# Server: segurança (revisão de 12/11/2026)

Leitura estática do commit `a630eae` (main mais os lotes A1 e A2). Nada foi executado: nem a suíte, nem o banco, nem o servidor. Os valores do `.env` não foram abertos. Cada achado passou por um verificador, que releu o código; a coluna "Veredito" traz o resultado dele.

A matriz de autorização rota a rota e as policies de RLS explicadas estão em [`../02-confianca-no-cliente.md`](../02-confianca-no-cliente.md). Este arquivo traz só os achados.

## Termos usados

- **RLS** (Row-Level Security): regra do PostgreSQL que filtra linha por linha o que cada conexão enxerga. Cada regra se chama **policy**.
- **BOLA** (ou IDOR): trocar o id na URL e ler o objeto de outra pessoa.
- **BFLA**: usar uma função que não é do seu papel, como um paciente chamando rota de psicólogo.
- **Mass assignment**: o servidor gravar campos que o cliente mandou a mais no corpo.
- **Oráculo de enumeração**: uma resposta diferente que revela se um e-mail tem conta.
- **OTP**: código de uso único mandado por e-mail.

## Resumo

A autorização está sólida:

- Todo id vindo da URL ou do corpo fica amarrado ao dono no próprio SQL.
- Toda rota do psicólogo confere o vínculo ativo e o consentimento.
- Não há BOLA, BFLA nem mass assignment em aberto, fora dois casos já na fila: o A6 (conta de psicólogo entra no app) e o A7 (dados de antes do vínculo).
- Nenhuma consulta a tabela com RLS roda fora de `comContexto*`, e nenhuma policy aceita contexto vazio.

Há dois achados novos de severidade média e um já conhecido que subiu para média:

- **SEG-01:** a confirmação do cadastro não confere a senha. Quem pré-cadastra o e-mail da vítima fica com a conta.
- **SEG-02:** a mensagem "Código incorreto." revela se o e-mail tem conta.
- **SEG-03:** o 409 do `/registro-psicologo` revela o mesmo. Já era conhecido como baixa e subiu para média, porque num app de saúde mental ter conta já é dado sensível.

Três policies são mais largas do que o `docs/rls.md` descreve (RLS-01 a RLS-03, baixa). Elas são a segunda barreira. A RLS não aplica o consentimento: quem filtra é o código das rotas (RLS-04).

Continuam abertos, do levantamento:

- datas do diário mesmo sem consentimento (K-01);
- `/checkin` sem `no-store` (K-02);
- JWT do app sem `algorithms` (K-03);
- token de redefinição reutilizável (K-04).

## Achados mantidos

Legenda do veredito: **confirmado** = o verificador refez o caminho no código; **provável** = o caminho fecha, mas parte depende de algo que não está no código; **não conferido** = o verificador não chegou a esse achado (não quer dizer refutado).

| Id | Sev. | Confiança | Veredito | Título | Onde | Cenário | Correção | Teste | Lote |
|---|---|---|---|---|---|---|---|---|---|
| SEG-01 | média | verificado | confirmado | Confirmação do cadastro não confere a senha | `src/routes/auth.ts:221-251` | O atacante cadastra o e-mail da vítima com a senha dele. A vítima se cadastra (recebe o mesmo 201) e digita o código que chegou, ou toca "reenviar". A conta fica confirmada com a senha do atacante. Ele vincula a conta a um psicólogo que ele mesmo cadastrou (o CRP só tem o formato conferido). Se a vítima redefinir a senha, o vínculo e o consentimento continuam | `/auth/verificar-email` recebe a senha e faz `bcrypt.compare` antes do UPDATE. Muda o contrato do app e do web, então vai num PR só, de preferência junto do A11 | `cadastro.test.ts`: terceiro cadastra com uma senha, dono com outra e confirma com o código e a senha dele. Esperado 400 e conta não verificada; com a senha gravada, 200 | — (junto do A11) |
| SEG-02 | média | verificado | confirmado | "Código incorreto." só aparece quando a conta existe | `src/routes/auth.ts:119-131` | Esqueci-senha e depois verificar-codigo-senha com código errado: com conta, 400 "Código incorreto."; sem conta, 400 "Código inválido ou expirado". O 429 depois de 5 erros também só sai com conta. Vale para conta pendente via reenviar + verificar-email | Uma resposta única para toda falha de código, contando a tentativa sem mudar a mensagem | `cadastro-sem-revelar.test.ts`: código errado com e sem conta dá status e corpo iguais, também depois de 6 tentativas | — (cabe no PR do A6) |
| SEG-03 | média | verificado | confirmado | `/registro-psicologo` devolve 409 para e-mail já cadastrado | `src/routes/auth-psicologo.ts:326-332` | Qualquer e-mail com CRP válido: 201 se não há conta, 409 se há conta verificada (inclusive de paciente). Revela a conta que o `/auth/registro` esconde. O 201 também demora mais (espera o SMTP) | Espelhar o `/auth/registro`: 201 com a mesma mensagem e aviso ao dono. O 409 de CRP em uso pode ficar | `cadastro-sem-revelar.test.ts`: e-mail de paciente, de psicólogo e novo dão o mesmo status e corpo | — |
| K-01 | baixa | verificado | confirmado | Resumo devolve as datas dos textos de diário liberados mesmo sem humor nem hábitos | `src/routes/psicologo/pacientes.ts:199-204` | Paciente com humor e hábitos desligados e um texto liberado no check-in. O resumo devolve `{data, texto}`. Liberar o texto pela marcação é de propósito; o defeito é a data sair, contra a regra de `lib/resumo.ts:57-63` | Com humor e hábitos desligados, devolver os textos sem data. Corrigir o comentário de `pacientes.ts:196` | `pacientes.test.ts`: consentimento todo false e um texto marcado; o resumo não traz data | — |
| K-02 | baixa | verificado | confirmado | `/checkin/*` sem `Cache-Control: no-store` | `src/app.ts:25` | `/checkin/painel` e `/checkin/resumo` devolvem humor e emoções sem `no-store`. Um proxy compartilhado não guarda (há Authorization), mas o cache do próprio aparelho pode guardar e sobrar depois do logout | Incluir `/checkin` na lista de `app.ts:25` | `hardening.test.ts`: GET `/checkin/painel` responde com `no-store` | — |
| K-03 | baixa | verificado | não conferido | `jwt.verify` do app e da redefinição sem `algorithms` nem `audience`; um segredo para 3 tokens | `src/routes/auth.ts:40` | Hoje nenhum token vale no lugar do outro, mas só pelo formato do payload. Se o token de redefinição ganhar um campo `id`, vira Bearer do app por 10 min | `algorithms:['HS256']` e `audience` própria no verify e no sign; de preferência um segredo por uso | `auth.test.ts`: token de redefinição e `pl_at` como Bearer dão 403 | — |
| K-04 | baixa | verificado | não conferido | Token de redefinição reutilizável por 10 min | `src/routes/auth.ts:339-381` | Quem copia o token troca a senha de novo depois do dono | Recusar quando `iat` for anterior a `sessao_invalidada_em` | `auth.test.ts`: redefinir 2 vezes com o mesmo token; a 2ª dá 400 | — |
| RLS-01 | baixa | verificado | não conferido | Policy de anotação é FOR ALL e não exige vínculo | `migrations/0003_papel_app_rls.sql:84-85` | No contexto de um psicólogo sem vínculo, o banco aceita INSERT de anotação para qualquer paciente e DELETE de anotação própria. Só a rota barra | Duas policies: SELECT do autor e INSERT com vínculo ativo; sem UPDATE e sem DELETE | `rls.test.ts`: INSERT sem vínculo falha; DELETE afeta 0 linhas | — |
| RLS-02 | baixa | verificado | não conferido | Policy do paciente em `aplicacao_escala` é FOR ALL | `migrations/0003_papel_app_rls.sql:87-88` | No contexto do paciente, o banco aceita criar aplicação em nome de qualquer psicólogo, inventar score e apagar resultado. Nenhuma rota faz isso hoje; falta a segunda barreira | SELECT do paciente e UPDATE só com status aberto; sem INSERT nem DELETE | `rls.test.ts`: DELETE da própria aplicação afeta 0 linhas; INSERT com psicólogo alheio falha | — |
| RLS-03 | baixa | provável | não conferido | Policy de cancelamento deixa reescrever score e item 9 de aplicação concluída | `migrations/0005_escalas.sql:154-159` | O USING aceita qualquer status de origem. Um UPDATE para `cancelada` com `score_total=0` numa aplicação concluída deve passar e apagar o sinal do item 9. Conferido só pelo texto da migration | Acrescentar `status IN ('pendente','em_andamento')` ao USING; limitar as colunas por GRANT ou trigger | `rls.test.ts`: o UPDATE afeta 0 linhas | — |
| RLS-04 | baixa | verificado | não conferido | A RLS não aplica consentimento | `migrations/0003_papel_app_rls.sql:56-60` | Com humor revogado, a policy ainda libera a linha inteira. Quem descarta é o JS da rota. Uma rota nova que esqueça o JOIN vaza | Registrar no `docs/rls.md` que o consentimento é só da aplicação e manter um teste por rota de leitura | `defesa-sem-rls.test.ts`: consentimento todo false, nenhuma rota devolve emoção, diário ou data | — |
| VIN-01 | baixa | verificado | não conferido | Resgate do código de vínculo limitado só por usuário | `src/routes/paciente/vinculo.ts:42` | 20 contas dão 100 palpites a cada 15 min. Com 20 códigos ativos, cerca de 19% de chance de acerto por dia. Quem acerta vira paciente de um psicólogo que esperava outra pessoa | Um limite por IP antes do limite por usuário | `vinculo.test.ts`: 21 erros do mesmo IP com contas diferentes; o 21º recebe 429 | — |
| OTP-01 | baixa | verificado | não conferido | 2FA sem teto por conta; o reenvio zera as tentativas | `src/routes/auth-psicologo.ts:96-114` | Quem tem a senha ganha 5 palpites por login e mais 5 a cada reenvio (60 s, por até 30 min). Trocando de IP, o limite por IP não segura | Contar falhas por conta numa janela e não zerar no reenvio | `auth-psicologo.test.ts`: 3 logins com 5 erros cada; o 11º palpite é recusado | — |
| OTP-02 | baixa | verificado | não conferido | OTP do paciente: o reenvio zera as tentativas | `src/routes/auth.ts:98-108` | Cada reenvio grava tentativas=0, então o limite de 5 vale por código, não por conta | Teto de falhas por e-mail, sem zerar no reenvio | `auth.test.ts`: 5 erros, esqueci-senha, 5 erros; o seguinte é recusado | A6 |
| SEG-04 | baixa | provável | não conferido | Reenvio e esqueci-senha fazem uma consulta a mais só quando a conta existe | `src/routes/auth.ts:264-271` | A ida extra ao banco pode ser medida pelo tempo de resposta. Não medido | Uma consulta só, sempre executada | `cadastro-sem-revelar.test.ts`: contar as chamadas ao banco com e sem conta | — |
| AUD-01 | baixa | verificado | não conferido | Leituras em lista não são auditadas | `src/routes/psicologo/checkins.ts:60-137` | Lista de check-ins, linha do tempo, dashboard, aplicações, pacientes e relatório geral não gravam auditoria. Sobreposto ao LGPD-06 | Um registro por requisição, sem conteúdo | `auditoria-psicologo.test.ts`: GET `/psicologo/checkins` grava 1 linha | — |
| SEG-05 | baixa | provável | não conferido | Senha fixa das contas demo no repositório | `scripts/seed-dev.ts:14` | Se o seed for adaptado para a branch de demonstração (A5), qualquer um entra pelo app nas contas de paciente da demo e mexe nos dados antes da banca | Ler a senha de uma variável fora do banco de teste, ou trocá-la depois do seed | Seed fora do banco de teste sem a variável: recusa | — (ligado ao A5) |

Já estavam no levantamento de 10/11 e continuam abertos:

- SEG-03: `levantamento/conferencia_auth.md` (A-C1-2, como baixa).
- K-01 e K-02: `levantamento/server_arquitetura.md`.
- K-03: `levantamento/checklists_seguranca_conformidade.md`.
- K-04: `levantamento/conferencia_auth.md` (A-C3-2).
- OTP-02: `levantamento/server_arquitetura.md` (contador do OTP); o detalhe do reenvio é novo.
- AUD-01: `levantamento/server_arquitetura.md` §3.

## Refutados

Nenhum.

Observação do setor crítico: a correção do SEG-03 não resolve o bloqueio de e-mail que um psicólogo pendente causa. Esse bloqueio vem do `/auth/registro` e virou o achado CAD-01 ([`server-critico.md`](server-critico.md)).

## Conferência do bloco A do checklist

Itens de `levantamento/checklists_seguranca_conformidade.md`, conferidos no código deste commit.

| Item | Estado | Onde |
|---|---|---|
| Vínculo ativo no SQL em toda rota com `:pacienteId`; nenhum `pool.query` fora do contexto | confirmado | `lib/vinculo.ts:34-62`; JOINs em `checkins.ts:83`, `dashboard.ts:41`, `relatorios.ts:119`. Lacuna de tempo: A7 |
| RLS em toda tabela clínica; contexto vazio tratado | parcial | 7 tabelas com RLS forçada; `NULLIF` em `0003:28`, `0003:31`, `0001:917`. Sem RLS: alerta, mensagem, auditoria. Policies largas: RLS-01 a RLS-03 |
| JWT com `algorithms`, `aud` e tipo; segredo por uso | parcial | web ok (`sessaoWeb.ts:120-131`); app e redefinição sem (`auth.ts:40`, `:348`); segredo único (K-03) |
| Rate limit por rota sensível e por conta; trust proxy | parcial | por IP e em memória; por conta só no resgate de vínculo; login, código e 2FA sem limite por conta (OTP-01, OTP-02) |
| AES-GCM: IV, AAD, versão de chave, cobertura | parcial | IV ok; sem AAD e sem versão; hábitos e medicação em claro |
| App conecta como `psychelink_app` | não verificável | `docs/rls.md:16`; o `.env` não foi aberto |
| Contexto vale só na transação | confirmado | `contextoseguro.ts:23-27`; nenhum SET de sessão em `src` |
| BFLA | confirmado, com a lacuna do A6 | `paciente/index.ts:11`; `psicologo/index.ts:40` |
| Mass assignment | confirmado | sem espalhar `req.body`; colunas explícitas |
| Sessão web: 12 h e 30 min, rotação, reuso, revogação na troca de senha | confirmado | `sessaoWeb.ts:19-21`, `:104-109`; `auth-psicologo.ts:221-281` |
| Token do app sem revogação por sessão | confirmado (limitação) | `auth.ts:410-414`, `:444` |
| CSRF | confirmado | `app.ts:31`; `sessaoWeb.ts:152-160` |
| Código por e-mail: aleatório seguro, tentativas, expiração, uso único, tempo constante | parcial | tentativas não atômicas (A6) e zeradas no reenvio (OTP-02); token de redefinição reutilizável (K-04) |
| Enumeração de conta | ausente em três pontos | SEG-02, SEG-03, A-C3-4; por tempo, SEG-04 |
| Senha | parcial | mínimo de 8; máximo de 72 caracteres, não bytes; bcrypt custo 10 |
| SQL só parametrizado; paginação validada | confirmado | só constantes são interpoladas; cursores validados por zod |
| Custo: bcrypt sem conta, LIMIT, `statement_timeout` | parcial | sem `statement_timeout` (`db.ts:7-13`) |
| helmet, CORS, `no-store` | parcial | `/checkin` sem `no-store` (K-02) |
| Erro sem stack; logs sem dado pessoal | parcial | resposta genérica; objeto de erro inteiro no log |
| Erro assíncrono chega ao handler | parcial | o Express 5 propaga; `lerSeguro` engole o erro de decifração |
| Segredos fora do git, distintos, falha no boot | parcial | histórico em `1eae948`; pepper com valor reserva; boot não exige `EMAIL_PEPPER` nem `WEB_ORIGINS` |
| Auditoria imutável, leitura clínica, exportação, consentimento | parcial | imutável ok; listas sem registro (AUD-01); gravada fora da transação (LGPD-09) |
| Produção: TLS verificado, HSTS, `NODE_ENV` | parcial | TLS pelo `sslmode` da URL; HSTS do helmet; `NODE_ENV` não é exigido |

## O que não foi coberto

- Nada foi executado. O RLS-03 e a combinação de policies em UPDATE foram conferidos só pelo texto das migrations.
- Os valores do `.env` não foram abertos. Não dá para confirmar se `DATABASE_URL` usa o papel `psychelink_app`, nem se os segredos são fortes e distintos.
- O código do lote A4 (Brevo, `/health`, timeout do pool) está fora do `a630eae`.
- Os oráculos por tempo (SEG-04, e o SMTP no login do psicólogo) não foram medidos.
- O SEG-01 não foi reproduzido de ponta a ponta. A parte do servidor foi lida no código; o comportamento da vítima é suposição.
- `scripts/seed-dev.ts` e `scripts/migrar.ts` foram vistos só por grep.
- A pasta `test/` foi lida só pelos nomes dos casos.
- Os lados web e mobile (CSP, armazenamento, variáveis `VITE_*` e `EXPO_PUBLIC_*`) ficam para as revisões deles.
- LGPD e CFP: ver [`server-conformidade.md`](server-conformidade.md).
