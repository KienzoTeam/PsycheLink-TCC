# Dependências: server

> Levantamento em modo leitura, 10 e 11/11/2026. Agente `deps_server`, Opus 5.5 (effort high). Nada foi executado além de leitura de código, `npm view/audit/outdated` e documentação pública; "verificado" quer dizer lido no código, não testado. Linhas citadas são do commit `0864143`.

## Resumo

apps/server tem 10 dependências e 8 devDependencies, todas na última major. npm audit: 0 vulnerabilidades em 170 pacotes. npm outdated mostra 4 atrás, só em minor/patch: nodemailer 10.2.1→10.5.0, express-rate-limit 8.7.1→8.7.4, dotenv 18.0.9→18.0.10, @types/node 26.6.5→26.6.6. Nenhum pacote está deprecado. Nenhuma troca de biblioteca é urgente. Os problemas reais estão na configuração e no uso: falta o campo engines; o tsconfig não declara types:["node"] e não checa test/ nem scripts/, o que importa no TS 7; o limite de senha conta 72 caracteres em vez de 72 bytes; jwt.verify do mobile roda sem a opção algorithms; o allowScripts fixa versões exatas (bcrypt@6.0.0, esbuild@0.28.2) e quebra em updates; o .env local não tem ALLOWED_ORIGINS nem TRUST_PROXY, que o app.ts lê; console.error com objetos de erro do pg pode gravar dados pessoais no log. Recomendação: manter pg, Express 5, bcrypt e jsonwebtoken até a entrega. Argon2id, jose, pino e ORM ficam como trocar_depois.

## Relatório

## Auditoria de dependências do apps/server (2026-11-10)

### Resultado
- **npm audit**: 0 vulnerabilidades em 170 pacotes. **npm outdated**: 4 pacotes atrás, só em minor/patch: nodemailer 10.2.1→10.5.0, express-rate-limit 8.7.1→8.7.4, dotenv 18.0.9→18.0.10, @types/node 26.6.5→26.6.6. Nenhum pacote está deprecado (`npm view X deprecated` vazio em todos). [verificado]
- Lockfile v3. A versão instalada é igual à declarada em todos os pacotes. O dependabot faz updates semanais agrupando minor e patch (`.github/dependabot.yml`). [verificado]

| Pacote | Decl./Inst. | Última (data) | Ação |
|---|---|---|---|
| bcrypt | ^6.0.0 / 6.0.0 | 6.0.0 (2025-05-11) | manter |
| cors | 2.8.6 | 2.8.6 (2026-01-22) | manter |
| dotenv | 18.0.9 | 18.0.10 (2026-11-09) | remover (baixa prioridade) |
| express | 5.3.0 | 5.3.0 (2026-10-09) | manter |
| express-rate-limit | 8.7.1 | 8.7.4 (2026-11-09) | atualizar |
| helmet | 8.3.0 | 8.3.0 (2026-07-12) | manter |
| jsonwebtoken | 9.0.3 | 9.0.3 (2025-12-04) | manter |
| nodemailer | 10.2.1 | 10.5.0 (2026-11-10) | atualizar |
| pg | 8.23.1 | 8.23.1 (2026-09-30) | manter |
| zod | 4.6.7 | 4.6.7 (2026-10-12) | manter |
| @types/* (bcrypt, cors, express, jsonwebtoken, pg) | em dia | — | manter |
| @types/node | 26.6.5 | 26.6.6 (2026-10-28) | atualizar |
| tsx | 4.23.15 | 4.23.15 (2026-09-20) | manter |
| typescript | 7.0.2 | 7.0.2 (2026-07-08) | investigar config |

### Problemas encontrados (mais importantes que versões)
1. **Senha medida em caracteres, não em bytes.** `src/schemas.ts:25` aceita `.max(72)` caracteres, e o README do bcrypt avisa que o limite é de 72 bytes. Uma senha com acentos ou emoji pode ser truncada em silêncio. A OWASP pede limite de 72 bytes. Correção: `refine(s => Buffer.byteLength(s) <= 72)`. [verificado]
2. **jwt.verify sem `algorithms`** no fluxo mobile (`src/routes/auth.ts:40` e `:348`). O fluxo web já fixa HS256 e audience (`src/lib/sessaoWeb.ts:120`). Com segredo string, o jsonwebtoken 9 já restringe a HS*, então o risco é baixo. Vale padronizar `algorithms:['HS256']` e uma `audience` por tipo de token. [verificado; impacto: suspeita baixa]
3. **Env sem validação.** `src/index.ts:4` só checa DATABASE_URL, JWT_SECRET e ENCRYPTION_KEY. `src/lib/codigo.ts:3` usa JWT_SECRET se faltar EMAIL_PEPPER, e `''` se faltar os dois. O `app.ts` lê ALLOWED_ORIGINS e TRUST_PROXY, que não estão no `.env` local (vi só os nomes das chaves). Sem TRUST_PROXY atrás de proxy, o rate limit conta o IP do proxy. Recomendo um schema zod no boot, sem dependência nova. [verificado]
4. **Logs.** `app.ts` e `lib/rota.ts` passam o objeto de erro inteiro para o `console.error` (25 chamadas no total). O `DatabaseError.detail` do pg pode trazer valores, como o e-mail numa violação de unique, e isso é dado pessoal no log (LGPD). Logar só `code` e `message`. [uso verificado; vazamento: suspeita]
5. **Falta o campo `engines`.** O Node local é 26.13.0, que já é LTS (Lithium, 2026-10-28). O nodemailer 10 exige >=20, e os scripts usam `--env-file` e glob no `--test`. Declarar `"engines":{"node":">=24"}`. [verificado]
6. **TypeScript 7.** `target ES2022`, `module commonjs`, `strict true`, sem `moduleResolution` nem `types` (`tsc --showConfig`). O TS 7 é o port em Go, sem API programática até a 7.1 (anúncio oficial de 2026-07-08). Segundo fontes secundárias, as opções deprecadas no 6.0 viram erro no 7.0 e os `@types` deixam de ser carregados automaticamente. Recomendo `"types":["node"]` explícito e `"moduleResolution":"bundler"` ou `"node16"` explícito. Não rodei o tsc (modo leitura). A revisão anterior registra "tsc limpo". Risco extra: ferramentas que dependem da API do TS, como typescript-eslint, podem não funcionar com o 7. [config verificada; efeitos: suspeita]
7. **Testes e scripts sem checagem de tipos.** O `include` cobre só `src`, e o tsx não checa tipos. Adicionar um `tsc --noEmit` que cubra `test/` e `scripts/`. Não há linter. [verificado]
8. **allowScripts** (npm 12.2.2 local). Os scripts de instalação ficam bloqueados por padrão, e os pins `bcrypt@6.0.0` e `esbuild@0.28.2` valem só para essas versões. Quando o dependabot subir o esbuild via tsx, o script será pulado em silêncio. O bcrypt traz prebuilds N-API e deve continuar funcionando (suspeita). Rodar `npm install-scripts ls` após updates. npm mais antigo na máquina de um colega ignora o campo (suspeita). [docs locais do npm verificadas]
9. **dotenv** é importado só em `src/index.ts:1`. O resto já usa `--env-file` e `util.parseEnv`. Pode sair com `node --env-file-if-exists=.env dist/index.js`. Ganho pequeno. [verificado]

### Alternativas
- **bcrypt x Argon2id**: a OWASP põe Argon2id em 1º (m=19 MiB, t=2, p=1) e bcrypt só para legado, com custo mínimo 10. O projeto usa custo 10 em todos os hashes, inclusive no `HASH_REFERENCIA`, o que preserva o tempo constante. **trocar_depois (M)**: exige rehash no login.
- **jsonwebtoken x jose**: jose (6.2.17, 2026-11-09) é o padrão moderno. Para HS256 só em Node, trocar não traz ganho agora. **manter**, aplicando o item 2.
- **SMTP x API transacional**: o nodemailer está em dia e tem tipos próprios. Uma API HTTP só compensa se o host bloquear 465/587. **investigar** (host não verificado).
- **Rate limit**: a documentação diz que o MemoryStore basta numa instância e que vários processos pedem store externo. O store Postgres (`@acpr/rate-limit-postgresql` 1.4.1) está parado desde 2024. **manter**.
- **pg x Prisma x Drizzle x Kysely**: o RLS por `set_config(...,true)` transacional (`src/lib/contextoseguro.ts`), as 124 queries e as 7 migrations SQL funcionam. Achado útil para o agente de Prisma: a dist-tag `latest` do CLI `prisma` aponta para 8.0.0-rc.33 (2026-11-06), enquanto a do `@prisma/client` é 7.10.1. Drizzle ainda é 0.45 com a 1.0 em beta. Kysely 0.29.8 exige Node >=22. **trocar_depois (G)**.
- **Express 5 x Fastify/Hono**: sem ganho claro. **manter**.
- **pino**: **trocar_depois (P)**. Antes, corrigir o item 4.
- **Validação de env com zod**: **trocar_agora (P)**.

### Limitações
Não rodei tsc, testes nem build. Não confirmei qual é o host de produção. Os efeitos do TS 7 vêm de fontes secundárias. Do `.env` li só os nomes das chaves.

## npm audit e outdated

npm --prefix apps/server audit --json (2026-11-10): 0 vulnerabilidades (info 0, low 0, moderate 0, high 0, critical 0) em 170 dependências (104 de produção, 66 de dev, 48 opcionais). outdated: @types/node 26.6.5→26.6.6, dotenv 18.0.9→18.0.10, express-rate-limit 8.7.1→8.7.4, nodemailer 10.2.1→10.5.0. Nenhum major pendente, nenhum pacote deprecado.

## Pacotes

| Pacote | Declarada | Instalada | Última | Defasagem | Vulnerabilidades | Ação | Justificativa |
|---|---|---|---|---|---|---|---|
| bcrypt | ^6.0.0 | 6.0.0 | 6.0.0 (2025-05-11) | nenhuma | 0 | manter | Custo 10 é o mínimo da OWASP. Corrigir src/schemas.ts:25 para medir bytes (Buffer.byteLength<=72) e não caracteres. Argon2id é a primeira escolha da OWASP, mas a migração exige rehash no login: fica para depois. |
| cors | ^2.8.6 | 2.8.6 | 2.8.6 (2026-01-22) | nenhuma | 0 | manter | Uso simples em app.ts:23. Variável ALLOWED_ORIGINS não está no .env local (só WEB_ORIGINS) — verificar se é intencional. |
| dotenv | ^18.0.9 | 18.0.9 | 18.0.10 (2026-11-09) | patch | 0 | remover | Só é usado em src/index.ts:1. Os scripts já usam --env-file do Node e o seed-dev usa util.parseEnv. Trocar por node --env-file-if-exists=.env dist/index.js. Ganho pequeno, prioridade baixa. |
| express | ^5.3.0 | 5.3.0 | 5.3.0 (2026-10-09) | nenhuma | 0 | manter | Fastify ou Hono não trazem ganho claro para um TCC com tráfego baixo e 124 chamadas de query já escritas. |
| express-rate-limit | ^8.7.1 | 8.7.1 | 8.7.4 (2026-11-09) | patch | 0 | atualizar | Store em memória basta com 1 instância. O limite reinicia a cada restart ou deploy. Precisa de TRUST_PROXY correto atrás do proxy (app.ts:14), e essa chave não está no .env local. |
| helmet | ^8.3.0 | 8.3.0 | 8.3.0 (2026-07-12) | nenhuma | 0 | manter | Em dia. |
| jsonwebtoken | ^9.0.3 | 9.0.3 | 9.0.3 (2025-12-04) | nenhuma | 0 | manter | Funciona e sessaoWeb.ts:120 já fixa algorithms HS256. Faltam algorithms:['HS256'] e audience em auth.ts:40 e auth.ts:348. jose é a escolha moderna, mas a troca não traz ganho funcional agora. |
| nodemailer | ^10.2.1 | 10.2.1 | 10.5.0 (2026-11-10) | minor | 0 | atualizar | Subir para 10.5.0. Considerar API transacional só se a hospedagem bloquear as portas SMTP (a confirmar). |
| pg | ^8.23.1 | 8.23.1 | 8.23.1 (2026-09-30) | nenhuma | 0 | manter | O RLS usa set_config(...,true) por transação (src/lib/contextoseguro.ts) e funciona bem com pg puro. Migrar para ORM custa G, já que são 124 chamadas de query. |
| zod | ^4.6.7 | 4.6.7 | 4.6.7 (2026-10-12) | nenhuma | 0 | manter | Reaproveitar para validar o env no boot. Hoje index.ts:4 só checa 3 variáveis. |
| @types/bcrypt | ^6.0.0 | 6.0.0 | 6.0.0 (2025-07-19) | nenhuma |  | manter | Em dia. |
| @types/cors | ^2.8.19 | 2.8.19 | 2.8.19 (2025-06-07) | nenhuma |  | manter | Em dia. |
| @types/express | ^5.0.6 | 5.0.6 | 5.0.6 (2025-12-01) | nenhuma |  | manter | Em dia. |
| @types/jsonwebtoken | ^9.0.10 | 9.0.10 | 9.0.10 (2025-06-16) | nenhuma |  | manter | Em dia. |
| @types/node | ^26.6.5 | 26.6.5 | 26.6.6 (2026-10-28) | patch |  | atualizar | Bate com o Node 26.13.0 local, que já é LTS (Lithium). Declarar engines para fixar o alvo. |
| @types/pg | ^8.23.1 | 8.23.1 | 8.23.1 (2026-08-17) | nenhuma |  | manter | Em dia. |
| tsx | ^4.23.15 | 4.23.15 | 4.23.15 (2026-09-20) | nenhuma |  | manter | Só remove tipos, não faz checagem: test/ e scripts/ nunca passam pelo tsc. |
| typescript | ^7.0.2 | 7.0.2 | 7.0.2 (2026-07-08); beta 7.1.0-beta | nenhuma |  | investigar | Para tsc puro o risco é baixo. Recomenda-se 'types':['node'] explícito, porque no 6/7 os @types não são mais carregados automaticamente (fonte secundária). Ferramentas que dependem da API do TS, como typescript-eslint, podem não funcionar. |

## Alternativas avaliadas

| Tema | Opções | Recomendação | Custo | Justificativa |
|---|---|---|---|---|
| Hash de senha: bcrypt x argon2 | bcrypt 6.0.0 \| argon2 0.45.2 \| @node-rs/argon2 2.2.2 | trocar_depois | M | A OWASP põe Argon2id em 1º lugar (m=19MiB, t=2, p=1) e bcrypt só para legado, com custo mínimo 10. O projeto já está no mínimo e limita o tamanho da senha. Antes da banca: corrigir o limite para 72 bytes. A migração exige rehash no login e manter os dois algoritmos convivendo. |
| JWT: jsonwebtoken x jose | jsonwebtoken 9.0.3 \| jose 6.2.17 | manter | P | jose é a escolha moderna (Web Crypto, JWE/JWKS), mas só HS256 em Node não pede troca. Basta adicionar algorithms e audience nos verify de auth.ts. |
| E-mail: SMTP x API transacional | nodemailer SMTP \| API HTTP (ex.: resend 6.38.0) | investigar | P | SMTP funciona e não prende a um fornecedor. Só vale trocar se a hospedagem bloquear as portas 465/587. Não verifiquei qual é o host. |
| Rate limit: memória x store externo | MemoryStore \| rate-limit-redis 6.0.2 \| @acpr/rate-limit-postgresql 1.4.1 (sem release desde 2024-03) | manter | P | Com uma instância, a memória basta. A documentação só pede store externo quando há várias instâncias. O store Postgres está parado e Redis seria mais um serviço. |
| Acesso a dados: pg x Prisma x Drizzle x Kysely | pg 8.23.1 \| @prisma/client 7.10.1 (CLI 'latest' aponta 8.0.0-rc.33) \| drizzle-orm 0.45.4 (1.0 em beta) \| kysely 0.29.8 | trocar_depois | G | O RLS por set_config transacional, as 124 queries escritas à mão e as 7 migrations SQL funcionam. A reta final do TCC não é hora de trocar. Kysely é o caminho de menor atrito, porque mantém o SQL. Prisma tem a divergência de dist-tag acima. |
| Framework HTTP: Express 5 x Fastify/Hono | express 5.3.0 \| fastify 5.12.8 \| hono 4.13.17 | manter | G | Sem ganho claro para o volume de um TCC. |
| Logger estruturado | console.* (25 console.error) \| pino 10.4.0 | trocar_depois | P | O urgente não é o pino. É parar de logar o objeto de erro inteiro (app.ts, rota.ts), porque DatabaseError.detail do pg pode trazer valores, como o e-mail numa violação de unique (suspeita). Logar só code e message já resolve. pino com redact fica para depois. |
| Validação de env | checagem manual em index.ts \| schema zod \| dotenv | trocar_agora | P | Zod já está instalado. Um schema no boot cobriria DATABASE_URL, JWT_SECRET, ENCRYPTION_KEY, EMAIL_PEPPER, WEB_ORIGINS, ALLOWED_ORIGINS e TRUST_PROXY. Hoje codigo.ts:3 cai em silêncio para JWT_SECRET e depois para '' se faltar EMAIL_PEPPER. |
| Engines, lint e checagem de tipos dos testes | engines ausente \| sem linter \| tsconfig include só src | trocar_agora | P | Declarar engines.node >=24 (nodemailer pede >=20, Node 26 é LTS) e incluir test/ e scripts/ num tsc --noEmit. Para lint, preferir algo que não dependa da API do TS 7 (suspeita sobre typescript-eslint). |
| allowScripts | pins exatos bcrypt@6.0.0 / esbuild@0.28.2 | investigar | P | No npm 12, scripts de instalação são bloqueados por padrão e o pin vale só para aquela versão. Quando tsx ou dependabot subirem o esbuild, o script será pulado em silêncio. Rodar npm install-scripts ls após cada update. npm mais antigo ignora o campo (suspeita). |

## Fontes

- https://registry.npmjs.org (npm view, consultado 2026-11-10)
- https://nodejs.org/dist/index.json (consultado 2026-11-10)
- https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/ (2026-07-08)
- https://www.visualstudiomagazine.com/articles/2026/03/23/typescript-6-0-ships-as-final-javascript-based-release-clears-path-for-go-native-7-0.aspx
- https://dev.to/gabrielanhaia/5-typescript-defaults-that-quietly-changed-in-2026-and-why-your-build-is-now-broken-381f
- https://github.com/microsoft/TypeScript/issues/62200
- https://www.pkgpulse.com/guides/jose-vs-jsonwebtoken-vs-fast-jwt-jwt-libraries-nodejs-2026
- https://express-rate-limit.mintlify.app/reference/stores
- npm 12.2.2 docs locais: docs/content/commands/npm-install-scripts.md
- apps/server/node_modules/bcrypt/README.md:41
