---
name: PsycheLink Web (psicólogo)
description: Painel do psicólogo em Material 3 Expressive sobre Catppuccin, quieto por padrão e expressivo no toque.
colors:
  primary-light: "#8738ee"
  primary-dark: "#cba6f7"
  on-primary-light: "#ffffff"
  on-primary-dark: "#4a0080"
  primary-container-light: "#e7d3f5"
  primary-container-dark: "#663399"
  on-primary-container-light: "#21005d"
  on-primary-container-dark: "#f5e0dc"
  secondary-light: "#4a5fd6"
  secondary-dark: "#b4befe"
  secondary-container-light: "#e8eaff"
  secondary-container-dark: "#373f77"
  tertiary-light: "#127a80"
  tertiary-dark: "#94e2d5"
  error-light: "#d10d38"
  error-dark: "#f38ba8"
  background-light: "#eff1f5"
  background-dark: "#1e1e2e"
  surface-light: "#e6e9ef"
  surface-dark: "#181825"
  card-light: "#ffffff"
  card-dark: "#313244"
  on-surface-light: "#4c4f69"
  on-surface-dark: "#cdd6f4"
  on-surface-variant-light: "#5c5f77"
  on-surface-variant-dark: "#bac2de"
  outline-light: "#7c7f93"
  outline-dark: "#7f849c"
  outline-variant-light: "#bcc0cc"
  outline-variant-dark: "#45475a"
typography:
  display-large:
    fontFamily: "Google Sans Flex Variable, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 1.4rem + 4.4vw, 3.5625rem)"
    fontWeight: 400
    lineHeight: 1.125
  headline-medium:
    fontFamily: "Google Sans Flex Variable, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 400
    lineHeight: "2.25rem"
  title-medium:
    fontFamily: "Google Sans Flex Variable, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: "1.5rem"
  body-large:
    fontFamily: "Google Sans Flex Variable, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: "1.5rem"
  label-large:
    fontFamily: "Google Sans Flex Variable, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: "1.25rem"
rounded:
  none: "0"
  xs: "0.25rem"
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1rem"
  lg-plus: "1.25rem"
  xl: "1.75rem"
  xl-plus: "2rem"
  2xl: "3rem"
  full: "9999px"
spacing:
  "4": "0.25rem"
  "8": "0.5rem"
  "12": "0.75rem"
  "16": "1rem"
  "24": "1.5rem"
  "32": "2rem"
  "48": "3rem"
components:
  button-filled:
    backgroundColor: "{colors.primary-light}"
    textColor: "{colors.on-primary-light}"
    rounded: "{rounded.full}"
    height: "2.75rem"
    padding: "0 1.5rem"
  button-filled-pressed:
    rounded: "{rounded.md}"
  card:
    backgroundColor: "{colors.card-light}"
    textColor: "{colors.on-surface-light}"
    rounded: "{rounded.xl}"
    padding: "1.5rem"
  text-field:
    textColor: "{colors.on-surface-light}"
    rounded: "{rounded.md}"
    height: "3.5rem"
---

# Design System: PsycheLink Web (psicólogo)

Fonte normativa dos valores: `src/styles/tokens.css`. Este arquivo explica como aplicá-los. Os tokens têm nomes em pt-BR (`--cor-primaria`, `--forma-md`, `--espaco-16`, `--mola-espacial-padrao`).

## Overview

**Creative North Star: "O Consultório Silencioso"**

O painel é uma sala quieta: superfícies tonais, texto calmo, nenhuma cor que julgue o dado. A expressão fica no toque. Botões viram retângulos arredondados sob o dedo, o item ativo da navegação vira pílula, o indicador dos segmentos desliza com mola. Quem olha os números não é distraído, quem interage sente resposta.

A base é Material 3 Expressive mapeado em Catppuccin: Latte no claro, Mocha no escuro, os mesmos matizes do app mobile. O mauve é o único acento forte e aparece no que é ação ou seleção. A rejeição confirmada é visual e clínica ao mesmo tempo: nada de semáforo vermelho/verde, nada de gradiente de SaaS, nada de dashboard "de monitoramento".

Leitura do antislop: *painel clínico de gestão (Operate) para psicólogos, linguagem M3 Expressive sobre Catppuccin, dial ENERGY 2 / RHYTHM 2 / MOTION 2.*

**Key Characteristics:**
- Elevação tonal. Sombra só no FAB e em sobreposições.
- Dados sem valência: rampa de um tom e cores de emoção fixas, sempre com rótulo.
- Vermelho só para erro de sistema.
- Molas em CSS puro (`linear()`), sem biblioteca de animação.
- Google Sans Flex variável, self-hosted (nenhuma chamada ao Google).

## Colors

Papéis M3 sobre a paleta Catppuccin. `light-dark()` escolhe o valor pelo `color-scheme`, que segue o sistema ou `data-theme` no `<html>`.

### Primary
- **Mauve** (`#8738ee` claro, `#cba6f7` escuro): ações, seleção, foco, indicador de aba e de segmento. No claro é o mauve do Latte um passo mais escuro, para chegar a 4.5:1 sobre a superfície `mantle`.

### Secondary
- **Lavender profundo** (`#4a5fd6` claro, `#b4befe` escuro): preenchimento secundário. O container (`#e8eaff` claro, `#373f77` escuro) dá os botões tonais e os chips selecionados.

### Tertiary
- **Teal** (`#127a80` claro, `#94e2d5` escuro): preenchimento terciário. O teal de paleta do Latte é `#179299` (o mobile ainda tem `#179287`); ele é usado só na cor da emoção "calmo".

### Neutral
- **Fundo** (`#eff1f5` claro, `#1e1e2e` escuro): página. Igual ao `background` do mobile.
- **Superfície** (`#e6e9ef` claro, `#181825` escuro): barra lateral e barra do topo.
- **Cartão** (`#ffffff` claro, `#313244` escuro): card, diálogo, menu, popover. É o container mais claro que o fundo nos dois temas.
- **Texto** (`#4c4f69` claro, `#cdd6f4` escuro) e **texto secundário** (`#5c5f77` claro, `#bac2de` escuro).
- **Contorno** (`#7c7f93` claro, `#7f849c` escuro): borda de campo, 3:1. **Contorno variante** (`#bcc0cc` claro, `#45475a` escuro): divisores, decorativos.

### Containers de superfície (5 níveis)

| Nível | Latte | Mocha |
|---|---|---|
| lowest (`--cor-container-minimo`) | `#ffffff` | crust `#11111b` |
| low (`--cor-container-baixo`) | base `#eff1f5` | mantle `#181825` |
| container (`--cor-container`) | mantle `#e6e9ef` | base `#1e1e2e` |
| high (`--cor-container-alto`) | crust `#dce0e8` | surface0 `#313244` |
| highest (`--cor-container-maximo`) | surface0 `#ccd0da` | surface1 `#45475a` |

`container-maximo` só recebe elementos sem texto (esqueleto, trilho). `container-alto` não recebe texto de ação nem de erro.

### Dados e emoções (sem valência)
- **Rampa sequencial** `--dados-1` a `--dados-5`, de lavender a mauve, um tom só. No claro cresce em escuridão, no escuro em claridade: mais valor, mais contraste com o fundo. Humor baixo nunca vira vermelho, humor alto nunca vira verde.
- **Emoções** fixas: feliz (amarelo), triste (azul), ansioso (pêssego), calmo (teal), irritado (rosa), cansado (cinza overlay). No claro, amarelo, pêssego e rosa foram escurecidos até 3:1. A cor é só marca: o rótulo sempre vem junto.
- **Vermelho** (`--cor-erro`) é exclusivo de erro de sistema, sempre com ícone e texto.

### Named Rules
**A Regra da Voz Única.** O mauve aparece em ação, seleção e foco. Se uma tela tem mais de um ponto mauve competindo, um deles não é ação.
**A Regra Sem Valência.** Nenhuma cor de dado significa bom ou ruim. Cor de dado nunca aparece sem rótulo.

### Contraste (AA) verificado nos dois temas

Pares calculados com o checker do antislop-human (`contrast-check.py`, fórmula WCAG 2.x) a partir dos próprios valores de `tokens.css`: 174 pares tema-superfície, 0 falhas. Disabled é isento (38% de opacidade do conteúdo). Texto sobre `container-maximo` e primária/erro como texto sobre `container-alto` não são usos permitidos e ficam fora da matriz.

### Pares de papel (texto, mínimo 4.5)

| Par | Light (Latte) | Dark (Mocha) |
|---|---|---|
| sobre-primária / primária | #ffffff em #8738ee = 5.48 | #4a0080 em #cba6f7 = 6.45 |
| sobre-container-primária / container-primária | #21005d em #e7d3f5 = 12.30 | #f5e0dc em #663399 = 6.64 |
| sobre-secundária / secundária | #ffffff em #4a5fd6 = 5.39 | #1e285a em #b4befe = 7.79 |
| sobre-container-secundária / container-secundária | #001d35 em #e8eaff = 14.38 | #dde3ff em #373f77 = 7.71 |
| sobre-terciária / terciária | #ffffff em #127a80 = 5.10 | #003733 em #94e2d5 = 8.84 |
| sobre-container-terciária / container-terciária | #00201d em #c6fff8 = 15.57 | #c6fff8 em #00504b = 8.47 |
| sobre-erro / erro | #ffffff em #d10d38 = 5.49 | #690005 em #f38ba8 = 5.66 |
| sobre-container-erro / container-erro | #410008 em #fbd5dc = 12.74 | #ffdad6 em #93000a = 7.24 |
| sobre-fundo / fundo | #4c4f69 em #eff1f5 = 7.06 | #cdd6f4 em #1e1e2e = 11.34 |
| sobre-inversa / inversa (toast) | #eff1f5 em #4c4f69 = 7.06 | #1e1e2e em #cdd6f4 = 11.34 |

### Texto sobre superfícies (light / dark)

| Superfície (hex light / dark) | sobre-superficie (4.5) | sobre-superficie-variante (4.5) | primária como texto (4.5) | erro como texto (4.5) |
|---|---|---|---|---|
| fundo (#eff1f5 / #1e1e2e) | 7.06 / 11.34 | 5.53 / 9.26 | 4.85 / 8.07 | 4.85 / 7.08 |
| superficie (#e6e9ef / #181825) | 6.57 / 12.14 | 5.14 / 9.91 | 4.51 / 8.64 | 4.51 / 7.58 |
| cartao (#ffffff / #313244) | 7.99 / 8.69 | 6.25 / 7.10 | 5.48 / 6.19 | 5.49 / 5.43 |
| container-minimo (#ffffff / #11111b) | 7.99 / 12.97 | 6.25 / 10.59 | 5.48 / 9.23 | 5.49 / 8.10 |
| container-baixo (#eff1f5 / #181825) | 7.06 / 12.14 | 5.53 / 9.91 | 4.85 / 8.64 | 4.85 / 7.58 |
| container (#e6e9ef / #1e1e2e) | 6.57 / 11.34 | 5.14 / 9.26 | 4.51 / 8.07 | 4.51 / 7.08 |
| container-alto (#dce0e8 / #313244) | 6.04 / 8.69 | 4.73 / 7.10 | n/a | n/a |

### UI e dados (mínimo 3.0): menor razão entre as superfícies de uso

| Elemento | Superfícies verificadas | Light (pior caso) | Dark (pior caso) |
|---|---|---|---|
| contorno de campo | fundo, cartao, container-minimo, container-baixo, container | 3.25 em container | 3.40 em cartao |
| anel de foco (primária) | todas as 8 | 3.55 em container-maximo | 4.49 em container-maximo |
| emocao-feliz (#c87800 / #f9e2af) | fundo, cartao, container-minimo, container-baixo | 3.02 em container-baixo | 9.89 em cartao |
| emocao-triste (#1e66f5 / #89b4fa) | fundo, cartao, container-minimo, container-baixo | 4.34 em container-baixo | 5.97 em cartao |
| emocao-ansioso (#f25800 / #fab387) | fundo, cartao, container-minimo, container-baixo | 3.01 em container-baixo | 7.10 em cartao |
| emocao-calmo (#179299 / #94e2d5) | fundo, cartao, container-minimo, container-baixo | 3.31 em container-baixo | 8.44 em cartao |
| emocao-irritado (#d361b6 / #f5c2e7) | fundo, cartao, container-minimo, container-baixo | 3.02 em container-baixo | 8.23 em cartao |
| emocao-cansado (#7c7f93 / #9399b2) | fundo, cartao, container-minimo, container-baixo | 3.49 em container-baixo | 4.45 em cartao |
| dados-1 (#6875f6 / #6d7ac2) | fundo, cartao, container-minimo, container-baixo | 3.40 em container-baixo | 3.12 em cartao |
| dados-2 (#685fe0 / #8a8dd7) | fundo, cartao, container-minimo, container-baixo | 4.32 em container-baixo | 4.11 em cartao |
| dados-3 (#6549ca / #a7a0ed) | fundo, cartao, container-minimo, container-baixo | 5.53 em container-baixo | 5.32 em cartao |
| dados-4 (#6133b3 / #c4b3ff) | fundo, cartao, container-minimo, container-baixo | 7.05 em container-baixo | 6.73 em cartao |
| dados-5 (#5b199c / #e2c7ff) | fundo, cartao, container-minimo, container-baixo | 9.00 em container-baixo | 8.29 em cartao |


Verificação complementar: axe-core (wcag2a, wcag2aa, wcag21aa, best-practice) sem violações em `/_componentes` e nos estados com menu, diálogo, select, calendário e gaveta, nos dois temas, em 1440px e 375px.

## Typography

**Fonte:** Google Sans Flex variável (`@fontsource-variable/google-sans-flex/wght.css`: só o eixo wght, ~52 KB no latim), com `system-ui` como reserva. Decisão do grupo (18/11): a interface segue o M3 Expressive; Cormorant Garamond + Outfit ficam só na identidade visual (logo, slides). A variante enfática do M3E muda só o peso: Medium (500), e Bold (700) em título médio/pequeno e rótulos.

**Character:** neutra e legível, com a ênfase vindo de peso e largura, não de uma segunda família.

### Hierarchy
Cada papel M3 (display, headline, title, body, label) tem três tamanhos (grande, médio, pequeno) e uma variante enfática (`-enfatico`: mesmo tamanho, só o peso muda, como no M3 Expressive). Cada token é um atalho `font`. Display usa `clamp()` para não estourar 375px. Rastreamento fica no padrão da fonte.
- **Display** (400, até 3.5625rem, 1.125): números grandes e títulos de impacto.
- **Headline** (400, 1.5 a 2rem): título de tela (`headline-medio`) e de diálogo (`headline-pequeno`).
- **Title** (400/500, 0.875 a 1.375rem): título de seção e de card, aba.
- **Body** (400, 0.75 a 1rem): texto corrido. Campos usam 1rem para o iOS não ampliar.
- **Label** (500, 0.6875 a 0.875rem): botões, rótulos de campo, navegação.

Métricas usam `font-variant-numeric: tabular-nums` (`--numeros-tabulares`).

## Layout

- **Espaço:** grade de 4, tokens `--espaco-4/8/12/16/24/32/48`.
- **Shell:** barra lateral sticky + conteúdo (`--largura-conteudo` de 75rem, centralizado). Abaixo de 820px a barra vira gaveta modal e entra uma barra do topo com o botão "Menu" rotulado.
- **Breakpoint:** `819.98px` vive em um único lugar, `useCompacto()` em `src/lib/useCompacto.ts` (usado pelo Shell e pela tela de entrada); o CSS lê o resultado por `data-compacto`. É a única exceção a "número só em token", porque media query não lê custom property.
- **Alvos:** 44px mínimo (`--alvo-minimo`). Sem rolagem horizontal em 375px; listas largas (abas) rolam dentro do próprio contêiner.
- **FAB:** fixo no canto inferior direito com `env(safe-area-inset-*)`; o conteúdo reserva espaço no fim para ele nunca cobrir o último item.
- **Landmarks:** link "Ir para o conteúdo", `<nav aria-label="Principal">`, `<main id="conteudo">`.

## Elevation & Depth

Tonal. A hierarquia vem dos containers de superfície, não de sombra.

- **Sombra do FAB** (`--sombra-fab`): o botão de perfil e as pílulas do FAB menu.
- **Sombra de sobreposição** (`--sombra-overlay`): diálogo, menu, popover, gaveta, toast.
- Todo o resto fica plano.

**A Regra do Plano.** Uma sombra só existe quando o elemento flutua sobre outro. Card, lista e campo ficam planos.

## Shapes

Escala M3: `none 0`, `xs 4`, `sm 8`, `md 12`, `lg 16`, `lg+ 20`, `xl 28`, `xl+ 32`, `2xl 48`, `full`.

- Cards e diálogos: `xl` (28). Campos e popovers: `md` (12). Chips estáticos: `sm` (8).
- **Shape morph:** botão, FAB e chip de filtro vão de pílula para `md` no press (`border-radius` com mola espacial rápida). O repouso usa metade da altura em vez de `full`, porque a interpolação de 9999px para 12px não seria visível.
- **Item ativo da navegação** vira pílula (raio = metade da altura do item).

## Components

Em `src/components/ui/`, com react-aria-components por baixo onde há primitivo (teclado, foco e ARIA vêm dele). Estilo em CSS Modules sobre tokens, sem inline style.

### Buttons
- **Button** (`filled`, `tonal`, `outlined`, `text`): 44px de altura, pílula, rótulo `label-grande`, ícone opcional de 18px. `isPending` mostra spinner e `aria-busy`. Hover 8%, foco 10%, press 10% como state layer na cor do conteúdo. Press: scale 0.97 e morph para `md`. Desabilitado: conteúdo a 38%, fundo a 12%.
- **IconButton**: o mesmo botão em 44x44, ícone de 24px, `aria-label` obrigatório.

### Campos
- **TextField / PasswordField**: rótulo acima, borda `contorno` de 1px e `md`, 56px. Foco: borda e anel de 2px em primária com offset 2. Erro: borda `erro` mais ícone mais texto. Senha tem botão Mostrar/Ocultar.
- **OtpField**: 6 caixas, `autocomplete="one-time-code"` na primeira, colar distribui os dígitos, digitar avança, Backspace volta, setas movem.
- **Select**: gatilho igual ao campo, lista em popover com o item selecionado em container secundário.
- **Colapsavel**: cresce e encolhe a altura (`grid-template-rows` 0fr a 1fr) com desfoque que entra e sai, sem fade. Fechado, o conteúdo fica `inert` (sem foco, fora da árvore de acessibilidade). O respiro interno de 4px mantém o anel de foco dentro do corte.
- **SegmentedControl**: trilho `container-alto`, indicador primário que desliza (`SelectionIndicator` do RAC anima o `translate` com a mola).

### Superfícies e listas
- **Card**: `cartao`, sem borda (separado do fundo pelo tom), forma `md` (12dp, o raio do card no M3), sem sombra.
- **ListItem**: linha com título, apoio e fim; vira link (`href`), botão (`onPress`) ou texto. Divisor entre itens.
- **Chip** (rótulo com marca de emoção) e **ChipFiltro** (alterna, mostra check quando marcado).
- **ScrollFade**: lista rolável com véu desfocado (`backdrop-filter` com máscara) no fim, que some quando não há mais conteúdo. Não é uma linha. Área de rolagem focável por teclado.
- **EmptyState**, **Skeleton** (linha, titulo, bloco, circulo; brilho só enquanto carrega).
- **Disclaimer**, **ConsentimentoAusente**, **ScoreBruto** com os textos fixos do plano; ScoreBruto mostra valor e "de N", sem rótulo de severidade. Disclaimer e ConsentimentoAusente aceitam um texto próprio (o aviso das escalas, o "não compartilha escalas").
- **MarcadorItem9**: registro factual "Item 9 respondido com valor diferente de 0", em container terciário com ícone de marcador de página. Sem vermelho, sem ícone de alerta, sem "risco": a interface relata o valor, não o interpreta. Aparece na lista, no detalhe, no relatório e no início.
- **StatusConsulta**: ícone próprio + texto por status (Agendada, Concluída, Cancelada, Remarcada); a distinção nunca depende da cor.
- **AvisoErro**: erro de ação (envio de formulário) com ícone e texto em `role="alert"`.
- **GraficoLinhas**: gráfico de linhas em SVG próprio (sem recharts), com o tamanho real do contêiner medido por `ResizeObserver` para que o texto fique no token em qualquer largura. Linha de 2px, marcadores com anel de superfície, grade recessiva, nome direto no fim de cada série e `<title>` por ponto. A série se distingue também por traço (tracejado) e marcador (quadrado), então a impressão em preto e branco continua legível. Usado na evolução do escore bruto e na série diária do relatório.

### Sobreposições
- **Dialog** (modal, Esc e fundo fecham, foco preso e devolvido; `larga` para vários botões lado a lado), **Menu** (variantes `lista` e `pilulas`), **Toast** (região `aria-label="Notificações"`, 6s, pausa em hover e foco, ícone distingue erro), **Tabs** (indicador deslizante, lista rola no próprio contêiner).
- **DateRangePicker** (presets de 7, 30 e 90 dias sempre visíveis, mais campo com calendário, pt-BR via `I18nProvider`) e **Calendar** (célula de 44px, hoje com contorno, intervalo em faixa).

### Entrada (`src/rotas/Auth.tsx`)
Tela dividida em tela cheia, do wireframe. Painel de marca à esquerda em `container-alto` (logo em um quadrado `container-minimo`, nome em `display-medio-enfatico`, slogan em `titulo-grande`) e formulário à direita, centrado em `--largura-formulario`. O conteúdo da marca entra deslizando da esquerda com desfoque, sem fade (a opacidade fica em 1); com `prefers-reduced-motion` a entrada é instantânea. Abaixo de 820px a marca vira faixa no topo (logo de `--tamanho-logo-faixa`, nome e slogan ao lado) e o formulário ocupa o resto.
- **Login/Cadastro**: o `SegmentedControl` troca o modo; nome, data de nascimento, CRP, especialidade e confirmação de senha vivem em `Colapsavel`. Campos ocultos não validam (o schema do modo ativo é o único usado). Erros por campo ligados por `aria-describedby`, foco no primeiro inválido ao enviar. Erro de servidor aparece em um aviso `role="alert"` acima do botão.
- **Verificação de código** (`rotas/auth/VerificacaoCodigo.tsx`): um só `Dialog` para a verificação em 2 etapas, a confirmação de e-mail do cadastro e o código de recuperação de senha. Envia sozinho ao completar 6 dígitos; erro limpa as caixas e devolve o foco à primeira; contagem "Reenviar em m:ss" até liberar o botão.
- **Recuperar senha**: mesmo painel, com "Voltar ao login"; e-mail, diálogo do código e nova senha. O aviso de sucesso volta ao login pelo `Toast`.
- Slogan provisório, registrado em `PRODUCT.md`.

### Telas do psicólogo (`src/rotas/`)
Todas carregam sob demanda (`React.lazy` + `Suspense` em `AreaProtegida`), e o recharts só entra com a aba Visão geral do perfil. Título de tela em `headline-medio`, estados de carregando (esqueleto com a forma do conteúdo), vazio e erro (`EstadoErro`, com "Tentar de novo") em todas.
- **Início**: filtro de período (7, 30 e 90 dias), "Pacientes vinculados" com número grande e linha de vínculos por dia, "Resumo de check-ins", "Atividades recentes" em `ScrollFade`, "Dados insuficientes" e médias do grupo com n. Duas colunas de cartões empilhados: o espaço para consultas de hoje e escalas é o fim de cada coluna. Cada linha leva ao paciente.
- **Pacientes e Check-ins**: `<table>` de verdade no desktop (`Linhas.module.css` põe o layout em grade e mantém a semântica no HTML) e cartões empilhados no compacto, com o rótulo de cada célula visível. Filtros na URL (`?busca`, `?status`, `?pacienteId`, `?de`, `?ate`, `?emocao`), paginação por cursor com "Carregar mais".
- **Perfil**: cabeçalho com consentimentos como chips, período com atalhos e abas Visão geral, Linha do tempo e Anotações privadas (aba na URL). Gráficos: humor e ansiedade são dois tons da mesma rampa (a ansiedade tracejada), emoções usam a cor fixa da emoção com o rótulo no eixo, nada é verde ou vermelho por valor. Comparação entre períodos mostra a diferença como número neutro (`+0,8`). Cada bloco sem consentimento mostra `ConsentimentoAusente`.
- **Vínculo**: código em `display-medio-enfatico` com algarismos tabulares, agrupado 3+3, só na memória do componente (a mutação usa `gcTime: 0`; nada em storage).

- **Início** ganhou "Consultas de hoje" (hora, paciente e status, ou o vazio honesto) e "Escalas" (quantas aguardam resposta e as últimas respondidas com sigla, escore bruto, data e o marcador do item 9).
- **Perfil** ganhou as abas **Escalas** (evolução do escore bruto por sigla, eixo de 0 ao máximo da escala e nenhuma faixa de severidade; histórico; solicitar; `ConsentimentoAusente` quando não compartilha) e **Consultas** (próximas e anteriores numa janela de 92 dias para cada lado, o limite da API; agendar daqui). A linha do tempo traz escala solicitada, escala respondida e consulta com texto próprio.
- **Escalas**: catálogo controlado (sigla, nome, itens, pontuação bruta, referência de validação) com o aviso fixo "Instrumento de acompanhamento. O resultado é o escore bruto e não é diagnóstico.", aplicações com filtro de situação na URL (`?status`) e "Carregar mais". Solicitar abre um diálogo (paciente e escala): sem consentimento mostra o aviso e desabilita o envio, 403 e 409 do servidor têm mensagem própria. O detalhe mostra o escore "12 de 27" (DASS-21: três subescalas "x de 42" e o total), as respostas por item com o rótulo da opção, o marcador do item 9 e os avisos fixos.
- **Calendário**: Dia, Semana e Mês (`?visao`, `?dia`), anterior, próximo e Hoje, tudo em America/Sao_Paulo. Dia e semana são uma grade de horas (07h às 21h, que cresce para caber consulta fora da faixa) rolável; em telas estreitas a semana rola na horizontal dentro do contêiner e começa em hoje. A posição de cada bloco vem de custom properties (`--inicio`, `--duracao`, `--faixa`), que o React aplica pelo CSSOM e por isso passam no CSP estrito. Canceladas e remarcadas ficam esmaecidas sem opacidade: sem preenchimento, contorno tracejado e texto secundário, para manter o contraste. O mês usa o `Calendar` do react-aria (setas, PageUp e PageDown, Enter abre o dia) com a contagem de consultas que acontecem. Criar e remarcar compartilham os campos de data, início e duração (15 a 240 minutos, de 5 em 5); o conflito (409) aparece no próprio diálogo, sem fechá-lo.
- **Relatórios**: Geral ou Paciente, período, "Incluir anotações privadas" (desligado, com explicação), prévia na tela e "Exportar PDF". O botão abre a nova aba no clique (antes de esperar o servidor, para o navegador não bloquear), registra a exportação (`POST /exportacoes`, que devolve o número) e leva a `/relatorios/imprimir`, que carrega os dados e chama `window.print()`. A mesma folha (`Relatorio.tsx`) serve à prévia e à impressão. Na impressão: A4 com 15mm de margem, tema claro forçado nessa aba (sem salvar a preferência), cabeçalho corrido e rodapé (Disclaimer e "Documento confidencial") repetidos em toda página por uma tabela de layout (`role="presentation"`, o único jeito de o Chromium repetir `thead` e `tfoot`), seções que não se partem e série diária e anotações em página nova.
- **Auditoria**: tabela (data e hora, ação em texto humano do servidor, paciente, quem: Você ou Paciente, detalhes) com filtros na URL (`?acao`, `?pacienteId`, `?de`, `?ate`) e "Carregar mais". Os detalhes saem de uma lista fechada de chaves dos metadados; o IP só aparece em eventos de conta e sessão.
- **Minha área**: abas Perfil (nome e especialidade editáveis; e-mail e CRP somente leitura), Senha (8 a 72, confirmação; depois do sucesso o aviso de que as outras sessões foram encerradas), Sessões (navegador e sistema resumidos do user-agent, IP, último uso, "Esta sessão", "Encerrar outras sessões" com confirmação) e Preferências (tema e itens fixados, os mesmos controles do FAB: `useTema` e `usePins`, que agora é um estado único). O FAB leva a `?aba=preferencias` (Configurações) e a `/minha-area` (Meu perfil). "Sair" também mora no topo da tela.

### Navegação (Shell)
- **Sidebar** colapsável (toggle com `PanelLeftClose`/`PanelLeftOpen` no lugar de `<|` e `|>`). Recolhida: só os itens fixados (padrão Início, Pacientes, Escalas, Calendário), ícone sobre rótulo. Expandida: Início, Pacientes, Check-ins, Chats (desabilitado, "em breve"), Relatórios, Escalas, Calendário, Vínculo, Auditoria.
- **FAB de perfil**: iniciais do nome; abre o FAB menu vertical de pílulas (alternativa 1 do wireframe) com Configurações e Meu perfil (ambos levam à Minha área), Tema (Sistema, Claro, Escuro, num diálogo rápido) e Sair. Pins ficam em `localStorage` (`psychelink_web_pins`) e o tema em `psychelink_web_tema`; nada mais.

## Motion

Molas M3 Expressive viram `linear()` (massa 1, duração = tempo até assentar em 0,2%). Sem biblioteca de animação.

| Token | Mola | Uso |
|---|---|---|
| `--mola-espacial-rapida` + `--duracao-espacial-rapida` (348ms) | ζ 0.6, k 800 | press, morph de forma, escala |
| `--mola-espacial-padrao` + `--duracao-espacial-padrao` (412ms) | ζ 0.8, k 380 | popovers, indicadores, gaveta |
| `--mola-espacial-lenta` + `--duracao-espacial-lenta` (568ms) | ζ 0.8, k 200 | reservada para transições de página inteira |
| `--mola-efeitos-rapida` + `--duracao-efeitos-rapida` (138ms) | ζ 1, k 3800 | state layers, cor |
| `--mola-efeitos-padrao` + `--duracao-efeitos-padrao` (212ms) | ζ 1, k 1600 | opacidade de overlays |

Espacial pode passar do alvo (overshoot), efeitos nunca. `prefers-reduced-motion: reduce` zera todas as durações: tudo vira mudança instantânea e o spinner e o brilho do esqueleto param.

## Tema

`system | light | dark` em `data-theme` no `<html>`. `public/tema-inicial.js` aplica o valor salvo antes da primeira pintura (sem piscar); `src/lib/tema.ts` mantém o estado e persiste em `localStorage` (`try/catch`, o tema ainda vale na sessão se o storage falhar). Em build, o lightningcss converte `light-dark()` para o truque `--lightningcss-light/dark`, que respeita o `color-scheme` do `:root`.

## Segurança do front: CSP

Dev (`index.html`, meta): precisa de `'unsafe-inline'` em script e estilo (preâmbulo do React Refresh e CSS injetado pelo Vite) e do WebSocket do HMR. Esse meta também vai no build; no host, o header de produção abaixo vale por cima (as políticas se somam e vence a mais restrita).

Produção, header do reverse proxy (mesma origem de `/api`):

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
```

Verificado com `vite preview` e esse header em `/inicio`: menu, diálogos, gaveta e navegação funcionam. O react-aria injeta um `<style>` de `touch-action` no runtime, que o `style-src 'self'` bloqueia (uma mensagem no console, sem efeito: a regra equivalente está em `globais.css`). Para silenciar a mensagem, acrescente ao `style-src` o hash que o navegador informa na violação (`'sha256-...'`) e refaça-o ao atualizar o react-aria-components.

## Do's and Don'ts

### Do:
- **Do** usar só tokens: cor por papel (`--cor-*`), forma por escala (`--forma-*`), espaço pela grade (`--espaco-*`), tipo por papel (`--tipo-*`).
- **Do** acompanhar toda cor de dado com rótulo e todo erro com ícone e texto.
- **Do** mostrar ausência de consentimento com `ConsentimentoAusente`, nunca como vazio.
- **Do** dar a todo componente interativo foco visível (2px primária, offset 2), alvo de 44px e operação por teclado.
- **Do** copy em pt-BR, não diagnóstica: registros, variação, tendência de dados, média, frequência.

### Don't:
- **Don't** usar vermelho ou verde para significar bom ou ruim. Vermelho é erro de sistema.
- **Don't** escrever inline style, número fixo de cor, raio, espaço ou duração fora de `tokens.css` (a exceção é o breakpoint, documentada).
- **Don't** usar sombra em card, lista ou campo, nem borda colorida lateral.
- **Don't** usar as palavras proibidas da interface (melhora, piora, grave, leve, moderado, risco, sintoma, diagnóstico fora de "não é diagnóstico", saudável, alerta clínico).
- **Don't** usar `dangerouslySetInnerHTML` nem guardar dado sensível em storage do navegador.

## Decisões e motivos (R-31)

| Decisão | Motivo |
|---|---|
| Catppuccin Latte/Mocha | Mesma paleta do app mobile: paciente e psicólogo reconhecem o mesmo produto. |
| M3 Expressive | Forma e movimento comunicam estado (pressionado, ativo, aberto) sem depender de cor. |
| Google Sans Flex | Fonte do M3 Expressive (OFL); self-hosted por LGPD e pela CSP `font-src 'self'`. |
| lucide-react | Família Feather que o mobile já usa; aceito apesar do aviso de "ícone de biblioteca" do antislop, com ícones escolhidos por relevância (Check-ins `MapPinCheck`, Escalas `ClipboardList`, Vínculo `Link2`, Auditoria `ShieldCheck`). |
| Cantos muito arredondados (pílula em botão, `xl` em card) | É a linguagem do M3 Expressive e do mobile. Campos, popovers e chips usam `md`/`sm`, então o raio varia por papel. |
| Elevação tonal | Dado clínico pede tela calma; sombra só onde algo flutua. |
| `light-dark()` | Um valor por papel e tema, sem blocos duplicados. |
| FAB menu de pílulas (alternativa 1) | Mais acessível que o radial e é o "FAB menu" do M3 Expressive. |
| Tabelas como `<table>` com CSS em grade | Leitor de tela navega por linha e coluna no desktop; o compacto vira cartão sem perder o dado. |
| Humor e ansiedade em dois tons da mesma rampa | Sem valência: a série se distingue por luminosidade e traço, nunca por verde e vermelho. |
| Pins em localStorage | Preferência de interface, não dado sensível. |
| Gráfico de linhas próprio em SVG | O recharts mede por `ResponsiveContainer`, que não acompanha a troca de tela para impressão, e não dá controle de marcador e traço por série. O SVG próprio mede o contêiner e cabe nos dois casos. |
| Folha do relatório como tabela de layout | É o único jeito de o Chromium repetir cabeçalho e rodapé em toda página impressa (`position: fixed` na margem sai na página seguinte; `display: table-*` em `div` não repete). |
| Item 9 do PHQ-9 como marcador neutro | Decisão do produto: o fato aparece, a interpretação não. Sem alerta vermelho, sem "risco". |
| Escala e consulta sem faixas de severidade | O gráfico de evolução vai de 0 ao máximo e só mostra o escore bruto de cada aplicação. |
| Mês só com os dias do mês | O `Calendar` do react-aria desabilita os dias de fora do mês; buscar a agenda deles seria dado que ninguém alcança. |
