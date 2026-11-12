# Server: conformidade com LGPD e CFP (revisão de 12/11/2026)

Leitura estática do commit `a630eae`: o server, os textos de `apps/mobile/src/constants/documentos.ts` e as telas do app que tratam de consentimento. Nada foi executado. As leis foram lidas por resumo automático das fontes oficiais. Os trechos curtos citados são literais; o resto é paráfrase. Cada achado passou por um verificador, que releu o código.

Isto não é parecer jurídico. É o que o código mostra comparado com o que os textos prometem.

## Termos usados

- **LGPD**: Lei Geral de Proteção de Dados (Lei 13.709/2018). O art. 11 trata de dado sensível, como saúde.
- **Titular**: a pessoa a quem o dado se refere (o paciente, mas também o psicólogo).
- **Controlador**: quem decide o que se faz com o dado. Aqui, o grupo do TCC.
- **Base legal**: o motivo que a lei aceita para tratar o dado. Por exemplo, consentimento.
- **Resolução CFP 09/2024**: regra do Conselho Federal de Psicologia para serviços psicológicos mediados por tecnologia.
- **Minimização**: coletar só o dado que tem uso.

## Resumo

Pontos sólidos que dá para afirmar:

- consentimento por categoria conferido a cada leitura, sem cache;
- data da mudança em `atualizado_em` e trilha de auditoria que o papel `psychelink_app` não altera;
- vínculo conferido duas vezes, no SQL e pela RLS;
- textos livres cifrados com AES-256-GCM;
- leituras de detalhe auditadas.

Há uma falha nova de severidade alta, e duas altas que já estão na fila (lotes A7 e A11):

- **LGPD-02 (nova):** os textos legais mandam o titular a menus e e-mails que não existem. Eles prometem chat, TLS 1.3 e monitoramento contínuo, e se apresentam como uma "Ltda.".
- **A7-ref:** o psicólogo de um vínculo novo lê o histórico e os diários liberados ao anterior (lote A7).
- **A11-ref:** o aceite dos documentos não chega ao servidor (lote A11).

São médias:

- **LGPD-01:** o paciente não consegue reler os próprios dados. A verificação baixou de alta para média: é funcionalidade ausente, e o pedido pode ser atendido à mão.
- **LGPD-05:** a categoria "Humor" libera também contextos e horário, e o texto não diz isso.
- **LGPD-08:** a data de nascimento é obrigatória e não serve para nada.
- **LGPD-03:** não há exclusão de conta, e a cascata apaga registros da outra parte.
- **CFP-01:** o registro do psicólogo some da tela. Já estava no levantamento.

O LGPD-07 (consentimento padrão sem evento) foi refutado: o histórico pode ser reconstituído pela auditoria.

## Achados mantidos

Legenda do veredito: **confirmado** = o verificador refez o caminho; **provável** = o código confere, mas o efeito é menor do que o descrito; **não conferido** = o verificador não chegou a esse achado.

| Id | Sev. | Confiança | Veredito | Título | Onde | Cenário | Correção | Teste | Lote |
|---|---|---|---|---|---|---|---|---|---|
| LGPD-02 | alta | verificado | confirmado | Os textos legais mandam o titular a menus, e-mails e funções que não existem | `apps/mobile/src/constants/documentos.ts:137` | O texto manda a "Configurações > Privacidade e Dados", mas esses itens do menu não fazem nada (`SheetConta.tsx:100-123`). Diz "PsycheLink Tecnologia Ltda." (`:41`), "15 dias úteis" (`:93`; a lei fala em 15 dias), "TLS 1.3" e "monitoramento contínuo" (`:97`). Não identifica um responsável. AES-256 tem base no código | Editar `documentos.ts` conforme a tabela abaixo. Não exige código | Roteiro manual no Expo Go: cada caminho citado leva à tela. Um rg pelas frases antigas não acha nada | — |
| A7-ref | alta | verificado | confirmado | O psicólogo de um vínculo novo lê o histórico e os diários liberados ao anterior | `src/routes/psicologo/checkins.ts:172` | O paciente libera um texto para A, encerra e se vincula a B. B lê o texto e todo o histórico: os JOINs exigem só `status='ativo'`. Contradiz `documentos.ts:77` ("exclusivamente com o psicólogo que você vinculou") | Lote A7 | O do A7 | A7 |
| A11-ref | alta | verificado | confirmado | O aceite dos quatro documentos não chega ao servidor | `src/schemas.ts:28` | Um POST direto, sem aceite, cria a conta. Nada guarda versão nem data. A lei põe no controlador o ônus de provar o consentimento (art. 8 §2) | Lote A11 | O do A11 | A11 |
| LGPD-01 | média | verificado | confirmado | O paciente não consegue ler os próprios dados | `src/routes/checkin.ts:233` | Nenhuma rota do paciente devolve diário, contextos, hábitos nem intensidade. O score aparece uma vez só, na resposta do envio. O app diz "Seus check-ins continuam com você" (`consentimento.tsx:168`) | Mínimo: GET `/paciente/meus-dados`, com os dados decifrados e auditado. Sem prazo para isso, trocar os textos de `consentimento.tsx:142` e `:168` e declarar a limitação | `meus-dados.test.ts`: A lê o próprio texto; B não; sem token, 401; 1 linha de auditoria | — |
| LGPD-05 | média | verificado | confirmado | "Humor" libera contextos e horário sem que o texto diga | `src/lib/resumo.ts:76` | Com só "Humor" ligado, o psicólogo recebe também os contextos (Trabalho, Família…) e o horário de cada check-in. Com humor e hábitos desligados, os textos de diário liberados ainda saem com a data (ver K-01). A medicação e a intensidade são pontos fracos (já cabem no texto) | Só texto: dizer em `consentimento.tsx:31` que inclui contextos e horário, e que os diários liberados continuam visíveis; mesma correção em `vinculacao.tsx:88` | `pacientes.test.ts`: humor e hábitos false com um texto liberado; fixa o que o novo texto descreve | — |
| LGPD-08 | média | verificado | confirmado | Data de nascimento obrigatória e sem uso | `src/schemas.ts:18` | Data de ontem passa: só a data futura é recusada. Os Termos aceitam menor "com autorização do responsável", mas não há fluxo. A data também é obrigatória para o psicólogo, e nenhuma rota mostra a idade do paciente | Decisão do grupo. Opção mínima: idade de pelo menos 18 anos no `registroSchema` e Termos sem "ou ter autorização" | `cadastro.test.ts`: 17 anos e 364 dias dá 400; 18 anos, 201 | — |
| LGPD-03 | média | verificado | confirmado | Sem exclusão de conta, e a cascata apaga registros da outra parte | `migrations/0001_baseline.sql:816` | Não há rota de exclusão. Um DELETE manual do psicólogo leva as escalas que o paciente respondeu, e um DELETE do paciente leva as anotações e consultas do psicólogo | Migration (0009 em diante, a combinar) com `ON DELETE RESTRICT` nessas FKs. Nos textos: "exclusão a pedido, feita manualmente" | Pelo dono: apagar o psicólogo falha com 23503 e a aplicação continua | — |
| CFP-01 | média | verificado | confirmado | O registro do psicólogo some com o fim do vínculo e aos 5 anos da criação | `src/routes/psicologo/pacientes.ts:426` | Com o vínculo encerrado, as anotações dão 404, embora a policy já libere o autor. O prazo conta da criação, não do fim do atendimento | Leitura das próprias anotações sem exigir vínculo ativo; documentar a guarda | Encerrar o vínculo; o autor lê (200), outro psicólogo não | — |
| LGPD-06 | baixa | verificado | provável | Leituras de dado clínico sem rastro | `src/routes/psicologo/pacientes.ts:277` | A linha do tempo, a aba de escalas, a lista de pacientes e `/aplicacoes` não auditam. Mas a visita ao paciente pelo web fica registrada, porque o Perfil sempre chama `/resumo`. Sobram as listas e o acesso direto pela API. Sobreposto ao AUD-01 | Auditar a linha do tempo e as escalas; ou trocar o texto de `apps/web/PRODUCT.md:57` | `pacientes.test.ts`: a linha do tempo gera 1 linha de auditoria | — |
| LGPD-04 | baixa | verificado | confirmado | Nada é descartado | `migrations/0002_sessao_auditoria.sql:13` | Contas que desistiram do código ficam para sempre. Sessão e auditoria guardam IP sem prazo. A Política conta prazos "após o encerramento", que não existe. O texto "por até 6 meses" inverte o Marco Civil, que fixa 6 meses como mínimo | Mínimo, só texto: descrever a retenção real. Opcional: um script de expurgo rodado à mão | Com o script: cadastro não confirmado de 8 dias some; de 1 dia fica | — |
| LGPD-09 | baixa | verificado | não conferido | Mudança de consentimento e auditoria em transações separadas | `src/routes/paciente/consentimento.ts:104` | Se o INSERT da auditoria falhar, o consentimento mudou e a trilha não registra. O app mostra erro, e o paciente acha que nada mudou | `registrarAuditoria` aceita a conexão da transação e roda dentro dela | Pelo dono, tirar o INSERT em auditoria do papel; o PUT dá 500 e o consentimento continua o anterior | — |
| LGPD-10 | baixa | verificado | não conferido | O psicólogo se cadastra sem aviso de privacidade nem termo de sigilo | `apps/web/src/rotas/auth/FormularioAcesso.tsx:82` | O cadastro web não tem texto nem aceite. O psicólogo também é titular, e é quem lê o dado sensível | Um texto curto "Termos do profissional", com aceite gravado no mesmo contrato do A11 | Com o A11: cadastro do psicólogo sem aceite dá 400 | A11 |

Já estavam no levantamento de 10/11 e continuam abertos:

- LGPD-01: `levantamento/docs_afirmacoes.md` (portabilidade e eliminação). A leitura do próprio diário e a frase do app são novas.
- LGPD-02: `levantamento/mobile_arquitetura.md` (menu sem ação) e `docs_afirmacoes.md` (TLS 1.3, chat).
- A7-ref: `levantamento/conferencia_resto.md` e `critico_completude.md`.
- A11-ref: `levantamento/critico_completude.md`.
- LGPD-05: `levantamento/conferencia_resto.md`, só o comentário.
- LGPD-06: `levantamento/docs_afirmacoes.md` ("Auditoria não cobre todos os acessos").
- LGPD-08: `levantamento/critico_completude.md` item 3 e `PLANO.md` (decisão aberta).
- LGPD-03 e LGPD-04: `levantamento/docs_afirmacoes.md`.
- CFP-01: `levantamento/conferencia_resto.md` e F-C1-3. É duplicado inteiro.
- LGPD-09: `levantamento/server_dados.md` e `server_arquitetura.md` (apontado pelo setor crítico).

Citações que o verificador não conferiu e que não sustentam nenhum veredito: Res. CFP 09/2024 art. 4º VIII c e art. 8º; Res. CD/ANPD 2/2022 (dispensa de encarregado para agente de pequeno porte).

## Refutados

- **LGPD-07, "Consentimento dado por padrão no vínculo não deixa evento nem versão do aviso".** O evento de fato não existe, mas o histórico pode ser reconstituído. Cada PUT grava na auditoria as categorias alteradas com o valor novo, e o valor anterior é o contrário. Desfazendo esses eventos a partir do estado atual, chega-se ao estado no momento do vínculo. Sobram dois pontos: a versão do texto do aviso não é gravada (é o A11), e a auditoria roda depois do COMMIT (é o LGPD-09).

## O que o protótipo pode afirmar com honestidade

Cada frase vale para o commit `a630eae`. A condição está entre colchetes. As frases 3 e 6 foram corrigidas pelo setor crítico.

### Na apresentação

1. "O PsycheLink é um protótipo acadêmico. Na demonstração só usamos dados fictícios." [o grupo confirma que o banco da equipe não tem dado real]
2. "O paciente escolhe o que o psicólogo vê, em três categorias: humor, hábitos e sono, e escalas. O texto do diário é liberado um a um, no próprio check-in."
3. "Cada rota do painel confere o consentimento antes de devolver o dado; o diário é liberado texto a texto." [não dizer "o banco confere": quem confere são as rotas, não a RLS (RLS-04)]
4. "O psicólogo só lê dados de pacientes com vínculo ativo, e encerrar o vínculo, de qualquer um dos lados, corta o acesso na hora. Isso é conferido duas vezes: na consulta SQL e por RLS no PostgreSQL." [só se `DATABASE_URL` usar `psychelink_app`; até o A7, vale "com vínculo ativo", mas inclui o histórico anterior]
5. "Textos livres (emoções, contextos, diário, anotações, respostas das escalas e observação da consulta) são cifrados campo a campo com AES-256-GCM. Números como humor, ansiedade, sono, hábitos e pontuação ficam em claro, para os gráficos."
6. "Cada mudança feita pelo paciente na tela de privacidade é registrada numa trilha que a aplicação não consegue alterar nem apagar." [o consentimento padrão gravado no vínculo não gera evento; o dono do banco pode remover o trigger]
7. "As telas de detalhe de um paciente, as anotações, o relatório e a exportação ficam registradas na auditoria." [não dizer "todo acesso"]
8. "As escalas não dão diagnóstico. O sistema mostra a pontuação e só marca quando o item 9 do PHQ-9 é diferente de zero. Nesse caso, o paciente vê na hora o CVV 188 e o SAMU 192."
9. "O psicólogo entra com senha e código por e-mail. A sessão web expira em 12 horas, ou em 30 minutos sem uso."

### Na parte escrita

- "Base legal pretendida: consentimento específico e destacado para os registros do paciente e o compartilhamento (LGPD art. 11, I); tutela da saúde por profissional para as anotações do psicólogo (art. 11, II, f)."
- "Os controles técnicos (RLS, cifra por campo, auditoria, 2FA, consentimento por categoria) seguem as medidas de segurança da LGPD, arts. 46 a 49."
- "Este trabalho não teve relatório de impacto (RIPD), encarregado nomeado, teste de invasão independente nem parecer jurídico ou do Conselho Regional de Psicologia."
- "Limitações desta versão:"
  - "o app ainda não mostra ao paciente o histórico do próprio diário, nem exporta ou exclui a conta; esses pedidos são atendidos manualmente pela equipe;"
  - "não há descarte automático de dados;"
  - "o cadastro não verifica a idade;"
  - "o psicólogo não é avisado em tempo real quando o item 9 é diferente de zero."

### Não afirmar

"em conformidade com a LGPD", "seguro", "certificado", "aprovado pelo CFP", "toda leitura é auditada", "TLS 1.3", "dados eliminados em 90 dias", "o paciente exporta ou exclui seus dados", "chat com o psicólogo".

Dependem de confirmação do grupo:

- "Nenhuma credencial vazou": só depois de confirmar que a senha do dono do banco foi trocada (`levantamento/critico_completude.md`, item 1).
- "Ninguém além do psicólogo lê o diário": só depois do A7.

## O que mudar nos textos do app

### `apps/mobile/src/constants/documentos.ts`

| Linha | Hoje | Trocar por |
|---|---|---|
| 5 | "manter comunicação estruturada com o profissional" | tirar (não há chat) |
| 11 | "maior de 18 anos ou ter autorização expressa de seu responsável legal" | decisão do grupo (LGPD-08): "Nesta versão, o cadastro é só para maiores de 18 anos", com checagem no servidor; ou descrever como a autorização é colhida |
| 13, 195 | "canal de suporte", "etica@psychelink.com.br" | o contato real da equipe |
| 23, 59 | "mensagens enviadas ao profissional", "Dados de comunicação" | tirar |
| 41 | "PsycheLink Tecnologia Ltda." | "projeto acadêmico de TCC da ETEC <nome>, sem pessoa jurídica" |
| 49 | "acessando as Configurações do aplicativo" | "pedindo pelo e-mail <contato real>" |
| 51, 101 | "em conformidade com a Lei Geral..." | "buscando seguir a Lei Geral..." |
| 57 | "horários de acesso e funcionalidades utilizadas" | "data e hora das ações registradas na auditoria" |
| 61 | "tipo de dispositivo, sistema operacional, versão do aplicativo" | "endereço IP e identificação do navegador ou aplicativo, gravados no login do psicólogo e em ações registradas" |
| 71 | lista de bases legais | deixar claro que "legítimo interesse" não vale para dado de saúde |
| 73 | "obtido neste ato" | só fica verdadeiro depois do A11 |
| 77, 127 | "compartilhados exclusivamente com o psicólogo que você vinculou" | acrescentar que, ao vincular, humor, hábitos e escalas ficam compartilhados por padrão e que isso muda em "Conta > Psicólogo e privacidade". Até o A7: "inclui registros anteriores ao vínculo" |
| 79, 129 | fornecedores sem nome | nomear o banco (Neon), o envio de e-mail e a hospedagem, e dizer se ficam fora do Brasil (conferir) |
| 85, 133 | "eliminados em até 90 dias" | "Nesta versão, a exclusão é feita a pedido, manualmente, pela equipe" |
| 87 | "logs ... até 6 meses ... Marco Civil" | "A trilha de auditoria é guardada sem exclusão, por ser registro de segurança". Conferir o Marco Civil art. 15 antes de citá-lo |
| 93 | "seção 'Privacidade e Dados'", "privacidade@psychelink.com.br", "15 dias úteis" | pedido por um e-mail real, "em até 15 dias", e o nome e contato de quem responde pelos dados |
| 97 | "TLS 1.3", "AES-256", "monitoramento contínuo" | "conexão com o banco por TLS com certificado verificado; HTTPS pela hospedagem; textos livres cifrados com AES-256-GCM; números em claro; sem monitoramento contínuo" |
| 99 | aviso à ANPD | manter, e escrever no repositório um roteiro de incidente de uma página |
| 113 | "qualidade do sono e bem-estar geral" | "PHQ-9, PHQ-2, GAD-7 e DASS-21" |
| 121 | itens (c) "apoiar a comunicação" e (d) "aprimorar ... anonimizada e agregada" | tirar os dois: não existem |
| 137 | "Configurações do aplicativo > Privacidade e Dados > Gerenciar Consentimentos" | "Conta > Psicólogo e privacidade" |
| 139 | "deixará de coletar novos dados sensíveis" | "Desligar o compartilhamento corta o acesso do psicólogo; para parar a coleta, deixe de registrar ou peça a exclusão" |
| 141 | "anonimizados ou eliminados conforme sua solicitação" | "eliminados a pedido, manualmente" |
| 153 | "desenvolvida por profissionais de tecnologia e consultores da área de saúde mental" | "desenvolvida por estudantes da ETEC <nome>, com orientação de <nome>". O grupo confirma se houve psicólogo consultor |
| 193 | "Trabalhamos em colaboração com psicólogos e seguimos as orientações do CFP" | "Buscamos seguir a Resolução CFP 09/2024; o sistema não foi avaliado pelo CFP nem por um CRP" |

Faltam nos textos: versão e data de vigência (vão para o A11), o contato de quem responde pelos dados e a menção de que as leituras do psicólogo ficam registradas.

### Outras telas

- `consentimento.tsx:31`: incluir contextos, intensidade e horário, e o efeito sobre os diários já liberados (LGPD-05). Em `:36`, incluir medicação.
- `consentimento.tsx:142` e `:168`: "continuam salvos, só para você" e "continuam com você" só ficam verdadeiros se o app mostrar o histórico (LGPD-01). Se não mostrar: "ficam guardados no servidor; nesta versão o app ainda não mostra o histórico".
- `vinculacao.tsx:88`: citar os contextos e, até o A7, avisar que o histórico anterior também aparece.
- `apps/web/PRODUCT.md:57`: "Cada acesso deixa rastro" só vale depois do LGPD-06. Até lá: "as telas de detalhe de um paciente deixam rastro".
- Cadastro do psicólogo no web: termo do profissional com aceite (LGPD-10).

## O que não foi coberto

- O prazo de guarda do registro do psicólogo: 5 anos (Res. CFP 01/2009) ou 20 anos (Lei 13.787/2018). As fontes não foram lidas.
- A Res. CFP 09/2024 foi lida por resumo de um espelho (Legisweb), não no Diário Oficial. Os artigos da LGPD foram lidos por resumo do site do Planalto.
- Não foi verificado se o Marco Civil art. 15 se aplica a projeto acadêmico sem pessoa jurídica.
- Não foi verificado se o ECA Digital (Lei 15.211/2025) se aplica a adolescentes.
- A região do Neon e do SMTP, e se há transferência internacional, não foram conferidas (o `.env` não foi aberto).
- Não foi verificado quem é dono do domínio `psychelink.com.br`.
- As telas do web não foram revisadas uma a uma.
- Os PDFs do TCC não foram lidos.
- O A4 (Brevo) está fora deste estado. A Política vai precisar citar o novo fornecedor quando ele entrar.
