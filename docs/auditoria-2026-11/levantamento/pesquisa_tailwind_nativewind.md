# Pesquisa: Tailwind v4 e NativeWind

> Levantamento em modo leitura, 10 e 11/11/2026. Agente `pesquisa_tailwind_nativewind`, Opus 5.5 (effort high). Nada foi executado além de leitura de código, `npm view/audit/outdated` e documentação pública; "verificado" quer dizer lido no código, não testado. Linhas citadas são do commit `0864143`.

## Resumo

Em 10/11/2026, Tailwind v4 no web é viável: tailwindcss e @tailwindcss/vite estão na 4.3.5 e o peer do plugin aceita vite ^8. Os tokens atuais (light-dark()) cabem num @theme inline sem reescrever nada. Mesmo assim, o ganho funcional é nulo e há armadilhas: a ordem de camadas do CSS, o Preflight e o CSS de impressão. No mobile, o NativeWind não está pronto para este projeto. A v4 estável (4.2.7) depende de react-native-css-interop 0.2.7, que exige tailwindcss ~3, então não divide tema com o web. A v5 está em 5.0.0-rc.1 e a própria documentação diz que "não é para produção"; a pilha testada é Expo 57 / RN 0.86, não 58/0.88. O Uniwind 1.13.2 (Tailwind 4, estável) é a alternativa técnica melhor, mas animar via className com Reanimated 4 só existe no Pro, que é pago. O app mobile tem 678 referências a theme.colors espalhadas por 34 arquivos.

## Recomendação

WEB: não migrar agora. Se o grupo quiser o Tailwind como item do TCC, fazer só uma migração parcial e opcional. Instalar @tailwindcss/vite, criar uma ponte @theme inline que aponta para as variáveis de tokens.css, não carregar o Preflight e usar utilitários só em telas novas ou componentes folha. Button, Calendário, Relatório e Imprimir continuam em CSS Modules. MOBILE: não migrar agora, nem para NativeWind (v4 presa ao Tailwind 3, v5 em RC) nem para Uniwind. O que vale fazer agora é alinhar os valores de src/theme/index.ts com tokens.css: o teal está diferente, assim como secondary, outline e on*Container. Reavaliar o Uniwind (ou o NativeWind 5 quando sair estável) depois da banca. Não criar workspaces nem pacote de tokens compartilhado antes disso.

## Relatório

## Viabilidade: Tailwind v4 (web) e NativeWind (mobile), novembro de 2026

Legenda: **[V]** = verificado nesta sessão (li o arquivo ou a fonte). **[S]** = suspeita ou inferência.

### 0. O que o código tem hoje
- `apps/web/src/styles/tokens.css` (255 linhas): cores M3 em `light-dark()` (linhas 19-96), tema escolhido por `data-theme` no `<html>` (7-15), tipografia como atalho `font` com `semi-expanded` (121-152), molas `linear()` (226-235) e duração zero com movimento reduzido (245-254). [V]
- `Button.module.css`: state layer em `::before`, estados `data-hovered/pressed/disabled` do react-aria e `color-mix()`. No web inteiro há 35 pseudo-elementos, 10 `color-mix` e dezenas de seletores `[data-*]`. [V] A impressão aparece em `Relatorio.module.css:242`, `Imprimir.module.css:23` e `GraficoLinhas.module.css:73`. [V]
- A CSP de produção é `style-src 'self'` (`DESIGN.md:339`). As custom properties são aplicadas via CSSOM (`DESIGN.md:305`). [V]
- Mobile: `babel.config.js` só tem `babel-preset-expo` e não existe `metro.config.js`. [V] `theme/index.ts` é um objeto JS claro/escuro. `ThemeContext.tsx` guarda o modo no SecureStore. O app tem 678 usos de `theme.colors.*` em 34 arquivos, quase todos inline em `style={[...]}` (ex.: `checkin.tsx:144-432`, `CustomButton.tsx:29-56`). [V] `@gorhom/bottom-sheet` está em `SheetConta.tsx` e `gifted-charts` em `dados.tsx`. Os dois recebem cor e estilo por prop. [V] Os scripts usam `expo run:*`, ou seja, development build e não Expo Go. [V]
- Os temas web e mobile já divergem: teal `#179299` vs `#179287` (o próprio `tokens.css:18` registra isso), secondary claro `#4a5fd6` vs `#7287fd`, outline `overlay2` vs `surface1`, e `onSecondaryContainer` escuro `#dde3ff` vs `mocha.blue`. [V]
- Não há package.json na raiz, nem workspaces, nem CI (só `.github/dependabot.yml`). [V]

### 1. NativeWind
- **Versões no npm (10/11/2026):** `latest` = 4.2.7 (14/09/2026); `rc` = 5.0.0-rc.1 (02/11/2026). [V] A 4.2.7 depende de `react-native-css-interop@0.2.7`, cujo peer é `tailwindcss ~3`. Na prática, **a v4 só roda com Tailwind 3**. [V] A v5 pede `tailwindcss >4.1.11` e `react-native-css 3.1.0-rc.1` em versão exata. [V]
- **Estado da v5:** a página de instalação diz "pre-release… not intended for production use" e "V4 remains the stable release". A pilha testada é Expo 57.0.22, RN 0.86.3, React 19.2.3, Reanimated 4.5.1 e Worklets 0.10.1. O mínimo declarado é RN ≥0.81 e @expo/metro-config ≥54, sem verificação em todos os SDKs. A doc ainda cita o rc.0, enquanto o npm já está no rc.1. [V] **Não há declaração para Expo 58 / RN 0.88.** [V] A nova arquitetura não é mencionada. [V]
- **Instalação da v5:** `nativewind` e `react-native-css` com versão exata. Depois `tailwindcss`, `@tailwindcss/postcss` e `lightningcss@1.30.1` (pinado por `overrides`), um `postcss.config.mjs` e um `global.css` com imports separados de theme, preflight e utilities mais `nativewind/theme`. Também `metro.config.js` com `withNativewind`, `nativewind-env.d.ts` referenciando `react-native-css/types` e nenhum preset Babel. [V] **Instalação da v4:** `tailwind.config.js` com preset, `babel-preset-expo` com `jsxImportSource: "nativewind"` + `nativewind/babel`, `withNativeWind(config, { input })` e `@tailwind base/components/utilities`. [V]
- **Limitações e issues abertas:** #1834 (LogBox quebra no RN 0.86 com `nativewind/babel`), #1875 (na v4, `animate-*` continua rodando depois do unmount), #1870 (modificadores de opacidade `/50` retornam undefined), #1876 (na v5 RC, `@theme --font-sans` não tem efeito no iOS/Android) e #1846 (`font-bold` corta texto no Android). [V] Há um PR aberto no react-native-css para "resolve light-dark() at runtime", então o suporte a `light-dark()` ainda está em ajuste. [V título, S efeito] Na v5 o tema por variáveis usa `VariableContextProvider`, `vars()` está depreciado e variáveis trocadas em runtime precisam de `inlineVariables.exclude`. [V] Bottom-sheet e gifted-charts recebem cor por prop, então exigiriam `styled`/`remapProps` ou continuar com `style`. [S]
- **Saúde do projeto:** 8,1 mil estrelas, 71 issues abertas, último push em 02/11/2026. A v5 está em preview/RC desde 09/2025, ou seja, mais de 13 meses. [V]

### 2. Alternativas no React Native
| Opção | Estado (npm, 10/11/2026) | Quando vence |
|---|---|---|
| **Uniwind** 1.13.2 (MIT) | Tailwind ≥4, RN ≥0.81, sem Babel, `withUniwindConfig` no Metro, temas light/dark/system com `Uniwind.setTheme`, `withUniwind` para terceiros. 2 issues abertas, push em 09/11/2026 [V] | Quando o objetivo for Tailwind 4 de verdade no RN e tema compartilhado com o web. Ponto fraco: **className com Reanimated 4 é só no Pro (pago)**; no Free a animação continua em `style` [V] |
| **Unistyles** 3.8.1 | Exige RN ≥0.85 com nova arquitetura, Nitro Modules, development build [V] | Quando se quer manter a API de `StyleSheet` com temas e breakpoints e desempenho nativo, sem Tailwind |
| **Tamagui** 3.3.1 | Kit de componentes com compilador [V versão] | Projeto novo que adota a biblioteca inteira; aqui seria reescrever a UI [S] |
| **twrnc** 4.16.0 | Último push em 30/12/2025 [V]; ligado ao modelo de config do Tailwind 3 [S] | Protótipo rápido; não serve para dividir tokens Tailwind 4 |
| **StyleSheet + tema (atual)** | Funciona, sem dependências novas | **Vence agora**: risco zero e já suporta Reanimated, bottom-sheet e charts |

### 3. Tailwind v4 no web
- **Vite 8:** o peer de `@tailwindcss/vite@4.3.5` é `^5.2.0 || ^6 || ^7 || ^8`. [V] O suporte a navegador começa em Chrome 111, Safari 16.4 e Firefox 128. [V]
- **Tokens:** `@theme inline { --color-primaria: var(--cor-primaria); … }`. Com `inline`, o utilitário emite o `var()` em vez do valor resolvido, então o `light-dark()` e o `data-theme` continuam valendo e **não precisa da variante `dark:`**. [V doc + S aplicação] `--color-*: initial` remove a paleta padrão. [V] O espaçamento padrão (`--spacing` de 0.25rem) coincide com a grade de 4 (`p-4` = `--espaco-16`). [S] Forma vai em `--radius-*`, molas em `--ease-*` aceitando `linear()` e duração em `duration-(--duracao-…)`. [S] A tipografia em atalho `font` com `semi-expanded` não tem namespace próprio, então precisa de `@utility tipo-titulo-medio { font: var(--tipo-titulo-medio) }`. [S]
- **react-aria:** `tailwindcss-react-aria-components@2.2.0` (peer `tailwindcss ^4`) se registra com `@plugin`. Os `data-[pressed]:` nativos funcionam sem o plugin. Para animações de entrada e saída, a doc recomenda `tw-animate-css`. [V] Os state layers em `::before` dependem de `before:` + `data-[hovered]:before:opacity-…`, e o resultado é verboso. [S]
- **Convivência com CSS Modules:** a doc do Tailwind "não recomenda" misturar os dois. `@apply` dentro de um módulo exige `@reference`, e cada módulo processado custa uma execução do Tailwind. A alternativa sugerida é usar `var()`. [V] Os utilitários ficam em `@layer utilities`, enquanto os CSS Modules ficam fora de camada. **Por isso o módulo vence o utilitário em qualquer conflito**, seja qual for a especificidade. [S, regra de cascade layers] O Preflight muda o reset (bordas, botões, imagens), então numa migração incremental é melhor importar só `theme.css` e `utilities.css`. [S]
- **CSP:** o Tailwind gera CSS estático que o Vite extrai para `/assets/*.css`, o que é compatível com `style-src 'self'`. [S, alta confiança] Classes montadas em runtime (`bg-${x}`) não são detectadas pelo scanner. [S]
- **Impressão:** existe a variante `print:` [S, doc não reaberta], mas a quebra de página (`break-before`, `table-header-group`) fica mais legível em CSS. A recomendação é manter o Relatório em módulo.

### 4. Tokens compartilhados
O Tailwind 4 permite um `theme.css` importado por vários projetos. [V] Para web e mobile dividirem um único `@theme`, seria preciso: (a) usar Uniwind ou NativeWind 5, porque a v4 roda Tailwind 3; (b) criar `packages/tokens` com workspaces npm na raiz ou um caminho relativo, mais `watchFolders` no Metro (o Uniwind tem página sobre monorepos [V]); (c) resolver as divergências de cor listadas na seção 0; (d) traduzir o que o RN não tem: atalho `font`, `linear()` (o Reanimated usa molas próprias) e `color-mix` (uma issue aponta falha de opacidade na v4). [S] Custo estimado: 8-16 h, com risco no Metro. [S]

### 5. Estratégia e esforço (se migrarem)
**Web:** (1) instalar o plugin e criar `src/styles/tailwind.css` com `@theme inline` sem Preflight, 3-5 h; (2) migrar layouts folha (Linhas, VisaoGeral) um por vez, apagando o módulo do componente migrado; (3) deixar por último, ou nunca migrar, Button, Calendário (293 linhas), Relatório (281) e Imprimir. Migração total: ~50-80 h para iniciantes. [S]
**Mobile (Uniwind):** criar `metro.config.js` e `global.css`, mapear o tema para variáveis, trocar `ThemeContext` por `Uniwind.setTheme` mantendo a persistência no SecureStore e migrar as 678 referências tela a tela. A animação continua em `style`. Estimativa: 70-120 h, mais imprevistos de build no RN 0.88. [S]
**Regressão visual:** não há testes de UI. Web: capturas antes e depois por rota nos dois temas, em 360 px e 1280 px, e a pré-visualização de impressão do relatório. Uma ferramenta como Playwright `toHaveScreenshot` exigiria dependência nova. [S] Mobile: roteiro manual de capturas por tela nos dois temas e com fonte grande, num aparelho Android real. [S]
**Riscos para a equipe:** quebra visual perto da banca; dois sistemas de estilo convivendo e confundindo quem chega depois; a ordem de camadas fazendo utilitário "não funcionar"; dependência de RC (NativeWind 5) ou de recurso pago (Uniwind Pro); retrabalho na documentação do TCC (DESIGN.md descreve CSS Modules).

### 6. Recomendação
- **Web: não migrar agora.** O sistema atual já é M3 Expressive, já está documentado, já usa os `data-*` do react-aria e passa na CSP. O Tailwind não traz nenhuma função nova. Se o grupo quiser mostrar Tailwind, fazer só a migração parcial da seção 5 (ponte + telas novas), sem tocar em Button, Calendário e Relatório.
- **Mobile: não migrar agora.** Nenhuma opção Tailwind declara suporte ao Expo 58 + RN 0.88 com estabilidade e animação via className de graça. O ajuste útil e barato é alinhar os valores de `theme/index.ts` aos de `tokens.css`. Depois da banca, avaliar o Uniwind (ou o NativeWind 5 estável).

## Riscos

- Regressão visual (state layers, shape morph, impressão do relatório) perto da banca, sem testes de UI automatizados.
- Ordem de camadas: CSS Modules fora de camada sobrescrevem utilitários Tailwind, o que dá a impressão de que a classe não funciona.
- O Preflight do Tailwind altera o reset atual se for importado inteiro.
- NativeWind v5 em RC há mais de 13 meses; a v4 estável presa ao Tailwind 3 impede tema único com o web.
- Uniwind: animação via className com Reanimated 4 só no Pro, que é pago.
- Migrar 678 referências inline de theme.colors em 34 arquivos mobile causa retrabalho e erros de build no RN 0.88.
- Um pacote de tokens compartilhado exige workspaces e watchFolders no Metro, novidade de infraestrutura para a equipe.
- Dois sistemas de estilo coexistindo deixam o código menos legível para a banca, e DESIGN.md ficaria desatualizado.

## Incertezas

- Nenhuma fonte declara compatibilidade de NativeWind v4/v5 com Expo SDK 58 / RN 0.88; o funcionamento real não foi testado (modo somente leitura).
- O Uniwind Free declara RN >=0.81 sem teto; a tabela de compatibilidade 55-58 / 0.83-0.89 é do Uniwind Pro, não do Free.
- Suporte a light-dark() no react-native-css (NativeWind v5) parece incompleto (PR aberto), mas o efeito prático não foi verificado.
- Não foram lidas as páginas de dark mode e de terceiros do NativeWind v5, nem withUniwind com Reanimated no Free além da tabela Pro.
- A existência e o comportamento da variante print: no Tailwind v4 não foram reconferidos nesta sessão.
- Os efeitos das cascade layers (módulos vencem utilitários) e do Preflight são inferência a partir da especificação CSS, não testados no projeto.
- As estimativas de esforço em horas são aproximações para equipe iniciante, sem base medida.
- O prazo exato da banca/entrega não foi encontrado nos documentos do TCC (a Devolutiva só cita 'Critérios para a próxima entrega').
- Unistyles, Tamagui e twrnc foram avaliados só por npm, README e metadados do GitHub, sem ler a documentação completa.

## Fontes

- https://registry.npmjs.org (npm view nativewind, react-native-css, react-native-css-interop, uniwind, react-native-unistyles, tamagui, twrnc, tailwindcss, @tailwindcss/vite, tailwindcss-react-aria-components), consultado em 2026-11-10
- https://www.nativewind.dev/v5/getting-started/installation (consultado 2026-11-10; cita rc.0, testado Expo 57/RN 0.86)
- https://www.nativewind.dev/docs/getting-started/installation (v4.2.7, consultado 2026-11-10)
- https://www.nativewind.dev/v5/guides/themes (consultado 2026-11-10)
- https://github.com/nativewind/nativewind (API: releases 5.0.0-rc.1 de 2026-11-02, 71 issues abertas; issues #1834, #1846, #1870, #1875, #1876; PRs #1885, #1886) consultado 2026-11-10
- https://github.com/nativewind/react-native-css README e PR aberto 'resolve light-dark() at runtime', consultado 2026-11-10
- https://docs.expo.dev/guides/tailwind/ (página datada de 2026-07-22, consultada em 2026-11-10)
- https://docs.uniwind.dev/quickstart.md, /theming/basics.md, /faq.md, /components/other-components.md, /pro-version.md, /pro/compatibility.md, /llms.txt (consultados 2026-11-10)
- https://github.com/uni-stack/uniwind (API, push 2026-11-09)
- https://raw.githubusercontent.com/jpudysz/react-native-unistyles/main/README.md (requisitos, 2026-11-10)
- https://github.com/jaredh159/tailwind-react-native-classnames (API, push 2025-12-30)
- https://tailwindcss.com/docs/compatibility (v4.3, consultado 2026-11-10)
- https://tailwindcss.com/docs/theme (consultado 2026-11-10)
- https://react-aria.adobe.com/styling (consultado 2026-11-10)
- apps/web/src/styles/tokens.css
- apps/web/src/styles/globais.css
- apps/web/src/components/ui/Button.tsx
- apps/web/src/components/ui/Button.module.css
- apps/web/src/rotas/relatorios/Relatorio.module.css
- apps/web/vite.config.ts
- apps/web/index.html
- apps/web/DESIGN.md (linhas 305, 332-342)
- apps/mobile/src/theme/index.ts
- apps/mobile/src/theme/ThemeContext.tsx
- apps/mobile/babel.config.js
- apps/mobile/package.json
- apps/mobile/src/components/ui/CustomButton.tsx
- apps/mobile/src/screens/paciente/checkin/styleCheckin.ts
- apps/mobile/src/screens/paciente/checkin/checkin.tsx
