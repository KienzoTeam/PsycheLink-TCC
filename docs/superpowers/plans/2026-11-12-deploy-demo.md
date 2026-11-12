# Lotes A4 e A5: API publicada, painel publicado e ambiente de demo

Plano-mestre: `docs/auditoria-2026-11/PLANO.md`, lotes A4 e A5 e trilha "Deploy e demo". Marco: até 17/11 a API responde `/health` no Render e um código de verificação chega a uma caixa de e-mail real; se não, a demo passa a ser local.

## Contexto

- Hoje só o banco está hospedado (Neon). API e painel rodam no notebook. Os slides citam Docker, Vercel e Render.
- O Render gratuito bloqueia saída nas portas 25, 465 e 587 (https://render.com/docs/free), então o SMTP atual não funciona lá. Ele também dorme depois de 15 minutos sem tráfego e leva cerca de 1 minuto para acordar; o Neon suspende em 5 minutos; os dois clientes desistem em 15 s.
- O grupo não tem domínio próprio. Resend só envia para o dono da conta sem domínio verificado. Brevo envia por `POST https://api.brevo.com/v3/smtp/email` com cabeçalho `api-key`, exige remetente "registrado e verificado"; se um Gmail verificado basta é o que o primeiro teste do grupo confirma.
- O repositório é privado e de uma organização (`KienzoTeam`). O Vercel gratuito (Hobby) não conecta repositório de organização (https://vercel.com/docs/limits), então o painel sobe pela CLI do Vercel a partir do notebook (`npx vercel --prod`, deploy manual pelo dono da conta). O Render conecta o repositório com o app do GitHub instalado na organização (https://render.com/docs/github) e aceita deploy por Dockerfile (https://render.com/docs/docker).
- Sessão do painel: cookies `HttpOnly; Secure; SameSite=Strict` com `path=/api` (`apps/server/src/lib/sessaoWeb.ts:23-25`); escritas exigem `Origin` em `WEB_ORIGINS`. Por isso o painel precisa falar com a API pela mesma origem: o Vercel repassa `/api/*` para o Render (rewrite), como o proxy do Vite faz em dev (`apps/web/vite.config.ts`).

## Restrições globais

- Nenhum segredo no repositório: chaves só em variáveis de ambiente do Render, do Vercel e no `.env` local. `.env.example` documenta os nomes.
- `.gitignore` tem uma modificação do usuário: nunca adicioná-la ao commit.
- Servidor: testes `node:test` no estilo de `apps/server/test/hardening.test.ts`; suíte `cd apps/server && npm test` verde; `tsc --noEmit` limpo.
- Sem dependência nova: `fetch` nativo do Node 26 para a API do Brevo.
- Commits em Conventional Commits, pt-BR, com o trailer do modelo que escreveu.

### Task 1: E-mail pela API do Brevo e `/health`

**Arquivos**
- Modificar: `apps/server/src/lib/mailer.ts`, `apps/server/src/app.ts`, `apps/server/.env.example`
- Testes: `apps/server/test/hardening.test.ts` (ou arquivo novo `test/mailer.test.ts`)

**O que fazer**
1. `mailer.ts`: uma função interna de envio usada por `enviarCodigo` e `enviarAvisoCadastro`. Com `BREVO_API_KEY` definida, envia por `fetch` para `https://api.brevo.com/v3/smtp/email` com cabeçalhos `api-key`, `content-type: application/json`, `accept: application/json`, corpo `{ sender: { name, email }, to: [{ email }], subject, htmlContent }` (nome e e-mail do remetente lidos de `EMAIL_FROM` no formato `Nome <email>`) e `AbortSignal.timeout(15_000)`. Resposta fora de 2xx lança um erro com `code: 'EBREVO'` e `responseCode: <status>`, que o `resumoErroSmtp` já sabe resumir; o corpo da resposta e o destinatário nunca vão para o log. Sem `BREVO_API_KEY`, o SMTP de hoje; sem os dois, o console de dev de hoje. `mailer` continua exportado (os testes trocam `sendMail`).
2. `index.ts`: ao subir, registrar no log qual envio de e-mail está ativo (`Brevo`, `SMTP` ou `console de dev`). Com `NODE_ENV=production` e nem `BREVO_API_KEY` nem `SMTP_HOST`, registrar um erro claro: hoje, nesse caso, `enviarCodigo` volta sem enviar nem logar, e um cadastro em produção ficaria sem código sem ninguém saber por quê.
3. `app.ts`: `GET /health` faz `SELECT 1` no `pool` e responde `200 { ok: true }`; com o banco fora, `503 { ok: false }`. `Cache-Control: no-store`. Sem autenticação e sem rate limit (o ping da banca bate nela a cada 4 minutos).
4. `.env.example`: `BREVO_API_KEY=""` com uma linha dizendo que ela vale mais que o SMTP e que o remetente de `EMAIL_FROM` precisa estar verificado no Brevo.

**Testes**
- Com `BREVO_API_KEY` e `fetch` trocado por um mock (`t.mock.method(globalThis, 'fetch', ...)`, recarregando o módulo como `hardening.test.ts:102-108` faz): `enviarCodigo('a@b.test', 123456)` chama `https://api.brevo.com/v3/smtp/email` com `api-key` e corpo com `sender` lido de `EMAIL_FROM`, `to: [{ email: 'a@b.test' }]` e o código no `htmlContent`; resposta 401 do mock faz `enviarCodigo` lançar com `code === 'EBREVO'` e `responseCode === 401`; `sendMail` não é chamado.
- `GET /health` responde 200 `{ ok: true }` com o banco de teste.
- O aviso de boot: com `NODE_ENV=production` e sem `BREVO_API_KEY` e `SMTP_HOST`, a função que escolhe o transporte informa "nenhum" (teste da função, sem subir o processo).

### Task 2: Arquivos de deploy e guia para o grupo

**Arquivos**
- Criar: `apps/server/Dockerfile`, `apps/server/.dockerignore`, `docker-compose.yml` (raiz), `apps/web/vercel.json`, `docs/deploy.md`

**O que fazer**
1. `Dockerfile` do server: `node:26-slim`; instala com `npm ci`; compila com `npm run build`; roda `node dist/index.js` como usuário não root; copia `migrations/` e `scripts/` para quem quiser rodar `npm run migrar` de dentro do contêiner. `.dockerignore` tira `node_modules`, `dist`, `.env*` e `test/`.
2. `docker-compose.yml` (plano B da demo, tudo local): `postgres:18` com volume e a API do Dockerfile, ligada só em `127.0.0.1`; as variáveis vêm de `apps/server/.env.compose` (fora do git; o guia mostra quais chaves). O guia explica rodar as migrations e a senha do `psychelink_app` como no `ESTADO.md`.
3. `vercel.json` do web: rewrite de `/api/:caminho*` para `https://psychelink-api.onrender.com/:caminho*` (o guia diz para trocar se o nome do serviço no Render for outro); fallback de SPA para `/index.html`; header `Content-Security-Policy` igual ao de produção de `apps/web/DESIGN.md` ("Segurança do front: CSP").
4. `docs/deploy.md`, passo a passo para quem nunca fez, com o que clicar e o que copiar em cada serviço:
   - Brevo: criar a conta, verificar o remetente (o e-mail do grupo), gerar a chave de API, mandar um teste para um e-mail que não seja o do dono.
   - Neon: criar a branch `demo` a partir da principal e, dentro dela, um banco novo e vazio `psychelink_demo` (assim nenhum dado da equipe vai para a demo); rodar `npm run migrar` com a URL do dono apontando para `psychelink_demo` e definir a senha do `psychelink_app`. Seed com contas de e-mail reais fica para o lote A5 (o seed atual recusa outro host e usa contas `@psychelink.test`, que não recebem o código do 2FA).
   - Render: instalar o app do Render na organização do GitHub; Web Service a partir do repositório, raiz `apps/server`, linguagem Docker; colar os valores das variáveis sem aspas; variáveis (`DATABASE_URL` da branch `demo` com `psychelink_app`, `JWT_SECRET`, `ENCRYPTION_KEY`, `EMAIL_PEPPER`, `BREVO_API_KEY`, `EMAIL_FROM`, `NODE_ENV=production`, `VALIDAR_MX`, `WEB_ORIGINS` e `ALLOWED_ORIGINS` com o domínio do Vercel, `TRUST_PROXY`); health check em `/health`.
   - Vercel: `npx vercel login` e, em `apps/web`, `npx vercel --prod` (deploy manual; repetir a cada versão nova do painel); conferir login em 2 etapas, vínculo e painel no domínio do Vercel.
   - App: `EXPO_PUBLIC_API_URL=https://<domínio do Vercel>/api`, para o app passar pelos mesmos proxies do painel.
   - `TRUST_PROXY`: o caminho é cliente → Vercel → Render → API. Medir antes de fixar: entrar no painel, abrir Minha área → Sessões e comparar o IP da sessão com o IP público de quem testa (por exemplo, `curl https://api.ipify.org`). Ajustar o número até baterem. Com o valor errado o rate limit junta todos os usuários num IP só (429 na demo) ou aceita IP forjado.
   - Dia da banca: abrir `/health` 10 minutos antes e manter um ping a cada 4 minutos (comando pronto no guia); hotspot próprio para o celular e o notebook.

**Verificação**
- `podman build -t psychelink-api apps/server` passa; o contêiner, apontado para o Postgres de teste local (`--network host`, com `apps/server/.env.test` montado como `/app/.env`, porque `--env-file` do podman guarda as aspas dos valores e o `dotenv` não), responde `GET /health` com 200.
- `vercel.json` é JSON válido; o header CSP é idêntico ao de `DESIGN.md`.
- Ninguém publica nada nesta task: deploy é com o grupo, pelo guia.

## Pronto quando (marco de 17/11)

O grupo, seguindo `docs/deploy.md`: `/health` do Render responde 200; um cadastro de paciente feito contra a API publicada recebe o código num e-mail real que não é o do dono da conta Brevo. Se o Brevo não aceitar um remetente Gmail, ou o Render não subir até 16/11, a demo vira local com `docker-compose.yml` e o slide 15 vai para a proposta de documentos.
