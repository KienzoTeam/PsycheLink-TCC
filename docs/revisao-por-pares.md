# PsycheLink — Revisão de Código por Pares

Atividade: *Revisão de Código e Qualidade durante o Desenvolvimento*.
Grupo: Iago (ImFenyx), Henzo, Eduardo e Kenai.
Base de requisitos: *Requisitos Funcionais – Não Funcionais* (F1 a F20, paciente e psicólogo).

## 1. Como a atividade funciona (resumo do PDF)

1. O grupo escolhe funcionalidades **parcialmente desenvolvidas** (o sistema não precisa estar pronto).
2. Um integrante **apresenta** o código.
3. Outro integrante **revisa** com o checklist abaixo.
4. Um terceiro **verifica os requisitos** da funcionalidade.
5. O grupo **registra** os achados e discute.

**Checklist de revisão** (usado na seção 5, item por item):

| # | Pergunta |
|---|----------|
| C1 | O código atende ao requisito? |
| C2 | Os nomes das variáveis são claros? |
| C3 | Existem erros de lógica? |
| C4 | Existem dados que não estão sendo validados? |
| C5 | Existem trechos repetidos desnecessariamente? |
| C6 | Existem mensagens de erro adequadas? |
| C7 | O código está organizado? |
| C8 | Outro integrante consegue compreender o código? |

O PDF também pede atenção a **segurança** (informação sensível exposta? o sistema aceita qualquer entrada?). Esses achados aparecem junto de C4.

## 2. Situação de cada requisito no código

Legenda: ✅ atendido, ⚠️ parcial, ❌ não encontrado no código. Baseado em leitura do código, não em execução do app.

| Req. | Resumo | Status | Observação |
|------|--------|--------|------------|
| F1 | Login do paciente | ✅ | E-mail verificado por código, bcrypt, JWT, rate limit. |
| F2 | Check-in diário (6 etapas) | ⚠️ | 6 etapas + tela de sucesso. NF2.1: só emoção, contexto e diário vão cifrados; humor, ansiedade e sono ficam em claro (necessário para médias; decisão a documentar). NF2.2 (3 min) não foi medido. |
| F3 | Registrar hábitos | ❌ | A tela coleta hábitos, mas **nada os grava**. Ver seção 5, área B. |
| F4 | Histórico emocional (linha do tempo, filtros, detalhe) | ❌ | No app só há gráficos. Não achei linha do tempo com notas, filtro de período e detalhe por entrada. A linha do tempo existe **no web do psicólogo** (`LinhaDoTempo.tsx`). |
| F5 | Gerenciar consentimento | ✅ | Por categoria, com timestamp e revogação imediata do diário. NF5.2: auditoria "imutável" (migration 0002). |
| F6 | Dashboard do paciente | ⚠️ | Há humor/ansiedade (linha) e frequência de emoções (barras). Faltam: gráfico de sono, análise de crises por horário, filtro 7/30/90 dias e alerta de esparsidade (mínimo de 3 registros). |
| F7 | Chat com o psicólogo | ❌ | `chat.tsx` usa mensagens fixas e o selo "Demonstração". Existe a tabela `mensagem`, mas nenhuma rota. |
| F8 | Diário emocional | ⚠️ | Opt-out por padrão e cifrado (✅). Falta o diário **fora** de um check-in. |
| F9 | Recursos de emergência | ⚠️ | SOS está a 1 toque, tem CVV 188, respiração e contatos locais (funciona offline). Faltam SAMU 192 e Bombeiros 193 na tela SOS (o 192 só aparece após uma escala), link para o chat e registro do acesso para o psicólogo. |
| F10 | Notificações do paciente | ❌ | Não há `expo-notifications` nem rota. |
| F11 | Login do psicólogo com 2FA | ⚠️ | 2FA por e-mail, sessão por cookie httpOnly com rotação de refresh (✅). Pré-condição "CRP validado": só se valida o **formato** `00/000000`. |
| F12 | Dashboard clínico geral | ✅ | `dashboard.ts` + `Inicio.tsx`, com disclaimer (NF12.1) e respeito ao consentimento. |
| F13 | Painel individual do paciente | ✅ | Dados sem consentimento aparecem como "ausente" (`ConsentimentoAusente`), e cada acesso é auditado (`paciente_painel_visualizado`). |
| F14 | Exportar PDF | ✅ | `Relatorio.tsx` / `Imprimir.tsx`, com auditoria `relatorio_exportado`. |
| F15 | Recomendar exercícios | ❌ | Não encontrei no servidor, no web nem no app. |
| F16 | Lista de pacientes | ✅ | `Pacientes.tsx`. |
| F17 | Anotações clínicas privadas | ✅ | Cifradas, auditadas (`anotacao_criada`, `anotacoes_lidas`). |
| F18 | Código de vínculo | ⚠️ | 6 dígitos, 24 h, uso único e rastreável (✅). Falta a notificação ao psicólogo quando o paciente usa o código. |
| F19 | Solicitar escala (PHQ-9, GAD-7, DASS-21) | ⚠️ | Escalas, pontuação e log (✅). Falta o push (NF19.1). |
| F20 | Notificações do psicólogo | ❌ | Sem push. O dashboard mostra "atividade recente" como alternativa. |

Os requisitos ❌ não são achado de "revisão de código", e sim **lacunas de escopo**. **Decisão do grupo:** F7, F10, F15 e F20 entram como **trabalho futuro** (seção 7), e não são revisados.

## 3. Divisão por funcionalidade

Regras: o revisor nunca é o apresentador, e cada pessoa passa por papéis diferentes.

| Área | Requisitos | Apresenta | Revisa (checklist) | Verifica requisitos | Registra |
|------|------------|-----------|--------------------|---------------------|----------|
| A. Autenticação (paciente e psicólogo) | F1, F11 | Eduardo | Henzo | Kenai | Iago |
| B. Check-in, hábitos e diário | F2, F3, F8 | Henzo | Iago | Eduardo | Kenai |
| C. Histórico e dashboard do paciente | F4, F6 | Henzo | Eduardo | Kenai | Iago |
| D. SOS e emergência | F9 | Iago | Henzo | Eduardo | Kenai |
| E. Consentimento, vínculo e escalas | F5, F18, F19 | Iago | Eduardo | Kenai | Henzo |
| F. Painel do psicólogo (web) | F12, F13, F14, F16, F17 | Iago | Henzo | Kenai | Eduardo |

- **Contagem:** Iago apresenta 3, Henzo 2, Eduardo 1. Revisões: Henzo 3, Eduardo 2, Iago 1. Kenai verifica requisitos em A, C, E e F (os requisitos são o documento dele) e registra em B e D. Eduardo verifica B e D e registra F; Iago registra A e C; Henzo registra E.
- **Autoria:** o Iago escreveu quase tudo (151 commits). Ninguém é 100% imparcial, e isso fica registrado. Em A, o Eduardo apresenta (fez a primeira versão do registro mobile e do auth do psicólogo) e o Iago fica de "autor de apoio".
- **Kenai:** não tocou no código, então é o teste do item C8 ("outro integrante consegue compreender?"). Trecho que ele não entender vira achado de manutenção.
- **Uma funcionalidade só:** se o professor pedir uma única, use a **B (Check-in)**. Cruza app, servidor e criptografia, e tem os achados mais claros.
- **Fora desta rodada:** consultas/calendário (não estão na lista de requisitos), auditoria em detalhe, migrations e testes.

## 4. Escopo de cada área

| Área | Arquivos |
|------|----------|
| A | Servidor: `routes/auth.ts`, `routes/auth-psicologo.ts`, `schemas.ts`, `lib/sessaoWeb.ts`, `lib/codigo.ts`. App: `hooks/useAuth.ts`, `lib/api.ts`, `lib/authToken.ts`, `screens/auth/*`. Web: `rotas/auth/*` |
| B | Servidor: `routes/checkin.ts`, `lib/criptografia.ts`. App: `screens/paciente/checkin/checkin.tsx`, `lib/checkinService.ts`, `lib/rascunhoCheckin.ts` |
| C | App: `screens/paciente/dashboard/dados.tsx` e `home.tsx`. Servidor: `GET /checkin/resumo` e `/painel` |
| D | App: `screens/paciente/sos/sos.tsx`, `lib/contatosConfianca.ts`, `components/ui/ExercicioRespiracao.tsx` |
| E | Servidor: `routes/paciente/{consentimento,vinculo,escalas}.ts`, `routes/psicologo/{vinculo,escalas}.ts`, `lib/escalas.ts`. App: `screens/paciente/{consentimento,escalas}`, `auth/vinculacao.tsx`. Web: `rotas/vinculo`, `rotas/escalas` |
| F | Servidor: `routes/psicologo/{dashboard,pacientes,relatorios}.ts`. Web: `rotas/inicio`, `rotas/pacientes`, `rotas/relatorios` |

## 5. Pré-diagnóstico (checklist aplicado ao código)

Legenda: ✅ ok, ⚠️ atenção, ❌ problema. O revisor deve **confirmar ou derrubar** cada achado.

Cobertura: os `tsc --noEmit` dos três apps passam sem erro. **Não rodei os testes** (precisam de banco) **nem abri o app**. No web li em detalhe `dashboard.ts`, `auth-psicologo.ts` (até a linha 260) e `validacao.ts`; os demais arquivos do web e `pacientes.ts`/`relatorios.ts` foram verificados por busca de trechos (consentimento, auditoria, disclaimer), não lidos linha a linha. O grupo deve ler esses arquivos na reunião.

### A. Autenticação (F1, F11)

| Item | Status | Achado |
|------|--------|--------|
| C1 | ⚠️ | F11 pede "CRP registrado e validado"; o servidor só valida o formato (`schemas.ts`, `/^\d{2}\/\d{5,6}$/`). |
| C1 | ✅ | Cadastro com código por e-mail; o servidor não revela se a conta existe (mesma resposta e mesmo tempo); 2FA do psicólogo com tentativa consumida antes da conferência; refresh de uso único com rotação. |
| C3 | ⚠️ | `auth.ts:60`: o logout só invalida tokens emitidos mais de 10 s antes dele. Provável tolerância de relógio, mas precisa estar documentada. |
| C3 | ⚠️ | `auth.ts:326-331`: o token de redefinição de senha (10 min) não é de uso único; continua válido depois da troca. |
| C3 | ⚠️ | `auth-psicologo.ts:116`: grava `login_ok` na etapa 1 (senha certa), antes do 2FA. O log "imutável" mostra login com sucesso de quem ainda não entrou. |
| C3 | ⚠️ | `auth-psicologo.ts:83-86`: conta de paciente com senha **certa** recebe 403, enquanto senha errada recebe 400. Isso revela que a credencial é válida. |
| C4 | ⚠️ | `/verificar-email`, `/verificar-codigo-senha`, `/reenviar-codigo` e `/esqueci-senha` leem `req.body.*` direto (`auth.ts:222,260,281,303`); só `/registro` usa zod. O padrão do projeto é `lerOuNegar` (`lib/rota.ts`). |
| C5 | ❌ | `const limite = ...` redefinido em `auth.ts:17`, `auth-psicologo.ts:35` e `checkin.ts:12`, mas já existe `limite` em `lib/rota.ts`. As rotas de `auth-psicologo.ts` também não usam `rota()` (o Express 5 repassa o erro, mas o padrão do projeto não é seguido). |
| C5 | ❌ | **Data de nascimento validada em 3 lugares**: `useAuth.ts:48` (app), `schemas.ts:4` (servidor) e `rotas/auth/validacao.ts:24` (web, cujo comentário admite "espelha"). E-mail também tem 3 validações. Falta um pacote compartilhado. |
| C5 | ⚠️ | `useAuth.ts`: o bloco `catch { Alert.alert(titulo, error.response?.data?.error \|\| '...') }` se repete 7 vezes. |
| C6 | ⚠️ | Login errado responde 400 (`auth.ts:400`); o padrão seria 401. O app (`api.ts:55-58`) decide deslogar procurando "sessão", "token" ou "acesso" no **texto** do 403: mudar a mensagem no servidor quebra o logout automático. |
| C7 | ⚠️ | `useAuth.ts` mistura estado global de módulo com o hook (um "store" caseiro). Import mal formatado na linha 12. `auth-psicologo.ts` e `auth.ts` têm ~410 e ~450 linhas. |
| C8 | ✅ | Comentários explicam o *porquê* (lock por e-mail, não revelar conta, versão de sessão). Ponto forte. |

Perguntas: o que acontece se o usuário trocar de aparelho no meio do cadastro? O `limite(10)` por IP atrapalha quem divide o mesmo Wi-Fi?

### B. Check-in, hábitos e diário (F2, F3, F8)

| Item | Status | Achado |
|------|--------|--------|
| C1 | ❌ | **F3 não funciona.** O app coleta hábitos (etapa 5) e envia `habitos`; o `checkinSchema` valida (`schemas.ts:50`); mas o `INSERT` (`checkin.ts:181-197`) não grava nada. A tabela `habito` (`checkin_id, exercicio, meditacao, medicacao`) só é preenchida por `scripts/seed-dev.ts`. Ou seja: o painel do psicólogo mostra hábitos que, fora do seed, nunca existem. |
| C1 | ❌ | **O modelo não bate com o requisito.** F3 lista hidratação, exercício, meditação, limite de redes sociais e contato social; o app oferece exatamente esses (`checkin.tsx:53-59`), mas a tabela só tem `exercicio`, `meditacao` e `medicacao`. |
| C1 | ⚠️ | `intensidade` ("Intensidade Emocional", F2) também é enviado, validado e descartado. |
| C3 | ❌ | **Gráfico congela com mais de 30 check-ins.** `GET /resumo` usa `ORDER BY data ASC ... LIMIT 30` (`checkin.ts:226-228`): devolve os 30 mais **antigos**. Afeta também `frequenciaEmocional`. |
| C3 | ⚠️ | O slider vai de 1 a N (`checkin.tsx:92,103`): não dá para registrar 0 h de sono, mas o servidor aceita 0–24. |
| C3 | ⚠️ | Erro 409 ("já registrou hoje"): o rascunho continua salvo e o paciente fica preso na etapa 6 (`checkin.tsx:293-325` só limpa em sucesso). |
| C3 | ⚠️ | O corte semanal usa o fuso do servidor (`formatarDataISO`), enquanto `data` usa `CURRENT_DATE` do Postgres. O comentário fala em "dispositivo". |
| C4 | ⚠️ | `emocoes`, `contextos` e `habitos` aceitam qualquer string de qualquer tamanho; emoções são juntadas por vírgula e separadas depois (`checkin.ts:170,252`), então uma vírgula no valor quebra a contagem. O campo de notas não tem `maxLength` no app, mas o servidor limita a 2000. |
| C5 | ❌ | Rotas duplicadas como alias: `['/', '/checkins']`, `['/resumo', '/checkins/resumo']`, `['/painel', '/checkins/painel']`. O app só usa `/checkin/...`. |
| C5 | ⚠️ | `checkin.tsx`: o rodapé Voltar/Próximo se repete nas etapas 2 a 5; as grades de emoções, contextos e hábitos são o mesmo bloco copiado 3 vezes. |
| C6 | ⚠️ | Erros de zod sem mensagem própria (ex.: notas acima de 2000) chegam ao paciente no texto padrão do zod, provavelmente em inglês. |
| C7 | ❌ | `checkin.tsx` tem **795 linhas** (slider, 7 etapas, listas e lógica no mesmo arquivo). O handler `/painel` tem ~130 linhas. O tipo `RascunhoCheckin` local (`checkin.tsx:23`) não é usado e duplica o de `lib/rascunhoCheckin.ts`. |
| C7 | ⚠️ | Mistura `runOnJS` (`:333`) e `scheduleOnRN` (`:111`); `total_etapas` em snake_case; comentários que repetem o código ("Tipagem direta do resultado"). |
| C8 | ⚠️ | `gerarPercepcao` usa `Math.random` e devolve texto de interface pelo servidor: difícil testar e traduzir. |
| F8 | ⚠️ | Diário só existe dentro do check-in; F8 pede também entrada avulsa. O texto "registros privados e compartilhados apenas com seu psicólogo" (`checkin.tsx:654`) é impreciso, pois o diário só é compartilhado com opt-in. |
| Teste | ❌ | Não existe `checkin.test.ts`. |
| Segurança | ✅ | Diário, contextos e emoções cifrados (AES-256-GCM); acesso protegido por RLS (`comContextoPaciente`). |

Perguntas: hábitos devem ir para a tabela `habito` (e a tabela precisa de novas colunas) ou para um campo novo? Quem manda no fuso: servidor, banco ou aparelho?

### C. Histórico e dashboard do paciente (F4, F6)

| Item | Status | Achado |
|------|--------|--------|
| C1 | ❌ | F6 pede 7/30/90 dias, gráfico de sono, crises por horário e alerta de esparsidade. `dados.tsx` não tem nada disso, e `/checkin/resumo` não aceita período. (O painel do **psicólogo** já tem `periodo: 7/30/90` e `dadosInsuficientes` em `dashboard.ts`.) |
| C1 | ❌ | F4 pede linha do tempo em ordem decrescente com notas, filtro e detalhe. O card chamado "Histórico emocional" (`dados.tsx:181-202`) é um gráfico de **frequência**, não um histórico. |
| C3 | ❌ | Herda o bug do `LIMIT 30 ASC` (área B): com muitos registros o gráfico mostra o início do histórico. |
| C5 | ⚠️ | A regra de "poucos dados" existe no servidor do psicólogo (`MIN_REGISTROS_SEMANA = 3`) e não no app. |
| C7 | ⚠️ | `home.tsx` (380 linhas) e `dados.tsx` (296) misturam busca de dados, formatação e layout. |

Pergunta: por que o painel do psicólogo é mais completo que o do próprio paciente?

### D. SOS e emergência (F9)

| Item | Status | Achado |
|------|--------|--------|
| C1 | ⚠️ | A tela SOS só traz CVV (`NUMERO_CVV = '188'`). F9 pede também SAMU 192 e Bombeiros 193, link para o chat e **registro do acesso** para o psicólogo; nenhum dos dois últimos existe. |
| C1 | ✅ | A tela está a 1 toque (aba), os contatos ficam no aparelho e funcionam offline (NF9.1). |
| C3 | ⚠️ | `gravando.current` (`sos.tsx:84-92`) descarta a segunda gravação em silêncio e devolve `false`, e a tela então mostra "Não foi possível salvar", o que engana. |
| C3 | ⚠️ | WhatsApp: `55` só é adicionado se o número tiver 10 ou 11 dígitos (`sos.tsx:134`); erra para números com DDI ou de fora do Brasil. |
| C4 | ⚠️ | `interpretar()` (`contatosConfianca.ts:23-32`) só confere se o JSON é um array, não os campos de cada contato. |
| C5 | ⚠️ | `extrairNome` e `extrairTelefone` (`sos.tsx:34-72`) tentam 8 formatos de objeto com `any`. Tela com 593 linhas. |
| C6 | ✅ | Mensagens claras e em português para cada falha. |
| Segurança | ✅ | Contatos no SecureStore (fora de backup); os logs não vazam nome nem telefone. |

Perguntas: o que fazer quando o paciente não tem internet e toca em SOS? Registrar o acesso ao SOS (F9) conflita com a privacidade do paciente?

### E. Consentimento, vínculo e escalas (F5, F18, F19)

| Item | Status | Achado |
|------|--------|--------|
| C1 | ✅ | Código de vínculo com HMAC, uso único, 24 h e limite por **usuário**; consentimento por categoria com revogação imediata do diário; 3 escalas (PHQ-9, GAD-7, DASS-21) com pontuação no servidor. |
| C1 | ⚠️ | F18 e F19 pedem notificação push (psicólogo avisado do vínculo; paciente avisado da escala). Não existe. |
| C1 | ✅ | **Decisão do grupo:** ao vincular, humor, hábitos e escalas ficam compartilhados por padrão e o diário não (`paciente/vinculo.ts`: `VALUES ($1, true, true, true, false)`). Justificativa: são dados menos invasivos que o diário, e o paciente muda quando quiser. O NF5.1 pede consentimento "explícito"; isso é atendido porque `vinculacao.tsx:88` avisa o que será compartilhado **antes** de vincular e leva o paciente à tela de consentimento logo depois. Registrar na documentação como decisão de projeto (base LGPD: aviso prévio + revogação a qualquer momento). |
| C3 | ⚠️ | `GET /aplicacoes/:id` altera dados (marca "em andamento", `escalas.ts:45-60`). O comentário avisa, mas um GET com efeito colateral foge do esperado. |
| C4 | ✅ | `codigoSchema` (6 dígitos), respostas conferidas contra as opções da escala. |
| C6 | ⚠️ | `lerOuNegar` responde sempre "Dados inválidos."; não diz o que falhou. |
| C7 | ⚠️ | `responderEscala.tsx` tem 565 linhas e 10 `useState`; vale discutir `useReducer` ou dividir pergunta, revisão e conclusão. |
| C8 | ✅ | É a parte mais organizada do servidor (`rota`, `limite`, `lerOuNegar`) e tem `docs/escalas.md`. É o modelo que `auth.ts` e `checkin.ts` deveriam seguir. |
| Teste | ✅ | `escalas.test.ts`, `vinculo.test.ts` e testes de RLS. |
| Segurança | ✅ | Respostas por item cifradas; auditoria de resposta; reenvio idempotente. |

Perguntas: o que o paciente vê quando o item 9 do PHQ-9 é diferente de zero? Existe fluxo de apoio imediato?

### F. Painel do psicólogo — web (F12, F13, F14, F16, F17)

| Item | Status | Achado |
|------|--------|--------|
| C1 | ✅ | `dashboard.ts` cumpre F12 (médias, lista de pacientes, consultas do dia, dados insuficientes). Sono médio só entra com consentimento de hábitos. `Disclaimer` aparece em `Inicio`, `VisaoGeral`, `Escalas` e `Relatorio` (NF12.1). |
| C1 | ✅ | F13: seções sem consentimento mostram `ConsentimentoAusente`; abrir o painel, ler anotações e exportar relatório geram auditoria. |
| C1 | ⚠️ | F17 pede anotações acessíveis "exclusivamente ao psicólogo que as criou". A tabela `anotacao_clinica` tem uma coluna `expira_em` que não está nos requisitos: confirmar o propósito (retenção?). |
| C3 | ⚠️ | Dashboard filtra "check-ins recentes" e "atividade" por humor compartilhado, mas a atividade inclui `consentimento_alterado` e `vinculo_criado` mesmo sem consentimento de humor. Confirmar se é intencional. |
| C5 | ⚠️ | `web/src/lib/periodo.ts` e `server/src/lib/periodo.ts` duplicam lógica de datas; o fuso `'America/Sao_Paulo'` está fixo em várias queries. |
| C7 | ⚠️ | `routes/psicologo/pacientes.ts` (490 linhas) e `dashboard.ts` (handler de ~140 linhas, 7 consultas seguidas). No web: `Relatorio.tsx` (430), `MinhaArea.tsx` (351), `Inicio.tsx` (294), `VisaoGeral.tsx` (284). 11 usos de `any` no web. |
| C8 | ✅ | Tipos explícitos por consulta, comentários que explicam regra de negócio, componentes pequenos em `components/ui`. |
| Teste | ✅ | `pacientes.test.ts`, `relatorios.test.ts`, `auditoria-psicologo.test.ts`. |

Perguntas: o PDF (F14) sai do navegador via impressão (`Imprimir.tsx`); isso atende "exportar PDF" para o professor? O que o psicólogo vê de um paciente que revogou todos os consentimentos?

## 6. Pontos transversais (valem para o relatório)

- **Dois estilos no servidor.** As rotas novas (`escalas`, `consultas`, `vinculo`, `consentimento`, `dashboard`) usam `rota()`, `limite()` e `lerOuNegar()`; `auth.ts`, `auth-psicologo.ts` e `checkin.ts` repetem esse código à mão.
- **Código duplicado entre apps** (validação de data e e-mail em app, servidor e web). O monorepo não tem pacote compartilhado.
- **Arquivos grandes:** `checkin.tsx` (795), `sos.tsx` (593), `responderEscala.tsx` (565), `Relatorio.tsx` (430).
- **O app está atrás do web.** Dashboard e histórico do paciente (F4/F6) são mais pobres que os do psicólogo.
- **Requisitos sem implementação:** F7, F10, F15 e F20 são trabalho futuro (seção 7). Partes de F4, F6, F8, F9, F18 e F19 também faltam e aparecem como ⚠️/❌ nas áreas C, B, D e E: o grupo deve decidir, caso a caso, se corrige agora ou se também vira trabalho futuro.
- **Pontos fortes para citar:** criptografia de campos sensíveis, RLS, auditoria, rate limit, 2FA com rotação de refresh, não revelar existência de conta, comentários que explicam o motivo, `tsc` limpo nos 3 apps.

## 7. Trabalho futuro (fora do escopo desta entrega)

| Req. | Funcionalidade | Estado atual | O que falta |
|------|----------------|--------------|-------------|
| F7 | Chat paciente–psicólogo | Tela com mensagens fixas e selo "Demonstração"; tabela `mensagem` já existe no banco | Rotas de envio/leitura, cifragem das mensagens, histórico para as duas partes, regra de vínculo ativo (NF7.1) |
| F10 | Notificações do paciente | Nada implementado | Push (lembretes às 09:00 e 21:00, relatório semanal, nova mensagem), permissão e configuração por tipo |
| F15 | Recomendar exercícios | Nada implementado (o paciente já tem a aba Bem-estar com exercícios próprios) | Tela do psicólogo para recomendar, tabela de recomendações e exibição no app |
| F20 | Notificações do psicólogo | O dashboard mostra "atividade recente" como alternativa | Push em até 60 s para mensagem e escala respondida, oscilação de humor e dados esparsos (NF20.1) |

F18 e F19 dependem do mesmo mecanismo de push (aviso ao psicólogo do novo vínculo e aviso ao paciente da escala solicitada); quando F10/F20 entrarem, eles fecham juntos.

## 8. Modelo de registro (preencher na reunião)

Um bloco por área.

```
Área: __ — ______________________   Requisitos: ____________
Data: ___/___/_____
Apresentou: __________   Revisou: __________
Verificou requisitos: __________   Registrou: __________
```

| Item do checklist | Resultado (✅/⚠️/❌) | O que foi encontrado | Quem corrige | Prazo / issue |
|-------------------|----------------------|----------------------|--------------|---------------|
| C1 Atende ao requisito? | | | | |
| C2 Nomes claros? | | | | |
| C3 Erros de lógica? | | | | |
| C4 Dados validados? | | | | |
| C5 Repetição desnecessária? | | | | |
| C6 Mensagens de erro adequadas? | | | | |
| C7 Código organizado? | | | | |
| C8 Outro integrante entende? | | | | |

Conclusões do grupo (3 linhas): ______________________________

Aprendizados sobre colaboração, comunicação e responsabilidade: ______________________________
