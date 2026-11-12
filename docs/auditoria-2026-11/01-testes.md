# Testes do server

Estado do commit `a630eae` (main mais os lotes A1 e A2). A tabela de cobertura foi montada lendo os arquivos de `apps/server/test` com grep. A contagem de testes foi medida em 12/11. As linhas citadas são deste commit; as do `levantamento/server_testes.md` eram do `0864143` e mudaram.

## Termos usados

- **Teste de integração na rota real**: o teste sobe o servidor Express de verdade numa porta livre, chama a rota por HTTP e confere a resposta e o banco. É o tipo que mais se parece com o uso real.
- **Teste unitário**: chama uma função direto, sem servidor. Às vezes substitui uma peça por uma falsa (um **mock**), como o envio de e-mail.
- **SQL direto**: o teste roda consultas no PostgreSQL de verdade, com o papel da aplicação, para provar que a RLS bloqueia. Não é mock.
- **RLS** (Row-Level Security): regra do PostgreSQL que filtra linha por linha o que cada conexão enxerga.
- **Caso negativo**: o teste manda algo errado (senha errada, valor fora da faixa) e confere que o servidor recusa.
- **Caso de fronteira**: o teste manda o valor exato do limite (humor 1 e 10, notas com 2000 caracteres).

## Ferramenta

- **Runner:** `node:test`, o executor de testes que já vem com o Node, rodado pelo `tsx`, que executa TypeScript sem compilar antes.
- **Script:** `npm test` roda `tsx --env-file=.env.test --network-family-autoselection-attempt-timeout=3000 --test "test/**/*.test.ts"` (`apps/server/package.json:30`).
- **Arquivos:** 18 arquivos `*.test.ts` e 3 auxiliares: `ajuda.ts`, `comoDono.ts` e `bancoDeTeste.ts`.
- **Como as rotas são chamadas:** `iniciar(app)` sobe o servidor em `127.0.0.1` numa porta livre, e `criarCliente` faz `fetch` com cookies e um IP aleatório.
- **E-mail:** sem `SMTP_HOST`, o código de verificação sai no console e o teste lê de lá. Nenhum e-mail real sai.
- **Mocks usados:** `console.log` (para capturar o código), `mailer.sendMail`, um espião em `bcrypt.compare` e `crypto.randomInt` (para forçar colisão de código de vínculo).

## Banco separado e a trava que o garante

A suíte apaga linhas da auditoria e desliga por um instante o trigger que a protege. Por isso ela só pode rodar num banco de teste.

- **Banco:** um PostgreSQL 18 próprio, com o banco `psychelink_teste`. Localmente roda num contêiner. No CI é um serviço do GitHub Actions. O banco da equipe, do `.env`, nunca é usado.
- **Duas conexões:** a aplicação conecta como `psychelink_app`, que não ignora a RLS. As fixtures e a limpeza usam o dono do banco (`DATABASE_URL_DIRETA`).
- **A trava:** a função `motivoParaRecusar` está em `apps/server/test/bancoDeTeste.ts` e é chamada no topo de `test/ajuda.ts:23-27`. Ela recusa a suíte, antes de qualquer conexão, em quatro casos:
  1. falta `DATABASE_URL` ou `DATABASE_URL_DIRETA`;
  2. uma das URLs não é válida;
  3. o nome do banco não termina em `_teste`;
  4. o host é o mesmo do banco da equipe, lido do `.env` quando ele existe.
- **Mensagem de erro:** a recusa nunca repete a URL, o host nem a senha.
- **Testes da trava:** a própria trava tem 5 testes unitários em `test/bancoDeTeste.test.ts`.

O passo a passo para montar o banco local está em [`ESTADO.md`](ESTADO.md), seção "Como rodar a suíte do server".

## Comando

```bash
cd apps/server && npm test
```

Antes da primeira vez é preciso ter o `apps/server/.env.test` (fora do git) e rodar `npm run migrar:test`.

## O que o CI roda

O arquivo é `.github/workflows/ci.yml`. Ele roda em todo pull request e em todo push na `main`.

1. **`tipos`:** para cada app (server, web, mobile), `npm ci` e `npx tsc --noEmit`, que confere os tipos. O `tsconfig.json` do server só inclui `src/`, então os arquivos de `test/` não passam por essa conferência.
2. **`testes-server`:**
   - sobe um `postgres:18` de serviço com o banco `psychelink_teste`;
   - roda `npm ci`;
   - escreve um `.env.test` com segredos aleatórios gerados na hora (`openssl rand`) e `SMTP_HOST` vazio;
   - roda `npm run migrar:test`;
   - define a senha do papel `psychelink_app`;
   - roda `npm test`.

## Contagem medida

**242 testes, 242 passam, 0 falham**, em 12/11/2026. A contagem foi medida no PostgreSQL 18 local e no CI do PR #35, que é o estado deste commit.

A conta bate com o texto dos arquivos. São 215 chamadas `it(`, e três delas estão dentro de laços:

- as 7 tabelas de `rls.test.ts:92` somam mais 6 casos;
- as 8 fronteiras aceitas de `checkin.test.ts:166` somam mais 7;
- os 15 corpos recusados de `checkin.test.ts:186` somam mais 14.

O baseline de 11/11, antes do A1, era de 203 testes.

## Fluxos críticos

Legenda:

- **I** = integração na rota real.
- **U** = unitário, às vezes com mock.
- **SQL** = SQL direto no banco real com o papel da aplicação.
- **—** = nenhum.

| Fluxo | Cobertura | Onde está o teste | O que falta |
|---|---|---|---|
| Cadastro do paciente | I | `cadastro.test.ts:71-96` (pendente refeito); `cadastro-sem-revelar.test.ts:87`, `:122` (não revela conta); `cadastro-concorrente.test.ts:28` (paralelo) | validação de campos; idade (LGPD-08); aceite (A11) |
| Verificação de e-mail | I, só o caminho feliz | `cadastro.test.ts:54` (CRP), `cadastro-concorrente.test.ts:28` | código errado, expirado e 6ª tentativa; mesma resposta com e sem conta (SEG-02); senha na confirmação (SEG-01) |
| Login e logout do paciente | I, parcial | `auth.test.ts:18` (sucesso e `/auth/me`); `auth.test.ts:36` (e-mail inexistente passa pelo bcrypt, com espião); `checkin.test.ts:266`, `:271` (401 sem token, 403 com token inválido) | senha errada; conta não verificada; token expirado; **`/auth/logout` não tem nenhum teste**; conta de psicólogo no `/auth/login` (A6) |
| Recuperação de senha | I, parcial | `cadastro-sem-revelar.test.ts:184` (esqueci-senha não revela conta); `sessao-web.test.ts:269-294` (redefinir revoga sessões, com token assinado pelo próprio teste) | **`/auth/verificar-codigo-senha` não tem nenhum teste**; fluxo completo código → token → nova senha; token reutilizado (K-04) |
| Cadastro do psicólogo | I | `cadastro.test.ts:54`, `:98`; `cadastro-sem-revelar.test.ts:87` (psicólogo verificado não vira paciente) | CRP com formato inválido; 409 que revela conta (SEG-03); pendente que bloqueia paciente (CAD-01) |
| Login em 2 etapas do psicólogo | I, completo | `auth-psicologo.test.ts:36-300` (16 casos: paciente recusado, senha errada, não verificado, tentativas, expiração, reuso, reenvio, teto de 30 min, cookies) | teto de tentativas por conta (OTP-01) |
| Sessão web | I, completo | `sessao-web.test.ts:45-213` (cookie, Bearer recusado, rotação, concorrência, reuso, 30 min, 12 h, logout); `:323-384` (conta, troca de senha, sessões) | resposta de refresh perdida (IDEM-03) |
| Código de vínculo | I | `vinculo.test.ts:67-253` (geração, HMAC, limite de 10, colisão com `randomInt` falso, resgate, resposta igual para inválidos, 409, 429 por usuário) | limite por IP (VIN-01); reenvio do resgate (IDEM-02) |
| Encerramento de vínculo | I e SQL | `vinculo.test.ts:265`, `:285` (pelos dois lados); `escalas.test.ts:503`; `consultas.test.ts:388`; `defesa-sem-rls.test.ts:44`; SQL em `rls.test.ts:139` | — |
| Consentimento e revogação | I, parcial | `vinculo.test.ts:302-374` (PUT grava e audita o que mudou; parar diário; corpo inválido); o efeito no psicólogo só por fixture direta (`pacientes.test.ts:164-191`, `escalas.test.ts:436`, `auditoria-psicologo.test.ts:184`) | **PUT do paciente seguido de leitura do psicólogo, antes e depois**; parar diário seguido de GET `/psicologo/checkins/:id` |
| Check-in | I | `checkin.test.ts:94-215`: cifra os campos sensíveis; 409 no mesmo dia (`:154`); 8 fronteiras aceitas; 15 corpos recusados; emoções vazias com mensagem | dia em São Paulo das 21h às 24h (A3); reenvio depois do timeout (IDEM-01); primeiro check-in em paralelo (RACE-04) |
| Hábitos | I | `checkin.test.ts:125-147` (seis hábitos e intensidade gravados, nenhum hábito, um só, sem intensidade); leitura em `:223` | — |
| Resumo do paciente (`/checkin/resumo`, `/checkin/painel`) | **—** | nenhum arquivo chama essas rotas | tudo; é o lote A3. Inclui o sono médio com 2 check-ins (QUAL-01) |
| Dashboard | I | `pacientes.test.ts:509-579`; `escalas.test.ts:454`; `consultas.test.ts:357`; `defesa-sem-rls.test.ts` | limiar com 2 registros (abaixo); item 9 true |
| Painel individual (resumo, linha do tempo, check-ins do psicólogo) | I | `pacientes.test.ts:269-502` (horário em São Paulo, períodos, comparação, correlação, paginação, consentimento); `checkin.test.ts:223` | resumo com diário marcado e humor e hábitos desligados (K-01); dados de antes do vínculo (A7) |
| Anotações | I e SQL | `pacientes.test.ts:126` (B recebe 404), `:593` (cria, lista, audita); `auditoria.test.ts:92`; `relatorios.test.ts:208`; SQL em `rls.test.ts:121`, `:162` | duplicata no reenvio (IDEM-04); leitura pelo autor depois do encerramento (CFP-01) |
| Escalas e item 9 | I e U | `escalas.test.ts:135-566` (23 casos: solicitar, 409, corrida, responder, idempotência, cancelar, intruso, RLS); `pontuar()` unitário em `:57-68` | **item 9 só tem o caso false** (`:281-282`); falta o true e o efeito no dashboard |
| Consultas | I e SQL | `consultas.test.ts:86-410` (19 casos: conflito, corrida, remarcar, dia de São Paulo, paciente sem observação, encerramento, RLS) | datas fixas em 2031 (`:40`) vão virar passado |
| Relatório e exportação | I | `relatorios.test.ts:114-258` (geral, individual, consentimento, anotações opcionais, exportação auditada) | o PDF é feito no web e não tem teste |
| Auditoria | I e SQL | `auditoria.test.ts:36-187` (login, 2FA, logout, leituras, imutabilidade até para o dono, ON DELETE SET NULL); `auditoria-psicologo.test.ts:104-211` | leituras em lista (AUD-01, LGPD-06) |
| RLS | SQL | `rls.test.ts:78-162` (papel sem BYPASSRLS, sem contexto 0 linhas nas 7 tabelas, psicólogo sem vínculo, paciente); `escalas.test.ts:531`; `consultas.test.ts:410`; `defesa-sem-rls.test.ts`, que roda como dono para provar a defesa da aplicação | as policies largas (RLS-01 a RLS-03) |
| Rate limit | I, parcial | `vinculo.test.ts:245` (5 por usuário no resgate); `auth-psicologo.test.ts:225` (429 do intervalo de reenvio do 2FA) | **nenhum limite por IP é testado**: os clientes de teste usam IP aleatório de propósito |
| CSRF | I | `sessao-web.test.ts:220` (escrita sem Origin ou com Origin fora da lista dá 403), `:238` (GET e rotas do app fora da regra); `hardening.test.ts` (CORS, Cache-Control, trust proxy) | `Cache-Control` em `/checkin` (K-02) |

Testes unitários fora dos fluxos acima: `bancoDeTeste.test.ts` (a trava), `hardening.test.ts:65-118` (o código só vai para o log fora de produção, com `console` e `sendMail` falsos) e `hardening.test.ts:120` (TLS do banco).

## Casos negativos e de fronteira que a devolutiva pede e ainda faltam

**Já cobertos desde o A1:** valores fora da faixa e salvamento duplicado do check-in (`checkin.test.ts:154-215`). Também está coberto o 401 e o 403 em `/checkin`.

**Ainda faltam:**

1. **Senha incorreta no login do paciente.** Existe só no psicólogo (`auth-psicologo.test.ts:53`).
2. **Conta não verificada no login do paciente** (403 `EMAIL_NAO_VERIFICADO`).
3. **Token do app expirado** e `/auth/logout` invalidando o token.
4. **Código de e-mail errado, expirado e a 6ª tentativa**, em `/auth/verificar-email` e `/auth/verificar-codigo-senha`. Incluir a mesma resposta com e sem conta (SEG-02).
5. **Fluxo completo de recuperação de senha:** esqueci-senha, código, token e nova senha, e o token usado duas vezes.
6. **Limiar de dados insuficientes com 2 registros.** `MIN_REGISTROS_SEMANA = 3`. Os testes cobrem 0, 1 e 4 na lista (`pacientes.test.ts:204-206`) e 1 no dashboard (`:557`). O 3 só aparece de forma implícita: o paciente com 3 registros fica fora de `dadosInsuficientes`. Falta um teste com 2, 3 e 4 registros no mesmo período.
7. **Revogação de ponta a ponta:** o paciente desliga pelo PUT e o psicólogo lê antes e depois. O mesmo para o "parar diário".
8. **Item 9 do PHQ-9 diferente de zero:** a marca `true` gravada e o campo `item9DiferenteDeZero` no dashboard.
9. **`/checkin/resumo` e `/checkin/painel`:** sem dados, com dados e com sono em 2 check-ins (lote A3).
10. **Dia do check-in em São Paulo:** um teste determinístico para o horário das 21h às 24h, porque o CI roda de dia (lote A3).
11. **Um 429 por IP**, em pelo menos uma rota de login.
12. **Datas relativas em `consultas.test.ts`**, no lugar das datas fixas em 2031.

Do levantamento, ainda valem os pontos de qualidade: asserts fracos, esperas fixas (`esperaMs(50)`), dependência de ordem e helpers repetidos (`levantamento/server_testes.md` §5).
