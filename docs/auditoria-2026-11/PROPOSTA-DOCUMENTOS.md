# Proposta de ajuste dos documentos do TCC

Para levar à orientadora até 16/11/2026. Origem: a auditoria de novembro cruzou slides, descrição do projeto, requisitos e casos de teste com o código (relatórios `levantamento/docs_afirmacoes.md` e `levantamento/docs_casos_de_teste.md`).

## A pergunta

Alguns documentos prometem o que o sistema não tem. Para cada item há duas saídas: **implementar** até 27/11 (congelamento de funcionalidade) ou **ajustar o documento** e declarar o restante como trabalho futuro. Pedimos autorização para ajustar slides, requisitos e casos de teste onde a coluna "Proposta" indica.

Se o ajuste não for autorizado, o grupo apresenta as diferenças oralmente como limitações do protótipo, e os casos de teste das funcionalidades fora do escopo ficam com status "Bloqueado".

## Slides (`Psychelink.pdf`, outubro de 2026)

| Slide | Hoje | O que o código tem | Proposta |
|---|---|---|---|
| 9 e 10 | Paleta lavanda `#E6E6FA`, preto, branco, rosa `#FFB5C0` | Catppuccin Latte (claro) e Mocha (escuro), com mauve como cor principal; lavanda e rosa não aparecem no código | Trocar pelas cores reais e manter o significado de cada uma |
| 13 | Frontend: React/React Native, Vite, Expo, Figma, TailwindCSS | Web em CSS Modules sobre tokens do Material 3; mobile em StyleSheet | Depende do lote A8: se a ponte do Tailwind entrar, fica "TailwindCSS (adoção incremental) + tokens M3"; se não, trocar TailwindCSS por "CSS Modules + tokens M3". Confirmar se o Figma foi usado no wireframe |
| 14 | Backend: TypeScript, PostgreSQL (NeonDB), Prisma, Express | node-postgres (`pg`) com SQL parametrizado, RLS e migrations SQL | Depende do piloto (lote A9): se entrar, "Prisma (piloto) + SQL com RLS"; se não, trocar Prisma por "node-postgres (pg)" |
| 15 | DevOps: Git, GitHub, Docker, Vercel, Render | Nenhum dos três últimos; CI entra no lote A1 | Depende dos lotes A4 e A5 (deploy): o que estiver no ar fica; acrescentar GitHub Actions |
| 22 | "Mapa de Gatilhos" | Os contextos são gravados cifrados, mas não há tela de mapa | Retirar o nome ou trocar por "registro de contextos" |

## Requisitos (`Requisitos Funcionais - Não Funcionais`)

| Item | Hoje | Proposta |
|---|---|---|
| F7 Chat | Requisito do paciente | Trabalho futuro. Decisão do grupo em 22/10: o chat aumentaria muito a complexidade e não daria para apresentar funcionando (ata em `docs/`) |
| F10 Notificações do paciente | Lembretes 09:00 e 21:00, relatório semanal, aviso de mensagem | Fica o lembrete diário de check-in, local no aparelho (lote B7). Relatório semanal e aviso de mensagem viram trabalho futuro |
| F15 Recomendar exercícios | Requisito do psicólogo | Trabalho futuro |
| F18, F19, F20, NF19.1, NF20.1 | Push ao psicólogo e ao paciente em até 60 s | Trabalho futuro (push remoto exige servidor de push e build próprio do app) |
| F9 Emergência | Registra o acesso à tela para o psicólogo | Retirar o registro: expõe um momento de crise do paciente sem ganho clínico claro. O resto do F9 entra (lote B4) |
| F11 e F18 | "CRP registrado e validado" | Hoje só o formato é validado. O grupo decide até 20/11 entre conferência manual por um administrador e manter como limitação |
| NF2.1 | "Registros emocionais armazenados com criptografia" | "Emoção, contexto e diário cifrados com AES-256-GCM; humor, ansiedade e sono em claro, porque entram nas médias calculadas no banco" |
| NF6.1 e NF6.2 | Cópia do NF5.1 e NF5.2 | Trocar por um NF do próprio F6: com menos de 3 registros no período, o painel mostra aviso de poucos dados em vez de gráfico |
| NF14.1 | Paciente precisa aceitar compartilhar todos os dados para exportar | Contradiz o F5. Proposta: o relatório traz só as categorias que o paciente compartilha |

## Descrição completa do projeto

| Afirmação | O que o código tem | Proposta |
|---|---|---|
| TLS 1.3 em todas as requisições | TLS verificado na conexão com o banco; a API sobe em HTTP e o HTTPS vem da hospedagem | "TLS na conexão com o banco e HTTPS na hospedagem" |
| AES-256 em repouso nas colunas sensíveis | AES-256-GCM em emoção, contexto, diário, anotações e respostas de escala | Listar as colunas |
| Retenção de 5 anos após o fim do vínculo | Anotações ficam 5 anos a partir da criação; os demais dados não têm política | "Anotações retidas por 5 anos; política para os demais dados é limitação do protótipo" |
| Revogação em menos de 5 s | Imediata por desenho (o consentimento é lido a cada requisição) | "Imediata", com o teste que mede (trilha de testes) |
| JWT de 15 min com refresh rotativo | Só no painel web; o app usa token de 1 dia | Restringir a frase ao painel web |
| O paciente só acessa o app depois do vínculo | O vínculo é opcional | "O paciente usa o app sozinho; os dados só chegam a um psicólogo depois do vínculo e do consentimento" |
| Testes OWASP Top 10 | Não há mapeamento | Retirar, ou mapear os testes existentes às categorias |
| Python com pandas; Express ou Django; Docker + VPS ou Heroku | Estatística em TypeScript; Express; deploy conforme os lotes A4 e A5 | Atualizar |
| Marketplace e perfil público (FP9, FP10) | Não existem | Trabalho futuro |
| Categoria de consentimento "Dashboard e análises" | São 4 categorias: humor, hábitos, escalas e diário | Atualizar a tabela |
| "Engenharia de Software · 2025/2026" | Curso técnico de Desenvolvimento de Sistemas, 2026 | Corrigir |

## Casos de teste (CT-001 a CT-033)

- **Formato:** todos ganham o que a devolutiva de 02/11 pede: valores concretos, casos negativos e de fronteira, resultado obtido, status, data e evidência. A trilha de testes reescreve e executa os casos até 03/12.
- **Fora do escopo:** CT-009, CT-013, CT-022, CT-023, CT-031, CT-032 e CT-033 testam chat, push ou recomendação de exercícios. Proposta: status "Bloqueado, fora do escopo", com a ata da decisão. A lista será reconferida caso a caso antes da reescrita.
- **CT-008:** testa uma categoria de consentimento que não existe ("Dashboard analítico"). Reescrever com as 4 categorias reais.
- **CT-027:** descreve outro psicólogo abrindo o mesmo paciente, o que o sistema impede (um vínculo ativo por paciente). Reescrever como: psicólogo sem vínculo tentando acesso por identificador direto, e psicólogo de um vínculo novo tentando ler dados anteriores ao vínculo dele.
- **QTS:** as partes 2 a 4 estão vazias e as considerações finais têm texto de preenchimento ("lorem ipsum"). Completar.

## O que já existe e não aparece nos documentos

Vale incluir nos slides e na parte escrita: agenda de consultas com bloqueio de conflito de horário; RLS no PostgreSQL com papel próprio da aplicação, testada; gestão de sessões do psicólogo com encerramento remoto; recuperação de senha; cadastro que não revela se o e-mail já tem conta; marcador neutro do item 9 do PHQ-9 com encaminhamento ao CVV e ao SAMU; auditoria visível ao próprio psicólogo; cerca de 200 testes automatizados do servidor.
