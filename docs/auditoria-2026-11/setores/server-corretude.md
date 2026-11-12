# Server: corretude sob concorrência, idempotência e fuso (revisão de 12/11/2026)

Leitura estática do commit `a630eae`. Nada foi executado: as conclusões sobre duas requisições ao mesmo tempo vêm da leitura do código e das regras do PostgreSQL. Cada achado passou por um verificador, que releu o código.

As tabelas completas estão nos documentos do pedido:

- corridas trecho a trecho: [`../03-race-conditions.md`](../03-race-conditions.md);
- reenvios escrita a escrita: [`../04-idempotencia.md`](../04-idempotencia.md).

Aqui ficam os achados e a seção de fuso horário.

## Termos usados

- **Race condition** (condição de corrida): duas requisições ao mesmo tempo produzem um resultado que nenhuma produziria sozinha.
- **Idempotência**: repetir o mesmo pedido deixa o sistema como se ele tivesse sido feito uma vez só.
- **Lock**: trava que faz a segunda requisição esperar a primeira terminar.
- **TOCTOU** (*time of check, time of use*): o código confere uma condição e, antes de usar o resultado, outra requisição muda o estado.
- **UTC**: o horário de Greenwich. São Paulo fica 3 horas atrás.

## Resumo

As travas centrais estão certas e ficam no PostgreSQL, então valem também com duas instâncias do servidor:

- lock consultivo por e-mail;
- troca condicional no refresh;
- `FOR UPDATE` no código de vínculo e na resposta de escala;
- índices únicos parciais;
- `EXCLUDE` na agenda.

A única proteção guardada na memória do processo é o rate limit (RACE-02).

O ponto fraco é a idempotência. Não há webhook, pagamento nem chave de idempotência. Os clientes desistem aos 15 s e o servidor grava mesmo assim. Um reenvio então vira erro de uma ação que deu certo (IDEM-01, IDEM-02, IDEM-03, IDEM-07, IDEM-08, IDEM-09) e duplica a anotação clínica (IDEM-04).

Fuso horário: o dia do check-in e as janelas de 7 dias do psicólogo usam `CURRENT_DATE`, que no banco é UTC. O web e o resto do SQL usam o dia de São Paulo. Um check-in das 22h30 some do Perfil e do Relatório até o dia seguinte (FUSO-01). O A3 precisa incluir `dashboard.ts`, `pacientes.ts` e `lib/resumo.ts`, que hoje não estão na lista dele.

Nada chega a crítico.

## Achados mantidos

Legenda do veredito: **confirmado** = o verificador refez o caminho; **provável** = o caminho fecha, mas o gatilho não foi demonstrado; **não conferido** = o verificador não chegou a esse achado.

| Id | Sev. | Confiança | Veredito | Título | Onde | Cenário | Correção | Teste | Lote |
|---|---|---|---|---|---|---|---|---|---|
| FUSO-01 | alta | provável | confirmado | Dia do check-in em UTC; web e parte do SQL em São Paulo | `migrations/0001_baseline.sql:114` | Check-in às 22h30 de 12/11 grava `data`=13/11. O web pede até "hoje" (12/11) e não mostra. Quando aparece, sai "13/11 22:30". Às 08h de 13/11 o paciente recebe 409 | Uma expressão só para o dia de São Paulo, no DEFAULT e em todo `CURRENT_DATE`, inclusive nos arquivos do psicólogo. Não trocar o TimeZone da sessão | `SELECT dia_sp('2026-11-13 01:30+00') = '2026-11-12'`; um check-in de hoje aparece no resumo e no dashboard | A3 |
| IDEM-01 | média | verificado | confirmado | Check-in reenviado depois do timeout aparece como falha | `src/routes/checkin.ts:214` | O app desiste aos 15 s, o servidor grava. No novo toque vem 409, que o app mostra no alerta "Não foi possível salvar" e não limpa o rascunho. A mensagem do 409 aparece no alerta, mas fica ambígua | No 409 de `uk_paciente_data`, mandar um código próprio e o id do check-in; o app trata como sucesso | `checkin.test.ts`: dois POST iguais; o 2º traz o código e o mesmo id | — |
| RACE-01 | média | verificado | confirmado | Tentativas do OTP do paciente: lê, compara e só depois soma | `src/routes/auth.ts:112` | Com 4 tentativas gastas, N requisições paralelas testam N códigos | `UPDATE ... tentativas < 5 RETURNING`, como já é feito no 2FA | 10 códigos errados em paralelo: no máximo 5 respostas 400 | A6 |
| IDEM-04 | média | verificado | confirmado | Anotação clínica reenviada fica duplicada | `src/routes/psicologo/pacientes.ts:466` | O POST passa dos 15 s, o INSERT acontece e o web pede para tentar de novo. O prontuário fica com duas anotações iguais, sem rota para apagar | Chave gerada pelo web por formulário, coluna única e `ON CONFLICT DO NOTHING` | `pacientes.test.ts`: dois POST com a mesma chave criam 1 linha | — |
| RACE-02 | média | verificado | confirmado | Proteção contra força bruta só na memória do processo | `src/lib/rota.ts:6` | Senha, código de vínculo e OTP dependem só do contador em memória. As colunas `tentativas_falhas` e `bloqueio_acesso` existem e não são usadas. O contador zera no deploy ou numa queda. Duas instâncias é hipótese (o plano gratuito roda uma) | Documentar no TCC. Se for endurecer, contador por conta no banco com bloqueio curto | 11 logins errados, recarregar o app de teste, tentar o 12º | — |
| IDEM-02 | baixa | verificado | provável | Vinculação reenviada responde 409 para quem acabou de se vincular | `src/routes/paciente/vinculo.ts:57` | O duplo toque não acontece (o botão fica desabilitado e o 201 já navega). Sobra o reenvio depois de perder a resposta: 409 "Você já tem um psicólogo vinculado", que é verdade, e o paciente pode voltar pela Home | Se o código foi usado por este paciente, responder 200 com o vínculo | `vinculo.test.ts`: mesmo código 2 vezes dá 201 e 200 | — |
| IDEM-03 | baixa | provável | provável | Resposta de refresh perdida derruba a sessão e grava auditoria falsa de reuso | `src/routes/auth-psicologo.ts:269` | Se a rotação acontece e a resposta se perde, o cookie antigo dá 409 por 10 s e depois revoga a sessão com "reuso de credencial". O gatilho do Render acordando foi refutado; sobra rede instável | Aceitar o anterior por uma janela maior. Isso enfraquece a detecção de reuso: é uma troca, não um ganho certo | `sessao-web.test.ts`: cookie anterior depois de 20 s; muda o teste de `:112` | — |
| IDEM-05 | baixa | provável | provável | Cadastro reenviado com e-mail lento troca o código do primeiro e-mail | `src/routes/auth.ts:194` | O segundo pedido regrava o código e manda outro e-mail; o código do primeiro dá "Código incorreto". Exige SMTP lento a ponto de passar de 15 s | Dentro do lock, se o código tem menos de 60 s e a senha confere, responder 201 sem gerar outro. No `/auth/registro`, cuidado: se o primeiro envio falhou, isso responde 201 sem e-mail | No modelo de `cadastro-concorrente.test.ts`: 1 código só | — |
| IDEM-06 | baixa | provável | provável | Login do psicólogo reenviado: o pedido antigo invalida o desafio que a tela guarda | `src/routes/auth-psicologo.ts:106` | O login 1 fica preso no SMTP; o login 2 cria o desafio d2. Quando o 1 termina, invalida d2. O código certo do 2º e-mail falha | Gravar o desafio antes de enviar, invalidando os anteriores na mesma instrução | `auth-psicologo.test.ts`: segurar o 1º envio; o 2FA com o 2º desafio dá 200 | — |
| RACE-03 | baixa | verificado | confirmado | CRP sem UNIQUE: duas confirmações simultâneas ficam com o mesmo CRP | `src/routes/auth.ts:236` | Cada `NOT EXISTS` não vê o commit do outro. Na prática só o próprio atacante, com duas contas, consegue | Lock por CRP na confirmação (em transação) e no cadastro | Duas confirmações em paralelo: uma 200, outra 409 | — |
| RACE-04 | baixa | verificado | confirmado | Primeira escrita paralela do paciente dá 500 | `src/lib/paciente.ts:10` | As duas leem "sem paciente" e inserem; uma estoura o UNIQUE e volta 500. Janela de milissegundos | `INSERT ... ON CONFLICT (user_id) DO UPDATE ... RETURNING id` | Dois POST `/checkin` em paralelo: 201 e 409, sem 500 | — |
| FUSO-02 | baixa | verificado | não conferido | TimeZone da sessão não é fixado, e cerca de doze leituras supõem UTC | `src/db.ts:7` | Colunas sem fuso gravadas e lidas como UTC. Num Postgres em São Paulo (instalação local no Brasil), horários saem 3 h antes | Fixar UTC no papel da aplicação e no dono por migration; a correção de fundo é usar timestamptz | `SHOW timezone` pelo pool da aplicação devolve UTC | — |
| RACE-05 | baixa | verificado | não conferido | Confirmação de e-mail fora do lock do cadastro | `src/routes/auth.ts:230` | No instante em que o código vence, um recadastro troca a senha entre o SELECT e o UPDATE, e a confirmação do dono confirma a conta com a senha do outro. Janela de uma ida ao banco | Conferir e confirmar na mesma transação, com o mesmo lock do cadastro, e comparar a validade no SQL | Com o lock, o recadastro paralelo espera e só gera aviso | A6 |
| IDEM-07 | baixa | verificado | não conferido | Confirmar de novo depois de ter dado certo responde 400 | `src/routes/auth.ts:249` | A linha do código é apagada; o reenvio recebe "Código inválido ou expirado" | No app, oferecer "Já confirmou? Entrar". Não manter a linha no servidor (ver as correções que se anulam no relatório) | `cadastro.test.ts`: verificar 2 vezes; documenta 200 e 400 | A6 |
| IDEM-08 | baixa | verificado | não conferido | Troca de senha do psicólogo: o reenvio diz "Senha atual incorreta" | `src/routes/psicologo/conta.ts:69` | Com a resposta perdida, o reenvio compara com o hash novo e falha. Duas abas: vale a última | UPDATE condicional ao hash lido; no reenvio, se a nova senha já confere, responder ok | POST 2 vezes com o mesmo corpo: 200 e 200 | — |
| IDEM-09 | baixa | verificado | não conferido | Reenvio de ações do psicólogo devolve 404 ou 409 | `src/routes/psicologo/consultas.ts:129` | Agendar de novo dá 409 contra a própria consulta; remarcar, encerrar vínculo, cancelar e revogar dão 404; gerar código cria um segundo | No web, recarregar a lista depois de erro de rede antes de deixar repetir | `consultas.test.ts`: agendar 2 vezes documenta 201 e 409 | — |

Já estavam no levantamento de 10/11 e continuam abertos:

- FUSO-01: `levantamento/server_dados.md` §4, `conferencia_checkin.md` (B-C3-4), `conferencia_resto.md`.
- IDEM-01 e IDEM-04: `levantamento/server_dados.md` §5.
- RACE-01: `levantamento/server_dados.md` e `server_arquitetura.md`.
- RACE-02: `levantamento/server_arquitetura.md`. Só as colunas sem uso são novidade.
- RACE-03 e RACE-04: `levantamento/server_dados.md`.
- IDEM-06: `levantamento/server_dados.md` §4 (dois desafios vivos).
- IDEM-09: `levantamento/server_dados.md` §5.

## Refutados

Nenhum achado inteiro. Duas partes caíram na verificação:

- **IDEM-02:** a metade do duplo toque. O botão fica desabilitado enquanto envia, e o 201 já navega.
- **IDEM-03:** o gatilho "Render acordando". O refresh só sai depois de um 401, e nessa hora o servidor já está acordado.

## Fuso horário

No Brasil não há horário de verão desde 2019. São Paulo fica em UTC−3 o ano todo. Das 21h00 às 23h59, o `CURRENT_DATE` em UTC já é o dia seguinte.

O fuso do banco não foi medido:

- **Neon:** o comentário de `lib/checkins.ts:5` diz GMT. Falta rodar `SHOW timezone`.
- **Contêiner local:** `Etc/UTC`, medido em 11/11 (`ESTADO.md`). O CI usa a mesma imagem `postgres:18`, mas o fuso dele não foi medido.
- **Código:** nada fixa o TimeZone da sessão nem o TZ do processo Node.

| Trecho | Base do "dia" | Às 22h30 de 12/11 em São Paulo | Lote |
|---|---|---|---|
| `0001:114` (`data DEFAULT CURRENT_DATE`) e `checkin.ts:214` (409 "hoje") | sessão (UTC) | grava 13/11; às 08h de 13/11 o paciente recebe 409 | A3 |
| `checkin.ts:290-305` (painel do paciente) | relógio do processo Node | o corte da semana muda conforme onde o servidor roda | A3 |
| `lib/resumo.ts:39-40` e `psicologo/checkins.ts:78-79` | dia em UTC, hora em São Paulo | mostra "13/11 22:30" | A3 |
| web `DateRangePicker.tsx:27-30` contra `resumo.ts:49-50`, `relatorios.ts:102`, `pacientes.ts:174` | navegador (São Paulo) contra `data` em UTC | Perfil e Relatório não mostram o check-in até o dia seguinte. **Isso já falha hoje** | A3 |
| `lib/resumo.ts:49-50` (janela padrão, sem `de`/`ate`) | `CURRENT_DATE` | a janela termina em 13/11 | fora da lista do A3 |
| `dashboard.ts:71` e `:134` | `CURRENT_DATE` | conta o registro como de 13/11 | fora da lista do A3 |
| `pacientes.ts:81` e `:183` | `CURRENT_DATE` | idem | fora da lista do A3 |
| `dashboard.ts:86-89`, `:145-146`; `consultas.ts:91-92`; `lib/escalas.ts:67`; `auditoria.ts:109-110`; `pacientes.ts:300-328`; `relatorios.ts:108`, `:117`, `:167`, `:177` | São Paulo explícito | correto: 12/11 | — |
| `test/ajuda.ts:151` (`criarCheckin`) | `CURRENT_DATE` | as fixtures seguem a coluna | A3 |
| Leituras de timestamp sem fuso com `AT TIME ZONE 'UTC'` (FUSO-02) | supõem a sessão em UTC | corretas só se o TimeZone for UTC | — |

O `CURRENT_DATE` do lado do psicólogo aparece 6 vezes, em 5 consultas: `dashboard.ts:71` e `:134`, `pacientes.ts:81` e `:183`, `lib/resumo.ts:49-50`. Entre essas janelas não há desvio hoje, porque todas usam a mesma base. O desvio que já existe é o do web contra a coluna. O que o A3 criaria é outro: se ele mudar só a gravação para São Paulo, essas 6 ocorrências passam a discordar da coluna (QUAL-02, em [`server-complexidade.md`](server-complexidade.md)).

Para o A3:

1. Usar uma expressão só para o dia de São Paulo, `(ts AT TIME ZONE 'America/Sao_Paulo')::date`. Ela vai no DEFAULT da coluna e nas 6 ocorrências acima. O corte do painel passa a ser calculado no SQL, e `test/ajuda.ts:151` muda junto.
2. Não trocar o TimeZone da sessão, do papel ou do banco para São Paulo. As colunas sem fuso passariam a misturar linhas em UTC e em São Paulo.
3. Recalcular `data` das linhas antigas pode colidir no índice único de um check-in por dia. Antes, procurar duplicatas, ou não recalcular.
4. Ter um teste determinístico para o horário das 21h às 24h. O CI roda de dia, em UTC, e não pega esse intervalo sozinho.
5. O A7 vai comparar com `vinculo.criado_em`. Comparar instantes (`criado_em` com `criado_em`, as duas colunas em UTC), não `data` com `criado_em::date`.

## O que não foi coberto

- O fuso real do Neon (`SHOW timezone`) não foi medido.
- Não foi verificado se o proxy do Render repassa ao servidor um pedido cujo cliente já desistiu.
- Nenhum teste de concorrência foi executado.
- O PR do A4 (Brevo) está fora deste commit e pode mudar a latência do e-mail que pesa em IDEM-05 e IDEM-06.
- Web e mobile foram lidos só nos pontos de chamada.
- `scripts/seed-dev.ts` e `scripts/migrar.ts` não foram revisados para corrida.
- O esgotamento do pool foi tratado pelo setor de desempenho (DES-03).
