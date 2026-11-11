# Mobile: design system

> Levantamento em modo leitura, 10 e 11/11/2026. Agente `mobile_design`, Opus 5.5 (effort high). Nada foi executado além de leitura de código, `npm view/audit/outdated` e documentação pública; "verificado" quer dizer lido no código, não testado. Linhas citadas são do commit `0864143`.

## Resumo

O design system do mobile está pela metade. Existe um tema de cores com papéis M3 sobre Catppuccin (theme/index.ts) e um ThemeContext com modo sistema/claro/escuro, mas não há tipografia, elevação nem movimento como token. theme.spacing tem 0 usos e theme.borderRadius só 18, contra 129 raios escritos direto no código (32 valores distintos), 201 fontSize literais (25 tamanhos, de 9 a 34) e 29 hex + 13 rgba fora do tema. Nenhuma fonte é carregada: o app usa a fonte do sistema, enquanto a web usa Roboto Flex. Os tokens divergem da web em primary, secondary, tertiary, onSurfaceVariant e outline. O outline do mobile tem contraste de 1.5 a 1.9:1, o que deixa bordas de campos e opções praticamente invisíveis. Em relação ao M3 Expressive, a maioria dos componentes está parcial ou divergente: barra de navegação com 6 destinos e sem indicador ativo, botão principal com gradiente, slider fora do padrão, sem FAB, sem shape morph e sem molas tokenizadas. A acessibilidade básica é razoável (85 accessibilityRole, Switch com rótulo e dica, escala com radiogroup), mas há cerca de 17 tocáveis sem role, alvos abaixo de 48dp e limite de ampliação de fonte entre 1.1 e 1.4. Para o NativeWind: 23 arquivos com StyleSheet (cerca de 2.950 linhas), 678 referências a theme.colors e 54 estilos inline. A versão estável 4.2.7 exige Tailwind 3 e só declara suporte ao Expo SDK 57; a v5 (que usa Tailwind 4) ainda é RC.

## Relatório

## 1. Estrutura do tema (verificado)
- **Cores**: `apps/mobile/src/theme/index.ts:5-62` traz a paleta Catppuccin Latte e Mocha. `:67-164` mapeia papéis M3: primary, secondary e tertiary com containers, error/onError, background, surface, um único `surfaceContainer`, surfaceVariant, outline e `subtext1`, que é um papel fora do M3. **Faltam** outlineVariant, error container, os 5 níveis de surface container, inverse e scrim. `gradienteMarca` (`:170`) é um gradiente fixo, o mesmo nos dois temas.
- **Tipografia**: não existe como token. `grep fontFamily` = 0 resultados. O plugin `expo-font` está em `app.json`, mas nenhuma fonte é carregada, então o texto sai na fonte do sistema.
- **Espaçamento**: xs a xxl (4 a 48), com **0 usos** de `theme.spacing`.
- **Raios**: sm 8, md 12, lg 16, xl 28, full 999, com 18 usos. Faltam os degraus 4, 20, 32 e 48 da escala M3.
- **Elevação**: não há token. São 40 props de sombra escritas à mão (ex.: `SheetConta.tsx:523-527`, `StyleBemEstar.ts:52-58`).
- **Claro/escuro**: `ThemeContext.tsx:32-64` usa `useColorScheme` mais um modo persistido no SecureStore. O tema de navegação é derivado em `AppNavigator.tsx:45-56`.
- **Como os componentes consomem o tema**: `useTheme()` em 34 arquivos. Os StyleSheets são estáticos e as cores do tema entram em arrays inline (`[styles.x, {color: theme.colors.y}]`), com 678 ocorrências. Não há estilos gerados por função.

## 2. Web × mobile (verificado: `apps/web/src/styles/tokens.css`)
| Papel | Web (claro/escuro) | Mobile |
|---|---|---|
| primary claro | #8738ee | #8839ef |
| secondary claro | #4a5fd6 | #7287fd (2.67:1 sobre o próprio container) |
| tertiary claro | #127a80 | #179287 (a web registra a divergência em tokens.css:18) |
| onSecondaryContainer escuro | #dde3ff | #89b4fa |
| onTertiaryContainer escuro | #c6fff8 | #a6e3a1 |
| onSurfaceVariant | subtext1 | subtext0 (4.06:1 sobre surface no claro) |
| outline | overlay2/overlay1 (≥3:1) | surface1 (1.49 a 1.92:1) |

A web também tem: 10 degraus de forma, 30 papéis tipográficos (incluindo os enfáticos), state layers, molas M3 em `linear()` e regra de movimento reduzido. O mobile não tem nada disso. Os nomes também divergem (`--cor-primaria` × `primary`).

## 3. Conformidade com o M3 Expressive
- **Cor: parcial.** Os papéis existem, mas estão incompletos. Há hex fixos em 8 arquivos (ex.: `dados.tsx:14-17`, `sos.tsx:14`).
- **Tipografia: ausente.** São 25 tamanhos (incluindo 10.5, 12.5 e 13.5) e o peso 700/bold aparece 71 vezes. Não há diferença entre estilo base e enfático, e o botão usa 16 bold em vez de label large.
- **Forma e shape morph: divergente.** São 32 raios distintos (13, 17, 19, 21, 22, 26, 27…) e não há variedade de formas nem morph.
- **Movimento: parcial.** As molas de `ToqueAnimado.tsx:31-32` (ζ≈0.61 e 0.50) e do progresso (`checkin.tsx:339`, ζ≈0.79, k160) são ad hoc, não os tokens M3 (0.8/380 etc.). `BreathingCircle` usa `Animated.timing` de 900ms.
- **Botões: divergente.** `CustomButton` tem 56dp, gradiente e opacidade de desabilitado 0.5. Além dele, há pelo menos 5 implementações paralelas (btnVoltar, primaryAction, botões do modal do SOS, btnAceitar, exercicioBotao).
- **FAB: ausente.** O CTA de check-in é um card dentro do header.
- **Barra de navegação: divergente.** `MainTabNavigator.tsx:26-33` tem 6 destinos, quando o M3 pede de 3 a 5. Não há pílula de indicador ativo, o fundo é surface com borda, e a aba SOS fica sempre na cor de erro.
- **Campos: divergente.** O rótulo fica fora da caixa, não há estado de foco nem de erro no campo, e a borda de 1.5px usa o outline de baixo contraste.
- **Chips: parcial.** Não há componente. As tags de emoção da Home e as opções de qualidade do sono são improvisadas.
- **Cards: parcial.** Raios de 16 a 22, borda e sombra ao mesmo tempo.
- **Bottom sheet: parcial.** Só `SheetConta` usa o gorhom. `DocumentItem` e `MoodModal` imitam o sheet com `Modal`.
- **Diálogos: parcial.** A maioria usa `Alert` nativo. O diálogo do SOS (`sos.tsx:504-512`) tem raio 20, não os 28dp do M3.
- **Progresso: parcial.** Barras lineares de 6dp customizadas e ActivityIndicator. Não há loading indicator do Expressive.
- **Sliders: divergente.** Trilho de 6dp com thumb redondo de 22dp. O token M3 é trilho de 16dp e handle de 4×44dp (component-tokens.md:993).

**Os 10 pontos que mais tiram o app do M3 Expressive:**
1. Sem fonte e sem escala tipográfica.
2. Gradiente de marca no botão e no header, inclusive no escuro.
3. Barra de navegação com 6 abas, sem indicador.
4. Raios aleatórios e sem shape morph.
5. Elevação por sombra e borda em vez de tonal.
6. Slider fora do padrão.
7. Botões sem os tamanhos e o label do M3, e sem FAB.
8. Molas sem tokens.
9. Campos sem estados.
10. Papéis de cor incompletos e outline ilegível.

## 4. Valores fixos (verificado com grep em `src/`)
- 29 hex fora do tema e 13 rgba/rgb.
- 201 `fontSize` numéricos.
- 129 raios numéricos.
- 54 `style={{…}}` inline em 12 arquivos (sos 11, checkin 10, dados 9, MainTab 8).
- `styleDados.ts` (83 linhas) não é importado: código morto.

## 5. Acessibilidade
- **Contagens**: 85 `accessibilityRole`, 64 Label, 19 State, 6 Hint, 1 `accessibilityValue`, 53 `maxFontSizeMultiplier` (limites de 1.1 a 1.4 travam a ampliação; ex.: `GuidedExerciseModal.tsx:180`), 0 `allowFontScaling`.
- **Tocáveis sem role** (heurística), cerca de 17: `checkin.tsx:182,419,467,513,562,658`, `sos.tsx:399,556,573`, `MoodModal.tsx:123,138`, `GuidedExerciseModal.tsx:244,263`, `TechniqueModal.tsx:163`, `DocumentItem.tsx:132`, `login.tsx:93`, `dados.tsx:117`.
- **Alvos abaixo de 48dp**: 44dp nos botões de voltar; números da escala do slider com cerca de 28×44 (`styleCheckin.ts:136-147`); ações do contato no SOS com 36dp + hitSlop 4.
- **Contraste**, calculado com a fórmula WCAG:
  - outline: 1.49 a 1.92:1.
  - onSurfaceVariant/surface no claro: 4.06:1.
  - primary/primaryContainer: 3.88:1 (rótulos de 9 e 10.5px no MoodModal e no ExerciseCard).
  - texto branco sobre os avatares #D08C2E: 2.81:1.
  - barras do gráfico #B9CFFB e #D9CFF8: 1.2 a 1.3:1.
- **Movimento reduzido**: `ToqueAnimado` usa `useReducedMotion`; `ExercicioRespiracao` usa AccessibilityInfo; as layout animations do Reanimated seguem `ReduceMotion.System` por padrão (docs swmansion, consultadas em 2026-11-10). `BreathingCircle` ignora a configuração.
- **Sliders**: `accessibilityRole="adjustable"`, `accessibilityValue` e ações de aumentar/diminuir (`checkin.tsx:155-165`), bem feito.
- **Escalas**: radiogroup/radio com `checked` (`responderEscala.tsx:114-130`), bem feito.

## 6. UX dos fluxos centrais
- **Check-in**: tem 6 etapas de entrada, mas mostra "Etapa X de 7" porque a tela de sucesso conta como etapa 7 (`checkin.tsx:21,347`). A última etapa de entrada exibe 86%. O mínimo é de cerca de 7 toques. O tempo de 60 a 90 s é estimativa (suspeita, não medido).
  - Pontos bons: validação só na etapa 1, com aviso; resumo na etapa 6; confirmação de descarte; falha no envio abre um Alert e mantém os dados.
  - O rascunho fica só em memória (`rascunhoCheckin.ts:20`), embora os comentários prometam que ele sobrevive ao app ser encerrado (`checkin.tsx:241`). Isso é falso.
- **SOS**: aba sempre visível, então de qualquer aba são 2 toques (aba e depois "Preciso conversar…"), que liga direto.
  - Fora das abas (check-in, escala, consentimento) não há atalho para o SOS.
  - A tela não tem SAMU 192.
  - `canOpenURL('tel:')` (`sos.tsx:116`) pode falhar no Android 11+ sem `<queries>` (documentação do RN), e `app.json` não declara isso. Suspeita: testar em aparelho.
- **Escala**: um item por tela, botão Próximo desabilitado até haver resposta, revisão antes de enviar, `usePreventRemove`, e apoio CVV/SAMU/SOS se o item 9 do PHQ-9 for diferente de 0. Bom.
- **Consentimento**: Switch com rótulo e dica, salvamento explícito, confirmação nas ações destrutivas. Mas sair da tela com alterações não salvas descarta tudo sem aviso: não há `usePreventRemove`.

## 7. Fatos para migrar ao NativeWind
- **StyleSheet**: 23 arquivos.
  - 10 arquivos de estilo dedicados somam 2.020 linhas (StyleBemEstar 712, styleCheckin 363, styleHome 195, styleConsentimento 157, styleSOS 156, registroStyles 129, styleChat 92, styleDados 83, styleEsqueciSenha 82, loginStyles 51).
  - 13 blocos dentro de .tsx somam 932 linhas (responderEscala 219, SheetConta 188, DocumentItem 120, escalas 102…).
- **Estilos dinâmicos**: 678 `theme.colors` em 34 arquivos, a maioria por estado (selecionado/ativo). Isso vira `className` condicional. O que não é estilo continua em JS e precisa dos tokens também em JS: 86 `color={theme…}` em ícones, mais trackColor, placeholderTextColor, RefreshControl, ActivityIndicator, LinearGradient, o tema do navigation e o gifted-charts (`dados.tsx:137-200`: color1, yAxisTextStyle…).
- **Animações**: `useAnimatedStyle` em ToqueAnimado, checkin (fill, thumb, progresso) e home (parallax); `entering`/`exiting` em checkin; `Animated` do RN em BreathingCircle e ExercicioRespiracao. Os valores animados continuam em `style`.
- **Props de estilo de bibliotecas**: gorhom tem `backgroundStyle`, `handleStyle` e `handleIndicatorStyle` (`SheetConta.tsx:138-140`). Precisam de `cssInterop`/`remapProps` ou de continuar como style.
- **Versões** (npm view, 2026-11-10):
  - nativewind latest 4.2.7 depende de react-native-css-interop 0.2.7, que pede peer tailwindcss ~3 e reanimated ≥3.6.2.
  - A doc diz "v4.2.7 adds Expo SDK 57 support" e não fala do SDK 58, que é o do projeto.
  - 5.0.0-rc.1 (02/11/2026) pede tailwindcss >4.1.11 e react-native-css 3.1.0-rc.1.
  - Tailwind latest é 4.3.5. Se a web for para v4, o mobile no NativeWind 4 fica no Tailwind 3 e não dá para compartilhar a configuração.
- **Configuração necessária** (não existe hoje):
  - `babel.config.js`: `babel-preset-expo` com `jsxImportSource: "nativewind"` e `nativewind/babel`.
  - `metro.config.js` com `withNativeWind(config, {input})`. O arquivo não existe hoje.
  - `tailwind.config.js` com `nativewind/preset`.
  - `global.css` importado em App.tsx.
  - `nativewind-env.d.ts`.
  - Para o modo manual de tema, `darkMode:'class'` + `colorScheme.set` (provável).
- **Esforço por grupo**:
  - **G**: BemEstar (8 componentes + 712 linhas de estilo, sombras) e Check-in (gestos, Reanimated).
  - **M**: SheetConta/ui, SOS, Home (gradiente e parallax), Escalas + ResponderEscala, Auth (6 telas).
  - **P**: Consentimento, Consultas, Dados (gráficos continuam em JS), MainTab. Chat: P ou remover.
- **Riscos**:
  - Compatibilidade com o SDK 58 não confirmada.
  - v5 ainda RC.
  - Major do Tailwind diferente da web.
  - Dois sistemas de tema convivendo durante a transição.
  - O mobile não tem nenhum teste nem regressão visual.

## Achados

| Severidade | Confiança | Achado | Onde | Detalhe |
|---|---|---|---|---|
| alta | verificado | Contraste do outline de 1.5 a 1.9:1 nos dois temas | apps/mobile/src/theme/index.ts:98,146 | outline = surface1. Contrastes calculados: #bcc0cc sobre #eff1f5 = 1.61, sobre #e6e9ef = 1.49; #45475a sobre #181825 = 1.92, sobre #313244 = 1.38. É a borda de campos, opções do check-in e escala e cards. WCAG 1.4.11 pede 3:1 para o limite de controles. A web já corrigiu isso com overlay2/overlay1. |
| alta | suspeita | SOS checa canOpenURL('tel:') antes de discar | apps/mobile/src/screens/paciente/sos/sos.tsx:113-125; app.json | Segundo a documentação do RN, no Android 11+ canOpenURL rejeita ou retorna false sem <queries> no manifesto, e o app.json não declara isso. O usuário em crise veria 'Este dispositivo não suporta chamadas diretas'. responderEscala.tsx:84-90 e chat.tsx:76 chamam openURL direto. Testar em aparelho Android 11+. |
| media | verificado | Barra de navegação com 6 destinos, incluindo o Chat protótipo | apps/mobile/src/navigation/MainTabNavigator.tsx:26-33,100-143 | O M3 pede de 3 a 5 destinos. Não há pílula de indicador ativo (só a cor muda), o fundo é surface com borda superior em vez de surfaceContainer, e o Chat, que não será implementado, ocupa uma aba. |
| media | verificado | onSurfaceVariant claro abaixo de AA sobre surface | apps/mobile/src/theme/index.ts:95 | subtext0 #6c6f85 sobre surface #e6e9ef = 4.06:1 e sobre base = 4.37:1. É usado em placeholders (CustomInput sobre surface), subtítulos de DocumentItem e rótulos de métricas. A web usa subtext1, com 5.14:1. |
| media | verificado | Rascunho do check-in só em memória, contra o que dizem os comentários | apps/mobile/src/lib/rascunhoCheckin.ts:1-4,20; checkin.tsx:241-242 | É uma variável de módulo, sem persistência. Os comentários dizem que retoma depois de background kill, o que é falso: se o processo morrer, tudo se perde. Persistir no SecureStore ou corrigir a documentação no TCC. |
| media | verificado | Consentimento descarta alterações não salvas sem aviso | apps/mobile/src/screens/paciente/consentimento/consentimento.tsx:176-177,214-218 | 'alterado' só habilita o botão Salvar. O botão voltar e o voltar do Android saem sem confirmação, ao contrário de responderEscala.tsx:53, que usa usePreventRemove. Num fluxo de consentimento LGPD, o paciente pode achar que mudou algo que não mudou. |
| media | verificado | SOS sem atalho fora das abas e sem SAMU 192 | apps/mobile/src/navigation/AppNavigator.tsx:71-75; sos.tsx:11 | Check-in, escala, consentimento e consultas ficam empilhados sobre a barra de abas e não têm botão SOS. Do check-in, chegar ao SOS custa voltar, confirmar o descarte e tocar na aba. A tela SOS só tem CVV; o 192 existe apenas na conclusão do PHQ-9. |
| media | provavel | Linhas de contato do SOS com tocáveis aninhados e alvos de 36dp | apps/mobile/src/screens/paciente/sos/sos.tsx:399-449; styleSOS.ts:113-119 | O TouchableOpacity externo não tem role nem label e contém 3 botões de 36dp + hitSlop 4 (44dp, abaixo de 48). O pai acessível tende a engolir os filhos no VoiceOver/TalkBack. |
| media | verificado | Escala numérica dos sliders com alvos estreitos e fonte de 9-10px | apps/mobile/src/screens/paciente/checkin/checkin.tsx:180-193; styleCheckin.ts:136-147 | São 10 a 12 TouchableOpacity sem role, com cerca de 28x44dp cada, e números em fontSize 9/10 inline. O slider em si está acessível (adjustable + ações). |
| media | verificado | Sem fonte e sem escala tipográfica | apps/mobile/src (grep fontFamily = 0); app.json plugins | 201 fontSize literais com 25 valores (9 a 34, incluindo 10.5/11.5/12.5/13.5), 71 pesos 700/bold. Não usa Roboto Flex nem estilos enfáticos. Há 53 maxFontSizeMultiplier entre 1.1 e 1.4 que limitam a ampliação. |
| media | verificado | Tokens do mobile divergem da web | apps/mobile/src/theme/index.ts:70-146 × apps/web/src/styles/tokens.css:39-66 | Diferenças em primary (#8839ef × #8738ee), secondary (#7287fd × #4a5fd6; o mobile tem 2.67:1 sobre o container), tertiary (#179287 × #127a80), onSec/onTertContainer no escuro, onSurfaceVariant e outline. No mobile faltam outlineVariant, errorContainer e os 5 surface containers. |
| media | verificado | Cores fixas e com valência nos gráficos | apps/mobile/src/screens/paciente/dashboard/dados.tsx:14-17 | Hex fixos que não seguem o tema. #B9CFFB/#D9CFF8 têm 1.2-1.3:1 sobre surface claro. Ansiedade em coral #F4645C contraria a 'Regra Sem Valência' da web (DESIGN.md:160). |
| baixa | verificado | Botão principal e header com gradiente fixo, inclusive no escuro | apps/mobile/src/components/ui/CustomButton.tsx:72-83; home.tsx:157-161; theme/index.ts:170 | O M3 usa preenchimento sólido tonal. O gradiente claro #8839ef→#6047d0 aparece no tema escuro, onde primary é #cba6f7, e a web rejeita 'gradiente de SaaS' (DESIGN.md:110). |
| baixa | verificado | Tokens de espaço e forma praticamente sem uso | apps/mobile/src (grep) | theme.spacing tem 0 usos, theme.borderRadius tem 18 usos contra 129 raios literais (32 valores distintos), e há 29 hex + 13 rgba fora do tema. Isso torna a migração de tema cara. |
| baixa | provavel | Cerca de 17 tocáveis sem accessibilityRole | checkin.tsx:419,467,513,562,658; MoodModal.tsx:123,138; GuidedExerciseModal.tsx:244,263; TechniqueModal.tsx:163; DocumentItem.tsx:132; sos.tsx:556,573; login.tsx:93; dados.tsx:117 | Contagem por heurística de grep. Inclui ações primárias como 'Li e compreendi', 'Registrar no diário', 'Voltar' do check-in e os botões do diálogo do SOS. |
| baixa | verificado | Contador do check-in conta a tela de sucesso como etapa | apps/mobile/src/screens/paciente/checkin/checkin.tsx:21,250,347 | Mostra 'Etapa 1 de 7' e 86% na última etapa de entrada. São 6 etapas reais. O título '✓ Salvar Registro' faz o leitor de tela ler o glifo. |
| baixa | verificado | Texto branco sobre avatares com baixo contraste no SOS | apps/mobile/src/screens/paciente/sos/sos.tsx:14; styleSOS.ts:85-89 | Branco sobre #D08C2E = 2.81:1 e sobre #2E9E6B = 3.38:1 em iniciais de 14px. |
| baixa | verificado | BreathingCircle ignora movimento reduzido | apps/mobile/src/components/bemEstar/BreathingCircle.tsx:18-31 | Animated.timing de 900ms sem checar AccessibilityInfo. ExercicioRespiracao e ToqueAnimado fazem a checagem. |
| baixa | verificado | MoodModal promete 'diário', mas o registro fica só em estado local | apps/mobile/src/screens/paciente/BemEstar/BemEstar.tsx:100-102; MoodModal.tsx:133-135; StyleBemEstar.ts:678-683 | O registro some ao desmontar a tela. Os rótulos usam fontSize 9 em opções de 19% de largura. |
| info | verificado | NativeWind estável não declara suporte ao Expo SDK 58 | npm view nativewind (2026-11-10); nativewind.dev/docs/getting-started/installation | 4.2.7 depende de react-native-css-interop 0.2.7, que pede tailwindcss ~3; a doc fala em suporte ao SDK 57. A v5 é 5.0.0-rc.1 (Tailwind >4.1.11, react-native-css RC). Fazer uma prova de conceito antes de migrar. |
| info | verificado | Código morto de estilo e import sem uso | apps/mobile/src/screens/paciente/dashboard/styleDados.ts; navigation/AppNavigator.tsx:12 | styleDados.ts (83 linhas) não é importado por nenhum arquivo. BemEstar é importado no AppNavigator, mas não é registrado como Screen. |

## Perguntas para o grupo

- O Chat sai da barra de abas, voltando a 5 destinos ou menos como o M3 pede, já que a decisão é não implementá-lo?
- A web vai para Tailwind 4? Se sim, o mobile aceita NativeWind 5 em RC (Tailwind 4, mesma configuração) ou fica no NativeWind 4.2.7 (Tailwind 3, sem suporte declarado ao SDK 58)?
- Querem uma fonte única de tokens (por exemplo, gerar o theme do mobile a partir de tokens.css) para eliminar as divergências de primary, secondary, tertiary, onSurfaceVariant e outline?
- O mobile vai carregar Roboto Flex com expo-font, como a web, ou fica na fonte do sistema?
- O gradiente de marca no botão principal e no header da Home continua? A web e o M3 o rejeitam.
- O rascunho do check-in deve persistir em disco (SecureStore) ou o texto do TCC deve dizer que ele se perde se o app for encerrado?
- A tela SOS deve ganhar SAMU 192 e um atalho visível nas telas empilhadas (check-in, escala, consentimento)?
- Alguém pode testar em Android 11+ se o botão 'Preciso conversar com alguém' realmente disca (canOpenURL sem <queries>)?
