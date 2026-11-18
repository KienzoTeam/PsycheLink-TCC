# Product

<!-- impeccable:product-schema 1 -->

> Origem: plano aprovado do TCC (web do psicólogo). Nenhum humano respondeu à entrevista do init nesta rodada, então os fatos abaixo vêm do plano e do wireframe; o que o plano não definiu está marcado como em aberto.

## Platform

web

## Users

Psicólogos com CRP que acompanham pacientes que usam o app mobile PsycheLink. Trabalham entre sessões e antes delas: abrem o painel para ver o que o paciente registrou e autorizou, conferir tendências dos dados, solicitar escalas, agendar consultas e emitir relatórios. Em aberto: volume real de pacientes por psicólogo.

## Product Purpose

Dar ao psicólogo uma visão organizada, em estatística descritiva, dos registros que o paciente escolheu compartilhar (humor, hábitos, escalas, diário), com vínculo, agenda, escalas, relatórios e auditoria no mesmo lugar. Sucesso é o psicólogo chegar à sessão com os dados em mãos sem que a interface interprete nada por ele.

## Positioning

O paciente controla o que o psicólogo vê, categoria por categoria, e a interface nunca rotula estado clínico: mostra registros, médias, frequência e escores brutos. Os acessos do psicólogo a dados de paciente são registrados em uma auditoria imutável (prevista no servidor, WP1 e WP2).

## Operating Context

- Web só para psicólogos, ligada ao app mobile dos pacientes. Mesma origem do servidor: em dev o Vite faz proxy de `/api` para `localhost:3000`.
- Sessão por cookies httpOnly, login em dois passos com código por e-mail (WP1, no servidor).
- Vínculo paciente-psicólogo por código gerado pelo psicólogo e resgatado no mobile; um vínculo ativo por paciente.
- Escalas de catálogo controlado (PHQ-9, GAD-7, DASS-21, PHQ-2), exibidas só com escore bruto.
- Relatórios saem por impressão do navegador ("Salvar como PDF"), com a exportação registrada na auditoria.
- Fuso de exibição: America/Sao_Paulo. Idioma: pt-BR.

## Capabilities and Constraints

- Consentimento desligado aparece como aviso explícito ("O paciente não compartilha esta categoria."), nunca como vazio silencioso.
- Linguagem não diagnóstica. Proibido na interface: melhora, piora, grave, leve, moderado, risco, sintoma(s), diagnóstico (exceto em "não é diagnóstico"), saudável, alerta clínico. Preferir: registros, variação, tendência de dados, média, frequência.
- Status do paciente vem só do volume de dados (Ativo, Esparso, Sem registros), nunca de estado clínico.
- Pearson sempre com N e a nota "correlação não indica causa".
- Disclaimer fixo nos resumos: "Gerado por estatística descritiva. Interpretação clínica é responsabilidade exclusiva do psicólogo."
- Fora desta rodada: chat (visível como "em breve"), marketplace, push, recomendação de exercícios, TOTP e Passkeys, lembretes.
- Nada sensível em localStorage (só tema e itens fixados da barra lateral). Proibido `dangerouslySetInnerHTML`.

## Brand Commitments

- Nome: PsycheLink. Logo: a árvore com raízes em forma de cérebro do app mobile (`apps/mobile/src/assets/Psychelink.png`, copiada para `public/`). Slogan **provisório**: "O acompanhamento entre as sessões." (o wireframe traz "[Algum slogan]"); aguarda confirmação da equipe.
- Sistema visual: Material 3 Expressive sobre Catppuccin Latte (claro) e Mocha (escuro), alinhado ao app mobile. Tipografia Google Sans Flex na interface (Cormorant Garamond + Outfit só na identidade visual), ícones lucide-react.
- Telas fiéis ao wireframe `TCC_PsycheLink/wireframe incompleto.png`.

## Evidence on Hand

- O wireframe acima e o design system do mobile (`apps/mobile/src/theme`).
- Não há dados reais de pacientes, depoimentos, métricas de uso nem logos de clientes. Nada disso pode ser inventado nas telas: sem dados, a interface mostra estado vazio honesto.

## Product Principles

1. O dado é do paciente: o que ele não compartilha fica visivelmente ausente, não escondido.
2. Descrever, não interpretar: números e frequências, sem rótulo clínico nem cor de valência.
3. Cada acesso deixa rastro: o psicólogo vê a própria trilha de auditoria.
4. Calma antes de expressão: a interface é quieta e o movimento aparece no toque, não como decoração.

## Accessibility & Inclusion

WCAG 2.2 AA nos dois temas (texto 4.5:1, elementos de interface 3:1). Tudo operável por teclado, com foco visível. Alvos de toque de pelo menos 44px. Sem rolagem horizontal em 375px. Movimento reduzido respeitado (`prefers-reduced-motion`). Conformidade com LGPD e com as diretrizes do CFP é requisito do projeto.
