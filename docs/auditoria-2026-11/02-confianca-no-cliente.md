# Confiança no cliente

A pergunta deste documento: o servidor confere sozinho tudo o que importa, ou confia no que o app e o painel web mandam? Um cliente pode ser trocado por um `curl`. Então toda regra que só existe na tela é uma regra que não existe.

Parte do server: leitura estática do commit `a630eae`. Lidos as rotas, as libs, as 8 migrations e `apps/server/docs/rls.md`. Nada foi executado, e os valores do `.env` não foram abertos. As linhas citadas são de `apps/server`. Os ids (SEG, RLS, VIN, OTP, AUD, K, CAD) apontam para [`setores/server-seguranca.md`](setores/server-seguranca.md) e [`setores/server-critico.md`](setores/server-critico.md). Os ids A-C… apontam para `levantamento/conferencia_auth.md`.

## Termos usados

- **Autorização**: decidir se *esta* pessoa pode fazer *esta* ação com *este* dado. A autenticação é outra coisa: só diz quem a pessoa é.
- **BOLA** (ou IDOR): trocar o id na URL e ler o objeto de outra pessoa.
- **BFLA**: usar uma função de outro papel, como um paciente chamando rota de psicólogo.
- **Mass assignment**: o servidor gravar campos que o cliente mandou a mais.
- **RLS** (Row-Level Security): regra do PostgreSQL que filtra linha por linha o que cada conexão enxerga. Cada regra se chama **policy**. É a segunda barreira: mesmo que uma rota erre o SQL, o banco não devolve a linha.
- **CSRF**: um site malicioso faz o navegador do psicólogo mandar uma requisição com o cookie dele.
- **JWT**: um token assinado que o cliente guarda e manda a cada requisição.

## 1. Matriz de autorização rota a rota

O que o servidor confere:

- **S**, sessão: no app, o Bearer passa por `verificarToken` (`auth.ts:34-71`); no web, o cookie `pl_at` passa por `exigirSessaoWeb` (`sessaoWeb.ts:112-144`).
- **P**, papel: a conta tem linha em `psicologo` (`psicologo/index.ts:24-40`).
- **V**, vínculo ativo conferido no SQL: por `vinculoOuNegar` (`lib/vinculo.ts:34-62`) ou por JOIN em `vinculo` com `status='ativo'`.
- **C**, consentimento por categoria.
- **D**, dono do objeto: o id da URL ou do corpo fica amarrado ao `psicologo_id` ou ao `paciente_id` da sessão.
- **RLS**: a consulta roda dentro de `comContextoPaciente` ou `comContextoPsicologo`.
- **O**, Origin na lista permitida (`app.ts:31`).

### Autenticação pública e conta do app (`/auth`, `auth.ts`)

| Rota | Quem pode | O que o servidor confere | Lacuna |
|---|---|---|---|
| POST /auth/registro | qualquer um | zod; lock por e-mail; não revela conta | confirmação sem senha (SEG-01); psicólogo pendente bloqueia (CAD-01); aceite só no app (A11); idade não conferida |
| POST /auth/verificar-email | quem tem o código | código com 5 tentativas | não confere a senha (SEG-01); "Código incorreto." revela conta (SEG-02); contagem não atômica e corpo ausente dá 500 (A6) |
| POST /auth/reenviar-codigo | qualquer um | resposta igual; intervalo de 60 s | consulta extra só com conta (SEG-04); zera tentativas (OTP-02) |
| POST /auth/esqueci-senha | qualquer um | resposta igual; intervalo de 60 s | idem |
| POST /auth/verificar-codigo-senha | quem tem o código | conta verificada e código; devolve JWT de redefinição de 10 min | SEG-02; A6 |
| POST /auth/redefinir-senha | portador do JWT de redefinição | `tipo='redefinicao'`; derruba sessões do app, do web e 2FA na mesma transação (`auth.ts:361-371`) | token reutilizável (K-04); sem `algorithms` (K-03); sem auditoria; vínculo não revisto |
| POST /auth/login | conta verificada | bcrypt mesmo sem conta, para o tempo não revelar | aceita conta de psicólogo sem 2FA (A6) |
| GET /auth/me | S (Bearer) | dono pelo token; corte por `sessao_invalidada_em` | sem rate limit; aceita token de usuário apagado (TOK-01) |
| POST /auth/logout | S (Bearer) | grava o corte | derruba todos os aparelhos; folga de 10 s (A-C3-1) |

### Autenticação web do psicólogo (`auth-psicologo.ts`)

| Rota | Quem pode | O que o servidor confere | Lacuna |
|---|---|---|---|
| POST /auth/psicologo/login | qualquer um + O | P no SQL; e-mail verificado; auditoria | 403 com senha certa contra 400 com senha errada (A-C3-4); sem teto por conta (OTP-01) |
| POST /auth/psicologo/2fa | portador do desafio | tentativa consumida de forma atômica; uso único com a linha do usuário travada | OTP-01 |
| POST /auth/psicologo/2fa/reenviar | portador do desafio + O | 60 s de intervalo e no máximo 30 min | zera tentativas (OTP-01) |
| POST /auth/psicologo/refresh | cookie `pl_rt` + O | sessão viva; troca condicional do hash; reuso revoga e audita | — |
| POST /auth/psicologo/logout | S web + O | revoga só a sessão atual | — |
| POST /auth/registro-psicologo | qualquer um (sem O, sem cookie) | zod; lock; CRP único entre verificados | 409 revela conta (SEG-03); CRP só no formato; corrida do CRP (RACE-03) |

### App do paciente (`/checkin`, `/paciente`; Bearer, sem CSRF)

| Rota | Quem pode | O que o servidor confere | Lacuna |
|---|---|---|---|
| POST /checkin | S | D pelo token; RLS; a data é definida pelo servidor | conta de psicólogo vira paciente (A6); sem `no-store` (K-02) |
| GET /checkin/resumo, /checkin/painel | S | D e RLS | 30 registros mais antigos (A3); K-02 |
| GET /paciente/vinculo | S | D | — |
| POST /paciente/vinculo | S | código de uso único com `FOR UPDATE`; um vínculo ativo por paciente; não resgata o próprio código | limite só por usuário (VIN-01); consentimento ligado por padrão |
| POST /paciente/vinculo/encerrar | S | D | — |
| GET e PUT /paciente/consentimento | S | D e RLS; zod com 4 booleanos | — |
| POST /paciente/consentimento/diario/parar | S | D e RLS | não alcança o check-in em gravação (DIA-01) |
| GET /paciente/escalas/pendentes | S | D e RLS | — |
| GET /paciente/aplicacoes/:id | S | D (`paciente_id=$2`) e RLS | — |
| POST /paciente/aplicacoes/:id/respostas | S | D e RLS; quantidade e valores conferidos; **o score é calculado no servidor** | — |
| GET /paciente/consultas | S | D e RLS; a observação do psicólogo fica fora do SELECT | — |

### Painel do psicólogo (`/psicologo`: S web e P em todas as rotas, O nas escritas)

| Rota | O que o servidor confere | Lacuna |
|---|---|---|
| GET e PATCH /me | D; zod só com nome e especialidade | PATCH sem auditoria |
| POST /me/senha | senha atual; revoga as outras sessões e os tokens do app | — |
| GET /me/sessoes, POST /me/sessoes/encerrar-outras | D | — |
| GET /pacientes | V e RLS; métricas só com C humor | sem auditoria (AUD-01); A7 |
| GET /pacientes/:id/resumo | V; C aplicado em JS (`resumo.ts:62-108`); auditoria | datas dos textos de diário liberados saem mesmo sem humor nem hábitos (K-01); A7 |
| GET /pacientes/:id/linha-do-tempo | V; C no SQL | AUD-01; A7 |
| POST /pacientes/:id/encerrar-vinculo | D | — |
| GET /pacientes/:id/anotacoes | V, D e RLS; auditoria | vínculo encerrado dá 404 ao autor (CFP-01) |
| POST /pacientes/:id/anotacoes | V e D; até 5000 caracteres | o banco não exige V (RLS-01) |
| Códigos de vínculo (POST, GET, DELETE) e histórico | D | teto de 10 códigos sem lock |
| GET /checkins | V e C humor; sono só com hábitos | AUD-01; A7 |
| GET /checkins/:id | D via V e C humor; auditoria | A7 |
| GET /dashboard | V e C por bloco | AUD-01 |
| POST e GET /pacientes/:id/escalas | V, C escalas e D | — |
| GET /aplicacoes, GET /aplicacoes/:id | D, V e C escalas; 403 sem C; detalhe auditado | AUD-01 na lista |
| POST /aplicacoes/:id/cancelar | D e V; só status aberto | a policy é mais larga (RLS-03) |
| Consultas (GET, POST, PATCH, remarcar) | D, V e RLS; observação cifrada | — |
| GET /relatorios/geral | V e C por coluna | AUD-01 |
| GET /relatorios/pacientes/:id | V, C e D; auditoria | A7 |
| POST /relatorios/exportacoes | V quando é de um paciente | — |
| GET /auditoria, /auditoria/acoes | eventos do próprio psicólogo e dos pacientes depois do início do vínculo; IP só nos eventos dele | — |

**BOLA.** Não há BOLA aberto. Todo id da URL ou do corpo fica amarrado ao dono no próprio SQL: check-in (`checkins.ts:172-178`), aplicação (`escalas.ts:115`, `:226`; `paciente/escalas.ts:56`, `:93`), consulta (`consultas.ts:159`, `:204`, `:212`), código de vínculo (`vinculo.ts:85`) e paciente (`vinculoOuNegar`). Id de outro dono responde 404, igual a id inexistente, e cada caso tem teste ([`01-testes.md`](01-testes.md)). O vazamento entre psicólogos que existe é de tempo: dados de antes do vínculo (A7).

**BFLA.** O Bearer do app não abre `/psicologo`, porque essa rota só lê o cookie `pl_at` (teste em `sessao-web.test.ts:54`). O `pl_at` e o token de redefinição, usados como Bearer, caem em `!payload.id` (`auth.ts:45`). O furo é no sentido contrário: conta de psicólogo entra em `/auth/login` e vira paciente (A6).

**Mass assignment.** Sem achado. Nenhuma rota espalha `req.body` numa escrita, todo INSERT e UPDATE lista as colunas, e o zod descarta chaves extras. Papel, `psicologo_id`, `paciente_id` e status vêm do servidor.

## 2. As policies de RLS, explicadas

### Como funciona

- O papel do banco usado pela aplicação, `psychelink_app`, não tem BYPASSRLS, a permissão de ignorar a RLS (`0003:4-10`). Sete tabelas têm RLS ligada e forçada.
- A cada requisição, o servidor grava "quem é o paciente" ou "quem é o psicólogo" numa variável que só vale dentro da transação (`set_config(..., true)`, em `contextoseguro.ts:23-27`).
- As policies leem essa variável pelas funções `app_paciente_id()` e `app_psicologo_id()` (`0003:27-31`).
- **Sem a variável, nenhuma linha passa**: o valor é nulo, a comparação dá nulo, e nulo não é verdadeiro. Um texto que não é número faz a consulta falhar.
- Policies do mesmo comando se somam: basta uma liberar.
- A subconsulta dentro de uma policy também obedece à RLS da tabela consultada. É por isso que o psicólogo seguinte não vê as respostas das escalas aplicadas pelo anterior.

### Tabela das policies

| Tabela | Policy | Comando | Libera | Bloqueia | Observação |
|---|---|---|---|---|---|
| checkin_diario | checkin_isolamento_paciente (`0001:917`) | todos | o paciente lê e grava só as próprias linhas | outro paciente; o contexto do psicólogo | — |
| checkin_diario | checkin_psicologo_vinculado (`0003:56-60`) | SELECT | o psicólogo lê os check-ins de quem tem vínculo ativo com ele | escrita; vínculo encerrado | não olha a data do vínculo (A7) nem o consentimento (RLS-04) |
| habito | habito_paciente (`0003:63-66`) | todos | hábitos dos próprios check-ins | hábitos alheios | segue o check-in |
| habito | habito_psicologo_vinculado (`0003:68-72`) | SELECT | hábitos de paciente vinculado | escrita | mesmo furo de tempo (A7) |
| consentimento | consentimento_paciente (`0003:74-75`) | todos | o paciente lê e grava o próprio | consentimento alheio | DELETE liberado; nenhuma rota usa |
| consentimento | consentimento_psicologo_vinculado (`0003:77-81`) | SELECT | o psicólogo lê o de paciente vinculado | escrita | ok |
| anotacao_clinica | anotacao_psicologo (`0003:84-85`) | todos | o psicólogo lê e grava as próprias anotações | anotação de outro psicólogo; o paciente | não exige vínculo para criar; libera DELETE (RLS-01) |
| aplicacao_escala | aplicacao_paciente (`0003:87-88`) | todos | o paciente lê e responde as próprias | aplicação de outro paciente | larga demais: aceita qualquer psicólogo, score inventado e DELETE (RLS-02) |
| aplicacao_escala | aplicacao_psicologo_vinculado (`0005:142-146`) | SELECT | só o que este psicólogo aplicou, com vínculo ativo | aplicações do psicólogo anterior | ok |
| aplicacao_escala | aplicacao_psicologo_solicita (`0005:148-152`) | INSERT | pedido próprio, pendente, a paciente vinculado | gravar score; pedir sem vínculo | ok |
| aplicacao_escala | aplicacao_psicologo_cancela (`0005:154-159`) | UPDATE | aplicação própria, desde que termine `cancelada` | qualquer outro status final | não restringe o status de origem nem as outras colunas (RLS-03, provável) |
| resposta_escala | resposta_paciente (`0003:96-99`) | todos | respostas das próprias aplicações | respostas alheias | tabela antiga e vazia |
| resposta_escala | resposta_psicologo_vinculado (`0003:101-105`) | SELECT | respostas de aplicação visível ao psicólogo | escrita | o filtro vem da RLS de `aplicacao_escala` |
| consulta | consulta_psicologo_le (`0006:35-39`) | SELECT | consultas próprias de paciente vinculado | outro psicólogo; ex-paciente | ok |
| consulta | consulta_psicologo_cria (`0006:41-45`) | INSERT | consulta própria com vínculo | sem vínculo; em nome de outro | ok |
| consulta | consulta_psicologo_altera (`0006:47-55`) | UPDATE | consulta própria; a linha nova também precisa de vínculo | apagar (não há policy de DELETE) | ok |
| consulta | consulta_paciente_le (`0006:57-58`) | SELECT | o paciente lê as próprias | escrita | a linha inclui a observação cifrada; quem esconde a coluna é a rota |

**Triggers** (`0005:164-177`, `0006:63-76`): quando um vínculo passa de ativo para encerrado, eles cancelam as aplicações abertas e as consultas futuras daquele par. Rodam com os direitos do dono (`SECURITY DEFINER`) e `search_path` fixo.

### Tabelas sem RLS

| Tabela | Por quê | Risco |
|---|---|---|
| users, paciente, psicologo | são lidas antes de existir contexto (login, perfil) | a aplicação lê todos os hashes de senha (normal) |
| vinculo | as policies leem dela | é a raiz da confiança: quem grava `status='ativo'` define o acesso. Só o resgate do código grava (`paciente/vinculo.ts:78-80`) |
| codigo_vinculo | o resgate acontece antes do vínculo | filtrada por `psicologo_id` |
| sessao, desafio_2fa, verificacoes_email | autenticação; guardam só hashes | — |
| auditoria | escrita por todo fluxo; imutável por REVOKE e trigger | guarda `paciente_id` e a ação (por exemplo, `escala_respondida` com a sigla). É metadado de saúde filtrado só pelo SQL das duas rotas que leem |
| escala | catálogo | — |
| alerta, mensagem | sem rota | guardam dado de paciente e a aplicação tem permissão nelas; precisam de policy antes de ganhar rota |
| schema_migrations | do dono | REVOKE ALL (`0003:18`) |

Nenhuma consulta a tabela com RLS roda fora de `comContexto*` em `src/`. Todo `pool.query` toca só tabelas sem RLS. Nenhuma policy aceita contexto vazio.

**O que a RLS não faz:** ela não aplica o consentimento. Quem descarta o dado de uma categoria desligada é o código JavaScript ou SQL de cada rota (RLS-04). Uma rota nova que esqueça o filtro vaza, e a RLS não segura.

## 3. Sessão, códigos, tokens, cookies, cripto, segredos e logs

**Sessão do app.**

- O token é um JWT `{id, email}` de 1 dia, sem refresh. O e-mail viaja legível dentro dele.
- A revogação é por conta, não por aparelho: o servidor compara `users.sessao_invalidada_em` com a hora de emissão do token, com folga de 10 s (A-C3-1).
- O logout derruba todos os aparelhos.

**Sessão web.**

- `pl_at`: JWT de 15 min, conferido com `algorithms:['HS256']`, `aud` e `sid`. O `sid` é conferido no banco a cada requisição.
- `pl_rt`: só o hash fica no banco, e o cookie só vale no caminho do refresh.
- Prazos: 12 h no total e 30 min sem uso.
- Rotação com troca condicional; o reuso de um refresh antigo revoga a sessão e audita.
- Cookies `HttpOnly`, `Secure` e `SameSite=Strict`.
- A troca de senha revoga as outras sessões e os desafios 2FA na mesma transação.

**CSRF.**

- `SameSite=Strict` mais a lista de Origin nas escritas de `/auth/psicologo` e `/psicologo`. Sem Origin, a resposta é 403.
- `/auth/registro-psicologo` fica fora da lista, mas não usa cookie.
- As rotas do app usam Bearer, então CSRF não se aplica.

**JWT.**

- Um único `JWT_SECRET` assina 3 tipos de token. Hoje nenhum é aceito no lugar do outro: o web exige `aud`, o do app exige `id` e o de redefinição exige `tipo`.
- O `alg:none` não passa no jsonwebtoken 9 com segredo em texto.
- Ainda assim, a separação depende só do formato do conteúdo (K-03).

**Código por e-mail (cadastro e redefinição).**

- 900 mil valores possíveis, guardado só como hash, vale 15 min, 5 tentativas, comparação em tempo constante.
- Falhas: contagem não atômica (A6); reenvio que zera as tentativas (OTP-02); "Código incorreto." que revela conta (SEG-02); confirmação que não confere a senha (SEG-01).

**2FA web.** O desafio tem 32 bytes aleatórios, e o código vale 10 min. A tentativa é consumida antes da conferência, e o desafio é de uso único. Falta um teto por conta (OTP-01).

**Recuperação de senha.**

- O fluxo é esqueci-senha, código, JWT de 10 min e redefinir. A redefinição revoga tudo numa transação.
- O JWT é reutilizável dentro dos 10 min (K-04).
- A redefinição não é auditada e não revê o vínculo, o que importa no SEG-01.

**Cifra por campo.**

- AES-256-GCM com IV aleatório de 12 bytes por cifra (`criptografia.ts:30-41`).
- Sem AAD e sem versão de chave: um texto cifrado copiado para a linha de outro paciente decifra sem erro, e não dá para trocar a chave aos poucos.
- `lerSeguro` engole o erro de decifração (`lib/checkins.ts:10-18`).
- Cifrados: emoção, contextos, diário, respostas por item, anotação e observação de consulta.
- Em claro: intensidades, sono, hábitos (inclusive **medicação**), scores, a marca do item 9, consentimento, datas, nome, nascimento e e-mail.

**Segredos.**

- O boot exige só `DATABASE_URL`, `JWT_SECRET` e `ENCRYPTION_KEY` (`index.ts:4`). O `EMAIL_PEPPER` cai para o `JWT_SECRET` ou para vazio (`codigo.ts:3`).
- `.env*` está no `.gitignore`, mas o histórico ainda tem `apps/server/.env` no commit `1eae948` (`levantamento/critico_completude.md`). O `PLANO.md` registra que a senha do dono já foi trocada.
- A senha das contas de demonstração está no repositório, em `scripts/seed-dev.ts:14` (SEG-05).

**Logs.**

- `console.error` imprime o objeto de erro inteiro (`app.ts:63`, `rota.ts:28`). O `detail` do pg pode trazer o e-mail.
- O código de verificação só vai para o console sem SMTP e fora de produção.
- Nenhum log contém texto clínico.

## 4. Regras que o cliente promete e o servidor não confere

- **Aceite dos termos:** existe só no app (`registro.tsx:28-31`). É o lote A11.
- **Maior de 18 anos ou autorização do responsável** (`documentos.ts:11`): o servidor aceita qualquer data passada (LGPD-08). Pendente de decisão do grupo.
- **CRP "registrado e validado":** só o formato é conferido (`schemas.ts:66-71`). Somado ao SEG-01, qualquer pessoa vira "psicólogo".
- **App só para pacientes:** `/auth/login` aceita conta de psicólogo (A6).
- **Diário:** a liberação texto a texto, pela marcação no check-in, é de propósito e o servidor respeita. O furo é que as datas desses textos saem no resumo mesmo com humor e hábitos desligados, contra a regra do próprio servidor (K-01). Além disso, o "parar" não alcança um check-in que está sendo gravado (DIA-01).
- **Consentimento explícito:** o vínculo liga humor, hábitos e escalas sem o paciente escolher (`paciente/vinculo.ts:83-89`).

O que o servidor confere mesmo que o cliente mande outra coisa: o score das escalas, a data do check-in, o dono de cada objeto, o papel, o vínculo e o consentimento em cada leitura do painel.

## Web e mobile: pendente

A revisão multiagente do web e do mobile ainda não foi feita (`ESTADO.md`, próximos passos). Ficam para ela:

- **Web:** CSP, onde e como o painel guarda estado, o que vai em variáveis `VITE_*` (tudo nelas fica público no bundle), o PDF do relatório gerado no navegador e se alguma regra de consentimento existe só na tela.
- **Mobile:** onde o token fica guardado (`expo-secure-store`), o que vai em `EXPO_PUBLIC_*`, o cache HTTP do aparelho (K-02), o rascunho do check-in e o aceite dos termos feito só na tela (A11).
