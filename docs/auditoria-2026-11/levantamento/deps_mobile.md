# Dependências: mobile

> Levantamento em modo leitura, 10 e 11/11/2026. Agente `deps_mobile`, Opus 5.5 (effort high). Nada foi executado além de leitura de código, `npm view/audit/outdated` e documentação pública; "verificado" quer dizer lido no código, não testado. Linhas citadas são do commit `0864143`.

## Resumo

O apps/mobile está no Expo SDK 58, o estável mais recente. Verificado: o dist-tag latest do expo é 58.0.23, o canary ainda é 58.0.0-canary-20260909 e não existe tag sdk-59. O SDK saiu em 2026-10-15 com RN 0.88 e React 19.3.0. As versões declaradas batem com o SDK, exceto três patches que o `expo install --check` aponta: expo 58.0.21→~58.0.23, expo-constants 58.0.14→~58.0.15 e react-native-safe-area-context 5.10.1→~5.11.1. O npm audit acha 12 avisos (2 high, 9 moderate, 1 low, 0 critical). Todos vêm de ferramentas de build: @expo/cli e @expo/config, mais o babel-plugin-module-resolver. Nenhum entra no bundle do app. Pela árvore de dependências no registry, o `expo install --fix` limpa zod, deepmerge e node-forge. Remover o babel-plugin-module-resolver (não é usado: o babel.config.js não o referencia e não há imports com alias) tira glob 9 e minimatch 8. Deve sobrar glob 13 e minimatch 10, moderados, dentro do próprio CLI do Expo. Não rodar `npm audit fix --force`: ele "corrige" rebaixando o expo para 53. O @react-navigation/bottom-tabs está declarado mas nunca é importado (a barra de abas é feita à mão sobre PagerView): remover. Falta eas.json para gerar o APK da banca. O metro.config.js só vira necessário se o NativeWind entrar. Recomendação para a reta final: só atualizar patches e limpar dependências. Não migrar para expo-router nem NativeWind (o NativeWind estável 4.2.7 exige Tailwind 3; o 5 ainda é RC). Não trocar gifted-charts, axios nem bottom-sheet.

## Relatório

# Auditoria de dependências: apps/mobile (2026-11-10)

## 1. SDK e plataforma (verificado)
- **Expo SDK 58 é o estável mais recente.** Dist-tags do `expo`: `latest` 58.0.23 (2026-11-05); `canary` ainda é `58.0.0-canary-20260909`; não há tag `sdk-59`. O changelog oficial data o lançamento em 2026-10-15 e diz que a Expo Go 58 chega às lojas "em algumas semanas".
- Docs v58: RN **0.88**, React **19.3.0**, react-native-web **0.21**, Node mínimo 22.13, Android 7+ (compileSdk 37, target 36), iOS 16.4+ e Xcode 26.4+.
- O projeto declara `react-native` 0.88.1 e `react`/`react-dom` 19.3.0 (`apps/mobile/package.json`), versões corretas para o SDK. O React 19.3.1 saiu hoje, mas o SDK fixa a 19.3.0: manter.
- `CI=1 npx --no-install expo install --check` (executado, sem alterar nada):
  - `expo@58.0.21` → ~58.0.23
  - `expo-constants@58.0.14` → ~58.0.15
  - `react-native-safe-area-context@5.10.1` → ~5.11.1
  - O typescript está excluído da checagem (`expo.install.exclude`).
- Lock e node_modules estão coerentes: as versões instaladas batem com o `package-lock.json` em todos os 31 pacotes.

## 2. Segurança (npm audit, verificado)
12 avisos: 2 high, 9 moderate, 1 low, 0 critical.
- **high:** zod 3.25.76, via @expo/cli (GHSA-mrhx-c7xc-m3w5).
- **moderate:** node-forge 1.4.2 (4 GHSAs), glob 9 e 13 (GHSA-3g3m-2fjr-6pw4), minimatch 8 e 10 (GHSA-g3hv-75wg-m249).
- **low:** deepmerge 4.3.1.

Todos vêm de ferramentas de CLI e build (`@expo/cli`, `@expo/config*`, `@expo/fingerprint`, `@expo/metro-config`) e do `babel-plugin-module-resolver`. Nenhum entra no bundle do app (inferência pelo `npm ls`).

Correção, conferida no registry:
- `expo@58.0.23` puxa `@expo/cli ^58.1.19`, que não depende mais de zod.
- Também puxa `@expo/config ~58.0.11`, sem deepmerge e sem glob.
- O `node-forge` sobe para 1.4.3.
- Remover o `babel-plugin-module-resolver` tira glob 9 e minimatch 8.
- Resíduo provável (suspeita, não instalei para confirmar): glob ^13 e minimatch ^10 dentro do próprio CLI. É aceitável.
- **Não rodar `npm audit fix --force`**: a correção que ele propõe é rebaixar para `expo@53.0.11`.

## 3. Achados no código (verificado por grep)
- **`@react-navigation/bottom-tabs` nunca é importado.** A barra de abas é manual, sobre `react-native-pager-view` (`src/navigation/MainTabNavigator.tsx`). Remover.
- **`babel-plugin-module-resolver` não é usado.** O `babel.config.js` só tem `babel-preset-expo` e não há imports `@/` ou `~/`. Além disso estava em `dependencies` quando deveria ser dev. Remover.
- **`react-native-web` e `react-dom` são necessários** enquanto o alvo web existir: há script `web` e ramos `Platform.OS === 'web'` em `src/lib/api.ts`, `authToken.ts`, `contatosConfianca.ts`, `hapticos.ts` e `src/theme/ThemeContext.tsx`.
  - Suspeita: o pager-view 9.0.7 não tem implementação web (não há `PagerView.web` em `lib/module`), então as abas podem quebrar no navegador.
  - Se ninguém usa o web, remover os dois pacotes junto com os ramos web.
- **Configuração:**
  - Não há `metro.config.js`. Ele é opcional no Expo; só será obrigatório com NativeWind.
  - Não há `eas.json`. Ele faz falta se a banca precisar de um APK: hoje o `android` é `expo run:android`, um dev build local.
  - O `expo-doctor` não foi executado (o `npx expo-doctor@latest` baixaria o pacote). Rodar antes da entrega.
- **Peers implícitos:**
  - `react-native-svg` e `expo-linear-gradient` são peers do gifted-charts.
  - `expo-font` é peer do `@expo/vector-icons`.
  - `react-native-worklets` é peer do Reanimated 4 (e o app usa `scheduleOnRN` em `checkin.tsx`).
  - `react-native-screens` é peer do native-stack.
  - Todos ficam.

## 4. Pacotes acima do SDK: não subir
| Pacote | Fixado pelo SDK 58 | latest no npm |
|---|---|---|
| react-native-gesture-handler | ~3.3.0 | 3.5.0 |
| react-native-pager-view | 9.0.7 | 10.0.0 |
| @react-native-async-storage/async-storage | 2.2.0 | 3.1.1 |
| react-native-svg | 15.16.0 | 15.16.1 |
| react-native-worklets | 0.13.0 | 0.13.1 |

O SDK fixa essas versões em `node_modules/expo/bundledNativeModules.json`, e as docs v58 confirmam a 2.2.0 do async-storage. Sair delas fica fora do conjunto que o Expo testou.

## 5. Saúde e alternativas
- **@gorhom/bottom-sheet 5.2.14:**
  - Sem commit nem release desde 2026-05-09 (API do GitHub), com 71 issues abertas. Issues novas citando SDK 58 continuam chegando (#2793, #2795).
  - Peers sem teto. Não encontrei relato de quebra com GH 3 ou Reanimated 4.7.
  - Só um uso (`src/components/ui/SheetConta.tsx`).
  - Alternativa oficial: `@expo/ui/community/bottom-sheet` 58.0.27, com API compatível. Mas abre como modal, ignora `BottomSheetBackdrop` e animação. → **manter agora, trocar depois (M)**. Testar no aparelho antes da banca.
- **react-native-gifted-charts 1.4.81:** ativo (commit em 2026-11-10). Dois gráficos em `dados.tsx`. O victory-native 43 exige Skia, Reanimated e GH e uma API nova; os blogs de 2026 o indicam para gráficos interativos e volumosos, o que não é o caso. → **manter**.
- **async-storage 2.2.0:** só atende o web e a migração da chave antiga para o SecureStore. → **manter**.
- **@expo/vector-icons 15.1.1:** ativo; ícones Feather em 26 arquivos. → **manter**. Trocar de família para alinhar com o M3 é decisão de design.
- **axios 1.21.0 → 1.21.1:** atualizar o patch. Manter em vez de fetch, porque os interceptors de sessão (`api.ts`) teriam de ser reescritos.
- **react-navigation 7 x expo-router 58:** o v8 do React Navigation ainda é alpha. No SDK 58 o expo-router reescreveu o núcleo de navegação. Migrar 13 telas tipadas e o pager na reta final custaria G sem ganho. → **manter**.
- **expo-notifications (F10 ausente segundo `docs/revisao-por-pares.md:45`):** lembrete local diário (~58.1.7) é viável sem backend. Push remoto, não. → **investigar (M)**.
- **TanStack Query no app:** padronizaria com o web, mas os hooks e services atuais são poucos. → **trocar depois (M)**.
- **NativeWind:**
  - O estável 4.2.7 exige `tailwindcss ~3` (via react-native-css-interop 0.2.7), enquanto o Tailwind mais recente é o 4.3.5.
  - O v5 ainda é `5.0.0-rc.1` e depende do react-native-css RC.
  - Exige `metro.config.js` e mexe em 23 `StyleSheet.create`.
  - → **trocar depois (G)**. Não fazer antes da banca.
- **Testes:** hoje não há nenhum no mobile. Opções: `jest-expo` ~58.0.13 (SDK) com `@testing-library/react-native` 14.1.0 para login, check-in e SOS; Maestro para um fluxo E2E. → **investigar (M)**.

## 6. Plano mínimo (custo P, em ordem)
1. `npx expo install --fix`
2. Remover `babel-plugin-module-resolver` e `@react-navigation/bottom-tabs`.
3. `npm update axios`
4. `npx expo-doctor@latest`
5. Decidir se o alvo web continua.
6. Criar `eas.json` se precisar de APK.
7. Rodar o `npm audit` de novo: deve sobrar só glob e minimatch do CLI.

## Limitações
- Não rodei o expo-doctor, builds nem o app.
- A compatibilidade bottom-sheet × GH 3 é inferida só pelos peers e pela ausência de issues.
- O `time.modified` do npm é a data da última alteração no registro do pacote, não necessariamente a data da versão instalada.
- Não abri o `.env`.

## npm audit e outdated

npm audit (2026-11-10), 665 dependências: 0 critical, 2 high, 9 moderate, 1 low, total 12. Fonte: `npm audit --json`, metadata.
- HIGH zod 3.25.76 (GHSA-mrhx-c7xc-m3w5, versões <4.6.6). Chega por expo > @expo/cli@58.1.17; o @expo/cli aparece como high por causa dele.
- MODERATE node-forge 1.4.2 (GHSA-6889-vf6x-f3g5, GHSA-w4xr-hqv8-ch44, GHSA-6cv4-p8m7-4r25, GHSA-j8rw-jp99-435v), via @expo/cli e @expo/code-signing-certificates.
- MODERATE glob 9.3.5 e 13.0.6 (GHSA-3g3m-2fjr-6pw4, 9.0.0–14.0.1) e minimatch 8.0.7 e 10.2.6 (GHSA-g3hv-75wg-m249, <11.0.1). Chegam via babel-plugin-module-resolver (dependência direta) e via @expo/cli, config, config-plugins, fingerprint e metro-config.
- MODERATE (só por propagação) expo, @expo/config, @expo/config-plugins, @expo/fingerprint, @expo/metro-config, babel-plugin-module-resolver.
- LOW deepmerge 4.3.1 (GHSA-gcqx-w48m-w2h4), via @expo/config 58.0.9.
Tudo isso é ferramenta de CLI e build; nada vai para o bundle JS do app (inferido pela árvore do `npm ls`).
Correção verificada no registry: o expo@58.0.23 puxa @expo/cli ^58.1.19 (que não depende mais de zod), @expo/config ~58.0.11 (sem deepmerge e sem glob), @expo/metro-config ~58.0.21 e @expo/config-plugins ~58.0.12. O node-forge sobe para 1.4.3 quando o lock é refeito. Remover o babel-plugin-module-resolver tira glob 9 e minimatch 8.
Resíduo esperado (suspeita, não testei instalando): glob ^13 e minimatch ^10.2.2 dentro de @expo/cli e @expo/fingerprint, ambos moderados. Aceitável, porque roda só na máquina de quem desenvolve.
Não use `npm audit fix --force`: o fixAvailable proposto é expo 53.0.11, um rebaixamento de major.

## Pacotes

| Pacote | Declarada | Instalada | Última | Defasagem | Vulnerabilidades | Ação | Justificativa |
|---|---|---|---|---|---|---|---|
| expo | ~58.0.21 | 58.0.21 | 58.0.23 (time.modified 2026-11-05) | 2 patches | moderate por propagação (@expo/cli, @expo/fingerprint) | atualizar | O expo install --check pede ~58.0.23, e a 58.0.23 tira zod, deepmerge e node-forge vulneráveis da árvore. Usar npx expo install --fix. Custo P. |
| expo-constants | ~58.0.14 | 58.0.14 | 58.0.15 | 1 patch | nenhuma | atualizar | O expo install --check pede ~58.0.15. Usado em src/lib/api.ts (hostUri). Custo P. |
| react-native-safe-area-context | ~5.10.1 | 5.10.1 | 5.11.1 (2026-11-03) | 1 minor | nenhuma | atualizar | O expo install --check pede ~5.11.1, mas o bundledNativeModules.json instalado (do expo 58.0.21) ainda diz ~5.10.1: a mudança vem do expo 58.0.23. Usado em 21 arquivos. Custo P. |
| babel-preset-expo | ~58.0.0 | 58.0.22 | 58.0.24 | 2 patches | nenhuma | atualizar | Sobe junto com o expo 58.0.23, que depende de ~58.0.24. Custo P. |
| react | 19.3.0 | 19.3.0 | 19.3.1 (2026-11-10) | 1 patch, lançado hoje | nenhuma | manter | O SDK 58 fixa react 19.3.0 (docs v58 e bundledNativeModules). Não sair do que o SDK pede. |
| react-dom | 19.3.0 | 19.3.0 | 19.3.1 | 1 patch | nenhuma | manter | Peer obrigatório do react-native-web. O app tem script web e vários ramos Platform.OS === 'web' (authToken, api, ThemeContext, contatosConfianca, hapticos). Só remover junto com o react-native-web, se o grupo abandonar o alvo web. |
| react-native | 0.88.1 | 0.88.1 | 0.88.1 | nenhuma | nenhuma | manter | É a versão que o SDK 58 espera (RN 0.88). |
| react-native-web | ^0.21.4 | 0.21.4 | 0.21.4 | nenhuma | nenhuma | investigar | Bate com o SDK (~0.21.4). É necessário só se a versão web do app for usada (para testar no navegador). Suspeita: o react-native-pager-view não tem implementação web (não há PagerView.web em lib/module), então as abas podem quebrar no navegador. Se ninguém usa o web, remover junto com o react-dom e os ramos web. Custo P a M. |
| @react-navigation/native | ^7.3.4 | 7.5.1 | 7.5.1 (8.0.0-alpha no next) | nenhuma | nenhuma | manter | O v7 está estável e o v8 ainda é alpha. Migrar para o expo-router agora traria custo G sem ganho para a banca. |
| @react-navigation/native-stack | ^7.17.6 | 7.21.0 | 7.21.0 | nenhuma | nenhuma | manter | Stack raiz em AppNavigator.tsx. |
| @react-navigation/bottom-tabs | ^7.18.13 | 7.21.0 | 7.21.0 | nenhuma | nenhuma | remover | Nenhum import em src/ nem em App.tsx (grep verificado): a barra de abas é manual, sobre PagerView (MainTabNavigator.tsx). É dependência morta. Custo P. |
| react-native-screens | ~4.30.0 | 4.30.1 | 4.30.1 | nenhuma | nenhuma | manter | Peer do native-stack; bate com o SDK. |
| react-native-gesture-handler | ~3.3.0 | 3.3.0 | 3.5.0 (2026-11-05) | 2 minors | nenhuma | manter | O SDK 58 fixa ~3.3.0. Passar disso sai do que o Expo testou. Usado em App.tsx e checkin.tsx, e é peer do bottom-sheet. |
| react-native-reanimated | 4.7.1 | 4.7.1 | 4.7.1 | nenhuma | nenhuma | manter | Bate com o SDK. Usado em ToqueAnimado, home e checkin. |
| react-native-worklets | 0.13.0 | 0.13.0 | 0.13.1 | 1 patch | nenhuma | manter | O SDK fixa 0.13.0, par do Reanimated 4.7.1. scheduleOnRN é usado em checkin.tsx. |
| react-native-svg | 15.16.0 | 15.16.0 | 15.16.1 | 1 patch | nenhuma | manter | O SDK fixa 15.16.0. É peer do gifted-charts; o app não importa direto. |
| react-native-pager-view | 9.0.7 | 9.0.7 | 10.0.0 (2026-11-04) | 1 major | nenhuma | manter | O SDK 58 fixa 9.0.7. Não subir para o 10. Sustenta as 6 abas. |
| @react-native-async-storage/async-storage | 2.2.0 | 2.2.0 | 3.1.1 | 1 major | nenhuma | manter | As docs v58 recomendam 2.2.0. Hoje ele só serve ao web e à migração da chave antiga de contatos para o SecureStore (contatosConfianca.ts). Não subir para o 3. |
| @gorhom/bottom-sheet | ^5.2.14 | 5.2.14 | 5.2.14 (release 2026-05-09) | nenhuma | nenhuma | manter | Só um uso (SheetConta.tsx). Alternativa oficial: @expo/ui/community/bottom-sheet (~58.0.27), com API compatível. Só que ela abre como modal, não renderiza inline e ignora BottomSheetBackdrop: avaliar depois da banca (trocar_depois, custo M). Testar o sheet no aparelho antes da apresentação. |
| react-native-gifted-charts | ^1.4.78 | 1.4.81 | 1.4.81 | nenhuma | nenhuma | manter | Só LineChart e BarChart em dados.tsx. Renderiza em SVG, sem Skia. O victory-native 43 exige Skia, Reanimated e Gesture Handler e uma API nova: custo M sem ganho visível para dois gráficos. |
| expo-linear-gradient | ~58.0.3 | 58.0.3 | 58.0.3 | nenhuma | nenhuma | manter | Usado em CustomButton e home, e é peer do gifted-charts. |
| @expo/vector-icons | ^15.0.2 | 15.1.1 | 15.1.1 | nenhuma | nenhuma | manter | Usado em 26 arquivos, quase todos com Feather. Trocar de família por coerência com o M3 (ex.: MaterialCommunityIcons do mesmo pacote) é escolha de design, não de dependência. |
| expo-font | ~58.0.11 | 58.0.11 | 58.0.11 | nenhuma | nenhuma | manter | Peer do @expo/vector-icons (>=14.0.4) e plugin no app.json. O código não carrega nenhuma fonte própria. |
| expo-secure-store | ~58.0.2 | 58.0.2 | 58.0.2 | nenhuma | nenhuma | manter | Guarda o token e os contatos de confiança com WHEN_UNLOCKED_THIS_DEVICE_ONLY. Essencial para dado sensível. |
| expo-contacts | ~58.0.10 | 58.0.10 | 58.0.10 | nenhuma | nenhuma | manter | Usado no SOS (sos.tsx). |
| expo-haptics | ~58.0.7 | 58.0.7 | 58.0.7 | nenhuma | nenhuma | manter | Usado em lib/hapticos.ts. |
| expo-status-bar | ~58.0.4 | 58.0.4 | 58.0.4 | nenhuma | nenhuma | manter | Usado em App.tsx. |
| axios | ^1.19.0 | 1.21.0 | 1.21.1 (2026-11-09) | 1 patch | nenhuma no audit | atualizar | npm update axios (fica dentro do ^). Manter axios em vez de fetch: os interceptors de Bearer e de sessão expirada (api.ts) e o isAxiosError (escalasService, vinculoService) teriam de ser reescritos à mão. Custo P. |
| babel-plugin-module-resolver | ^5.0.3 | 5.0.3 | 5.0.3 (sem release recente) | nenhuma | moderate direta (glob 9.3.5 e minimatch 8.0.7) | remover | O babel.config.js só usa babel-preset-expo e não há imports com alias (@/ ou ~/), então o plugin não é usado. Além disso estava em dependencies, quando deveria ser dev. Remover elimina um aviso direto. Custo P. |
| @types/react | ~19.3.0 | 19.3.0 | 19.3.0 | nenhuma | nenhuma | manter | Corresponde ao React 19.3. |
| typescript | ^7.0.2 | 7.0.2 | 7.0.2 | nenhuma | nenhuma | manter | Está em expo.install.exclude, então o Expo não valida a versão. O Metro transpila via Babel e a revisão anterior registra o tsc --noEmit passando. Compatibilidade com o tsconfig base do Expo: suspeita, não verificada. |

## Alternativas avaliadas

| Tema | Opções | Recomendação | Custo | Justificativa |
|---|---|---|---|---|
| Expo SDK | ficar no SDK 58 ou esperar o 59 | manter o 58 e aplicar os patches com npx expo install --fix | P | O 58 é o latest (58.0.23) e não há sdk-59 nem canary do 59. Lançado em 2026-10-15 com RN 0.88 e React 19.3.0, e Expo Go 58 anunciado para as lojas. |
| Arquivos de configuração (metro.config.js, eas.json, expo-doctor) | criar eas.json; rodar npx expo-doctor@latest; criar metro.config.js | investigar: criar eas.json (perfil preview com APK) se a banca precisar de um app instalável, já que o script android usa expo run (dev build local). Rodar expo-doctor@latest (1.21.6), que não precisa ir para devDependencies. Criar metro.config.js só se o NativeWind entrar. | P | O metro.config.js é opcional no Expo por padrão. O expo-doctor não foi executado aqui porque baixaria o pacote, o que o modo leitura não permite. |
| Navegação: react-navigation 7 x expo-router | manter o react-navigation 7, migrar para o expo-router 58.0.30 | manter | G | No SDK 58 o expo-router reescreveu o núcleo de navegação e deixou de carregar a maior parte do fork do React Navigation. A migração mexeria em 13 telas tipadas e no pager de abas: risco alto na reta final. |
| Gráficos | gifted-charts, victory-native 43 (Skia), react-native-svg puro | manter o gifted-charts | M | São dois gráficos simples. O victory-native acrescenta Skia nativo (o bundledNativeModules dá @shopify/react-native-skia 2.14.0) e uma API nova. Desenhar em SVG puro é mais código. |
| Bottom sheet | @gorhom/bottom-sheet 5.2.14, @expo/ui/community/bottom-sheet 58.0.27 | trocar_depois | M | O gorhom está sem release desde maio de 2026, mas funciona e é usado em um arquivo só. A opção do @expo/ui é nativa e fica no Expo Go, porém é modal e ignora backdrop e animação customizados. |
| HTTP: axios x fetch | axios, fetch nativo | manter o axios | M | Os interceptors fazem a lógica de sessão (versaoSessao, 401/403). Trocar não traz ganho. |
| Busca de dados (TanStack Query no app) | hooks manuais (useConsultas), @tanstack/react-query 5.107.1 | trocar_depois | M | O web já usa TanStack Query, então padronizar ajudaria. Mas o app tem poucos services (cerca de 25 chamadas) e a troca não é necessária para a banca. |
| Notificações (F10) | expo-notifications ~58.1.7, só com notificações locais; push remoto | investigar | M | A revisão por pares marca F10 como ausente. Lembrete local diário de check-in não exige servidor de push e cabe no prazo. Push remoto exige dev build, FCM/APNs e backend: fica fora. |
| Estilo: StyleSheet x NativeWind | NativeWind 4.2.7 (Tailwind 3), NativeWind 5.0.0-rc.1 (Tailwind >4.1.11 e react-native-css RC) | trocar_depois | G | O estável usa Tailwind 3, enquanto o Tailwind mais recente é o 4.3.5, o que deve divergir do web. O v5 ainda é RC. São 23 arquivos com StyleSheet.create. Migrar exige metro.config.js e babel novos: custo alto e pouco ganho na reta final. |
| Testes | jest-expo ~58.0.13 + @testing-library/react-native 14.1.0; Maestro (E2E) | investigar | M | O mobile não tem nenhum teste. Um jest-expo com RNTL para 2 ou 3 telas críticas (login, check-in, SOS) dá evidência para a banca. Maestro em YAML para um fluxo E2E, se houver tempo. |

## Fontes

- https://docs.expo.dev/versions/v58.0.0/ (consultado em 2026-11-10)
- https://expo.dev/changelog/sdk-58 (publicado em 2026-10-15)
- https://docs.expo.dev/versions/v58.0.0/sdk/ui/drop-in-replacements/bottomsheet/
- https://docs.expo.dev/versions/v58.0.0/sdk/async-storage/
- https://registry.npmjs.org (npm view: version, time.modified, dist-tags, dependencies; 2026-11-10)
- https://api.github.com/repos/gorhom/react-native-bottom-sheet (pushed_at 2026-05-09)
- https://github.com/gorhom/react-native-bottom-sheet/issues/2793
- https://github.com/gorhom/react-native-bottom-sheet/issues/2795
- https://api.github.com/repos/Abhinandan-Kushwaha/react-native-gifted-charts
- https://api.github.com/repos/FormidableLabs/victory-native-xl
- https://api.github.com/repos/callstack/react-native-pager-view
- https://api.github.com/repos/react-native-async-storage/async-storage
- https://docs.swmansion.com/react-native-reanimated/docs/guides/migration-from-3.x/
- https://reactnativerelay.com/article/react-native-charts-victory-native-interactive-data-visualizations-expo
- https://www.pkgpulse.com/guides/victory-native-vs-react-native-chart-kit-vs-echarts-rn-2026
- https://github.com/advisories/GHSA-mrhx-c7xc-m3w5
- https://github.com/advisories/GHSA-3g3m-2fjr-6pw4
- https://github.com/advisories/GHSA-g3hv-75wg-m249
- https://github.com/advisories/GHSA-gcqx-w48m-w2h4
- https://github.com/advisories/GHSA-6889-vf6x-f3g5
- apps/mobile/package.json
- apps/mobile/package-lock.json
- apps/mobile/node_modules/expo/bundledNativeModules.json
- apps/mobile/babel.config.js
- apps/mobile/src/navigation/MainTabNavigator.tsx
- apps/mobile/src/lib/api.ts
- docs/revisao-por-pares.md
