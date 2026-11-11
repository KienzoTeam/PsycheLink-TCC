# Pesquisa: Prisma

> Levantamento em modo leitura, 10 e 11/11/2026. Agente `pesquisa_prisma`, Opus 5.5 (effort high). Nada foi executado além de leitura de código, `npm view/audit/outdated` e documentação pública; "verificado" quer dizer lido no código, não testado. Linhas citadas são do commit `0864143`.

## Resumo

Migrar o servidor de pg para Prisma em novembro de 2026 é possível, mas o custo-benefício é ruim para este projeto. O Prisma está no meio de uma transição: a versão estável é a 7.10.1 (15/10/2026), e o `npm i prisma` instala hoje a 8.0.0-rc.33, cuja CLI não lê schema.prisma. As garantias de segurança do projeto ficam no Postgres: papel sem BYPASSRLS, policies, funções app_*_id, 3 triggers (um deles SECURITY DEFINER), EXCLUDE gist, CHECKs e índice parcial. Nada disso cabe no schema.prisma. As consultas analíticas (UNION ALL, LATERAL, generate_series, AT TIME ZONE, FILTER, cursor por tupla) teriam de continuar em SQL bruto. Ganho real só no CRUD simples. Recomendação: não migrar. Manter pg e corrigir os slides que citam Prisma. Um piloto opcional, isolado e descartável, cabe só se sobrar tempo.

## Recomendação

NÃO MIGRAR. Manter pg + SQL parametrizado e corrigir os slides e o documento que listam "Prisma" no back-end (Slide PsycheLink.pdf, Psychelink.pdf p.14) para "PostgreSQL (Neon) + node-postgres (pg), SQL parametrizado, RLS e migrations SQL versionadas". A justificativa honesta: o que o projeto tem de mais forte (RLS com papel próprio, triggers, EXCLUDE, auditoria imutável) fica fora do alcance do Prisma, e as consultas que dão trabalho ficariam em SQL de qualquer jeito. Prisma 7 (versão final da linha 7, com a 8 em RC) e TypeScript 7 sem validação oficial são risco gratuito na reta final. Se o grupo quiser ORM "para constar", a única variante defensável é um piloto: Prisma 7.10.1 fixado, só como cliente (db pull + generate, sem Prisma Migrate), num módulo de CRUD (ex.: psicologo/conta.ts), em branch, com todos os testes passando e reversível em um commit. Na banca, isso é inferior a explicar bem por que o projeto usa SQL. Entre as alternativas, Kysely é a menos invasiva se um dia quiserem tipagem; Drizzle está em transição para 1.0 (rc.5).

## Relatório

## Migrar o servidor de pg para Prisma: viabilidade em novembro de 2026

Legenda: **[V]** = verifiquei (li ou consultei a fonte); **[S]** = suspeita ou inferência, não confirmada.

### 0. Ponto de partida no código
- `src/db.ts:7-13`: um `Pool` do pg com idle de 4 min e keepAlive, ajustado ao autosuspend do Neon. [V]
- `src/lib/contextoseguro.ts:5-34`: `emTransacao` faz BEGIN/COMMIT/ROLLBACK num `PoolClient`. `comContexto*` roda `set_config($1,$2,true)` e entrega o mesmo client para várias queries. [V]
- `migrations/0003`: cria o papel `psychelink_app` NOBYPASSRLS, as funções `app_paciente_id()`/`app_psicologo_id()`, 10 policies, FORCE RLS, e `REVOKE ALL ON schema_migrations` (linha 18). `ALTER DEFAULT PRIVILEGES` (linha 22) dá DML ao papel da app em qualquer tabela nova. [V]
- Outras migrations: `0006:24` tem `EXCLUDE USING gist (... tstzrange ...) WHERE (status='agendada')`; `0004:29` tem índice único parcial; há 3 triggers (`0002:69`, `0005:174`, `0006:73`), sendo 2 com `SECURITY DEFINER`, mais CHECKs, `inet`, `jsonb` e `IDENTITY`. [V]
- `scripts/migrar.ts` aplica arquivos .sql em ordem, cada um numa transação, registrando em `schema_migrations`. Usa `DATABASE_URL_DIRETA`, que conecta como dono. [V]
- Contagem pela regex `.query(`: **120 chamadas em 24 arquivos de src** e **150 em 16 arquivos de test**. O número de 68 chamadas em 15 arquivos citado na missão provavelmente usou outro critério (ex.: sem contar `client.query`). [V]
- O código depende dos códigos de erro do pg: `23505` em 4 lugares, incluindo `err.constraint === 'uk_paciente_data'` (`checkin.ts:202`), e `23P01` em `psicologo/consultas.ts:76`. [V]
- `tsconfig.json` usa `"module": "commonjs"`. `test/ajuda.ts:48-49` recarrega a app via `require.cache`. [V]
- Prisma aparece só nos slides (`Slide PsycheLink.pdf`, `Psychelink.pdf` p.14); não há menção no repositório. [V]

### 1. Prisma em novembro de 2026
- **Estável: 7.10.1** (`@prisma/client`, publicada em 15/10/2026). **8.0.0 é RC**: rc.33 em 06/11/2026. [V, npm view em 10/11/2026]
- **Armadilha:** a dist-tag `latest` do pacote `prisma` (a CLI) aponta para `8.0.0-rc.33`, enquanto a do `@prisma/client` aponta para 7.10.1. Um `npm i -D prisma` instala a CLI 8, e ela "does not read schema.prisma" (página de release status). É preciso fixar `prisma@7.10.1`. [V]
- **Arquitetura do 7:** cliente sem engine Rust (`prisma-client`, com `output` obrigatório). **Driver adapter obrigatório** (`@prisma/adapter-pg`, que depende de `pg ^8.16.3`, ou `@prisma/adapter-neon`). **`prisma.config.ts` obrigatório**, com url, migrations e seed; `.env` deixa de ser carregado sozinho. O 7 é "ES module"; o gerador aceita `moduleFormat = "cjs"`, e com tsx o guia manda usar `importFileExtension = "ts"`. [V, guia de upgrade v7 e página de generators]
- **Node 26:** o campo engines do `@prisma/client` 7.10.1 é `^20.19 || ^22.12 || >=24.0`, então ok. [V]
- **TypeScript 7:** a exigência oficial é TS ≥5.4 (5.9 recomendado). Não achei nenhuma fonte que teste o cliente gerado com o TS 7 (tsgo). O 7.9.0 corrigiu uma regressão de desempenho de tipos. Risco real e não medido. [S]
- **Neon e pooler:** o guia do Neon (atualizado em 05/10/2026) manda usar a URL `-pooler` no runtime e a direta no `prisma.config.ts` para a CLI. `connection_limit` e `pool_timeout` não valem no 7: o pool se configura no adapter (exemplo do guia: `connectionTimeoutMillis: 15_000`). Isso mapeia direto para `DATABASE_URL` (app) e `DATABASE_URL_DIRETA` (dono). [V]
- **Cold start:** o Prisma divulga bundle 90% menor e queries 3x mais rápidas, mas sem números de cold start. No Neon, a latência dominante continua sendo acordar o compute, igual com pg. [V a afirmação; S o efeito aqui]
- **Suporte:** a linha 7 recebe correções por 18 meses após o GA do 8 (release status). O blog do líder do 8 fala em 12 meses. As fontes divergem. [V]

### 2. RLS com Prisma
- **Exemplo oficial** (`prisma-client-extensions/row-level-security`): uma extensão `$allOperations` embrulha cada query num `$transaction([set_config(...), query])` em lote. O próprio README avisa: "not intended to be used in production" e "explicitly running transactions … may not work". [V]
- **Padrão que serve aqui:** uma transação interativa por bloco, equivalente a `comContexto`. Dentro de `prisma.$transaction(async tx => { await tx.$executeRaw\`SELECT set_config('app.paciente_id', ${String(id)}, true)\`; return fn(tx) })` a assinatura troca `PoolClient` por `tx`, e o resto da lógica fica igual. Funciona com o pooler em modo transaction pelo mesmo motivo de hoje (`set_config` local). [V o padrão; S nos detalhes de tipagem]
- **Limitações:**
  1. O timeout padrão da transação interativa é **5000 ms** e o `maxWait` é **2000 ms**. O dashboard roda 8 queries numa transação (`dashboard.ts:64-177`); com o Neon acordando, isso pode estourar e precisa de configuração explícita. [V os números]
  2. `_prisma_migrations` nasceria com DML liberado para `psychelink_app` por causa do `ALTER DEFAULT PRIVILEGES` (`0003:22`). Seria preciso repetir o REVOKE. [V a causa; S o efeito]
  3. `migrate dev` exige banco shadow; o papel da app é NOCREATEDB, então seria preciso apontar um branch Neon (`shadowDatabaseUrl`). [S]
  4. A extensão por query não compõe com transações explícitas. [V]

### 3. Adoção num banco existente
- **Fluxo v7:** `prisma db pull` gera `schema.prisma` do banco. Para o baseline: `migrate diff --from-empty --to-schema ... --script > prisma/migrations/0_init/migration.sql`, depois `migrate resolve --applied 0_init`. O guia permite editar o baseline para incluir o que o schema não expressa. [V]
- **O schema.prisma não representa:** policies, papéis/GRANT/REVOKE/DEFAULT PRIVILEGES, funções, triggers, `EXCLUDE`, a extensão `btree_gist` (talvez dê para declarar) e `COMMENT`. A documentação cita "stored procedures, triggers, views" como não suportados e manda customizar a migration com `--create-only`. Diz que índice parcial já é suportado via `where`, mas não ficou claro se isso vale para a 7.10 ou só para a 8. [V a doc; S a versão]
- Um `0_init` gerado pelo diff **perderia tudo isso**. O correto seria usar como baseline o SQL real (0001–0007 ou um `pg_dump --schema-only`). [S]
- **Opção mais simples:** não usar Prisma Migrate. Manter `scripts/migrar.ts` e usar o Prisma só como cliente (`db pull` + `generate`). Nesse caso, 7 migrations continuam como hoje. [S, recomendável se houver piloto]

### 4. Consultas analíticas
- Ficam em SQL: a série com `generate_series` + `AT TIME ZONE` (`dashboard.ts:82-93`), `UNION ALL` com LIMIT por ramo (`:105-126`), `avg ... FILTER` (`:132`), `LEFT JOIN LATERAL` + cursor por tupla `(u.nome, v.paciente_id) > ($4,$5)` (`pacientes.ts:73-93`) e a linha do tempo com 6 fontes em `UNION ALL` (`pacientes.ts:290-337`). Nada disso tem equivalente na API do Prisma. [V]
- **TypedSQL** (`$queryRawTyped`) ainda é preview no 7, exige banco ativo no `generate --sql` e não aceita SQL dinâmico. Os fragmentos interpolados (`${CHECKINS_COM_HUMOR}`, `${vinculoAtivoDe('a')}`, `${CHECKIN_EM}`) teriam de ser duplicados em arquivos .sql. Os filtros opcionais `$2::text IS NULL OR ...` precisam de anotação de nulabilidade. [V os limites; S o atrito]
- Com `$queryRaw` não há ganho de tipagem sobre o `client.query<T>` atual. Viram API do Prisma só os `INSERT/UPDATE/SELECT` simples de auth, conta, consentimento, vínculo e anotações.
- **Custo extra:** reescrever o tratamento de erro (`23505`/`23P01` passam a chegar como `P2002` ou erro do adapter) e decidir como tratar `count`/`numeric` (BigInt/Decimal no raw). [S]

### 5. Testes
- 16 arquivos de teste usam SQL direto (o `ajuda.ts` é o central). Os testes de RLS (`rls.test.ts`, `defesa-sem-rls.test.ts`) **devem continuar em SQL bruto**: eles provam a política no banco, independente do ORM. Fixtures via `dono` também podem continuar em pg.
- Na prática, migrar o cliente da app não obriga a migrar os testes. Mas `carregarApp` (`require.cache`) quebra se o servidor passar para ESM, e é preciso garantir o `$disconnect` em `limpar()`. [V o código; S o efeito]

### 6. Alternativas
- **Kysely 0.29.8** (01/11/2026; engines Node ≥22): query builder tipado sobre SQL, funciona sobre o mesmo `pg.Pool`, transação e `sql\`select set_config(...)\`` triviais, não mexe nas migrations e dá para adotar arquivo a arquivo. Tipos via `kysely-codegen` (0.20.0, sem release desde 02/2026). É a menor fricção para tipagem. [V versões; S encaixe]
- **Drizzle:** estável 0.45.4 e 1.0.0-rc.5 (21/10/2026). Tem `pgPolicy`/`pgRole`/`withRLS` e helper do Neon, mas o drizzle-kit gerenciando policies e papéis disputaria as migrations SQL existentes, e a linha está em transição para 1.0. [V]
- **Manter pg e corrigir os slides:** custo próximo de zero, sem regressão e mais fácil de defender. Os slides citam "Prisma" (e também "MongoDB" e "TailwindCSS"); o código não usa Prisma. [V]

### 7. Estratégia incremental, se insistirem
1. Branch próprio; fixar `prisma@7.10.1`, `@prisma/client@7.10.1` e `@prisma/adapter-pg@7.10.1`; gerador `prisma-client` com `moduleFormat="cjs"` e `importFileExtension="ts"`; `prisma.config.ts` com `url = DATABASE_URL_DIRETA`.
2. Rodar `db pull`, **sem** Prisma Migrate; o `migrar.ts` continua dono do esquema.
3. Criar `comContextoPrisma`, com timeout configurado, ao lado de `comContexto`; pg e Prisma convivem.
4. Ordem dos módulos: `psicologo/conta.ts`, depois `paciente/consentimento.ts`, depois anotações. Dashboard, linha do tempo e relatórios nunca entram.
5. Critério de pronto por módulo: `tsc` (TS 7) limpo, `npm test` 100%, `rls.test.ts` intacto, mesmo JSON de resposta.
6. Reversão: um commit por módulo.

**Esforço [S, estimativa]:**
- Piloto: 15–25 h.
- Híbrido real (CRUD inteiro): 50–80 h.
- "Tudo": não é possível, porque metade do SQL continuaria raw. 100+ h sem ganho funcional.

**Riscos [S]:**
- TS 7 sem validação.
- A tag `latest` puxando a CLI 8.
- Timeouts em transações no Neon.
- Regressão silenciosa de RLS por GRANT em `_prisma_migrations`.
- Dois paradigmas de acesso a dados para uma equipe iniciante explicar na banca.

### 8. Recomendação
**Não migrar.** Manter pg e corrigir os slides e o documento. O ganho (tipagem em CRUD simples) não paga o risco nem o tempo na reta final, e o que diferencia o projeto (RLS, auditoria imutável, EXCLUDE, triggers) fica todo fora do Prisma de qualquer forma. Se quiserem tipagem depois do TCC, Kysely é o caminho menos invasivo.

## Riscos

- `npm i -D prisma` sem versão fixa instala a CLI 8.0.0-rc.33, que não lê schema.prisma e é incompatível com o cliente 7.10.1.
- TypeScript 7 + cliente gerado do Prisma sem validação oficial: pode quebrar o `tsc` ou a tipagem perto da entrega.
- Timeout padrão de 5 s / maxWait de 2 s da transação interativa no dashboard (8 queries) com o Neon acordando do autosuspend.
- `ALTER DEFAULT PRIVILEGES` (0003:22) concede DML a psychelink_app em `_prisma_migrations` se o Prisma Migrate for usado: precisa de REVOKE manual.
- Um baseline gerado por `migrate diff --from-empty` perderia policies, funções, triggers, EXCLUDE e CHECKs: risco de RLS sumir num banco recriado.
- O exemplo oficial de extensão RLS é marcado como não destinado a produção e não compõe com transações explícitas.
- Migrar o servidor para ESM quebraria `carregarApp` (require.cache em test/ajuda.ts:48-49).
- Reescrita do tratamento de erros pg (23505 com nome de constraint, 23P01) em 5 pontos.
- Dois paradigmas de acesso a dados (Prisma + SQL bruto) para equipe iniciante manter e explicar na banca.
- A linha 7 já é a anterior à 8: adotar agora significa outra migração em 12 a 18 meses.

## Incertezas

- Compatibilidade do cliente gerado pelo Prisma 7 com TypeScript 7 (tsgo): nenhuma fonte oficial encontrada; Prisma só declara TS >=5.4 (recomendado 5.9).
- Se o suporte a índice parcial via `where` no schema existe na 7.10 estável ou só na linha 8: a página consultada não deixa claro.
- Prazo de suporte da linha 7 após o GA do 8: release status diz 18 meses, blog diz 12 meses; data do GA do 8 não confirmada (previsto para outubro de 2026, ainda RC em 06/11/2026).
- A dist-tag latest da CLI `prisma` apontar para 8.0.0-rc.33 pode ser temporária ou acidental; observado em 2026-11-10.
- Formato dos erros de violação (23505/23P01) via @prisma/adapter-pg (P2002 com meta.target ou erro do adapter) não verificado.
- Comportamento de drift do `migrate dev` diante de policies, triggers e EXCLUDE existentes e necessidade do shadow database no Neon não verificados na prática.
- Se `transactionOptions` global no construtor do PrismaClient está disponível na 7.10: lembrado de memória, a página de transações consultada não menciona.
- Contagem de chamadas: 120 em 24 arquivos (src) e 150 em 16 arquivos (test) pela regex `.query(`; difere dos 68/15 e 133 da missão por critério de contagem.
- Estimativas de esforço (15-25 h piloto, 50-80 h híbrido) são julgamento, não medição.
- Nenhum comando foi executado contra o banco nem teste rodado (modo somente leitura).

## Fontes

- apps/server/src/db.ts
- apps/server/src/lib/contextoseguro.ts
- apps/server/docs/rls.md
- apps/server/migrations/0003_papel_app_rls.sql
- apps/server/migrations/0004_vinculo.sql (linha 29)
- apps/server/migrations/0006_consultas.sql (linha 24)
- apps/server/scripts/migrar.ts
- apps/server/test/ajuda.ts
- apps/server/test/comoDono.ts
- apps/server/src/routes/psicologo/dashboard.ts
- apps/server/src/routes/psicologo/pacientes.ts
- apps/server/src/routes/checkin.ts
- apps/server/tsconfig.json
- TCC_PsycheLink/Slide PsycheLink.pdf (pdftotext, menção a Prisma)
- TCC_PsycheLink/Psychelink.pdf (p.14, menção a Prisma)
- npm registry via npm view, consultado 2026-11-10: prisma (latest=8.0.0-rc.33, 2026-11-06), @prisma/client 7.10.1 (2026-10-15), @prisma/adapter-pg 7.10.1, @prisma/adapter-neon 7.10.1, drizzle-orm 0.45.4 / 1.0.0-rc.5 (2026-10-21), kysely 0.29.8 (2026-11-01), kysely-codegen 0.20.0, typescript 7.0.2
- https://github.com/prisma/prisma/releases (consultado 2026-11-10)
- https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7 (consultado 2026-11-10)
- https://www.prisma.io/docs/orm/prisma-schema/overview/generators (consultado 2026-11-10)
- https://www.prisma.io/docs/orm/release-status (consultado 2026-11-10)
- https://www.prisma.io/blog/is-prisma-8-ready-for-long-lived-production-apps (sem data no post; consultado 2026-11-10)
- https://www.prisma.io/blog/announcing-prisma-orm-7-0-0 (consultado 2026-11-10)
- https://www.prisma.io/docs/orm/prisma-migrate/workflows/unsupported-database-features (consultado 2026-11-10)
- https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/baselining (consultado 2026-11-10)
- https://www.prisma.io/docs/orm/v7/prisma-client/using-raw-sql/typedsql (consultado 2026-11-10)
- https://www.prisma.io/docs/orm/v7/prisma-client/queries/transactions (consultado 2026-11-10)
- https://github.com/prisma/prisma-client-extensions/tree/main/row-level-security (script.ts e README, consultado 2026-11-10)
- https://neon.com/docs/guides/prisma (atualizado 2026-10-05; consultado 2026-11-10)
- https://orm.drizzle.team/docs/rls (consultado 2026-11-10)
