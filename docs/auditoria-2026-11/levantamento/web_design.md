# Web: design system

> Levantamento em modo leitura, 10 e 11/11/2026. Agente `web_design`, Opus 5.5 (effort high). Nada foi executado além de leitura de código, `npm view/audit/outdated` e documentação pública; "verificado" quer dizer lido no código, não testado. Linhas citadas são do commit `0864143`.

## Resumo

O design system do web é pequeno e disciplinado. Todos os valores saem de src/styles/tokens.css (254 linhas): papéis M3 em light-dark() sobre o Catppuccin, 5 containers de superfície, a escala de forma M3 de 10 passos exata, 30 estilos tipográficos (15 base e 15 enfáticos), 5 molas M3 Expressive convertidas em linear() com durações que conferem com ζ/k, state layers de 8/10/10% e movimento reduzido. Nenhum hex fica fora de tokens.css. A distância para o M3 Expressive está nos componentes, não nos tokens. Botão de tamanho único (44px), FAB circular com as iniciais usado como menu de conta, cards com 28px, campos sem label flutuante, segmented no lugar de connected button group, trilho com pílula no item inteiro, um só breakpoint (820px). Faltam loading indicator, split button, toolbar e extended FAB. Há bugs pontuais: o morph do FAB não aparece (parte de 9999px), o foco em itens de menu e de select é só uma camada de 10%, e o trilho recolhido esconde destinos. Para o Tailwind v4 (4.3.5, verificado no npm em 2026-11-10) são 55 CSS Modules, cerca de 3.640 linhas e 76 KB. Os tokens vão quase direto para @theme inline. O que continua precisando de CSS próprio: state layers em ::before, seletores de data-* do react-aria (105 ocorrências), :has, :global do recharts, keyframes e impressão. Esforço total M a G.

## Relatório

## Escopo e método
Li inteiros: DESIGN.md, PRODUCT.md, tokens.css, globais.css, Componentes.tsx e o .module.css dela, todos os 26 pares de src/components/ui e os 3 CSS mais os .tsx de shell. Amostrei 8 CSS de rotas: Pagina, Linhas, Auth, Inicio, VisaoGeral, Calendario, Relatorio, Graficos (mais Imprimir). As referências M3 vêm da skill m3-expressive 1.1.0 (tokens.md, component-tokens.md, components/*.md). Nada foi executado. Contraste não foi recalculado: cito os números do DESIGN.md.

## 1. Estrutura dos tokens (verificado)
- **Cor** (tokens.css:17-97): 18 `--paleta-*` Catppuccin em `light-dark(Latte, Mocha)`. Papéis primária, secundária, terciária e erro, cada um com 4 tokens (cor, sobre, container, sobre-container). Também fundo, superfície, contorno e contorno-variante, inversa, scrim, a rampa `--dados-1..5` e 6 `--emocao-*`. O tema vem de `color-scheme` mais `data-theme` (:7-15). As 57 ocorrências de `light-dark()` estão todas neste arquivo.
- **5 containers** (:69-73): mínimo, baixo, container, alto, máximo. Fora da escada há o papel `--cor-cartao` (:75): `#fff` no claro (igual ao mínimo) e surface0 no escuro (igual ao alto). Ele não corresponde a nenhum papel M3.
- **Forma** (:101-110): 0/4/8/12/16/20/28/32/48/full. É idêntica à escala M3 de 10 passos (tokens.md).
- **Tipo** (:122-153): 15 atalhos `font` e 15 `-enfatico` com `semi-expanded`. Não há tracking em nenhum deles.
- **Molas** (:226-235): 3 espaciais e 2 efeitos. Os ζ/k batem com a tabela Expressive (0.6/800, 0.8/380, 0.8/200, 1/3800, 1/1600). Falta a slow effects (1/800). Conferi o tempo de assentamento à mão: dá cerca de 400, 550 e 135 ms, coerente com os tokens.
- **State layers**: 8/10/10%. Desabilitado: 38/12%. Foco: 2px com offset 2 (:156-163).
- **Elevação**: só `--sombra-fab` e `--sombra-overlay` (:212-215). Não há níveis 0-5.
- **Movimento reduzido**: zera as durações (:245-254).

## 2. Conformidade com o M3 Expressive
| Item | Estado | Evidência |
|---|---|---|
| Papéis de cor | parcial | Faltam inverse-primary, surface-dim/bright e fixed. Existe o papel `cartao` fora do M3. Terciária quase não é usada (só MarcadorItem9). |
| Origem da paleta | divergente | Hex fixos escolhidos à mão (ex.: on-primary-container escuro `#f5e0dc`, rosewater sobre mauve). Não há paleta tonal HCT nem níveis de contraste. |
| Escala tipográfica | implementado | Tamanhos e line-heights batem (57/64…11/16). |
| Enfático | parcial | display/headline enfáticos usam peso 600 (M3: Medium). Acrescenta `font-stretch`, que não existe no M3. Não há tracking. |
| Fonte | implementado/suspeita | Roboto Flex com wght 100-1000 e wdth 25-151% (node_modules wdth.css). O arquivo `wdth.css` não inclui o eixo opsz (existe um `opsz.css` separado), então a frase do DESIGN.md:221 de que o "opsz automático" cuida do espaçamento provavelmente é falsa. |
| Forma | parcial | A escala está certa, mas não há biblioteca de 35 formas nem morph entre polígonos. Card com 28 (M3: CornerMedium, 12), campo com 12 (M3 outlined: ExtraSmall, 4), toast com 12 (Snackbar: ExtraSmall). |
| Shape morph | parcial/bug | O botão vai de pílula a 12 no press (Button.module.css:44-46). M3 Small pressionado é 8dp. O FAB parte de `--forma-total` (FabPerfil.module.css:11), então a interpolação de 9999px até 16px praticamente pula. O DESIGN.md:254 avisa justamente para não fazer isso. As pílulas do FAB menu têm o mesmo problema (Menu.module.css:82,91). |
| Molas | implementado | Espacial em raio, scale e translate; efeitos em cor e opacidade. Colapsavel usa mola espacial em `filter: blur` (Colapsavel.module.css:22), que seria efeito. |
| Botões XS-XL | ausente | Só tem altura de 44px (tokens.css:167). Sem forma quadrada e sem toggle button. |
| Button group / connected | divergente | O SegmentedControl usa indicador primário deslizante. Segundo buttons.md:333, o connected group substitui o segmented. |
| Split button, extended FAB, loading indicator, progress, toolbars | ausente | O loading é um `LoaderCircle` girando (Button.tsx:18). |
| FAB / FAB menu | divergente | Círculo de 56px que vira 16 no press. M3: CornerLarge em repouso. O FAB não se transforma em botão de fechar. Os itens têm 44px e `min-width` fixo (Menu.module.css:80). M3: itens com medidas de botão medium, ajustados ao conteúdo. As ações são de conta (Tema, Sair), não uma ação primária. |
| Navigation rail | parcial | O expandido (17rem) é um expanded rail aceitável, com item de 48 (M3: 56). O recolhido tem 88px (M3: 96 ou 80) e a pílula cobre o item inteiro (M3: 56×32 em volta do ícone). Sem ícone filled no ativo e sem transição de largura (Sidebar.module.css:1-18). |
| Campos | divergente | Rótulo acima, foco com borda, inset e outline (TextField.module.css:26-31). Não há label flutuante nem variante filled. |
| Chips | parcial | Estático com 32px e 8 de raio, como no M3. O filtro tem 44px e 12 de raio e vira full quando selecionado (Chip.module.css:52-89). |
| Cards | parcial | Uma variante só (outlined), com 28 de raio. |
| Diálogos | parcial | 28 de raio, como no M3. Tem borda mais sombra; o M3 usa surface-container-high sem borda. |
| Menus | parcial | Lista com 12 de raio. Sem estados de seleção expressivos. |
| Tabs | implementado | Indicador de 3px e 48px de altura, como os tokens PrimaryNavigationTab. |
| Listas | parcial | Linha de 44px com divisor. Não é o padrão de lista segmentada. |
| Densidade e layout | parcial | Um breakpoint de 819.98px (useCompacto.ts:4). M3 tem 600/840/1200/1600. Não há layout canônico (list-detail). |

**10 pontos que mais tiram a cara de M3 Expressive**
1. FAB circular com as iniciais servindo de menu de conta.
2. Botões todos do mesmo tamanho, sem hierarquia por tamanho ou forma.
3. Cards com raio de 28 mais borda em todas as telas, deixando tudo uniforme.
4. Campos sem label flutuante.
5. Segmented com indicador deslizante, que parece iOS.
6. Pílula do trilho no item inteiro, sem ícone filled.
7. Acento mauve único e terciária ausente, sem tensão de cor.
8. Títulos de tela em `headline-medio` sem ênfase (Pagina.module.css:16). Nenhum hero moment.
9. Sem loading indicator expressivo, toolbar, split button ou extended FAB.
10. Overlays todos com borda, sombra e 12 de raio, e layout de um só breakpoint.

## 3. Inventário de componentes
| Componente | RAC | Variantes | Equivalente M3 | Lacuna |
|---|---|---|---|---|
| Button | Button | filled/tonal/outlined/text, isPending | Button | elevated, tamanhos, square, toggle |
| IconButton | Button | 1 (padrão) | Icon button | filled/tonal/outlined, tamanhos |
| Card | div | 1 | Outlined card | filled/elevated |
| Chip / ChipFiltro | span / ToggleButton | emoção; filtro | Assist / Filter chip | input chip |
| SegmentedControl | ToggleButtonGroup+SelectionIndicator | 1 | Connected button group | multi-select |
| Tabs | Tabs+SelectionIndicator | primary | Primary tabs | secondary |
| TextField/PasswordField | TextField | simples, multilinha | Outlined text field | label flutuante, filled |
| Select | Select+ListBox | 1 | Exposed dropdown menu | — |
| OtpField | input nativo | 1 | — | — |
| DateRangePicker/Calendar | DateRangePicker/RangeCalendar/Calendar | atalhos | Date range picker (docked) | modal |
| Dialog | ModalOverlay/Modal/Dialog | normal/larga | Basic dialog | fullscreen |
| Menu | MenuTrigger/Menu/Popover | lista/pílulas | Menu / FAB menu | botão de fechar, seleção |
| Toast | UNSTABLE_Toast* | info/erro | Snackbar | ação |
| ListItem | Link/Button/div | 3 | List item | 2/3 linhas |
| Sidebar/Gaveta | NavLink + Modal | expandida/recolhida/modal | Expanded / collapsed / modal rail | indicador, transição |
| FabPerfil | Button | 1 | FAB + FAB menu | close button |
| Skeleton, ScrollFade, Colapsavel, EmptyState, GraficoLinhas, avisos (6) | — | — | (Progress) / — | loading indicator |

## 4. Consistência
- **Hex, rgb e px fora de tokens**: nenhum no CSS (grep). Exceções encontradas:
  - `z-index: 1/2/3` e `filter: brightness(0.96)` em Calendario.module.css:86,93,144,189;
  - `15mm` em Relatorio.module.css:9 (documentado: `@page` não lê var);
  - frações `fr` em Checkins:9 e Auditoria:9;
  - px de geometria em JS: GraficoLinhas.tsx:6-11 e Graficos.tsx:20-28.
- **Estilo inline**: 4 `style={{'--x'}}` (GradeHoras.tsx:71,106; VisaoGeral.tsx:68; Relatorio.tsx:69). Contradiz DESIGN.md:259 e 355; só o do calendário está documentado (DESIGN.md:305).
- **DESIGN × código**:
  - DESIGN diz que o chip de filtro faz morph no press. No código ele faz morph ao ser selecionado.
  - DESIGN diz que o FAB vai a `md`. No código vai a `lg`.
  - A regra de "metade da altura" no repouso é violada no FAB, nas pílulas do menu e no chip.
  - A afirmação sobre o eixo opsz não se sustenta (ver seção 2).
  - O hover usa `:hover` no Sidebar (NavLink) e `[data-hovered]` no resto.

## 5. Acessibilidade estrutural
- **Foco**: o `:focus-visible` global (globais.css:59) está certo. Mas `outline:none` com só a camada de 10% aparece em Menu.module.css:47,64 e Select.module.css:77,94, e isso também vale para o FAB menu. O foco fica pouco visível.
- **Alvos**: 44px em todo controle (`--alvo-minimo`). O M3 recomenda 48.
- **ARIA**: os landmarks e o link "Ir para o conteúdo" estão certos. Problemas:
  - `aria-disabled` em `<span>` sem role (Sidebar.tsx:15);
  - `aria-label` em `<div>` sem role (Componentes.tsx:165);
  - ChipFiltro usado como interruptor de "Incluir anotações privadas" (Relatorios.tsx:113).
- **Movimento reduzido**: completo, via tokens.
- **Modo de alto contraste**: não há `forced-colors` nem `prefers-contrast` (grep). A seleção do SegmentedControl depende só do fundo (suspeita: some no alto contraste).
- **Contraste**: o DESIGN.md declara 174 pares sem falha (não recalculei). O pior caso é `primária` como texto sobre `superficie`, com 4.51.
- **Toast**: 6s mesmo para erro (Toast.tsx:7).

## 6. Fatos para migrar ao Tailwind v4
- **Volume**: 55 CSS Modules.
  - ui: 26 arquivos, 1.432 linhas, 31 KB;
  - shell: 3 arquivos, 271 linhas, 6 KB;
  - rotas: 26 arquivos, 1.935 linhas, 39 KB;
  - tokens.css (254 linhas) e globais.css (71) à parte.
- **Recursos usados**:
  - `[data-*]`: 105 ocorrências em 21 arquivos. Do react-aria: hovered 14, disabled 11, pressed 9, entering/exiting 9+9, selected 8, focus-visible 7, mais selection-start/end, today, outside-month, placeholder e type. Da aplicação: `data-compacto` 14, aberto, visivel, trocou, dias;
  - `::before` de state layer em 9 arquivos;
  - custom properties dinâmicas: `--raio-repouso`, `--cor-marca`, `--cor-serie`, `--colunas`, `--proporcao`, `--inicio/--duracao/--faixa/--faixas/--horas/--dias`;
  - `color-mix` em 10 lugares;
  - `composes` 6 vezes (Select e DateRangePicker herdam de TextField);
  - `:has` 3 vezes (Linhas.module.css:82-90);
  - `:global` 14 vezes (recharts, Graficos.module.css);
  - 4 `@keyframes`;
  - impressão: `@media print` 3 vezes e `@page` 1 vez;
  - `backdrop-filter` com `mask` (ScrollFade);
  - variáveis do react-aria: `--trigger-anchor-point`, `--trigger-width`, `--visual-viewport-height`.
  - Não há nesting, `@layer`, container queries nem `@supports`.
- **Ferramentas (verificado)**:
  - tailwindcss e @tailwindcss/vite estão em 4.3.5 (npm, 2026-11-06), com peer vite ^8;
  - tailwindcss-react-aria-components 2.2.0 tem peer tailwind ^4;
  - o v4 aceita `data-hovered:` nativamente;
  - pela documentação, CSS Module com `@apply` exige `@reference`, e cada módulo é processado à parte;
  - piso de navegador: Chrome 111, Safari 16.4, Firefox 128;
  - o Vite 8.3.5 minifica CSS com lightningcss por padrão (index.d.ts:2863), o que confirma a conversão de `light-dark()` descrita no DESIGN.
- **Vai direto para `@theme inline`**:
  - cores: os `--cor-*` viram `--color-*`, mantendo `light-dark()`, o que dispensa a variante `dark:`;
  - `--forma-*` vira `--radius-*`;
  - `--espaco-*` cabe no `--spacing` de 0.25rem;
  - `--sombra-*` vira `--shadow-*`;
  - `--mola-*` vira `--ease-*` (aceita `linear()`);
  - o breakpoint vira `--breakpoint-*`.
  - A tipografia precisa ser desmontada: o atalho `font` vira `--text-*` com `--line-height` e `--font-weight`. O `font-stretch` precisa de `@utility`.
- **Continua precisando de CSS próprio**:
  - state layers (`::before` com `currentcolor`);
  - entrada e saída de overlays;
  - `:has`;
  - `:global` do recharts;
  - keyframes;
  - a folha de impressão (`@page`, `table-header-group`, quebras de página);
  - a grade da agenda calculada por variáveis;
  - Colapsavel (`grid-template-rows`);
  - ScrollFade;
  - movimento reduzido (override de variável).
- **Esforço e riscos**:
  - tokens e @theme: P;
  - ui: M (state layers e data-*);
  - shell: P;
  - rotas simples: P;
  - Linhas, Calendario e Relatorio: G (impressão, `:has`, grade dinâmica);
  - Graficos: P (fica em CSS).
  - Riscos de regressão: ordem da cascata entre utilitários e CSS Modules durante a fase mista; `light-dark()` dentro de `@theme`; o shorthand `font` perdido; transições de raio e de mola; impressão no Chromium; a seleção dependente de data-*. Não há teste visual (sem CI): use a vitrine `/_componentes` nos 2 temas, em 1440px e 375px, como referência manual.

## Achados

| Severidade | Confiança | Achado | Onde | Detalhe |
|---|---|---|---|---|
| media | provavel | Shape morph do FAB e das pílulas do FAB menu praticamente não aparece | apps/web/src/components/shell/FabPerfil.module.css:11,42; apps/web/src/components/ui/Menu.module.css:82,91 | O repouso usa --forma-total (9999px) e o press vai a --forma-lg ou --forma-md. A interpolação só desce abaixo da metade da altura no fim da mola, então o efeito é um salto. O próprio DESIGN.md:254 manda usar metade da altura no repouso, como o Button já faz. |
| media | provavel | Foco por teclado em itens de Menu, Select e FAB menu é só uma camada de 10% | apps/web/src/components/ui/Menu.module.css:47,64; apps/web/src/components/ui/Select.module.css:77,94 | Com outline:none, o foco vira currentcolor a 10% sobre o cartão. O contraste entre os estados com e sem foco fica bem abaixo de 3:1 e destoa do anel de 2px usado no resto da interface. |
| media | verificado | Trilho recolhido esconde destinos não fixados | apps/web/src/components/shell/Sidebar.tsx:35 | Recolhida, a barra mostra só os pins: Check-ins, Relatórios, Vínculo e Auditoria somem por padrão. No M3, o rail recolhido e o expandido têm os mesmos destinos e fazem transição entre si. Também não há transição de largura (Sidebar.module.css:1-18). |
| media | verificado | Chip de filtro usado como interruptor de configuração sensível | apps/web/src/rotas/relatorios/Relatorios.tsx:113 | "Incluir anotações privadas" (dado sensível que vai para o PDF) é um ChipFiltro. O padrão M3 para liga/desliga é Switch, com estado on/off explícito. Os pins da Minha área usam o mesmo padrão (MinhaArea.tsx:295). |
| media | verificado | FAB usado como menu de conta, contra a semântica do M3 | apps/web/src/components/shell/FabPerfil.tsx:13-45 | No M3 o FAB é a ação primária da tela, com 56dp e CornerLarge (16dp). O FAB menu deve agrupar ações relacionadas, e o FAB se transforma no botão de fechar. Aqui ele é circular, mostra as iniciais, agrupa Configurações, Tema e Sair, e não tem botão de fechar. |
| media | suspeita | Seleção do SegmentedControl só por fundo e sem regras de forced-colors | apps/web/src/components/ui/SegmentedControl.module.css:29-45 | O grep não encontra forced-colors nem prefers-contrast no projeto. No modo de alto contraste do Windows, o indicador por background tende a sumir. O mesmo vale para o item ativo da navegação e para a seleção do calendário. Não testado. |
| baixa | verificado | Papel --cor-cartao fora da escada tonal | apps/web/src/styles/tokens.css:75 | No claro equivale a container-minimo e no escuro a container-alto. Cards, diálogos, menus e popovers usam esse papel com borda (e sombra nos overlays), o que mistura elevação tonal com contorno. Não corresponde a nenhum papel M3. |
| baixa | provavel | DESIGN.md afirma opsz automático, mas a fonte importada não tem esse eixo | apps/web/DESIGN.md:221; apps/web/src/main.tsx:5 | O arquivo @fontsource-variable/roboto-flex/wdth.css declara só font-weight 100-1000 e font-stretch 25-151%. O eixo opsz está em opsz.css ou full.css. Os tokens também não definem tracking. |
| baixa | verificado | Divergências entre DESIGN.md e o código (inline style, morph) | apps/web/DESIGN.md:254,259,355 | Há 4 style={{'--x'}} (GradeHoras.tsx:71,106; VisaoGeral.tsx:68; Relatorio.tsx:69). O chip de filtro faz morph ao ser selecionado, não no press. O FAB vai a lg, não a md. |
| baixa | verificado | Valores fixos fora de token no calendário | apps/web/src/rotas/calendario/Calendario.module.css:86,93,144,189 | z-index 1, 2 e 3 crus, e hover por filter: brightness(0.96), que é fraco e escurece também no tema escuro. Os outros hovers usam a camada de 8%. |
| baixa | verificado | ARIA sem role | apps/web/src/components/shell/Sidebar.tsx:15; apps/web/src/rotas/Componentes.tsx:165 | aria-disabled num span genérico (item Chats) e aria-label num div sem role. Leitores de tela ignoram os dois. |
| baixa | verificado | Toast de erro some sozinho em 6s | apps/web/src/components/ui/Toast.tsx:7-13 | Usa o mesmo timeout para info e erro. Pausa em hover e foco, mas uma mensagem de falha pode se perder. |
| baixa | verificado | Layout adaptativo com um só breakpoint | apps/web/src/lib/useCompacto.ts:4 | Só 819.98px. O M3 tem compact <600, medium 600-839, expanded 840-1199, large 1200-1599 e extra-large 1600+. Entre 820 e 1199px a barra expandida ocupa 272px fixos. |
| info | verificado | Ausência de componentes M3 Expressive | apps/web/src/components/ui/ | Faltam: botões XS-XL e forma quadrada, toggle button, button group standard e connected, split button, extended FAB, loading indicator, progress, toolbars, switch, checkbox e radio, cards filled e elevated, campo filled. |

## Perguntas para o grupo

- Manter o Catppuccin fixo, que é decisão de marca compartilhada com o mobile, ou gerar paletas tonais (HCT) a partir do mauve e aceitar mudar os hex?
- O FAB deve continuar como menu de conta, ou a conta vai para o topo ou o rail e o FAB passa a ser uma ação primária (ex.: Agendar consulta)?
- Botões de 44px foram escolhidos de propósito? O M3 usa 40dp de altura com alvo de 48dp; adotar os tamanhos XS-XL muda a densidade das tabelas.
- O raio de 28px em cards é intencional (linguagem do mobile) ou pode ir para o 12dp do M3?
- A migração para Tailwind será incremental, com CSS Modules convivendo, ou uma reescrita? Cabe no prazo do TCC junto com Prisma e NativeWind?
- A matriz de contraste de 174 pares tem script versionado para ser refeita depois da troca de tokens?
