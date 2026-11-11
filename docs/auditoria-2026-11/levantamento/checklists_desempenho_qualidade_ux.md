# Checklists: desempenho, complexidade, testes e UI/UX

> Levantamento em modo leitura, 10 e 11/11/2026. Agente `checklists_desempenho_qualidade_ux`, Opus 5.5 (effort high). Nada foi executado além de leitura de código, `npm view/audit/outdated` e documentação pública; "verificado" quer dizer lido no código, não testado. Linhas citadas são do commit `0864143`.

## Resumo

Fiz checklists de revisão para os blocos A a G (servidor, concorrência, web, mobile, manutenção, testes, UI/UX/a11y) adaptados à stack. Cada bloco marca com ★ os 5 itens de maior impacto para a demo ao vivo. Os itens trazem evidência do repositório: li db.ts, app.ts, index.ts, rota.ts, contextoseguro.ts, checkin.ts, dashboard.ts, paciente.ts, auth.ts e auth-psicologo.ts (cadastro), as migrations (via grep), test/ajuda.ts, cadastro-concorrente.test.ts e o dist/ do web. Confirmei na fonte os limites vigentes: CWV (LCP≤2,5s, INP≤200ms, CLS≤0,1 no p75), WCAG 2.2 (Rec. de 12/12/2024, sem o 4.1.1), pooler do Neon (PgBouncer em modo transação, 10.000 clientes, query_wait_timeout de 120s), scale-to-zero de 5 min fixo no Free, Expo 58 com RN 0.88, Node 26 (Current desde 05/05/2026, LTS em out/2026) e React Compiler 1.0, que no plugin-react v6 exige @rolldown/plugin-babel.

## Recomendação

Antes da demo, priorizar 5 pontos. (1) Fuso do check-in: a coluna data usa CURRENT_DATE em UTC, e um registro depois das 21h em Brasília cai no dia seguinte. (2) /registro-psicologo segura transação, lock e conexão durante o bcrypt e o envio SMTP. (3) Aquecer o Neon e o host antes de apresentar e ter seed sem dados reais. (4) Guard com useRef contra toque duplo no check-in do mobile. (5) Teste de fumaça E2E do fluxo da demo: Playwright no web, Maestro no mobile. Tailwind, NativeWind e Prisma não devem entrar antes da demo.

## Relatório

# Checklists de revisão: PsycheLink (stack de nov/2026)

Legenda: **[V]** = li no código, **[S]** = suspeita (precisa EXPLAIN, medição ou leitura extra), **★** = 5 itens de maior impacto do bloco para a demo ao vivo.

## A. Servidor (Node + Express 5 + pg + Neon)
- ★ **Pool e pooler** (pool = conexões reaproveitadas; pooler = PgBouncer do Neon, em modo transação). Procurar: se DATABASE_URL é `-pooler`, `max` do Pool (o padrão do pg é 10), `connectionTimeoutMillis` (ausente, então a espera não tem limite). [V] `src/db.ts:7-13` só define idle e keepAlive. Pooler: `query_wait_timeout=120s`.
- ★ **Conexão presa durante E/S lenta** (esgota o pool, o que é backpressure). [V] `routes/auth-psicologo.ts:306-395`: BEGIN, advisory lock e `FOR UPDATE`, depois `bcrypt.hash` e `enviarCodigo` (SMTP) antes do COMMIT. O `/auth/registro` (`auth.ts:155-197`) já faz certo: hash fora da transação e SMTP depois do COMMIT. Corrigir o psicólogo do mesmo jeito.
- ★ **Cold start / scale-to-zero** (o banco dorme após 5 min no Free; o host gratuito também dorme). Procurar uma rota de aquecimento antes da demo. Hoje não há rota `/saude` [V] (app.ts). `idleTimeoutMillis` de 4 min já está abaixo do autosuspend [V] `db.ts:6`.
- **Threadpool da libuv** (4 threads por padrão para bcrypt, crypto assíncrono, DNS e fs). Procurar bcrypt custo 10 em rajada: login, registro e troca de senha [V] `auth.ts:155,398`. O lookup de MX (`validarEmail.ts:31`) disputa as mesmas threads. Medir p95 do login com 20 logins simultâneos.
- **Event loop** (thread única; trabalho síncrono pesado trava todas as requisições). Procurar AES síncrono em laço (`descriptografar` em `checkin.ts:240-255`, que é pequeno, LIMIT 30) e JSON grande. Medir com `perf_hooks.monitorEventLoopDelay`.
- **Concorrência ≠ paralelismo** (Node intercala esperas, não roda JS em paralelo). Procurar awaits em série independentes. [V] `dashboard.ts:64-166` faz 8 queries em série num client; é obrigatório (mesma transação de RLS), mas cada uma paga uma ida e volta ao Neon. Avaliar juntar em menos queries.
- ★ **Índices e EXPLAIN**. [V] Há índices duplicados: `idx_checkin_paciente_data` repete `uk_paciente_data` (`0001_baseline.sql:692,747`) e `idx_paciente_user` repete `paciente_user_id_key`. [S] Filtros não sargáveis (não usam o índice) `(c.inicio AT TIME ZONE 'America/Sao_Paulo')::date = …` em `dashboard.ts:145` e `relatorios.ts`. Rodar `EXPLAIN (ANALYZE, BUFFERS)`.
- **Paginação por cursor** (keyset: "depois desta linha" em vez de OFFSET). [V] `lib/cursor.ts` existe. Conferir que toda lista do psicólogo usa o cursor e ordena por chave única (`criado_em, id`).
- **Cache HTTP / compressão**. [V] `Cache-Control: no-store` nas rotas sensíveis (app.ts:25-28), o que está correto para dado de saúde. Não há `compression`; o servidor de estáticos do web deve servir gzip ou brotli.
- **Timeouts e cancelamento**. Procurar `statement_timeout` (ausente [V]), timeout do nodemailer e do axios. Mobile usa 15 s [V] `mobile/src/lib/api.ts:14`.
- **Retries com idempotência**. Retry só em leitura. O check-in é idempotente por UNIQUE e responde 409 [V] `checkin.ts:202`. O web repete só 5xx e erro de rede [V] `queryClient.ts:5`.
- **Rate limit em memória** (o contador vive no processo). Com 2 instâncias o limite dobra, e reiniciar zera. `trust proxy` vem de `TRUST_PROXY` [V] `app.ts:14`; se errado, o limite cai sobre o IP do proxy. Há duplicação: `checkin.ts:12` redefine `limite` sem a mensagem JSON de `lib/rota.ts:6`.
- **Escala horizontal**. Sessão web fica em tabela, sem estado em memória além do rate limit [V] `lib/sessaoWeb.ts`. Sticky session não é necessária.
- **Encerramento gracioso**. [V] `index.ts` não trata SIGTERM; faltam `server.close()` e `pool.end()`.
- **Vazamento de memória**. Procurar Map global sem limite e listeners. Medir `process.memoryUsage()` antes e depois de carga.
- **Observabilidade mínima**. Só há `console.error`. Adicionar log por requisição com rota, status e duração (sem PII) e um contador de 5xx.

## B. Corretude sob concorrência
- ★ **Fuso horário** (servidor × banco × dispositivo). [V] `checkin_diario.data DEFAULT CURRENT_DATE` (`0001:114`) com Neon em GMT (`lib/checkins.ts:5`): check-in depois das 21h BRT grava o dia seguinte, e o 409 bloqueia o check-in de "amanhã". `formatarDataISO` usa o fuso do processo (`checkin.ts:50-58`). `dashboard.ts:71,134` usa `CURRENT_DATE` (UTC), enquanto `:86-90,145` usam São Paulo. Padronizar em `(now() AT TIME ZONE 'America/Sao_Paulo')::date`.
- ★ **Ler-decidir-gravar** (dois pedidos leem "não existe" e os dois gravam). [V] `lib/paciente.ts:9-18` `obterOuCriarPacienteId`: o segundo pedido recebe 23505 em `paciente_user_id_key` e vira 500 em `checkin.ts:206`. Trocar por `INSERT … ON CONFLICT (user_id) DO UPDATE … RETURNING id`.
- **Constraints como fonte da verdade**. [V] UNIQUE `uk_paciente_data`, índice único parcial de vínculo ativo (`0004:29`) e `EXCLUDE USING gist` contra consulta sobreposta (`0006:24`). Conferir que cada 23505/23P01 vira 409 com mensagem.
- **Locks**. [V] `pg_advisory_xact_lock` é de transação e compatível com o pooler (o Neon não suporta advisory lock de sessão). `FOR UPDATE` aparece em consentimento e vínculo.
- **Isolamento**. O padrão é READ COMMITTED; conferir se alguma regra depende de contagem lida antes de gravar.
- ★ **Duplo envio**. [S] O mobile usa `if (enviando) return` com estado (`checkin.tsx:205,294`), e dois toques no mesmo frame passam. Usar `useRef`. No web, `isPending` do `useMutation` desabilita o botão.
- **Respostas fora de ordem no cliente**. [V] O mobile tem versão de sessão (`api.ts:18-21`). No web, a queryKey precisa incluir todos os filtros para resposta velha não sobrescrever a nova.

## C. Web (React 19 + Vite 8)
- ★ **CWV** (LCP = maior conteúdo visível; INP = atraso da resposta ao clique; CLS = pulo de layout). A meta "bom" é LCP≤2,5s, INP≤200ms e CLS≤0,1 no p75. Medir com Lighthouse e o painel Performance em CPU 4x.
- ★ **Bundle**. [V] O `dist` de 22/out traz `index` com 427 KB e `VisaoGeral` com 384 KB (não comprimidos, provável recharts). Rodar `vite build` e conferir o tamanho gzip. Avaliar lazy só do gráfico.
- **Divisão de código**. [V] Rotas com `lazy` (`App.tsx:8-18`); `Componentes` só em DEV.
- **TanStack Query**. Conferir `staleTime` por tipo de dado (catálogo usa Infinity [V]) e queries em cascata (waterfall) no Perfil do paciente.
- **React Compiler** (memoização automática). [V] Não está configurado. No plugin-react v6 a opção `babel` é ignorada sem erro; o caminho é `@rolldown/plugin-babel` + `reactCompilerPreset()`. Opcional para o TCC.
- **Listas longas**: auditoria e check-ins paginam por cursor; renderizar só a página atual.
- **Fonte variável**. [V] Roboto Flex `wdth.css` gera 6 woff2. Conferir `font-display: swap` e o `unicode-range`.
- **Cache de assets**: nomes com hash, logo `Cache-Control: immutable` no host; o `index.html` vai com `no-cache`.
- ★ **Skeleton com altura fixa** (evita CLS). [V] `Skeleton.tsx` existe; conferir as dimensões.
- ★ **Gráficos** (recharts): `ResponsiveContainer` com altura definida e sem recalcular dados a cada render.

## D. Mobile (Expo 58 + RN 0.88, nova arquitetura e Hermes)
- ★ **Thread JS × UI** (JS trava, a UI continua desde que a animação rode em worklet). Procurar `useSharedValue` lido no JS e `setState` dentro de `onEnd` de gesto (`checkin.tsx` gestoSwipe).
- ★ **Listas**. [V] Só `consultas.tsx` usa FlatList. Há 27 `.map` em screens e ScrollView em check-in e escalas. Ok para listas curtas; histórico longo pede FlatList ou FlashList v2.
- **Re-render por contexto**. [V] `ThemeContext.tsx` é o único contexto; conferir que o value é memoizado.
- ★ **Timers e listeners**. [V] `setTimeout` sem cleanup em `BemEstar.tsx:55,78`. `ExercicioRespiracao.tsx:26-52` precisa remover o listener e os intervals no unmount.
- **Inicialização**: fontes e SecureStore no boot; o splash segura até o token ser lido (`api.ts:32`).
- **Armazenamento**. SecureStore e AsyncStorage são assíncronos. [V] Contatos de confiança no SecureStore, com AsyncStorage só no web (`contatosConfianca.ts:73-78`).
- **APK**: R8 vem ligado por padrão no release do SDK 58 [S, fonte terceira]. Medir com `eas build`/`expo run:android --variant release`.
- **Imagens**: os PNG de `src/assets` precisam ter o tamanho de exibição.
- ★ **Medir em build release** num Android de entrada; dev build mente sobre desempenho.

## E. Complexidade e manutenção
- ★ **Tamanho e coesão**. Telas acima de 500 linhas: `checkin.tsx` 795, `SheetConta.tsx` 690, `sos.tsx` 593, `responderEscala.tsx` 565. Separar etapas e hooks. No servidor, `checkin.ts` (403) mistura rota, regra e frases.
- ★ **Camadas** (rota → serviço → repositório). [V] SQL direto nas rotas. Com Prisma, centralizar o acesso, mas manter `set_config` dentro da transação (RLS). Não migrar antes da demo.
- **Duplicação**. [V] `media` e `QUALIDADE_SONO_REVERSO` aparecem em `checkin.ts:20,60` e de novo em `lib/estatistica.ts` e `lib/checkins.ts`; `limite` está duplicado. Schemas zod e rótulos se repetem entre web e mobile, o que é candidato a pacote compartilhado com npm workspaces.
- **Tipos**: `strict` ligado nos 3 apps [V]. Procurar `any` (`checkin.ts:201`, `api.ts:21`).
- **Erro consistente**: padronizar `rota()` e `lerOuNegar` (`lib/rota.ts`); o check-in não usa nenhum dos dois.
- **Big-O**: as estatísticas são O(n) (`pearson`, `media`) [V]; o top-5 faz sort em O(k log k). Ok.
- **Código morto**: tela de chat (protótipo) e tabela `mensagem`; marcar ou remover.
- ★ **Lint/format/CI**: não existem. ESLint (typescript-eslint, react-hooks, jsx-a11y), Prettier e um GitHub Action com `tsc` + testes.
- **Nomes**: português consistente; arquivos `style*.ts` misturam Style/style.

## F. Confiabilidade e testes
- **Pirâmide**: unitário (estatística, cursor, período) < integração de rota < E2E.
- ★ **Integração com banco isolado**. [V] cerca de 200 `it()` em `test/*.test.ts` contra um Neon de teste (`.env.test`), com limpeza por PID (`ajuda.ts:18`). Usar um branch Neon só para testes e nunca o banco de produção.
- ★ **Autorização**: RLS e "psicólogo B não lê paciente de A" (`rls.test.ts`, `defesa-sem-rls.test.ts` [V]). Cobrir toda rota nova.
- **Negativos e fronteira**: período de 366/367 dias, cursor inválido, PHQ-9 item 9 = 0/1, 409 de check-in duplicado. [S] Não achei teste direto do POST `/checkin`.
- **Concorrência**: há modelo em `cadastro-concorrente.test.ts` [V]. Replicar para o primeiro check-in paralelo e para consulta sobreposta (EXCLUDE).
- ★ **E2E**: Playwright (v1.65) para login + 2FA + perfil; Maestro para check-in + SOS. Hoje não existem [V].
- **Dados sintéticos**: o seed usa `@psychelink.test` [V]; nunca dados reais.
- ★ **RNF medido**: p95 de login e dashboard (autocannon ou k6), LCP/INP via Lighthouse; registrar comando, hardware e data.

## G. UI/UX e acessibilidade
- ★ **UX de crise**: SOS a 1 toque de qualquer tela; CVV 188 e SAMU 192 sem login. [V] `sos.tsx:11,339-388`, `responderEscala.tsx:242-243`. O item 9 ≠ 0 alerta o psicólogo (`MarcadorItem9.tsx`) sem tom diagnóstico.
- ★ **Contraste** (texto 4,5:1, UI 3:1) nos tokens Catppuccin, nos temas claro e escuro.
- ★ **Alvo mínimo** (WCAG 2.5.8: 24×24 px; Android recomenda 48 dp). Conferir os números do slider em `checkin.tsx:182`.
- **Foco visível e não encoberto** (2.4.7 e 2.4.11): o foco não pode ficar atrás da sidebar ou do FAB.
- **Teclado**: react-aria cobre os componentes; conferir o calendário e o Dialog.
- **Rótulos**: `accessibilityLabel`/`Role` aparece 156 vezes no mobile [V]; conferir os botões só com ícone.
- **Movimento reduzido**: [V] web `tokens.css:245`; mobile só em `ExercicioRespiracao`. Estender ao Reanimated (`useReducedMotion`).
- **Arrastar** (2.5.7): o swipe do check-in precisa de um botão equivalente.
- **Formulários**: mensagem por campo em pt-BR; sem dica que revele conta existente.
- ★ **Estados vazio, carregando e erro** em toda tela da demo (`EmptyState`, `EstadoErro` [V]).
- **Microcopy**: "registro", "sinal", nunca "diagnóstico"; revisar frases de `gerarPercepcao`.
- **Carga cognitiva**: 7 etapas no check-in; mostrar progresso e permitir pular as opcionais.
- **Gráficos**: legenda, unidade, cor mais forma, tabela alternativa.
- **pt-BR**: `Intl` em datas, números e fuso; `I18nProvider pt-BR` [V].
- **Heurísticas de Nielsen**: status do sistema, prevenção de erro, consistência entre web e mobile (M3).

## Riscos

- Check-in após 21h BRT gravado no dia seguinte (CURRENT_DATE em UTC) pode aparecer na demo e distorcer médias semanais.
- /registro-psicologo segura conexão do pool durante SMTP; SMTP lento + cadastros simultâneos esgota pool (10) e trava o servidor inteiro.
- Cold start do Neon Free (5 min) e do host gratuito no início da apresentação.
- Primeiro check-in concorrente pode retornar 500 por corrida em obterOuCriarPacienteId.
- Migrar para Prisma/Tailwind/NativeWind perto da demo arrisca regressões; Prisma precisa preservar set_config transacional para RLS e compatibilidade com pooler em modo transação.
- Sem CI/lint e sem E2E, regressões só aparecem manualmente.

## Incertezas

- Tamanhos de bundle vêm do dist/ de 22/out (pode estar desatualizado) e são não comprimidos; não rodei build (proibido).
- Não li inteiros: relatorios.ts (só 1-140), pacientes.ts, escalas.ts, consultas.ts, auth.ts fora de 140-220, tokens.css, DESIGN.md, PRODUCT.md, sos.tsx, nem os documentos do TCC fora do repo nem docs/revisao-por-pares.md além dos títulos.
- Fuso do Neon como GMT foi tirado de comentário no código (lib/checkins.ts:5), não consultado no banco.
- Filtros não sargáveis e custo das 8 queries do dashboard são suspeitas sem EXPLAIN.
- R8 ligado por padrão no SDK 58 e FlashList v2 integrada ao Reanimated vêm de fontes terceiras.
- Data exata de LTS do Node 26 (outubro/2026) não confirmada em página oficial; não verifiquei em qual Node o servidor roda.
- Thresholds de CWV: a página oficial é de 2024; um blog alegou mudança em março/2026, não confirmada.
- Detalhes de express-rate-limit MemoryStore e default max=10 / connectionTimeoutMillis=0 do pg são de conhecimento prévio, não reverificados na doc nesta sessão.
- Ausência de teste direto do POST /checkin é inferida por grep; pacientes.test.ts referencia /checkin.

## Fontes

- https://web.dev/articles/vitals (lido em 2026-11-10; página atualizada 2024-10-31)
- https://www.w3.org/TR/WCAG22/ (Recomendação 2024-12-12; lido 2026-11-10)
- https://neon.com/docs/connect/connection-pooling (lido 2026-11-10)
- https://neon.com/docs/introduction/scale-to-zero (via busca 2026-11-10)
- https://expo.dev/changelog/sdk-58 (2026-10-15, via busca)
- https://expo.dev/blog/how-to-upgrade-to-sdk-58 (via busca)
- https://nodejs.org/blog/announcements/evolving-the-nodejs-release-schedule (via busca)
- https://docs.swmansion.com/react-native-reanimated/docs/guides/performance (via busca)
- https://recca0120.github.io/en/2026/04/14/react-compiler-vite-v6/ (terceiro, 2026-04-14)
- https://alternativeto.net/news/2026/10/react-native-0-88-brings-web-based-event-dispatching-and-variable-fonts-no-breaking-changes/ (terceiro)
- https://registry.npmjs.org/ (consultado 2026-11-10: pg 8.23.1, prisma 8.0.0-rc.33 latest, @prisma/client 7.10.1, tailwindcss 4.3.5, nativewind 4.2.7 latest / 5.0.0-rc.1, @shopify/flash-list 2.3.3, reanimated 4.7.1, babel-plugin-react-compiler 1.0.0, @playwright/test 1.65.0, express-rate-limit 8.7.4, expo 58.0.23)
- apps/server/src/db.ts
- apps/server/src/app.ts
- apps/server/src/index.ts
- apps/server/src/routes/checkin.ts
- apps/server/src/routes/auth-psicologo.ts
- apps/server/src/routes/psicologo/dashboard.ts
- apps/server/src/lib/paciente.ts
- apps/server/migrations/0001_baseline.sql
- apps/mobile/src/screens/paciente/checkin/checkin.tsx
- apps/web/src/App.tsx
