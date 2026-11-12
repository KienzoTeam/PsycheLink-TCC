# Race conditions no server

Leitura estática do commit `a630eae`. Nada foi executado: o que acontece com duas requisições ao mesmo tempo foi deduzido do código e das regras do PostgreSQL, sem teste de concorrência. Os caminhos são relativos a `apps/server`. Os ids apontam para [`setores/server-corretude.md`](setores/server-corretude.md) e [`setores/server-critico.md`](setores/server-critico.md).

## Termos usados

- **Race condition** (condição de corrida): duas requisições ao mesmo tempo produzem um resultado que nenhuma produziria sozinha. O caso típico é "ler, decidir, gravar": as duas leem o mesmo valor antigo e as duas gravam.
- **READ COMMITTED**: o nível de isolamento padrão do PostgreSQL. Uma transação só vê o que as outras já confirmaram (COMMIT).
- **Lock**: trava que faz a segunda requisição esperar a primeira terminar.
  - **Lock consultivo** (`pg_advisory_xact_lock`): trava por uma chave qualquer, como o e-mail, e é solta no fim da transação.
  - **`FOR UPDATE` e `FOR SHARE`**: travam as linhas lidas.
- **UPDATE condicional** (ou CAS, *compare and swap*): `UPDATE ... WHERE valor = o_que_eu_li`. Se outro mudou antes, nenhuma linha muda, e o código sabe que perdeu a corrida.
- **Constraint única**: o banco recusa uma segunda linha igual (erro 23505), não importa quantas requisições cheguem juntas.
- **TOCTOU**: conferir uma condição e, antes de usar, outro mudar o estado.

Todas as transações passam por `emTransacao` (`lib/contextoseguro.ts:5-19`). A exceção é `/registro-psicologo`, que controla a transação à mão.

## Tabela

Coluna "Banco sozinho": **sim** quer dizer que uma constraint ou um UPDATE condicional bastam; **não** quer dizer que é preciso um lock ou mudar o modelo.

| # | Trecho | Duas requisições iguais ao mesmo tempo | Proteção hoje | Banco sozinho | Situação |
|---|---|---|---|---|---|
| 1 | Cadastro de paciente, `routes/auth.ts:160-196` | A 2ª espera o lock. Refaz o pendente só com a mesma senha; troca o código e manda um 2º e-mail | lock consultivo por e-mail e UNIQUE em `users.email` | o UNIQUE evita 2 contas, mas a 2ª viraria 500; a regra "refaz o pendente" pede o lock | ok (IDEM-05) |
| 2 | Cadastro de psicólogo, `routes/auth-psicologo.ts:305-398` | Igual ao 1, e a 2ª segura outra conexão do pool esperando o lock, que fica preso durante o envio de e-mail | lock, `FOR UPDATE`, UNIQUE e `ON CONFLICT` | igual ao 1 | conhecido (DES-03) |
| 3 | Confirmação de e-mail contra recadastro, `auth.ts:230-249` e `:160` | Se um recadastro entra entre o SELECT e o UPDATE, bem no instante em que o código vence, a conta é confirmada com a senha do outro | nenhuma | sim: conferir e confirmar numa transação com o mesmo lock | RACE-05 (A6) |
| 4 | CRP único, `auth.ts:236-245` e `auth-psicologo.ts:336-340` | Duas confirmações de e-mails diferentes com o mesmo CRP: cada `NOT EXISTS` não vê o commit da outra, e as duas passam | nenhuma (não há UNIQUE em `psicologo.crp`) | não: `email_verificado` fica em outra tabela; precisa de lock por CRP | RACE-03 |
| 5 | Tentativas do código do paciente, `auth.ts:112-133` | Com 4 tentativas gastas, N requisições paralelas testam N códigos | só o rate limit em memória | sim: `UPDATE ... tentativas < 5 RETURNING` | RACE-01 (A6) |
| 6 | Intervalo de reenvio e esqueci-senha, `auth.ts:135-141`, `:269-271`, `:289-291` | As duas leem "fora do intervalo": 2 e-mails, e vale o último gravado | nenhuma | sim: UPDATE que reserva os 60 s antes, como no reenvio do 2FA | conhecido |
| 7 | 2FA: tentativas, `auth-psicologo.ts:131-136` | Cada uma consome uma tentativa | UPDATE condicional | já é o banco | ok |
| 8 | 2FA: uso único, `:155-166` | Só uma abre sessão | UPDATE condicional e `FOR SHARE` em users | já é o banco | ok |
| 9 | 2FA: reenviar, `:181-190` | Um e-mail só | UPDATE reserva os 60 s antes do envio | já é o banco | ok |
| 10 | Um desafio 2FA vivo, `:99-114` | UPDATE e INSERT separados, depois do envio: dois desafios vivos. Com e-mail lento, o pedido antigo mata o desafio do novo | nenhuma | em parte: gravar antes do envio, invalidando na mesma instrução | conhecido; IDEM-06 |
| 11 | Rotação do refresh, `:253-266` | Uma vence, a outra recebe 409 | UPDATE condicional no hash | já é o banco | ok (resposta perdida: IDEM-03) |
| 12 | Uso e revogação da sessão, `lib/sessaoWeb.ts:91-95`, `:134-139` | Atômico | UPDATE condicional | já é o banco | ok |
| 13 | Troca de senha contra abrir sessão | Serializadas pela linha de users | UPDATE em users e `FOR SHARE` | já é o banco | ok |
| 14 | Troca de senha do psicólogo, `routes/psicologo/conta.ts:64-80` | Duas abas: as duas passam no compare e vale a última gravação | nenhuma | sim: UPDATE condicional ao hash lido | IDEM-08 |
| 15 | Criar paciente, `lib/paciente.ts:9-18` | As duas leem vazio e inserem; uma estoura o UNIQUE e devolve **500** | só o UNIQUE | sim: `INSERT ... ON CONFLICT ... RETURNING id` | RACE-04 |
| 16 | Código de vínculo de uso único, `routes/paciente/vinculo.ts:63-93` | Dois pacientes: o 2º espera o `FOR UPDATE`, vê o código usado e recebe 400 | `FOR UPDATE` e índice único dos códigos abertos | sim | ok |
| 17 | Mesmo paciente, mesmo código, duas requisições | O servidor responde 201 e 400 "Código inválido ou expirado.". A tela atual quase não dispara isso: o botão fica desabilitado enquanto envia, e o 201 já navega | idem | — | IDEM-02 |
| 18 | Um vínculo ativo por paciente, `:53-60`, `:78-80`, `:96-102` | A 2ª recebe 409 | índice único `uk_vinculo_ativo_paciente` | já é o banco | ok |
| 19 | Limite de 10 códigos, `routes/psicologo/vinculo.ts:23-31` | As duas contam 9 e inserem: 11 códigos | nenhuma | não: lock por psicólogo | conhecido (informativo) |
| 20 | Um check-in por dia, `routes/checkin.ts:180-215` | A 2ª recebe 409 | índice único `uk_paciente_data` | sim, mas o "dia" é UTC | FUSO-01 (A3) |
| 21 | Solicitar escala, `routes/psicologo/escalas.ts:62-89` | 201 e 409 | índice único de aplicação aberta e `FOR SHARE` no vínculo | já é o banco | ok |
| 22 | Responder escala, `routes/paciente/escalas.ts:88-136` | A 2ª espera, vê a aplicação fechada, compara as respostas e devolve o mesmo sucesso | `FOR UPDATE` | já é o banco | ok |
| 23 | Responder, cancelar e encerrar vínculo ao mesmo tempo | O lock de linha decide; quem chega depois reavalia o status | `FOR UPDATE` e UPDATE condicional | já é o banco | ok |
| 24 | Conflito de consulta, `routes/psicologo/consultas.ts:113-117` | 201 e 409 `CONFLITO_AGENDA` | `EXCLUDE USING gist` (`0006:23-24`) | já é o banco | ok |
| 25 | Remarcar, `:202-216` | A 2ª não acha a consulta agendada e recebe 404 | `FOR SHARE` no vínculo e UPDATE condicional | já é o banco | ok |
| 26 | Alterar consulta, `:155-161` | Status: a 2ª recebe 404. Observação: vale a última | UPDATE condicional | já é o banco | ok |
| 27 | Encerrar vínculo pelos dois lados | A 2ª recebe 404; os triggers cancelam escalas e consultas uma vez só | UPDATE condicional e triggers | já é o banco | ok |
| 28 | Encerrar contra gravação do psicólogo | Escala e consulta travam o vínculo, então o encerramento espera e cancela o que foi gravado. A anotação não trava, mas não há nada a cancelar | `FOR SHARE` no vínculo | já é o banco | ok |
| 29 | Consentimento, `routes/paciente/consentimento.ts:76-110` | Com linha existente, o `FOR UPDATE` serializa. Na primeira vez não trava nada: a auditoria sai em dobro, com a diferença calculada contra "nada" | `ON CONFLICT` e `FOR UPDATE` | sim para o estado; a auditoria pede travar a linha antes de ler | conhecido |
| 30 | "Parar diário" contra check-in em gravação, `consentimento.ts:123-130` e `checkin.ts:181-200` | O UPDATE não vê o INSERT ainda não confirmado, e o texto novo fica marcado como compartilhado. **O psicólogo lê esse texto**, porque a leitura usa só a marcação do check-in | nenhuma | em parte: só fecha se o INSERT do check-in condicionar a marcação ao consentimento, o que é decisão do grupo. Sem isso, documentar a janela de milissegundos | DIA-01 (baixa) |
| 31 | Número da exportação, `routes/psicologo/relatorios.ts:249` | Dois números diferentes | sequência da auditoria | já é o banco | conhecido |

Correção da linha 30: a entrega original do setor de corretude dizia "impacto baixo: o psicólogo só lê o texto se também houver `compartilha_diario`". O setor crítico conferiu no código que isso é falso (`psicologo/pacientes.ts:199-204`, `psicologo/checkins.ts:209-210`).

## Proteção na memória do processo

Só existe uma: o contador do `express-rate-limit`, criado a cada chamada de `limite()` (`lib/rota.ts:6-12`, `auth.ts:17`, `auth-psicologo.ts:35`, `checkin.ts:13`). Não há outro estado em memória.

Todos os locks são do PostgreSQL, então valem com duas instâncias do servidor e com o pooler do Neon.

Dependem **só** do contador em memória, que zera a cada deploy ou queda (RACE-02):

- a força bruta de senha do paciente e do psicólogo: as colunas `users.tentativas_falhas` e `bloqueio_acesso` existem (`0001:396-397`) e nada as usa;
- o código de vínculo: 5 tentativas por 15 min por usuário, sem contador por código no banco;
- o código do paciente sob concorrência, até o A6;
- spam de cadastro e de e-mail.

O cenário de "duas instâncias dobram o limite" é hipotético, porque o Render Free roda uma. O cenário real da banca é o contrário: todos os aparelhos no mesmo hotspot dividem o mesmo contador (DES-05).

## Constraints que viram 409

Estas constraints transformam a corrida em resposta 409:

- `uk_paciente_data` → 409 (`checkin.ts:214`);
- `uk_vinculo_ativo_paciente` → 409 (`paciente/vinculo.ts:98`);
- `uk_aplicacao_aberta` → 409 (`psicologo/escalas.ts:85`);
- conflito de agenda (23P01) → 409 `CONFLITO_AGENDA` (`consultas.ts:129`, `:226`).

Uma colisão no índice de códigos de vínculo abertos sorteia outro código. A exceção é o UNIQUE de `paciente.user_id`, que vira 500 (linha 15).

## Sobre o tempo do envio de e-mail

Várias linhas dependem de quanto tempo o envio leva com a transação aberta. A conta "até 35 s" não é uma soma simples. No nodemailer 10.2.1, conexão, saudação e STARTTLS dividem um prazo de 10 s, e os 15 s do socket contam inatividade por etapa. Uma porta bloqueada falha em cerca de 10 s; um servidor SMTP lento pode passar de 35 s.

## O que falta testar

Nenhuma corrida acima foi executada. As que têm teste hoje:

- duas rotações de refresh (`sessao-web.test.ts:127`);
- solicitar escala (`escalas.test.ts:202`);
- consultas no mesmo horário (`consultas.test.ts:164`);
- cadastro paralelo (`cadastro-concorrente.test.ts:28`).

Os testes propostos para as outras estão em cada achado de [`setores/server-corretude.md`](setores/server-corretude.md).
