# Levantamento do PsycheLink (10 e 11/11/2026)

Vinte e dois agentes de leitura mapearam os três apps, conferiram a revisão por pares, cruzaram os documentos do TCC com o código e pesquisaram a stack. Tudo aqui é leitura estática: nenhum teste, build ou servidor foi executado. Cada arquivo separa o que foi verificado (lido no código ou na fonte) do que é suspeita.

A crítica de completude (último arquivo) conferiu 14 afirmações que pesam no plano: 11 confirmadas, 3 imprecisas, 0 refutadas. Ela foi escrita antes de dois agentes terminarem (`pesquisa_m3_expressive` e `checklists_seguranca_conformidade`), por isso os cita como ausentes; os dois estão nesta pasta.

O plano que saiu daqui está em [`../PLANO.md`](../PLANO.md) e o andamento em [`../ESTADO.md`](../ESTADO.md).

| Arquivo | Conteúdo | Achados por severidade |
|---|---|---|
| [Server: arquitetura](server_arquitetura.md) | Middlewares, autenticação, inventário de rotas, padrões de código, configuração | 1 alta, 8 media, 5 baixa, 1 info |
| [Server: camada de dados](server_dados.md) | Esquema, RLS, pool, corridas, idempotência, criptografia, fatos para o Prisma | 1 alta, 9 media, 4 baixa, 3 info |
| [Server: estratégia de testes](server_testes.md) | Como a suíte roda, segurança da execução, matriz de cobertura por fluxo | 3 alta, 6 media, 5 baixa |
| [Web: arquitetura](web_arquitetura.md) | Rotas, sessão, cache, confiança no cliente, desempenho, separação | 5 media, 8 baixa, 1 info |
| [Web: design system](web_design.md) | Tokens, conformidade com M3 Expressive, fatos para o Tailwind v4 | 6 media, 7 baixa, 1 info |
| [Mobile: arquitetura](mobile_arquitetura.md) | Navegação, sessão, API, armazenamento, inventário de telas | 4 alta, 5 media, 5 baixa, 1 info |
| [Mobile: design system](mobile_design.md) | Tema, conformidade com M3 Expressive, acessibilidade, fatos para o NativeWind | 2 alta, 10 media, 7 baixa, 2 info |
| [Conferência da revisão por pares: requisitos e autenticação](conferencia_auth.md) | Seção 2 (F1 a F20) e 5-A de docs/revisao-por-pares.md contra o código | 1 media, 3 baixa, 1 info |
| [Conferência da revisão por pares: check-in e dashboard do paciente](conferencia_checkin.md) | Seções 5-B e 5-C contra o código | 2 media, 2 baixa, 1 info |
| [Conferência da revisão por pares: SOS, consentimento, painel web](conferencia_resto.md) | Seções 5-D, 5-E, 5-F e 6 contra o código | 1 alta, 2 media, 3 baixa |
| [Documentos: casos de teste × devolutiva](docs_casos_de_teste.md) | CT-001 a CT-033 contra a devolutiva e os testes automatizados | 1 critica, 3 alta, 7 media, 1 baixa |
| [Documentos: afirmações × repositório](docs_afirmacoes.md) | O que slides, descrição e requisitos prometem contra o que o código tem | 1 critica, 4 alta, 9 media, 3 baixa |
| [Dependências: server](deps_server.md) | Versões, npm audit, alternativas | — |
| [Dependências: web](deps_web.md) | Versões, npm audit, shadcn e outras alternativas | — |
| [Dependências: mobile](deps_mobile.md) | Versões, npm audit, Expo SDK 58, alternativas | — |
| [Pesquisa: Tailwind v4 e NativeWind](pesquisa_tailwind_nativewind.md) | Viabilidade em novembro de 2026 | — |
| [Pesquisa: Prisma](pesquisa_prisma.md) | Viabilidade de migrar de pg em novembro de 2026 | — |
| [Pesquisa: validação de CRP](pesquisa_crp.md) | Consulta oficial, APIs pagas, opções para o TCC | — |
| [Pesquisa: Material 3 Expressive e tipografia](pesquisa_m3_expressive.md) | O que define o M3E, fontes, Catppuccin, implementações | — |
| [Checklists: desempenho, complexidade, testes e UI/UX](checklists_desempenho_qualidade_ux.md) | Itens verificáveis para os revisores | — |
| [Checklists: segurança e conformidade](checklists_seguranca_conformidade.md) | OWASP, MASVS, LGPD e CFP 09/2024 para os revisores | — |
| [Crítica de completude do levantamento](critico_completude.md) | Lacunas, contradições e verificação de 14 afirmações | — |
