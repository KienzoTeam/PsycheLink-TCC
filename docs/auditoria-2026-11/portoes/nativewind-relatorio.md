# Relatório do portão do NativeWind

Spike de 12/11/2026, worktree `.claude/worktrees/spike-nativewind`, branch `spike/nativewind` (descartável, sem push). Roteiro do aluno: `.superpowers/sdd/portao-nativewind-roteiro.md`.

## Veredito

**Biblioteca: NativeWind 5 RC (`nativewind@5.0.0-rc.1` + `react-native-css@3.1.0-rc.1` + `tailwindcss@4.1.12`).** Passou nos critérios 1 a 3 já na primeira tentativa, então a Uniwind e o NativeWind 4 não foram tentados (a regra era parar na primeira que passar).

O veredito é **condicional**: nada foi rodado em aparelho nem no Expo Go (não há aparelho, emulador nem build nesta máquina). O que existe é build, bundle de desenvolvimento servido pelo Metro e um teste de runtime sem aparelho (renderizador de teste) do mecanismo de tema. Os critérios 4 a 7 dependem do aluno. Se 4 e 5 passarem e 6 e 7 não regredirem, o NativeWind 5 é viável no Expo 58, mas continua sendo uma pré-release que a própria documentação diz "não ser para produção" (ver riscos).

## Versões conferidas (npm, 12/11/2026)

| Pacote | dist-tag | Observação |
|---|---|---|
| nativewind | latest 4.2.7; `rc`/`preview` 5.0.0-rc.1 (02/11/2026) | rc.1 pede `react-native-css` exatamente 3.1.0-rc.1 e `tailwindcss >4.1.11` |
| react-native-css | latest 3.0.7; `rc` 3.1.0-rc.1 | peers: react >=19, react-native >=0.81, @expo/metro-config >=54, lightningcss >=1.27 |
| uniwind | latest 1.13.2 | não usada |
| tailwindcss / @tailwindcss/postcss | latest 4.3.5 | fixados em 4.1.12, como a documentação do NativeWind 5 manda |
| lightningcss | latest 1.33.0 | fixado em 1.30.1 (`overrides`), como a documentação manda |

A página de instalação do NativeWind 5 ainda cita `rc.0` e diz ter sido testada em Expo 57 / RN 0.86 / Reanimated 4.5. Usei o par `rc.1` que o npm publica. **Não há declaração oficial para Expo 58 / RN 0.88**; o resultado abaixo é o primeiro dado nessa combinação. O `npm install` não precisou de `--force` nem `--legacy-peer-deps`, e `npm ci` a partir do lockfile funciona. Reanimated 4.7.1 e worklets 0.13.0 ficaram intocados no `package.json`. Nenhum dos dois pacotes tem pasta `android/` ou `ios/` (JS puro, então roda no Expo Go); `expo-system-ui` está na lista de módulos nativos do Expo Go do SDK 58 (`bundledNativeModules.json`).

## O que cada tentativa deu

1. **NativeWind 5 RC: passou (critérios 1 a 3).** Detalhes abaixo.
2. Uniwind gratuita: não tentada.
3. NativeWind 4.2.7 (Tailwind 3): não tentada.

## O que foi preciso (seguindo a documentação oficial do v5 e as páginas do Expo SDK 58)

Arquivos novos em `apps/mobile`:
- `postcss.config.mjs`: plugin `@tailwindcss/postcss` (tem de ser `.mjs` ou `.js`, não `.cjs`).
- `global.css`: os três imports do Tailwind separados (`theme` em camada, `preflight` em `base`, `utilities` sem camada) mais `nativewind/theme`, e o bloco `@theme` com os tokens (abaixo). Um único `@import "tailwindcss"` seria pior: a documentação avisa que as utilities podem ficar abaixo dos padrões do react-native-web.
- `metro.config.js`: `withNativewind(config, { inlineRem: 16, inlineVariables: { exclude: [...] } })`. A lista de exclusão é extraída de `global.css` (todo `--color-*`), para não manter duas listas.
- `nativewind-env.d.ts` (uma linha referenciando `react-native-css/types`) e `css.d.ts` (`declare module "*.css"`): o TypeScript 7 reclama do `import './global.css'` sem ele.

Arquivos alterados:
- `package.json`/`package-lock.json`: dependências novas e `overrides.lightningcss`. A instalação do pin rebaixou o lightningcss de 1.33.0 para 1.30.1 (só afeta CSS).
- `App.tsx`: `import './global.css'` (no `App.tsx`, não no `index.ts`, para o Fast Refresh funcionar).
- `tsconfig.json`: `exclude` de `node_modules` e `__spike__` (o teste do spike importa código-fonte `.ts` do react-native-css, que não passa no `tsc` do app).
- `src/theme/ThemeContext.tsx`: envolve os filhos em `VariableContextProvider` (ver tema).
- `src/screens/paciente/consultas/consultas.tsx`: convertida.
- `__spike__/` (teste de runtime, fora do app e do `tsc`).

`app.json` já tinha `userInterfaceStyle: "automatic"`. O `expo-system-ui` foi instalado porque a documentação do NativeWind 5 manda, mas a rota de variáveis usada aqui não depende dele (o modo do sistema chega pelo `useColorScheme` que o `ThemeContext` já usava). Não há mais preset Babel (a v5 não usa; o `babel.config.js` ficou igual). **Descoberta que muda o impacto do spike:** a v5 funciona reescrevendo no resolvedor do Metro todo `import ... from 'react-native'` (inclusive dentro de `node_modules`: react-navigation, bottom-sheet, gifted-charts, reanimated) para componentes que leem `className` (`globalClassNamePolyfill: true`, padrão do `withNativewind`); o mesmo vale para `react-native-safe-area-context`, trocado por uma versão que também lê `className`. Ou seja, mesmo as telas não convertidas passam a usar `View`/`Text`/`Touchable*`/`ScrollView`/`FlatList` embrulhados. Funcionalmente eles repassam `style` e `ref` (testado, ver abaixo), mas é a maior fonte de risco para os critérios 6 e 7 e custa um pouco de desempenho (alguns hooks por elemento).

## Como o tema escuro foi resolvido

A documentação do v5 dá dois caminhos: `dark:`/`@media (prefers-color-scheme)` (só enxerga o tema do sistema) e variáveis CSS trocadas em runtime com `VariableContextProvider`. O `ThemeContext` tem modo manual (sistema/claro/escuro) guardado à parte, então usei o segundo, sem `Appearance.setColorScheme` (que mudaria um estado global lido pelas telas de controle):

1. `global.css` declara em `@theme` uma variável por papel de `theme.colors` em kebab-case (`onPrimary` vira `--color-on-primary`; 23 cores), com o valor claro como padrão, mais `--radius-sm/md/lg/xl` = 8/12/16/28 (os valores de `theme.borderRadius`). Assim existem `bg-surface`, `text-on-surface`, `border-outline`, `rounded-lg` etc.
2. O Metro recebe `inlineVariables.exclude` com essas 23 cores. Sem isso o compilador **troca a variável pelo hex** e o tema nunca muda (confirmado em teste, ver abaixo).
3. `ThemeProvider` calcula as variáveis a partir do tema **efetivo** (`isDark`, que já considera sistema/claro/escuro) com `paraVariaveis(currentTheme.colors)` e as passa ao `VariableContextProvider` no topo da árvore. As telas não convertidas continuam lendo `useTheme()` como antes; nada nelas muda.
4. Fonte única dos valores: `src/theme/index.ts` manda em runtime (claro e escuro). Os valores claros no `global.css` são só o padrão e **duplicam** o claro de `index.ts` (risco de divergir; uma geração automática do bloco `@theme` a partir de `index.ts` resolveria, não feita aqui). As variáveis só entram no CSS compilado quando alguma classe as usa; o provider fornece todas, então isso não importa.

Cores passadas a props (não `style`) continuam vindo de `useTheme()`: `Feather color`, `ActivityIndicator color`, `RefreshControl tintColor/colors`, e `insets.top` ficou em `style`. Isso vale também para `@gorhom/bottom-sheet` e `gifted-charts` na conversão futura. A `SectionList` não ganha `className` no v5; foi preciso `styled(SectionList, { className: 'style', contentContainerClassName: 'contentContainerStyle' })` com um cast de tipo (o TypeScript estoura com "union type too complex" ao inferir os tipos da lista).

## Fidelidade de pixel (critério 4, o que dá para afirmar sem aparelho)

- O `rem` do NativeWind 5 vale **14** por padrão (lido no código do compilador: `effectiveRem = ... ?? 14`), não 16. Com isso `p-4`, `text-sm`, `leading-5` sairiam menores que no Tailwind web. Configurei `inlineRem: 16`. Confirmado no bundle: `p-4` = 16, `gap-1.5` = 6, `rounded-lg` = 16, `text-sm/5` = fontSize 14 + lineHeight 20, `font-bold` = 700.
- Tamanhos de fonte em px exatos (`text-[16px]`, `text-[13px]`, `text-[18px]`) em vez de `text-base`/`text-lg`, porque as classes nomeadas do Tailwind trazem `line-height` que o original não tem.
- Mapeamento usado: `padding 20/paddingBottom 40` = `p-5 pb-10`; `gap 4/6` = `gap-1`/`gap-1.5`; `width/height 44` = `h-11 w-11`; `flexGrow 1` = `grow`; textos `fontWeight 700/600` = `font-bold`/`font-semibold`.
- Não verificável aqui: renderização real em Hermes/Android. A issue aberta nº 1846 do NativeWind relata `font-bold` cortando texto no Android; o aluno deve olhar o título e as datas em negrito.

## Critérios 1 a 3 (evidência)

| # | Resultado | Evidência |
|---|---|---|
| 1 | **Passou.** `npx tsc --noEmit` sai com código 0 (também após `npm ci`). | Baseline: 0. Depois: 0. |
| 2 | **Passou.** `npx expo export --platform android --output-dir <scratchpad>/expo-export-nw` termina com código 0, antes e depois. | Baseline: 1806 módulos, bundle Hermes 4,8 MiB. Depois: 2061 módulos, 5,3 MiB (+0,5 MiB, +255 módulos). Aviso informativo no export: `react-native-css: global.css - 42 declarations dropped, no React Native equivalent` (o Preflight de navegador, sem efeito no RN; o `expo start` imprime 40). Também exportei sem minificar e sem bytecode e li o bundle: `bg-surface` compila para uma referência de variável (`[[{}, "var", "color-surface", 1], "backgroundColor", 1]`), não para hex. |
| 3 | **Passou.** `npx expo start --port 8099 --clear` sobe o Metro sem erro de configuração (rodado, capturado e encerrado; porta liberada). | Saída: "Waiting on http://localhost:8099" e só o aviso acima. O manifesto Android (`expo-platform: android`) responde, runtime `exposdk:58.0.0`, e o bundle de desenvolvimento que o Expo Go baixaria (`index.ts.bundle?platform=android&dev=true...`) retorna HTTP 200, 11,7 MB, "Android Bundled ... (2163 modules)". |

## Evidência extra sem aparelho: teste de runtime do tema

`apps/mobile/__spike__/tema.test.tsx` renderiza o **`ThemeProvider` real** com o CSS **compilado de verdade** pelo Tailwind (`global.css` passado pelo `@tailwindcss/postcss`) e o compilador do react-native-css, com `View`/`Text` que leem `className`. Resultados (4 de 4 passam):

- Claro: `bg-surface` = `#e6e9ef`, `border-outline` = `#bcc0cc`, texto `#4c4f69`, `rounded-lg` = 16, `p-4` = 16, `text-sm/5` = 14/20. Escuro (`setMode('dark')`): `#181825`, `#45475a`, `#cdd6f4` (os valores de `theme.dark`). Volta para claro com `setMode('light')` e `setMode('system')` (aparelho em claro).
- Sem o `inlineVariables.exclude`, a cor fica `#e6e9ef` mesmo no escuro (a armadilha da configuração).
- `View` sem `className` com `style={[{flex:1},{backgroundColor:'red'}]}` e `ref` repassa tudo como antes.
- `styled(SectionList, { className: 'style', contentContainerClassName: 'contentContainerStyle' })` com `contentContainerClassName="grow p-5 pb-10"` entrega ao contêiner de conteúdo `flexGrow 1`, `padding 20` e `paddingBottom 40` (igual ao `StyleSheet` original) e `className="bg-background"` vira o fundo do tema.
- `grow` = `{flexGrow: 1}`. `flex-1` = `{flexGrow: 1, flexShrink: 1, flexBasis: "0%"}`; no RN `flex: 1` é basis 0, então só difere em pai de altura indefinida (o `View` raiz da tela está num stack de altura definida, mas vale olhar no aparelho).

Isso prova o mecanismo (critério 5 na lógica), não o resultado no Expo Go. Como rodar (comando conferido: foi executado como escrito em `apps/mobile`, 4 de 4 passam; as dependências não ficam no `package.json`, e um `npm ci` depois as remove): `npm i --no-save jest@29 react-test-renderer@19.3.0 @react-native/jest-preset@0.88.1 && node __spike__/compile-css.mjs && npx jest -c __spike__/jest.config.js`. `jest-expo@58.0.14` não funcionou (precisa de `expo-modules-core`), por isso o preset é o `@react-native/jest-preset`.

## O que fica para o aluno (critérios 4 a 7)

Ver o roteiro. Não verificados por mim: abertura no Expo Go, aparência igual (4), troca de tema vista em tela (5), slider do check-in com Reanimated 4.7 dentro do `View` embrulhado (6), telas início/SOS/consentimento, folha da conta (`@gorhom/bottom-sheet`) e gráficos (`gifted-charts`) (7), iOS e web.

## Riscos e pontos de atenção

- **Pré-release.** `5.0.0-rc.1` (02/11/2026); a documentação diz que não é para produção. O par `nativewind`/`react-native-css` precisa ser fixado exato (já está, sem `^`).
- **Sem suporte declarado ao Expo 58 / RN 0.88**; a documentação foi escrita para Expo 57 / RN 0.86 e ainda cita rc.0.
- **Reescrita global de `react-native`** (acima): se 6 ou 7 falharem, a alternativa a testar é `globalClassNamePolyfill: false` no `metro.config.js` e importar `View`/`Text`/`TouchableOpacity` de `react-native-css/components` só nas telas convertidas. Não testei.
- **Reanimated:** o `react-native-css` tem integração própria com Reanimated (animações por `className`, sem custo, ao contrário da Uniwind Pro), mas não exercitei nenhuma. O `Animated.View` do app é `createAnimatedComponent(View)` sobre o `View` embrulhado.
- **Duplicação dos tokens claros** em `global.css` e `src/theme/index.ts`; os temas web e mobile já divergem (pesquisa anterior), então "tema igual ao do web" continua sendo trabalho à parte.
- **Peso:** +0,5 MiB no bundle Hermes e +255 módulos (+14%); custo de hooks por elemento na árvore toda (não medido).
- **Issues abertas do NativeWind citadas na pesquisa** (não verificadas em aparelho): `font-bold` cortando texto no Android (#1846), `@theme --font-sans` sem efeito no v5 RC (#1876; não usei fonte customizada), modificadores de opacidade `/50` (#1870, só v4, mas valem teste: `bg-primary/50` com variável não foi exercitado).
- **Preflight** é carregado (como a documentação manda); 40 a 42 declarações são descartadas com aviso no console do Metro (pode silenciar com `warnings: "none"`).
- `npm audit` mostra 11 vulnerabilidades no app (não comparei com o estado anterior à instalação).

## Esforço estimado para converter as telas principais (aproximação, não medida)

Números do app: 22 arquivos com `StyleSheet.create` (1128 linhas em `style*.ts`), 665 usos de `theme.colors.*` em 35 arquivos, 7207 linhas de `.tsx` em telas e componentes. `consultas.tsx` (234 linhas, 9 papéis de cor, só RN puro) levou algumas dezenas de minutos para mim, incluindo o mapeamento de valores e a checagem do bundle; para um aluno, conte 1 a 1,5 h por tela desse porte com a comparação visual nos dois temas.

- Telas simples e médias (login, registro, escalas, consentimento, bem-estar, chat, componentes de UI): cerca de 25 a 35 h.
- Telas com bibliotecas ou animação (check-in 795 linhas, SheetConta 690, SOS 593, responderEscala 565, home, dados com gráfico): 15 a 25 h, por causa de `styled` nos terceiros, cores em props e do risco de regressão em animação.
- Total aproximado: **40 a 60 h** para as telas do paciente, mais o ajuste do tema (gerar o `@theme` a partir de `index.ts`) e a revisão visual nos dois temas. A estimativa da pesquisa anterior para a Uniwind era 70 a 120 h; aqui o custo por tela é menor porque a animação por `className` não é paga, mas o risco de uma pré-release no caminho crítico antes de 05/12 continua. A decisão fica com o grupo depois dos critérios 4 a 7.

## Commits em `spike/nativewind`

- `7312ebd` feat(mobile): spike do NativeWind 5 RC com a tela de consultas convertida
- `947181d` test(mobile): teste de runtime do tema com NativeWind 5 (spike, fora do tsc)
- `029245f` test(mobile): cobre styled(SectionList) e flex-1 no teste de runtime do spike
