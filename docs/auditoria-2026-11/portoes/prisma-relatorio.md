# Portão do Prisma: relatório

Worktree `.claude/worktrees/spike-prisma`, branch `spike/prisma` (3 commits sobre `c1b1ec5`, sem push). Banco de teste Postgres 18 em `127.0.0.1:54329`, papel `psychelink_app`. Nada de migration, nada apagado fora do `limpar()` dos testes. Só `db pull` (leitura) e `generate`.

## Veredito: PASSA

Os 6 critérios passam. O critério 6 fica com uma parte pendente por natureza (Neon real, "6 minutos ocioso"), registrada abaixo. O portão responde só à pergunta de viabilidade: dá para usar o Prisma Client numa parte pequena sem perder o RLS e sem quebrar os testes. Não muda a recomendação da pesquisa (não migrar, SQL é mais defensável na banca); só remove o medo de que o piloto seja inviável.

## Os 6 critérios

| # | Critério | Resultado | Evidência |
|---|---|---|---|
| 1 | Versões 7.10.1 fixadas, adapter pg, client CJS | PASSA | `package.json`: `"@prisma/adapter-pg": "7.10.1"`, `"@prisma/client": "7.10.1"`, devDependency `"prisma": "7.10.1"` (instalado com `npm i -E`; `npm ls`: um único `pg@8.23.1`, `typescript@7.0.2`; `grep -c "8.0.0-rc" package-lock.json` = 0). `prisma generate`: `Generated Prisma Client (7.10.1) to ./src/generated/prisma`; gerador `prisma-client` com `moduleFormat = "cjs"`; `dist/generated/prisma/client.js` abre com `"use strict"` + `__createBinding` (CJS) e carrega com `require`. |
| 2 | `npx tsc --noEmit` limpo com TS 7 | PASSA | `tsc --version` = 7.0.2, saída vazia, exit 0, 0,6 s. Controle negativo: um arquivo com 3 erros de tipo de propósito (campo não selecionado, tipo errado, `where` inexistente) falhou com TS2322, TS2339 e TS2353, então a inferência do client (`select`, `where`) funciona no TS 7. Ressalva: todos os arquivos gerados têm `// @ts-nocheck`, então o `tsc` não audita o interior do código gerado, só o que ele exporta. |
| 3 | `npm run build` e `node dist/index.js` sobem e respondem | PASSA | `npm run build` exit 0; `PORT=3996 node --env-file=.env.test dist/index.js` imprime `Servidor rodando na porta 3996`; `curl /psicologo/pacientes/1/anotacoes` responde `{"error":"Sessão ausente ou expirada."} [401]`; `POST /auth/psicologo/login` responde `{"error":"E-mail ou senha inválidos."} [400]`. Consulta do Prisma em node puro, sem tsx, contra o `dist` compilado (`node --env-file=.env.test -e` com `require('./dist/prisma')`): `count sem contexto: 0`, e dentro de `comContextoPsicologoPrisma(1, ...)`: `[{"u":"psychelink_app","ctx":"1"}]`; o processo sai sozinho depois do `pool.end()`, exit 0, 0,56 s. Também repetido num clone limpo (`git clone` da branch, `env -u DATABASE_URL npm ci`, `tsc --noEmit`, `npm run build`, boot): tudo ok. |
| 4 | Suíte verde sem editar teste e processo termina sozinho | PASSA | Baseline antes do Prisma: `tests 234 / pass 234`, 6,57 s de parede. Com o Prisma, 3 rodadas (a última em `b77ea6a`, o commit final): 6,9 s, 6,4 s e 7,7 s de parede, todas `tests 234, pass 234, fail 0, cancelled 0`, exit 0, sem `--test-force-exit` (a de 7,7 s é ruído: o banco é compartilhado com outro agente; baseline 6,6 s). `git diff --stat -- test/` vazio. O Prisma está de fato no caminho: com `DEBUG='prisma:driver-adapter:*'` o teste "anotações continuam: cria, lista e audita" mostra `BEGIN`, `SELECT set_config('app.psicologo_id', $1...)`, `INSERT INTO "public"."anotacao_clinica"` ou `SELECT ... FROM "public"."anotacao_clinica"` e `COMMIT`. Nenhum pool do Prisma sobra porque o adapter recebe o próprio `pool` de `src/db.ts` (`new PrismaPg(pool)`; o `d.ts` do adapter aceita `pg.Pool`), e o `pool.end()` do `limpar()` o fecha. O adapter não encerra pool externo (`disposeExternalPool` padrão false). |
| 5 | Sem `set_config` o Prisma lê 0 anotações | PASSA | `spike/rls-prisma.ts` (fora do glob dos testes). Saída: `linhas reais (visão do dono): 1` (controle positivo); `papel do Prisma: psychelink_app`; `sem set_config, fora de transação: 0`; `sem set_config, em $transaction: 0`; `com set_config da dona: 1`; `com set_config de outra psicóloga lendo as da dona: 0`; 5 transações seguintes sem contexto: 0 (o contexto não vaza pelo pool); `INSERT em nome de outra`: negado, `42501 new row violates row-level security policy for table "anotacao_clinica"`. |
| 6 | Tempo de transação (maxWait/timeout) | PASSA, com parte pendente | Ver abaixo. |

### Critério 6 em detalhe

Padrões do Prisma 7.10.1: `maxWait` 2000 ms, `timeout` 5000 ms. O tipo gerado `PrismaClientOptions` confirma o `transactionOptions` global no construtor (a página de transações da doc só mostra a opção por chamada), com esses mesmos padrões nos comentários. A doc diz que o `maxWait` é o tempo para obter a transação; no código do adapter, `startTransaction` faz `pool.connect()` e `BEGIN`, ou seja, abrir a conexão (TCP, TLS, SCRAM, acordar o Neon) conta contra o `maxWait`. Hoje `pool.connect()` do pg espera sem limite, então o Prisma introduz um limite que o código atual não tem.

Teste local, `spike/tempo-transacao.ts`: um proxy TCP local atrasa a abertura de cada conexão ao Postgres de teste, e o Prisma usa um Pool apontado para ele.

```
padrão  (2000/5000), conexão em 0 ms           305 ms  OK
padrão  (2000/5000), conexão em 1500 ms       1537 ms  OK
padrão  (2000/5000), conexão em 2500 ms       2012 ms  ERRO P2028 Unable to start a transaction in the given time.
ajustado(15000/10000), conexão em 2500 ms     2530 ms  OK
ajustado(15000/10000), conexão em 6000 ms     6047 ms  OK
padrão  (2000/5000), pg_sleep 6 s             6077 ms  ERRO P2028 (timeout da transação)
ajustado(15000/10000), pg_sleep 6 s           6067 ms  OK
conexões ociosas derrubadas pelo proxy -> 2ª transação: OK
```

- O padrão derruba a rota (viraria 500 no `rota()`) quando a conexão leva mais de 2 s. Com o Neon acordando isso é plausível.
- A conexão que demorou e perdeu a corrida não vaza: depois do erro o pool mostra `total=1 ocioso=1 esperando=0`.
- O `timeout` não cancela a consulta em andamento: o `pg_sleep(6)` terminou aos 6077 ms e só então a transação falhou e a conexão voltou ao pool (também sem vazamento).
- Valores propostos, já aplicados em `src/prisma.ts` via `transactionOptions` global: `maxWait: 15_000` (acompanha o `connectionTimeoutMillis: 15_000` do exemplo do guia do Neon para Prisma; cobre handshake + acordar o compute) e `timeout: 10_000` (as anotações fazem 3 consultas; folga para latência do Neon sem segurar conexão por muito tempo). O dashboard, se um dia entrar, tem 8 consultas e provavelmente pede um `timeout` por chamada maior.
- Pendente: o "6 minutos ocioso" do Neon (autosuspend de 5 min) não é testável localmente. O que foi simulado: o proxy derrubou as conexões ociosas (como o servidor fecharia) e a transação seguinte abriu conexão nova sem erro, porque o pool do pg descarta o cliente que emitiu `error`, e o `pool.on('error')` de `db.ts` continua valendo, já que o Prisma usa o mesmo Pool (com `keepAlive` e `idleTimeoutMillis: 4 min`). Não simula conexão half-open (NAT que descarta sem RST) nem o tempo real de acordar o compute.

## O que precisou mudar fora das anotações

- `apps/server/package.json` e lockfile: 3 dependências exatas (`prisma` em devDependencies) e `"postinstall": "prisma generate"`. O lockfile passou de 170 para 307 entradas e `node_modules/@prisma` + `prisma` somam cerca de 200 MB; `npm ci` leva uns 8 s.
- `apps/server/prisma.config.ts` (8 linhas): `schema` e `datasource.url` lendo `process.env.DATABASE_URL`. Detalhe que custou uma iteração: o `env('DATABASE_URL')` do `prisma/config` lança `PrismaConfigEnvError` quando a variável não existe, o que quebraria `prisma generate` no CI e em build; com `process.env.DATABASE_URL` direto o `generate` roda sem variável nenhuma. O Prisma 7 não carrega `.env`: os comandos rodam com `node --env-file=.env.test node_modules/prisma/build/index.js db pull`.
- `apps/server/prisma/schema.prisma` (322 linhas, saída do `db pull`, 19 modelos): o `db pull` adicionou sozinho `previewFeatures = ["partialIndexes"]` (índices únicos parciais ainda são preview no 7.10.1) e só avisa, sem falhar, sobre RLS, CHECK e EXCLUDE não suportados. `schema_migrations` foi ignorada (o papel não lê as colunas: `REVOKE ALL`). Nenhum Prisma Migrate. O `generator` tem `output = "../src/generated/prisma"` e `moduleFormat = "cjs"`; não foi preciso `importFileExtension` (o tsc emite `.js` normalmente, esse ajuste é para tsx).
- `src/prisma.ts` (novo): `new PrismaClient({ adapter: new PrismaPg(pool), transactionOptions })`. Reaproveita o Pool do pg (papel `psychelink_app`, `keepAlive`, handler de erro), então não existe um segundo pool nem a possibilidade de o Prisma ligar como dono.
- `src/lib/contextoseguro.ts`: `comContextoPsicologoPrisma(id, fn)`, irmão do `comContextoPsicologo`: `prisma.$transaction(tx => { $queryRaw set_config(..., true); return fn(tx) })`. Mesma transação interativa, mesma conexão.
- `src/routes/psicologo/pacientes.ts`: só as duas rotas de anotações (GET e POST). `vinculoOuNegar` continua como está (assinatura de `PoolClient`); no piloto o vínculo é verificado por um helper local com `tx.vinculo.findFirst` (as anotações só precisam saber se há vínculo ativo e do `paciente_id`; o JOIN com `users` e `consentimento` do original não influencia o resultado).
- `.gitignore`: `apps/server/src/generated/` (o client gerado não vai para o git).
- Nenhum arquivo de teste mudou.

Equivalência do JSON (`spike/equivalencia.ts`, as rotas reais por HTTP contra a consulta pg original, palavra por palavra): mesma lista, mesma ordem, `criadoEm` idêntico em bordas (`23:59:59.999999` vira `23:59`, virada de dia), expirada fica de fora, sem expiração entra, linha que não decifra é filtrada igual; POST devolve `criadoEm` igual ao `to_char` do banco e `expira_em` a 5 anos (diferença de 0,02 s); 404 genérico e isolamento entre psicólogos iguais. A suíte existente não cobre formato de `criadoEm`, ordem nem expiração, por isso essa prova extra era necessária.

Para o `criadoEm`: o Prisma lê `timestamp` sem fuso como UTC, então `toISOString().slice(0, 16)` reproduz o `to_char` do banco. Testado só com o banco em `Etc/UTC`; que isso valha em outro fuso de sessão é inferência.

## Esforço para 2 ou 3 módulos de CRUD (estimativa, não medição)

O piloto inteiro (instalação, `db pull`, tooling, 2 rotas, 4 scripts de prova) coube em cerca de 1h30 de trabalho do agente; o custo humano real vem de revisão, entender o padrão e a banca. Para `psicologo/conta.ts` (114 linhas, 5 consultas), `paciente/consentimento.ts` (142 linhas, 5 consultas) e mais um módulo de tamanho parecido:
- Custo único restante, 3 a 4 h: CI e deploy (o `postinstall` roda no `npm ci`, mas quebra com `npm ci --omit=dev`, ver riscos), ignorar major do `prisma` no dependabot, documentar o padrão.
- Por módulo, 2 a 4 h: reescrever as consultas simples, converter helpers compartilhados que hoje recebem `PoolClient` (`vinculoOuNegar`, `consentimentosDe`) ou duplicá-los para `tx`, trocar o tratamento de erro (próximo ponto), conferir JSON idêntico, e testar `numeric`/`bigint`/timestamps quando o módulo os tiver.
- Total: de 10 a 16 h para 2 ou 3 módulos. Dashboard, linha do tempo, relatórios e cursor por tupla continuam em SQL bruto de qualquer jeito.
- Erros: o 23505 que o código testa hoje com `instanceof DatabaseError` chega como `PrismaClientKnownRequestError` `P2002` (modelo) ou `P2010` (`$executeRaw`), com o código original em `meta.driverAdapterError.cause.originalCode` ("23505") e o nome da constraint em `...cause.constraint.index`; violação de RLS chega como `P2039` com `originalCode` "42501" (`spike/erros.ts`). Os 5 pontos que hoje checam 23505/23P01 precisam de uma função única que leia isso.

## Riscos que apareceram

1. A dist-tag `latest` do pacote `prisma` aponta para `8.0.0-rc.33`. O `-E` e os três pacotes na mesma versão evitam, mas o dependabot (major em PR próprio) vai abrir PR de 8.x; vale um `ignore` de major para `prisma` e `@prisma/*`.
2. `now()` passa a ser do cliente: o Prisma gera `@default(now())` no processo Node (o INSERT leva `criado_em` como parâmetro) e os filtros usam `new Date()`. As colunas são `timestamp` sem fuso e antes dependiam do `CURRENT_TIMESTAMP` do banco. No Neon e no banco de teste (`timezone = Etc/UTC`) dá igual; se o fuso da sessão do banco mudar, `criado_em` e `expira_em` passam a divergir em horas. Também `expira_em` agora é `setUTCFullYear(+5)` em JS (29/02 vira 01/03; o `interval '5 years'` do Postgres dá 28/02). Cosmético, mas diferente.
3. Arquivos gerados com `// @ts-nocheck`: o TS 7 compila e a inferência funciona, mas não há checagem de tipos dentro do código gerado; "o Prisma é compatível com TS 7" aqui significa "funciona nos usos testados", não validação oficial.
4. O client gerado não está no git: tudo depende do `postinstall`/`prisma generate`. Com `npm ci --omit=dev` (comum em deploy) o `prisma` (devDependency) não existe e o `postinstall` falha; ou o build roda `prisma generate` com dev deps, ou `prisma` vai para `dependencies`. Caso concreto, lido (não executado) no `apps/server/Dockerfile` ainda não commitado do checkout principal (`feat/deploy-demo`): ele faz `COPY package.json package-lock.json` + `npm ci` antes do `COPY . .`, então o `postinstall` (`prisma generate`) rodaria sem `prisma/schema.prisma` nem `prisma.config.ts` na imagem e falharia. Saída: trocar por `"build": "prisma generate && tsc"` (e tirar o `postinstall`, mantendo o `npm ci` do CI com um passo de generate) ou copiar `prisma/` e `prisma.config.ts` antes do `npm ci`. Em qualquer deploy, `npm ci --omit=dev` também quebraria o `postinstall`.
5. Esquema duplicado em dois lugares: `schema.prisma` precisa de novo `db pull` a cada migration SQL, senão o client fica defasado (sem aviso). RLS, CHECK, EXCLUDE, triggers e policies continuam só no SQL.
6. Fail-closed no RLS, mas só nas tabelas com RLS: `prisma.anotacao_clinica.findMany()` fora do helper devolve 0 linhas (provado). Em tabelas sem RLS (`users`, `vinculo`, ...) o `prisma` funciona sem contexto, igual ao pool hoje. Nada impede alguém de importar `prisma` direto: a disciplina de só usar via `comContexto...Prisma` é convenção, igual hoje com `pool`.
7. Timeout de transação: com o padrão, conexão lenta vira 500 (provado). Já ajustado; falta testar contra o Neon real.
8. Dois paradigmas de acesso a dados (pg + Prisma) para explicar na banca, e helpers duplicados (`vinculoOuNegar` para `PoolClient` e para `tx`) enquanto a migração for parcial.
9. Peso: lockfile de 170 para 307 entradas, `node_modules` +200 MB (CLI e engines de WASM).

## Reprodução

```
cd apps/server
npm ci                                        # roda prisma generate (postinstall)
npx tsc --noEmit && npm run build
npm test                                      # 234/234
npx tsx --env-file=.env.test spike/rls-prisma.ts          # critério 5
npx tsx --env-file=.env.test spike/tempo-transacao.ts     # critério 6 (cerca de 1 min)
npx tsx --env-file=.env.test spike/equivalencia.ts        # JSON igual ao pg
npx tsx --env-file=.env.test spike/erros.ts               # forma dos erros
```

Commits em `spike/prisma`: `74a0822` (piloto), `49f3ecd` (provas dos critérios 5 e 6, `transactionOptions`), `b77ea6a` (forma dos erros).
