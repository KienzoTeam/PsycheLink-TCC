# Pesquisa: Material 3 Expressive e tipografia

> Levantamento em modo leitura, 10 e 11/11/2026. Agente `pesquisa_m3_expressive`, Opus 5.5 (effort high). Nada foi executado além de leitura de código, `npm view/audit/outdated` e documentação pública; "verificado" quer dizer lido no código, não testado. Linhas citadas são do commit `0864143`.

## Resumo

O M3 não exige Google Sans. O padrão documentado continua sendo Roboto/Roboto Flex, e o sistema prevê os slots de fonte "brand" (display/headline) e "plain" (body/label) para trocar de fonte. Google Sans, Google Sans Flex e Google Sans Code estão sob OFL-1.1 no Google Fonts e no Fontsource em 11/2026. Sem Reserved Font Name; o nome "Google Sans" é marca registrada. O designer tem razão quando diz que a interface "não parece M3 Expressive", mas o motivo quase nunca é a fonte: faltam os componentes e os sinais do Expressive (tamanhos XS–XL de botão, button groups, split button, loading indicator, toolbars, navigation rail no lugar da gaveta, biblioteca de formas, cor mais saturada). Recomendação: no web, manter Roboto Flex como "plain". Opcionalmente usar Google Sans Flex como "brand" só em display/headline nos dois apps. Descartar Cormorant Garamond na UI. Gerar os acentos e os níveis de contraste com Material Color Utilities a partir dos matizes Catppuccin.

## Recomendação

Painel web: manter Roboto Flex em body, label e title. Os algarismos dela já são tabulares por padrão (verificado: todos os dígitos com avanço 1156). Corrigir os tokens enfáticos para seguir o M3: Medium (500), não 600, em display/headline/title-large; o M3 muda só peso e tracking, nunca largura. Corrigir também a afirmação sobre opsz em DESIGN.md:221: o arquivo wdth.css importado só tem os eixos wght e wdth. Opcional: Google Sans Flex como "brand" só em display/headline (subset latin wght ~50 KB; com wdth ~119 KB). Isso dá eixos wdth e ROND para os estilos enfáticos.

App mobile: hoje usa a fonte do sistema, sem fontFamily. Carregar via expo-font a mesma dupla (Google Sans Flex para display/headline, com ROND para um tom acolhedor, e Roboto Flex ou fonte do sistema no texto corrido). fontVariationSettings precisa ser testado no aparelho.

Não usar Cormorant Garamond na interface: no máximo no logotipo ou em um hero editorial. Outfit só serve como brand de display se a equipe quiser manter a identidade antiga, e sem eixo wdth.

Para "parecer M3 Expressive", investir primeiro em componentes, forma e cor. Ordem sugerida:
1. Escala de botões XS–XL e button groups.
2. Navigation rail recolhida/expandida no lugar da gaveta.
3. Loading indicator com forma que se transforma e progresso ondulado.
4. Toolbar flutuante ou docked.
5. Uma ou duas formas da biblioteca em elementos decorativos.
6. Esquema MCU (SchemeContent/Fidelity com seed mauve, spec 2025, contrastLevel 0/0.5/1) ligado a prefers-contrast.

No mobile, corrigir já os pares de contraste reprovados.

## Relatório

## 1. O que define o M3 Expressive (verificado, salvo indicação)

O M3 Expressive é uma evolução do M3 lançada em maio de 2025, não um "M4". A pesquisa por trás dele: 46 estudos, mais de 18 mil participantes, elementos-chave achados até 4× mais rápido (design.google, research). Táticas: forma, cor, tipografia, contenção, movimento, flexibilidade de componentes e "hero moments" (1 ou 2 por produto).

- **Cor:** os mesmos papéis do M3, com esquemas mais vibrantes e uso de primary/secondary/tertiary para criar hierarquia. Geração em HCT, com paletas tonais 0–100 e três níveis de contraste: padrão, médio (mínimo 3:1) e alto (7:1). O MCU 0.4.0 tem `color_spec_2025` e `contrastLevel` de −1 a 1 (verificado no pacote npm).
- **Tipografia:** 15 estilos base mais 15 enfáticos, com mesmo tamanho e entrelinha; muda só peso e tracking. Display/headline/body vão de Regular para Medium; title-m/s e todos os labels vão de Medium para Bold. Os componentes não usam os estilos enfáticos por padrão. Fontes variáveis "ainda não fazem parte do typescale".
- **Forma:** escala de 10 passos: 0/4/8/12/16/**20**/28/**32**/**48**/full (em negrito, os passos novos). Biblioteca de 35 formas e shape morph. Regra de aninhamento: raio interno = raio externo − padding. Formas abstratas só em elementos decorativos e imagens.
- **Movimento:** molas em vez de easing com duração.
  - Expressive spatial: padrão ζ0.8/k380, rápida ζ0.6/k800, lenta ζ0.8/k200.
  - Effects (cor e opacidade): sempre ζ1, k1600/3800/800, sem overshoot.
  - Esquema Standard: spatial ζ0.9.
- **Componentes novos:** button groups, split button, FAB menu, loading indicator e toolbars (docked e floating).
- **Componentes atualizados:** botões, icon buttons, FAB, extended FAB, app bars, navigation bar, navigation rail, progress indicators e sliders.
- **Tamanhos:** botões em 5 tamanhos (XS 32, S 40, M 56, L 96, XL 136 dp), formato redondo ou quadrado, e morph ao pressionar. Extended FAB S/M/L em 56/80/96 dp.
- **O que deixou de ser recomendado:** small FAB, app bars medium/large baseline (trocar pelas "flexible"), bottom app bar (trocar pela docked toolbar), navigation bar baseline (trocar pela flexible) e navigation drawer (trocar pela navigation rail expandida).
- **Compose material3:** a 1.5.0 está em rc01 (04/11/2026); a estável ainda é a 1.4.0. Já passaram para não experimental: MotionScheme, ButtonGroup, SplitButton, FAB menu, FloatingToolbar e as app bars flexíveis. MaterialShapes e LoadingIndicator tiveram a promoção revertida na alpha19.

## 2. Tipografia

- **O M3 não exige Google Sans (verificado).** O padrão continua sendo Roboto, com Roboto Flex como versão variável e fallback Roboto Flex → Roboto → Noto. O sistema prevê os tokens de fonte **brand** (display/headline/title-large, foco em expressão) e **plain** (body/label, foco em legibilidade) justamente para trocar de fonte.
- **Licença (verificada no METADATA.pb do google/fonts e na API do Fontsource em 10/11/2026):** Google Sans, Google Sans Flex e Google Sans Code são OFL-1.1. O cabeçalho do OFL não tem Reserved Font Name. A tabela name do Flex diz "Google Sans is a trademark of Google": dá para usar e embutir livremente, mas não para apresentar uma versão modificada com esse nome. A abertura das fontes é de 2025 (Flex em 18/11/2025, segundo a imprensa).
- **Eixos (verificados nos arquivos):**
  - Google Sans: wght 400–700, opsz 17–18, GRAD −50/200; sem wdth.
  - Google Sans Flex: ROND, opsz 1–144, slnt, wdth 25–151 e wght 1–1000. **Não tem GRAD**, apesar de o texto do design.google falar em "seis eixos incluindo grade".
  - Roboto Flex: 13 eixos, inclusive GRAD.

## 3. Avaliação dos pares

| Critério | Cormorant + Outfit | Só Roboto Flex | Google Sans Flex | Brand em display/headline + sans de trabalho |
|---|---|---|---|---|
| Legibilidade em tamanho pequeno | Cormorant ruim (display, traço fino: consenso tipográfico, suspeita) | Boa | Boa | Boa |
| Algarismos tabulares | tnum nas duas (verificado) | **Tabulares por padrão** | Proporcionais por padrão, tnum disponível | Depende da sans |
| Eixos para os estilos enfáticos | Só wght | wght/wdth/GRAD/opsz | wght/wdth/ROND/opsz | Sim |
| Acentos pt-BR | OK (verificado) | OK | OK | OK |
| Peso do subset latin em woff2 | 38 KB + 32 KB | wdth 58 KiB (atual); full 319 KiB | wght 50 KB; wdth 119 KB; full 1,4 MB | +50–120 KB |
| Coerência com o M3 | Baixa no painel | Alta (é o padrão) | Alta (fonte que se associa ao Expressive) | Alta (é o modelo brand/plain) |

- **(a) Painel clínico:** Roboto Flex como plain. Os dígitos tabulares de fábrica servem a escores e datas. Google Sans Flex é opcional como brand.
- **(b) App mobile:** brand Google Sans Flex com ROND em display/headline e uma sans de trabalho no corpo. O RN documenta `fontVariationSettings`, mas o suporte por plataforma não está claro: testar no aparelho. Cormorant só como wordmark.

**Onde o designer acerta:** as fontes são gratuitas (OFL). E a percepção de "não é Expressive" provavelmente procede, mas por falta de componentes, forma e cor (ver seção 6).

**Onde é opinião:** "Material só fica bom com Google Sans" contradiz a própria documentação, que tem Roboto como padrão e prevê slots de marca. Usar Google Sans também aproxima o visual de um produto Google, o que é discutível para uma marca própria.

**Desvios no repositório (verificados):**
- tokens.css:138-152: os enfáticos usam 600 e `semi-expanded`. O M3 pede Medium (500) e não muda largura nem implementa tracking.
- DESIGN.md:221 diz que "o eixo opsz automático" ajusta o espaçamento, mas main.tsx:5 importa `wdth.css`, que só tem wght e wdth (sem opsz e sem GRAD).
- O mobile não define fontFamily.

## 4. Catppuccin sobre os papéis do M3

É compatível como **esquema estático personalizado**. O M3 permite cor de marca, e o web já mapeia os 5 containers na ordem tonal certa e corrigiu contrastes (tokens.css:38-81).

O que se perde em relação ao Material Color Utilities:
- relações tonais garantidas entre papéis (o par por distância de tom);
- níveis de contraste médio e alto (não há `prefers-contrast`);
- papéis fixed, inverse-primary e surface-dim/bright (ausentes);
- cor dinâmica;
- croma: o Mocha é pastel, de croma baixo, e soa menos "vibrante".

**No mobile (theme/index.ts, contrastes calculados):**
- lavender sobre branco: 3,18:1;
- teal sobre branco: 3,82:1;
- onSurfaceVariant sobre mantle: 4,06:1;
- outline surface1 sobre mantle: 1,49:1.

Os três primeiros ficam abaixo de 4,5:1 para texto pequeno. O outline, se usado como borda de alvo, fica abaixo de 3:1.

**Como conciliar:** manter os neutros do Catppuccin (base/mantle/crust) como identidade e gerar com MCU (spec 2025, SchemeContent ou Fidelity com seed mauve) as paletas de primary/secondary/tertiary/error e os níveis de contraste 0/0,5/1. Em seguida, ajustar à mão os tons que fugirem muito do Catppuccin e revalidar os pares.

## 5. Implementações em 11/2026

- **Material Web (@material/web 2.5.0):** em manutenção desde 06/2024. Um mantenedor confirmou em 19/05/2025 que "new Expressive features are not planned".
- **MUI (9.5.0; 10.0.0-alpha.0):** o post do v9 (08/04/2026) não menciona MD3. Não há Expressive.
- **@m3e/web 2.12.0 (MIT, Lit):** comunitário e ativo. Maturidade não verificada (suspeita).
- **react-native-paper:** a 5.15.4 é MD3 baseline. A 6.0.0-alpha.2 traz trabalho parcial (PRs de AppBar e NavigationBar Expressive), nada estável.
- **Expo UI no SDK 58 (@expo/ui 58.0.27):** os componentes Compose são **só Android**. Incluem LoadingIndicator, SplitButtonLayout (depreciado no Compose), HorizontalFloatingToolbar, ToggleButton e Carousel, sobre Material3 1.5.0-beta01. No iOS ele entrega SwiftUI, que não é M3. Não dá uma aparência M3 consistente nas duas plataformas.

**Caminho mais realista:** continuar com componentes próprios sobre react-aria-components (web) e Reanimated (mobile), implementando os tokens. As molas do web em `linear()` estão corretas: a lenta tem a mesma curva da padrão porque o ζ é o mesmo, muda só a duração. No Reanimated, a conversão é c = 2ζ√(k·m). No web, o shape morph só sai via SVG/clip-path manual.

## 6. Checklist: 15 sinais que um designer reconhece

1. Botões em vários tamanhos (XS–XL), com redondo e quadrado misturados.
2. Morph de forma ao pressionar e ao selecionar (pílula para quadrado).
3. Button groups conectados, com largura que reage ao toque.
4. Split button nas ações com variantes.
5. FAB ou extended FAB grande (56/80/96) e FAB menu de itens grandes e contrastantes.
6. Toolbar flutuante ou docked no lugar da bottom app bar.
7. Navigation rail recolhida/expandida no lugar da gaveta; navigation bar flexível com indicador em pílula.
8. App bars flexíveis com headline grande.
9. Loading indicator com forma que se transforma; progresso ondulado e mais espesso.
10. Sliders com trilho grosso, handle em barra e ícone dentro do trilho.
11. Escala de cantos com 20/32/48 e raios aninhados corretos.
12. Uma ou duas formas da biblioteca (biscoito, flor, trevo) em avatar, imagem ou estado vazio.
13. Estilos enfáticos em seleção e ação; contraste forte de tamanho entre display e body.
14. Cor com croma e containers tonais em camadas, usando tertiary como acento pontual.
15. Molas espaciais com leve overshoot em posição e forma, effects sem bounce em cor e opacidade, e 1–2 hero moments.

O web cobre 2, 11, parte de 13 e 15. Não tem 1, 3, 4, 6, 7 (usa sidebar/gaveta), 8, 9, 10 nem 12.

## Riscos

- Trocar a fonte achando que isso basta para 'parecer Expressive': o custo vai para a fonte, e as lacunas reais de componentes e cor continuam.
- Google Sans Flex com todos os eixos pesa ~1,4 MB no subset latin. É preciso limitar aos eixos usados (wght ~50 KB, wdth ~119 KB) e manter self-hosted por causa da CSP font-src 'self' e da LGPD.
- Os dígitos do Google Sans Flex são proporcionais por padrão: sem tabular-nums explícito, escores e datas desalinham no painel.
- No mobile, pares de contraste abaixo do WCAG (lavender 3,18:1, teal 3,82:1, onSurfaceVariant 4,06:1, outline 1,49:1) num app de saúde mental voltado a pessoas possivelmente fragilizadas.
- Usar o nome 'Google Sans' em material derivado ou dar aparência de produto Google: há restrição de marca, embora a licença OFL permita o uso.
- Adotar Expo UI Compose cria divergência visual entre Android (M3) e iOS (SwiftUI).

## Incertezas

- m3.material.io é uma SPA e não renderiza no fetch: os valores do M3 vêm da skill m3-expressive (raspagem do site + tokens Compose), não de leitura direta em 11/2026. Uma revisão de 2026 do typescale pode não estar coberta.
- Não confirmei se o M3 passou a documentar Google Sans Flex como padrão em 2026. A busca não achou nada nesse sentido, e a skill diz que fontes variáveis ainda não fazem parte do typescale.
- O suporte real de fontVariationSettings (wdth/ROND) no RN 0.88 em Android e iOS não foi testado: a documentação não traz plataforma nem versão.
- A maturidade de @m3e/web e do 6.0 alpha do react-native-paper foi avaliada só por metadados e PRs.
- A má legibilidade de Cormorant Garamond em tamanho pequeno é consenso tipográfico, não foi medida. Não verifiquei se os algarismos padrão dela são oldstyle.
- O download do arquivo TTF completo do Roboto Flex falhou (connection reset). Os eixos dele vieram da API do Fontsource e do arquivo local.
- A discrepância de 'seis eixos' no Google Sans Flex (design.google cita grade; o arquivo tem 5 eixos, sem GRAD) pode indicar uma versão futura ou interna diferente.

## Fontes

- Skill m3-expressive 1.1.0 (raspagem de m3.material.io + tokens Compose): ~/.claude/plugins/cache/m3-expressive/m3-expressive/1.1.0/skills/m3-expressive/references/{typography,tokens,platforms,expressive-tactics,components/*}.md (lido 2026-11-10)
- https://m3.material.io/styles/typography/fonts (SPA, sem conteúdo no fetch; 2026-11-10)
- https://design.google/library/google-sans-flex-font (sem data na página; lido 2026-11-10)
- https://design.google/library/expressive-material-design-google-research (2025)
- https://raw.githubusercontent.com/google/fonts/main/ofl/googlesansflex/METADATA.pb e OFL.txt (lido 2026-11-10)
- https://raw.githubusercontent.com/google/fonts/main/ofl/googlesans/METADATA.pb e OFL.txt (lido 2026-11-10)
- https://raw.githubusercontent.com/google/fonts/main/ofl/googlesanscode/METADATA.pb (lido 2026-11-10)
- https://api.fontsource.org/v1/fonts/{google-sans,google-sans-flex,google-sans-code,roboto-flex,cormorant-garamond,outfit} e /v1/variable/* (lastModified 2026-10-01/2026-10-20; lido 2026-11-10)
- https://cdn.jsdelivr.net/fontsource/fonts/* (tamanhos de woff2 medidos em 2026-11-10)
- https://9to5google.com/2025/11/18/google-sans-flex-font-available/ (2025-11-18)
- https://developer.android.com/jetpack/androidx/releases/compose-material3 (1.5.0-rc01 de 2026-11-04)
- https://github.com/material-components/material-web/discussions/5642 (2024-06-10; respostas de 2025-05-19/20)
- https://mui.com/blog/introducing-material-ui-v9/ (2026-04-08)
- https://expo.dev/changelog/sdk-58.md (2026-10-15)
- https://docs.expo.dev/versions/v58.0.0/sdk/ui/jetpack-compose.md (lido 2026-11-10)
- https://reactnative.dev/docs/text-style-props (lido 2026-11-10)
- https://newreleases.io/project/npm/react-native-paper/release/6.0.0-alpha.0 (2026-06-15)
- npm view react-native-paper, @expo/ui, @material/web, @mui/material, @m3e/web, @material/material-color-utilities (2026-11-10)
- https://unpkg.com/@material/material-color-utilities@0.4.0/dynamiccolor/dynamic_scheme.d.ts (2026-11-10)
- apps/web/src/styles/tokens.css:38-81,121-153,223-241
- apps/web/DESIGN.md:216-228,249-255
- apps/web/src/main.tsx:5
- apps/web/node_modules/@fontsource-variable/roboto-flex/files/roboto-flex-latin-wdth-normal.woff2 (fvar e hmtx inspecionados)
- apps/mobile/src/theme/index.ts:67-170
