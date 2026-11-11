# Web: arquitetura

> Levantamento em modo leitura, 10 e 11/11/2026. Agente `web_arquitetura`, Opus 5.5 (effort high). Nada foi executado além de leitura de código, `npm view/audit/outdated` e documentação pública; "verificado" quer dizer lido no código, não testado. Linhas citadas são do commit `0864143`.

## Resumo

O painel web (apps/web) está bem organizado para o nível de um TCC. Todas as telas carregam sob demanda (lazy), exceto Auth, AreaProtegida e Shell. A sessão fica em cookies httpOnly com SameSite=Strict na mesma origem (/api), e um interceptor do axios faz uma única renovação por vez quando recebe 401. O TanStack Query usa configuração mínima: retry só para 5xx e falhas de rede, refetchOnWindowFocus desligado, staleTime e gcTime no padrão. Não há chaves VITE_* nem token no bundle, nem dangerouslySetInnerHTML nem redirecionamento aberto. O localStorage guarda só tema e pins, com lista fechada de valores, e os parâmetros de URL são validados. As regras de consentimento do front são repetidas pelo servidor.
Riscos principais:
1. Nenhum tratamento de inatividade no cliente: os dados ficam na tela sem limite de tempo, e quando a sessão de 30 min expira o app recarrega e perde o rascunho que estava sendo escrito.
2. A CSP do build sai com 'unsafe-inline' e ws://localhost; o header estrito existe só no DESIGN.md.
3. Não há error boundary.
4. A aba Consultas baixa a agenda de todos os pacientes, com observações, e filtra no cliente.
5. A detecção de 2FA encerrado compara o texto da mensagem de erro.
6. O número do relatório na impressão vem da URL sem conferência no servidor.
Não há testes, lint, formatter, CI nem monitoramento. Candidato nº 1 a refatorar: uma camada de queries por domínio (hooks e fábrica de chaves) no lugar de psicologoApi.ts com chaves literais espalhadas.

## Relatório

# Arquitetura do painel web (apps/web): leitura de 2026-11-10

Marcação: **[V]** = li o código; **[S]** = suspeita ou inferência não confirmada.

## 1. Roteamento, proteção e sessão
- O app usa o modo declarativo `BrowserRouter` + `Routes`, sem data router, e por isso não tem `errorElement` nem loaders [V] `src/main.tsx:15`, `src/App.tsx:29-63`.
- 11 telas usam `lazy()` [V] `App.tsx:8-18`. `Componentes` só existe em dev [V] `App.tsx:21`.
- `Auth`, `AreaProtegida` e `Shell` são importados estaticamente, então zod e os formulários de auth vão no chunk inicial [V] `App.tsx:5-6`.
- `VisaoGeral` (com recharts) tem um segundo nível de lazy [V] `rotas/pacientes/Perfil.tsx:27`.
- `AreaProtegida` busca `['psicologo','me']` com `retry:false` [V] `rotas/AreaProtegida.tsx:26-50`:
  - 401/403 → `<Navigate to="/">` (`lib/erros.ts:26-27`);
  - 5xx → `EstadoErro` com botão de tentar de novo;
  - só depois do sucesso o `Outlet` é renderizado.
  - `Auth` reaproveita a mesma chave e manda para `/inicio` se a sessão existir [V] `rotas/Auth.tsx:16-18`.
- `/relatorios/imprimir` fica fora da área protegida. A sessão é conferida pelas próprias chamadas [V] `App.tsx:43-51`.
- Fluxo de refresh [V] `lib/api.ts:14-54`:
  - um 401 fora de `/auth/*` (o logout é exceção) dispara `POST /auth/psicologo/refresh`, com uma única renovação em voo, e repete a requisição uma vez (`_repetida`);
  - 409 `REFRESH_CONCORRENTE` = outra aba já renovou → repete a requisição;
  - refresh 401 fora de `/` → `queryClient.clear()` + `window.location.assign('/')`, ou seja, recarga completa.
- Servidor [V] `apps/server/src/lib/sessaoWeb.ts:14-25,112-160`: access de 15 min; sessão viva com 12 h absolutas e 30 min de inatividade; cookies `httpOnly`, `secure`, `sameSite:'strict'`; allowlist de Origin para métodos que não são GET. O 403 vem de `exigirPsicologo` ou `exigirOrigem` (`routes/psicologo/index.ts:24-40`).
- **Lacuna [V]:** o cliente não tem timer de inatividade nem aviso de sessão expirando, e `refetchOnWindowFocus:false` (`lib/queryClient.ts:9`). A tela continua mostrando diário, escalas e anotações até a próxima requisição. Quando ela acontece, o `assign('/')` descarta qualquer rascunho, por exemplo uma anotação de 5000 caracteres escrita por mais de 30 min sem requisições (`rotas/pacientes/Anotacoes.tsx:24-34`). Também não há sincronização de logout entre abas.

## 2. Camada de dados
- axios: `baseURL:'/api'`, `withCredentials:true`, `timeout:15000` [V] `api.ts:12`.
- O proxy do Vite tira o prefixo `/api` e repassa a `localhost:3000`, em dev e em preview [V] `vite.config.ts:4-15`. Em produção não há reverse proxy versionado no repositório [V, busca por vercel/netlify/nginx/_headers sem resultado].
- QueryClient [V] `lib/queryClient.ts`:
  - queries repetem só para 5xx e falhas de rede, até 2 vezes a mais;
  - `staleTime` 0 e `gcTime` 5 min, valores padrão (não estão no arquivo);
  - mutations sem retry;
  - sem `QueryCache`/`MutationCache` com `onError` global.
- Exceções: `staleTime: Infinity` no catálogo de escalas, nas ações de auditoria e no Imprimir; `gcTime: 0` só no código de vínculo gerado (`rotas/vinculo/Vinculo.tsx:103-106`).
- Chaves de cache [V]: são literais espalhados, como `['psicologo','me']`, `['dashboard',p]`, `['pacientes',busca,status]`, `['paciente',id,'resumo'|'escalas'|'anotacoes'|'linha-do-tempo',...]`, `['consultas',de,ate]`, `['aplicacoes',...]`, `['checkins',...]`, `['checkin',id]`, `['relatorio',pedido]`, `['seletor-pacientes']`, `['vinculo',...]`, `['auditoria',...]`, `['sessoes']`. Não existe fábrica de chaves.
- Invalidação [V]:
  - `lib/cache.ts:7-9`: `invalidarEscalas` invalida o prefixo `['paciente']`, ou seja, todos os dados de todos os pacientes (excesso);
  - `invalidarConsultas` não alcança a linha do tempo nem o relatório (lacuna);
  - `EncerrarVinculo.tsx:15,28-31` remove `['paciente',id]` e invalida 5 prefixos, mas não `aplicacoes`, `consultas` nem `checkin`.
- Dados sensíveis em memória [V]: diário, anotações, respostas por item, relatório com anotações e agenda com observações ficam no cache até o gcTime de 5 min depois de sair da tela. O logout limpa tudo (`components/shell/useSair.ts:15`).

## 3. Formulários e validação
- react-hook-form + zod aparece **só** em `rotas/auth/*`, com um resolver próprio (`validacao.ts:90-101`) porque `@hookform/resolvers` não está instalado [V].
- As demais telas validam com `useState` manual [V]: `MinhaArea.tsx:36-52,101-105`, `calendario/CamposHorario.tsx:9-18`, `Anotacoes.tsx:18,36-40`, `NovaConsulta`, `DetalheConsulta`.
- Regras duplicadas do servidor [V]:
  - data de nascimento, CRP `^\d{2}\/\d{5,6}$`, senha 8–72, nome 2–120 e especialidade 255 (`validacao.ts:24-87` contra `apps/server/src/schemas.ts:4-74`);
  - as mesmas constantes de novo em `MinhaArea.tsx:37-41`;
  - anotação 5000, observação 2000, período 366 dias (`lib/periodo.ts:6`), duração 15–240 em passos de 5, reenvio 60 s (`authApi.ts:4`), lista de emoções em `Checkins.tsx:27` e `lib/rotulos.ts:4`.
- Mensagens: as do cliente são próprias, em pt-BR. As do servidor passam por `mensagemDeErro`, que usa o campo `error` e tem casos especiais para rede e 429 (`lib/erros.ts:4-13`).
- **Frágil [V]:** o 2FA encerrado é detectado comparando o texto da mensagem (`FormularioAcesso.tsx:101` com `authApi.ts:7`), quando o servidor já devolve `codigo` em outros casos.

## 4. Confiança no cliente
- Consentimento e permissão no front:
  - `SolicitarEscala` desabilita o envio quando o paciente não compartilha escalas, e o servidor também devolve 403 [V] `server/routes/psicologo/escalas.ts:66,232`;
  - `Checkins` filtra pacientes por `compartilhaHumor`, `Relatorio` mostra "—" e `ConsentimentoAusente` aparece nas abas: tudo isso é apresentação sobre dados que o servidor já filtra [V parcial] `psicologo/index.ts:14-21`, `relatorios.ts:160-205`;
  - a confirmação por primeiro nome em `EncerrarVinculo` é só UX.
- VITE_*: nenhuma [V]. `.env.example` diz que nenhuma é necessária. Não há chave nem token no bundle [V].
- Storage: `localStorage` guarda só `psychelink_web_tema` e `psychelink_web_pins`, com lista fechada de valores [V] `lib/tema.ts`, `shell/usePins.ts:6-17`, `public/tema-inicial.js`. Não há `sessionStorage`.
- `dangerouslySetInnerHTML`/`innerHTML`: ausentes [V].
- URL [V]: `aba`, `status`, `visao` e `emocao` passam por lista fechada; `dia`, `de` e `ate` por `lerDia`; `pacienteId` por regex ou inteiro; o `:id` do perfil por `Number.isInteger`. Só `acao` (`Auditoria.tsx:58`) vai ao servidor sem checagem, codificado pelo axios; é baixo risco.
- **Imprimir** [V]: o `numero` impresso vem da URL (`Imprimir.tsx:23,105`) e não fica vinculado ao registro `relatorio_exportado` (`relatorios.ts:233-262`). Dá para imprimir "Relatório nº N" com parâmetros diferentes dos registrados.
- Redirecionamento aberto: não há. Os destinos são fixos (`/`, `/inicio`), e `window.open('')` vem seguido de `opener=null` e URL relativa [V] `Relatorios.tsx:75-83`.
- CSP [V]: o `<meta>` com `'unsafe-inline'` em script e estilo e `ws://localhost:5173` está no `dist/index.html`. O header estrito existe só em `DESIGN.md:332-342`. `frame-ancestors` não funciona em meta, então hoje a proteção contra clickjacking depende do host, que não está definido. O que o app realmente precisa: `script-src 'self'` (o tema inicial é arquivo externo) e estilo inline via CSSOM (custom properties), que o CSP permite.

## 5. Carregando, vazio e erro
Padrão consistente [V]: `Skeleton` com `role="status"` e `VisuallyHidden`; `EstadoErro` com `role="alert"` e "Tentar de novo" (`components/ui/EstadoErro.tsx`); `EmptyState` com ação; `keepPreviousData` com `aria-busy` nas trocas de filtro; erro só substitui a tela quando não há dados (`isError && !data`).

Exceções:
- 404 do perfil vira "Paciente não encontrado" (`Perfil.tsx:97`);
- 403 de escala vira `ConsentimentoAusente` (`DetalheAplicacao.tsx:23`);
- mutations mostram erro com `AvisoErro` ou toast;
- o fallback do Suspense em Imprimir e Componentes é `null`.
- **Falta error boundary** [V, grep]: um erro de render ou de chunk lazy derruba a árvore. Exemplos possíveis: `STATUS_APLICACAO[status].toLowerCase()` com status desconhecido (`DetalheAplicacao.tsx:93`) e `STATUS_CONSULTA[item.status]` (`LinhaDoTempo.tsx:35`) [S para status novos vindos do servidor].

## 6. Desempenho
- `dist/` é de 22/out, anterior ao código atual (28–30/out), então os tamanhos são aproximados [V]. Chunk inicial `index-*.js` com 417 KB brutos; `VisaoGeral-*.js` com 375 KB (recharts, importado só em `pacientes/Graficos.tsx`); o `GraficoLinhas` do relatório e das escalas é próprio, sem recharts.
- lucide-react com imports nomeados em 39 arquivos, que o bundler consegue eliminar quando não usados [V]. react-aria-components é importado por componente [V].
- Waterfalls [V]:
  - `/me` → chunk da rota → `resumo` + histórico → só então o chunk de `VisaoGeral` (`AreaProtegida.tsx:37-50`, `Perfil.tsx:182-185`);
  - o perfil baixa o histórico inteiro de vínculos só para mostrar "vinculado desde" (`Perfil.tsx:95,121`);
  - `listarTodosPacientes` percorre as páginas em sequência, 100 por vez (`psicologoApi.ts:194-203`), em 5 telas (com cache compartilhado);
  - `AbaConsultas` faz 2×92 dias da agenda de **todos** os pacientes, com observações decifradas, e filtra por `pacienteId` no cliente (`AbaConsultas.tsx:51-65`; o servidor não tem esse filtro, `consultas.ts:80-97`).
- Listas: paginação por cursor com "Carregar mais" em pacientes, check-ins, aplicações, linha do tempo e auditoria; sem virtualização. É adequado para o volume esperado [S].
- Re-renders: nada grave. `Relatorio` e `VisaoGeral` recalculam `diasEntre` (função duplicada) a cada render, até 366 iterações [V].
- Prévia de relatório: cada mudança de filtro faz um GET que grava `relatorio_visualizado` e, se as anotações estiverem incluídas, `anotacoes_lidas`. Isso gera ruído na auditoria [V] `relatorios.ts:196-205`.
- Fonte [V]: `@fontsource-variable/roboto-flex/wdth.css` com 6 `@font-face` com `unicode-range` e `font-display: swap`. Só os subconjuntos latinos são baixados (latin com 58 KB). Sem preload.
- Build: `vite.config.ts` sem opções de build (sem sourcemap e sem `manualChunks`) [V].

## 7. Separação de responsabilidades
- Arquivos mais longos [V]:
  - `Relatorio.tsx` (430): só apresentação;
  - `psicologoApi.ts` (406): cerca de 30 tipos e cerca de 40 funções de API, além de uma transformação de data;
  - `MinhaArea.tsx` (351): 4 subtelas, validação manual, mutations e um parser de user-agent;
  - `Inicio.tsx` (294);
  - `VisaoGeral.tsx` (284).
- O padrão comum é a tela chamar `useQuery`/`useMutation` direto, com chave literal e invalidação manual.
- **Candidato nº 1:** dividir `psicologoApi.ts` por domínio em módulos com hooks (`usePaciente`, `useConsultas`...) e uma fábrica de chaves. Isso também resolve as invalidações frouxas (§2) e dá um lugar único para `gcTime` de dados sensíveis.
- Em seguida: `MinhaArea.tsx` usando RHF + zod com schemas iguais aos do servidor.

## 8. Ausências [V]
- Nenhum teste no web.
- Sem ESLint, Prettier ou Biome.
- Sem CI: `.github/` tem só `dependabot.yml`.
- Sem error boundary nem handler global de erro.
- Sem monitoramento nem sourcemaps.
- Sem configuração de deploy, proxy ou header.
- `npm audit --omit=dev`: 1 alta em `follow-redirects` (GHSA-mrwp-f3q8-3g9p), que é dependência do adapter Node do axios e não entra no bundle do navegador [S para impacto zero no web].
- Versões: react-router 8.5.0 (a última é 8.5.1), @tanstack/react-query 5.105.0 (5.107.1), axios 1.20.0 (1.21.1), lucide-react 1.61.0 (1.71.0), vite 8.3.5 (8.3.7); recharts, react-aria-components, zod e react-hook-form estão na última (registry npm, 2026-11-10).
- Não há `any` no `src` (grep). A revisão por pares citava 11, então essa informação está desatualizada.

## Achados

| Severidade | Confiança | Achado | Onde | Detalhe |
|---|---|---|---|---|
| media | verificado | Sem controle de inatividade no cliente: dados sensíveis ficam na tela e rascunhos se perdem quando a sessão expira | apps/web/src/lib/api.ts:26-28; apps/web/src/lib/queryClient.ts:9; apps/server/src/lib/sessaoWeb.ts:19-21; apps/web/src/rotas/pacientes/Anotacoes.tsx:24-34 | O servidor encerra a sessão após 30 min sem requisições. O cliente não tem timer, não avisa e não refaz buscas ao voltar o foco (refetchOnWindowFocus:false), então diário, escalas e anotações continuam visíveis numa tela sem ninguém. Na primeira requisição depois de expirar, o refresh falha e window.location.assign('/') recarrega a página, perdendo anotação, observação ou formulário em edição. Também não há logout sincronizado entre abas. |
| media | verificado | A CSP de produção sai com 'unsafe-inline' e ws://localhost; o header estrito só existe no DESIGN.md | apps/web/index.html:7-11; apps/web/dist/index.html; apps/web/DESIGN.md:332-342 | O meta de dev é copiado para o build. Nenhum arquivo de host, proxy ou header está versionado, então em produção vale só o meta, com script inline permitido. frame-ancestors não funciona via meta, então o painel não tem proteção contra clickjacking a menos que o host envie o header. |
| media | verificado | Nenhum error boundary: erro de render ou falha ao baixar chunk lazy deixa a tela branca | apps/web/src/App.tsx:29-63; apps/web/src/rotas/escalas/DetalheAplicacao.tsx:93; apps/web/src/rotas/pacientes/LinhaDoTempo.tsx:35 | BrowserRouter declarativo sem errorElement e sem ErrorBoundary (grep). Status desconhecido vindo do servidor em STATUS_APLICACAO[status].toLowerCase(), ou chunk antigo depois de um novo deploy, desmonta a aplicação inteira. Também não há onError global no QueryCache nem monitoramento. |
| media | verificado | A aba Consultas do perfil baixa a agenda de todos os pacientes, com observações, e filtra no cliente | apps/web/src/rotas/pacientes/AbaConsultas.tsx:51-65; apps/server/src/routes/psicologo/consultas.ts:80-97 | Duas janelas de 92 dias de /psicologo/consultas sem filtro de pacienteId: chegam ao navegador as observações decifradas das consultas dos outros pacientes, só para mostrar as de um. O servidor deveria aceitar pacienteId. |
| media | verificado | Sem testes, lint, formatter, CI, monitoramento nem configuração de deploy no web | apps/web/package.json; .github/dependabot.yml | Os scripts são só dev, build e preview. .github tem apenas dependabot. Não há eslint, prettier ou biome, nem arquivo *.test.*. Sem sourcemaps nem ferramenta de rastreio de erros. |
| baixa | verificado | 2FA encerrado é detectado comparando o texto da mensagem de erro | apps/web/src/rotas/auth/FormularioAcesso.tsx:101; apps/web/src/lib/authApi.ts:7 | mensagemDeErro(falha) === MSG_CODIGO_ENCERRADO: se o servidor mudar uma vírgula na mensagem, o diálogo deixa de fechar e o usuário fica preso no código. O servidor já usa o campo `codigo` em outros casos (REFRESH_CONCORRENTE, DESAFIO_EXPIRADO). |
| baixa | verificado | O número do relatório impresso vem da URL sem vínculo com o registro de exportação | apps/web/src/rotas/relatorios/Imprimir.tsx:23,105; apps/server/src/routes/psicologo/relatorios.ts:233-262 | Editando a query string dá para gerar 'Relatório nº N' com período, paciente ou anotações diferentes do que foi registrado em relatorio_exportado. O GET do relatório não recebe nem confere o número. |
| baixa | verificado | Prévia de relatório grava auditoria a cada mudança de filtro | apps/web/src/rotas/relatorios/Relatorios.tsx:51-56; apps/server/src/routes/psicologo/relatorios.ts:196-205 | Cada combinação de período e paciente (e o Imprimir de novo) gera relatorio_visualizado e, se as anotações estiverem incluídas, anotacoes_lidas. A trilha de auditoria fica com ruído; vale debounce ou exigir que a prévia seja pedida explicitamente. |
| baixa | verificado | Dados sensíveis ficam no cache 5 min depois de sair da tela; só o código de vínculo usa gcTime 0 | apps/web/src/rotas/vinculo/Vinculo.tsx:103-106; apps/web/src/lib/queryClient.ts; apps/web/src/components/shell/useSair.ts:15 | Diário, anotações, respostas por item e relatório com anotações ficam em memória pelo gcTime padrão. O logout faz queryClient.clear(), o que é correto, mas não há política uniforme para dados sensíveis. |
| baixa | verificado | Invalidação de cache ampla demais em alguns pontos e incompleta em outros | apps/web/src/lib/cache.ts:7-9; apps/web/src/rotas/pacientes/EncerrarVinculo.tsx:15,28-31 | invalidarEscalas invalida o prefixo ['paciente'] (todos os dados de todos os pacientes). invalidarConsultas não atualiza a linha do tempo nem o relatório. Encerrar o vínculo não invalida aplicacoes, consultas, checkin e auditoria. As chaves são literais espalhados, sem fábrica. |
| baixa | verificado | Waterfalls de carregamento no perfil do paciente e no seletor de pacientes | apps/web/src/rotas/AreaProtegida.tsx:37-50; apps/web/src/rotas/pacientes/Perfil.tsx:95,121,182-185; apps/web/src/lib/psicologoApi.ts:194-203 | Sequência /me → chunk → resumo e histórico → chunk VisaoGeral (cerca de 375 KB com recharts) só depois dos dados. O histórico inteiro de vínculos é buscado só para mostrar 'vinculado desde'. listarTodosPacientes percorre as páginas em sequência. |
| baixa | verificado | Validação duplicada em três estilos diferentes | apps/web/src/rotas/auth/validacao.ts:24-101; apps/web/src/rotas/minha-area/MinhaArea.tsx:36-52; apps/web/src/rotas/calendario/CamposHorario.tsx:9-18; apps/server/src/schemas.ts | Auth usa RHF com zod e um resolver próprio, que copia schemas.ts. Minha área, consultas e anotações validam com useState e constantes copiadas. Limites (8–72, 2–120, 5000, 2000, 366, 15–240) estão em 2 ou 3 lugares. |
| baixa | verificado | Auth não usa lazy: zod e formulários de login vão no chunk inicial | apps/web/src/App.tsx:5-6; apps/web/dist/assets/index-B9dy-AoR.js (417 KB, build de 22/out desatualizado) | Quem já tem sessão baixa zod, react-hook-form e as telas de auth sem precisar. O dist é anterior ao código atual; o tamanho exato precisa de um build novo. |
| info | suspeita | npm audit: follow-redirects com severidade alta | apps/web/package-lock.json (via axios) | GHSA-mrwp-f3q8-3g9p em follow-redirects 1.16.0-1.16.1, que tem correção. É usado pelo adapter Node do axios e provavelmente não entra no bundle do navegador; não confirmei inspecionando o bundle. |

## Perguntas para o grupo

- Onde o painel web vai rodar em produção (host ou reverse proxy)? Quem vai aplicar o header CSP estrito, o frame-ancestors e a remoção do prefixo /api?
- Vocês querem logout ou bloqueio por inatividade no cliente (ex.: aviso aos 25 min e tela bloqueada aos 30), já que o servidor encerra a sessão em 30 min?
- A prévia de relatório deve gravar auditoria a cada mudança de filtro, ou só quando o psicólogo pedir a prévia explicitamente?
- Como o chat não será implementado, o item 'Chats (em breve)' sai da navegação (itensNav.ts:20)?
- Na migração para Tailwind, o padrão data-compacto e useCompacto continua, ou passa a usar breakpoints do Tailwind?
- Vale aceitar pacienteId em GET /psicologo/consultas para a aba Consultas não baixar a agenda de todos os pacientes?
