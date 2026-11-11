# Documentos: casos de teste × devolutiva

> Levantamento em modo leitura, 10 e 11/11/2026. Agente `docs_casos_de_teste`, Opus 5.5 (effort high). Nada foi executado além de leitura de código, `npm view/audit/outdated` e documentação pública; "verificado" quer dizer lido no código, não testado. Linhas citadas são do commit `0864143`.

## Resumo

Cruzei os 33 CTs (Documento_mesclado, 27 p.), a devolutiva (3 p.), os requisitos (12 p.), o QTS (.md e .pdf) e os 16 arquivos de teste do servidor (cerca de 197 blocos it). Resultado: 17 CTs têm funcionalidade completa, 8 parcial e 8 não existem. Dos 8 que não existem, 6 são de chat, push ou recomendação e devem sair do escopo. CT-003 (hábitos) e CT-004 (histórico) também não existem, embora pareçam existir: o app envia os hábitos, mas o servidor descarta (checkin.ts:181-196 não grava em `habito`), e não há tela de histórico.
O backend do psicólogo tem testes automatizados que já servem de evidência para cerca de 15 CTs (acesso, consentimento, auditoria, vínculo, escalas, anotações, relatórios). Nada no mobile tem teste, e nenhum teste chama POST /checkin.
Pelos critérios da seção 6 da devolutiva, os CTs atuais atendem só identificação e rastreabilidade. Não há casos negativos nem de fronteira, nem métrica de RNF, nem as colunas de resultado obtido, status, data e evidência.
Inconsistências graves: NF6.x copia NF5.x e o CT-008 testa uma categoria que não existe ("Dashboard analítico"). NF14.1 contradiz o consentimento granular. O CT-027 descreve um cenário impossível (só há um vínculo ativo por paciente). O vínculo já liga por padrão o compartilhamento de humor, hábitos e escalas. Desligar o diário não revoga os textos já marcados.
O QTS tem as Partes 2 a 4 em branco e "lorem ipsum" nas considerações finais.

## Relatório

Fontes lidas: `Documento_mesclado_e_formatado.pdf`, `Devolutiva_Tecnica_PsycheLink.pdf`, `Requisitos Funcionais - Não Funcionais..pdf`, `PsycheLink_QTS_Relatorio_EDITAVEL.md`, `PsycheLink - TCC - QTS.pdf`, todos em `TCC_PsycheLink/`, e `apps/server/test/*.test.ts`. Nada foi executado: os testes não rodaram (modo leitura). Tudo o que está como "sim/não" foi verificado no código, salvo quando marcado como suspeita.

## 1. Rastreamento CT-001 a CT-033

| CT | Req | Valida | Existe | Teste automático | Devolutiva / ação |
|---|---|---|---|---|---|
| 001 | F1 | login do paciente | sim (`routes/auth.ts:384`) | `auth.test.ts:18` (sucesso), `:36` (e-mail inexistente); falta senha errada no app | negativos + recurso restrito: já há 401 sem Bearer (`vinculo.test.ts:216`) e Bearer recusado na web (`sessao-web.test.ts:54`) |
| 002 | F2 | check-in salvo | parcial: salva cifrado; `intensidade` é aceita mas não é gravada (`checkin.ts:181-196`); 1 por dia, duplicado → 409 (`:202`) | nenhum (os testes inserem check-in direto no banco, nenhum chama POST /checkin) | valores concretos, campo obrigatório (`schemas.ts:43`), faixa 1-10 (`:45-46`), duplicado |
| 003 | F3 | hábitos | **não**: a UI envia `habitos` (`checkin.tsx:53-59`, `checkinService.ts:19`), o servidor ignora; a tabela `habito` só tem exercicio/meditacao/medicacao (`0001_baseline.sql:223-229`) | não | implementar ou reescrever |
| 004 | F4 | histórico em ordem decrescente com filtro | **não**: não há tela de histórico; "Meus Dados" usa `ORDER BY data ASC LIMIT 30` (`checkin.ts:223-228`), ou seja, os 30 registros mais antigos | não | — |
| 005 | F5 | consentimento granular | sim; categorias humor/habitos/escalas/diario (`consentimento.ts:11`) | `vinculo.test.ts:348` (PUT + auditoria do que mudou), `:374` (400), `:315` (parar de compartilhar o diário); efeito em `pacientes.test.ts:164-197`, `escalas.test.ts:436`, `defesa-sem-rls.test.ts:126` com fixtures fixas, sem sequência antes/depois | CT-005-B: antes/depois da revogação, dois perfis |
| 006 | F6 | dashboard com ≥3 registros, filtro 7 dias | parcial: linha humor/ansiedade e barras de emoção (`dados.tsx`); sem filtro de período, sem sono, sem crises por horário | não (mobile não tem testes) | fronteira 2/3/4 |
| 007 | F6 | alerta de esparsidade | não no app (`dados.tsx:172` só trata zero registros); na web o aviso aparece com <3 em 7 dias, mas os gráficos continuam (`VisaoGeral.tsx:154-157`) | `pacientes.test.ts:200` (4/1/0 registros), `:288` e `:326` | 2/3/4 no mesmo período |
| 008 | NF6.1/6.2 | log imutável do consentimento | sim, para as categorias reais; "Dashboard analítico" não existe | `vinculo.test.ts:348`; imutabilidade em `auditoria.test.ts:148-195` | conferir evento, data/hora e ator, sem conteúdo clínico |
| 009 | F7 | chat + push | não (protótipo, `chat.tsx:99`) | — | retirar |
| 010 | F8/NF8.1 | diário opt-out | sim, mas só como etapa do check-in (não existe entrada avulsa, 1 por dia) | `pacientes.test.ts:455-493`; `vinculo.test.ts:172-177` (diario=false) | — |
| 011 | F9 | SOS em ≤2 toques + registro para o psicólogo | parcial: aba SOS = 1 toque (`MainTabNavigator.tsx:32`); só CVV 188 e contatos de confiança; sem SAMU, Bombeiros ou grounding; nenhum registro de acesso no servidor | não | manual |
| 012 | NF9.1 | SOS offline | suspeita: a tela é estática, mas não verifiquei se o app abre logado sem rede | não | manual em modo avião |
| 013 | F10 | notificações | não (item "Notificações" sem ação; `home.tsx:364-374`) | — | retirar |
| 014 | F11 | login do psicólogo com 2FA | sim, na web, com código por e-mail (não PIN nem biometria); CRP validado só no formato (`schemas.ts:65`) | `auth-psicologo.test.ts` (16 casos, vários negativos), `sessao-web.test.ts` | ajustar os dados de teste |
| 015 | NF11.1 | controle de acesso | sim | `pacientes.test.ts:125-162`, `rls.test.ts:100-150`, `defesa-sem-rls.test.ts:43` | incluir requisição direta por id |
| 016 | F12 | dashboard clínico | parcial: vinculados, médias, dados insuficientes, consultas do dia, escalas (`dashboard.ts:179-196`); sem "alertas ativos", "engajamento" ou "insights da semana" | `pacientes.test.ts:501-583`, `consultas.test.ts:357`, `escalas.test.ts:454` | — |
| 017 | NF12.1 | sem diagnóstico + disclaimer | sim (`Disclaimer.tsx:4`, `Inicio.tsx:291`) | `escalas.test.ts:566` (sem rótulo de severidade) | critério objetivo (lista de termos proibidos) |
| 018 | F13 | painel individual | sim | `auditoria.test.ts:92` (`paciente_painel_visualizado`), `pacientes.test.ts:269-400` | — |
| 019 | NF13.1 | igual ao 017 | sim (`VisaoGeral.tsx:281`) | idem | fundir com o 017 |
| 020 | F14 | PDF do paciente | parcial: PDF pela impressão do navegador (`Imprimir.tsx:65`); a exportação é auditada | `relatorios.test.ts:163-277` | manual, com o PDF anexado |
| 021 | NF14.1 | PDF com "todos os dados" | o requisito contradiz o F5; a implementação é granular | `relatorios.test.ts:195` | reescrever o requisito |
| 022 | F15 | recomendar exercício | não (Bem Estar é estático) | — | retirar |
| 023 | NF15.1 | disponibilidade das recomendações | não | — | retirar |
| 024 | F16 | lista de pacientes | sim (sem "iniciar conversa") | `pacientes.test.ts:199-268` | tirar "conversa" |
| 025 | NF16.1 | usabilidade da lista | sim: busca, filtro de status, ordem por nome, paginação | `pacientes.test.ts:229-268` | métrica objetiva |
| 026 | F17 | anotação privada | sim, cifrada | `pacientes.test.ts:585`, `auditoria.test.ts:92`, `rls.test.ts:162` (paciente não lê) | — |
| 027 | NF17.1 | sigilo das anotações | sim; mas "outro psicólogo no mesmo paciente" é impossível (`uk_vinculo_ativo_paciente`, `0004_vinculo.sql`) | `pacientes.test.ts:126` (B recebe 404), `rls.test.ts:121` | requisição direta; psicólogo sucessor (não testado para anotações) |
| 028 | F18 | código de 6 dígitos, 24 h | sim | `vinculo.test.ts:68`, `:200` | — |
| 029 | NF18.1 | rastreabilidade do código | sim (`criado_em`/`usado_em`/`expira_em`/`revogado_em`, via `psicologo_id`; CRP só indireto) | `vinculo.test.ts:88`, `:152` | sem notificação de vínculo |
| 030 | F19 | solicitar escala | sim (sem push; fica pendente no app) | `escalas.test.ts:173-224` | tirar "notificação" |
| 031 | NF19.1 | push ≤1 min | não | — | retirar ou redefinir |
| 032 | F20 | notificação de mensagem | não | — | retirar |
| 033 | NF20.1 | push ≤60 s | não | — | retirar |

## 2. Critérios da devolutiva (seção 6) × CTs atuais
- Identificação e rastreabilidade: atendido. Mas o CT-006/007 citam só "F6", e o CT-008 rastreia NF6.x, que são cópia de NF5.x.
- Pré-condição e massa de dados específica: fraco. Só CT-009, 010, 026 e 030/031 têm dado concreto. Nenhum fixa usuário, data ou quantidade.
- Passos executáveis: genéricos ("Realizar login"), sem URL, tela nem conta.
- Resultado esperado observável: subjetivo em CT-023 e CT-025 ("organizada e intuitiva", "sem falhas").
- Positivos, negativos e fronteira: praticamente só positivos. Fronteira nenhuma.
- RNF com ambiente e métrica: ausente. CT-031/033 têm SLA, mas sem cronômetro, rede ou repetições.
- Resultado obtido, status, data e evidência: o modelo de tabela nem tem esses campos.
- O QTS tem as Partes 2 a 4 com "Resposta:" vazio (`PsycheLink_QTS_Relatorio_EDITAVEL.md:50-370`). O PDF termina em "lorem ipsum".

## 3. Reescrever, criar e retirar
**Reescrever:**
- CT-002: payload concreto, por exemplo emoções ["ansioso"], humor 4, ansiedade 7, sono 6,5 h "Regular".
- CT-003 e CT-004: só depois de implementar.
- CT-006/007: sem filtro de período e sem as séries que não existem.
- CT-008: trocar para a categoria "escalas" ou "humor".
- CT-011: tirar SAMU, Bombeiros e o registro de acesso, ou implementar.
- CT-014: web, código de 2FA por e-mail.
- CT-017 e CT-019 em um só caso.
- CT-021: casar com o F5.
- CT-024: sem "conversa".
- CT-025: métrica, por exemplo achar o paciente com a busca em até X s ou em N cliques.
- CT-027: B sem vínculo e o psicólogo sucessor.
- CT-029: tirar a notificação.
- CT-030: tirar o push.

**Novos:**
- Login (CT-001-B a E): senha errada mostra a mesma mensagem do e-mail inexistente ("E-mail ou senha inválidos."); sem token, 401; paciente na web, 403 (`auth-psicologo.test.ts:45`); e-mail não verificado.
- Check-in (CT-002-B a F): sem emoção dá 400 "Selecione ao menos uma emoção."; humor 0, 1, 10 e 11; notas com 2000 e 2001 caracteres; sono 24 e 24,5; segundo check-in no dia dá 409 "Você já registrou um check-in hoje.".
- CT-005-B: o exemplo da devolutiva.
- CT-005-C: desligar humor faz o resumo voltar com campos nulos.
- CT-005-D: desligar "diário" não esconde os textos já marcados; só "Parar de compartilhar todos os textos" revoga (`pacientes.test.ts:487`, `consentimento.ts:116-141`).
- Esparsidade com 2, 3 e 4 registros em 7 dias (`MIN_REGISTROS_SEMANA=3`, `dashboard.ts:10`).
- Requisição direta: `GET /psicologo/pacientes/{id}/anotacoes` e `GET /psicologo/checkins/{id}` com o psicólogo B dão 404, igual a um id inexistente (`pacientes.test.ts:142`).
- Vínculo encerrado: o acesso cai na hora (`vinculo.test.ts:265`, `:285`).
- Código de vínculo: usado, expirado, revogado ou inexistente dão o mesmo 400; a 6ª tentativa dá 429 (`vinculo.test.ts:200`, `:245`).
- 2FA: a 6ª tentativa falha; código expirado; sessão expira com 30 min de inatividade (`auth-psicologo.test.ts:129-160`, `sessao-web.test.ts:165`).
- Escala: sem consentimento dá 403; resposta inválida dá 400 (`escalas.test.ts:174`, `:250`).
- RNF medidos:
  - NF2.2: check-in em ≤3 min, cronometrado em 5 execuções.
  - NF9.1: SOS em modo avião.
  - NF17.1 e NF2.1: SELECT mostra o texto cifrado.
  - NF5.2: UPDATE e DELETE na auditoria são rejeitados (`auditoria.test.ts:155`).

**Fora do escopo** (CT-009, 013, 022, 023, 031, 032, 033 e os trechos de chat do 011 e do 024): primeiro marcar F7, F10, F15, F20, NF19.1 e NF20.1 como "trabalhos futuros" no documento de requisitos. Depois tirar os CTs da matriz executável, ou mantê-los com status "Bloqueado – fora do escopo" e uma justificativa. Não deixar CT "Aprovado" para algo que não existe.

## 4. Evidência automatizada × manual
**Teste do servidor já serve de evidência (nível API e banco, não interface):** CT-001 parcial, 005, 008, 010, 014, 015, 016 parcial, 017/019 parcial, 018, 020/021 (dados e auditoria, não o PDF), 024, 025, 026, 027, 028, 029 e 030.

Para virar evidência, precisa da saída da execução com data (por exemplo `--test-reporter=spec`) e da tabela CT → `arquivo:linha`. Dois cuidados:
- `npm test` usa `--env-file=.env.test`, e no diretório só existe `.env.test.old` (verificado pelo nome do arquivo). Como estão, os testes não rodam.
- Os testes usam um Postgres real. A devolutiva (§5.3) pede evidência sem dados reais de paciente, então use um banco ou branch só de teste.

**Manual com telas:** CT-002, 003, 004, 006, 007, 011 e 012 (o mobile não tem nenhum teste), CT-005-B com os dois perfis, CT-014, o disclaimer do 017/019, o PDF do 020 e o CT-025. Atenção: a tela final do check-in mostra o selo "Demonstração" mesmo depois de salvar (`checkin.tsx:689`), o que confunde a evidência.

## 5. Inconsistências
1. NF6.1/6.2 são cópia literal de NF5.1/5.2. O CT-008 testa "Dashboard analítico", que não é categoria: as categorias são humor, hábitos, escalas e diário (`consentimento.ts:11`).
2. NF13.1 repete NF12.1 ("O dashboard..."). A pós-condição do F14 é cópia da do F13.
3. NF14.1 ("aceitar compartilhar todos os dados") contradiz o consentimento granular do F5.
4. Hábitos: o requisito lista hidratação/exercício/meditação/redes sociais/contato social; a UI tem "tempo de telas" no lugar de redes sociais; o banco tem exercicio/meditacao/medicacao; o servidor não grava nada. A regra de edição retroativa do NF3.1 não existe (não há edição).
5. F8 diz diário "associado ou não ao check-in", mas ele só existe dentro do check-in.
6. F9 promete SAMU, Bombeiros, grounding, link para o chat e registro de acesso: nada disso existe.
7. F11 diz "aplicativo" e 2FA por "PIN/biometria"; a implementação é web com código por e-mail, e o "CRP validado" é só checagem de formato.
8. Ao vincular, humor, hábitos e escalas ficam `true` por padrão (`paciente/vinculo.ts:84-87`). O app avisa antes e leva à tela de consentimento logo depois (`vinculacao.tsx:34,88`). Mesmo assim, há tensão com o "consentimento explícito" do NF5.1 e do art. 11 da LGPD. O opt-out que o NF8.1 descreve só vale para o diário.
9. O "imediatamente" do F5 não vale para o diário quando se usa o interruptor; só vale com "Parar de compartilhar".
10. F12 cita alertas e insights. As tabelas `alerta` e `mensagem` existem no baseline, mas suspeito que não sejam usadas: não achei código que as leia ou grave (não procurei em todos os arquivos).
11. O CT-027 descreve um cenário impossível com o modelo de vínculo atual.
12. Bug: `/checkin/resumo` ordena `ASC LIMIT 30` e congela os gráficos nos 30 primeiros registros (verificado no código, não executado).
13. O app gera "percepções" sorteadas (`checkin.ts:78-159`, `Math.random`) com frases interpretativas ("Esta semana tem sido mais difícil emocionalmente"). Não são determinísticas, então não dá para testar, e vão contra o espírito do NF12.1.
14. A devolutiva cita "PsycheLink .pdf (26 páginas)"; o documento mesclado tem 27. Confirmar qual versão foi avaliada.

## Achados

| Severidade | Confiança | Achado | Onde | Detalhe |
|---|---|---|---|---|
| critica | verificado | CTs sem negativos, fronteira, métrica nem resultado/status/evidência | Documento_mesclado_e_formatado.pdf; Devolutiva seção 6 | A seção 6 da devolutiva exige casos positivos, negativos e de fronteira, métricas de RNF e resultado obtido, status, data e evidência. O modelo de tabela atual só tem ID, título, requisito, prioridade, pré-condição, dados, passos e resultado esperado. Nenhum CT é negativo puro nem de fronteira. |
| alta | verificado | 7 CTs testam funcionalidade que o grupo decidiu não implementar | CT-009, 013, 022, 023, 031, 032, 033; chat.tsx:99; home.tsx:364-374 | Chat, push e recomendação de exercícios não existem. Os requisitos F7, F10, F15, F20, NF19.1 e NF20.1 continuam no documento. Precisam ir para trabalhos futuros, ou os CTs ficam como Bloqueado com justificativa. |
| alta | verificado | Hábitos (F3/CT-003) parecem existir, mas são descartados pelo servidor | apps/server/src/routes/checkin.ts:181-196; apps/mobile/src/screens/paciente/checkin/checkin.tsx:53-59; migrations/0001_baseline.sql:223-229 | A etapa 5 coleta os hábitos e o app os envia em `habitos`. O INSERT não grava em `habito`, e a tabela tem colunas diferentes das da UI. Executado na banca, o CT-003 seria reprovado. |
| alta | verificado | Histórico (F4/CT-004) e filtros/alerta do dashboard (F6/CT-006/007) não existem no app | apps/mobile/src/screens/paciente/dashboard/dados.tsx; checkin.ts:223-228 | Não há tela de histórico, filtro de 7/30 dias/3 meses, gráfico de sono, crises por horário nem alerta de esparsidade no app. Além disso, o resumo usa ASC LIMIT 30, ou seja, os 30 registros mais antigos. |
| media | verificado | CT-008 testa categoria inexistente e rastreia NF duplicado | CT-008; Requisitos NF6.1/6.2; consentimento.ts:11 | "Dashboard analítico" não é categoria de consentimento: as categorias são humor, habitos, escalas e diario. NF6.1/6.2 copiam NF5.1/5.2. |
| media | verificado | CT-027 descreve cenário impossível | migrations/0004_vinculo.sql (uk_vinculo_ativo_paciente) | Um paciente só tem um vínculo ativo, então outro psicólogo nunca abre o perfil do mesmo paciente. Reescrever como psicólogo sem vínculo por requisição direta (já coberto em pacientes.test.ts:126 e rls.test.ts:121) e como psicólogo sucessor após a troca de vínculo (não testado para anotações). |
| media | verificado | Consentimento ligado por padrão ao vincular | apps/server/src/routes/paciente/vinculo.ts:84-87; vinculacao.tsx:88 | Humor, hábitos e escalas ficam true no resgate do código, só com aviso na tela. Há tensão com o "consentimento explícito" do NF5.1 e do art. 11; a banca pode questionar. |
| media | verificado | Revogar o diário pelo interruptor não esconde textos já compartilhados | pacientes.test.ts:487; consentimento.ts:116-141 | O CT-005-B da devolutiva espera negação imediata. Isso só acontece com "Parar de compartilhar todos os textos". O caso precisa descrever essa ação, ou a regra precisa mudar. |
| media | provavel | Testes não rodam como estão configurados | apps/server/package.json (script test); apps/server/.env.test.old | O script usa --env-file=.env.test, mas só existe .env.test.old. Os testes usam Postgres real; a evidência precisa vir de um banco de teste sem dados reais. Nenhum teste chama POST /checkin, e web e mobile não têm testes. |
| media | verificado | QTS entregue incompleto | PsycheLink_QTS_Relatorio_EDITAVEL.md:50-370; PsycheLink - TCC - QTS.pdf (final) | As respostas das Partes 2 a 4 estão vazias e as considerações finais são "lorem ipsum". |
| media | verificado | Requisitos divergem da implementação (F9, F11, F12, NF14.1) | sos.tsx; schemas.ts:65; dashboard.ts:179-196 | F9: só CVV, sem SAMU, Bombeiros ou registro de acesso. F11: web e 2FA por e-mail, CRP só no formato. F12: sem alertas, insights ou engajamento. NF14.1 contradiz o F5. |
| baixa | verificado | Percepções aleatórias e interpretativas no app | apps/server/src/routes/checkin.ts:78-159 | Math.random escolhe frases como "Esta semana tem sido mais difícil emocionalmente". O resultado não é determinístico, então não dá para testar, e vai contra o espírito do NF12.1. |

## Perguntas para o grupo

- Vão implementar hábitos (gravar em `habito`), o histórico do paciente e o filtro/alerta de esparsidade antes da próxima entrega, ou reescrever os CTs 003, 004, 006 e 007 para o que existe?
- Chat, push, notificações e recomendações saem do documento de requisitos (como trabalhos futuros) ou ficam como CT Bloqueado com justificativa?
- O padrão humor/hábitos/escalas = true ao vincular é decisão consciente? Querem mudar para opt-in explícito por categoria?
- Revogar o diário deve esconder na hora os textos já marcados (como no CT-005-B da devolutiva), ou fica a ação separada "Parar de compartilhar"?
- Qual versão do PDF a devolutiva avaliou (26 páginas) em relação ao mesclado (27)?
- Há um banco/branch de teste para restaurar o `.env.test` e gerar a saída datada dos testes como evidência?
