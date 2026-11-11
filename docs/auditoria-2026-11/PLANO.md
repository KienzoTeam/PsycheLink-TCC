# PsycheLink: plano-mestre de revisão e reformulação até a banca (05/12/2026)

## Contexto

O grupo (4 alunos, ETEC, 3º DS) está na reta final do TCC, sem clareza do que melhorar, e pediu um plano de revisão completa com subagentes e de reformulação: auditoria de stack, revisão por setor em web, mobile e server, Tailwind/NativeWind, Prisma, Material 3 Expressive, tipografia e CRP.

O levantamento em modo plano (22 agentes de leitura; crítica adversarial em 14 afirmações: 11 confirmadas, 3 imprecisas, 0 refutadas) mostrou:

- **Base sólida:** RLS com papel sem `BYPASSRLS`, AES-256-GCM por campo, auditoria imutável, 2FA, refresh rotativo, 16 arquivos com ~197 testes HTTP reais, design system web em tokens, dependências em dia.
- **Defeitos reais:** hábitos do check-in descartados; app sem guarda de autenticação (SOS inalcançável em início a frio); histórico e diário visíveis ao psicólogo seguinte; aceite de termos só no cliente; OTP não atômico; `/auth/login` aceita psicólogo sem 2FA; resumo devolve os 30 check-ins mais antigos; `POST /checkin` sem teste; suíte não roda (`.env.test` ausente) e sem trava de banco; contraste 1,5:1 no contorno do mobile.
- **Documentos × código:** slides citam Prisma, TailwindCSS, Docker, Vercel e Render, que o repositório não tem; os 33 CTs não atendem a devolutiva (sem negativos, fronteira, evidência); pelo menos 7 testam o que não existe; QTS com "lorem ipsum".
- **Migrações:** as pesquisas recomendam não fazer migração completa antes da banca (Prisma `latest` = 8.0.0-rc; NativeWind estável preso ao Tailwind 3 e v5 em RC).

Uma segunda crítica, sobre a primeira versão deste plano, mostrou que ela não cabia no prazo e tinha dois bloqueios (e-mail no Render gratuito; revisão humana como gargalo). Esta versão é a corrigida.

Resultado esperado em 05/12: sistema estável e demonstrável, casos de teste com evidência, e as tecnologias dos slides presentes de forma defensável, sem depender de alterar documentos.

## Decisões do grupo (10 e 11/11)

| Tema | Decisão |
|---|---|
| Prazo | Banca 05/12. Funcionalidade congela em 27/11; código em 01/12 |
| Capacidade | 2 pessoas revisam e testam quase todo dia: duas frentes (A: server e web; B: mobile) |
| Prisma | Piloto com portão: 7.10.1 fixado, só Client; migrations SQL, RLS e consultas analíticas ficam |
| Tailwind (web) | Ponte `@theme` sobre `tokens.css`, sem Preflight, adoção incremental |
| NativeWind | Teste de 3h com portão; se falhar, StyleSheet com tokens |
| Lacunas que entram | F3 (os 5 hábitos do app + medicação), F4/F6, F9 (SOS completo e offline), F10 (lembretes locais) |
| Fora ou adiado | F7 chat, push remoto (F19/F20), F15, marketplace; CRP adiado; menores de 18 em aberto |
| Tipografia | Roboto Flex (texto, rótulos, números) + Google Sans Flex em títulos; confirmar com comparação visual contra Outfit |
| Design | Seguir o M3 Expressive em tokens e componentes; Catppuccin continua como paleta da marca, como dizem os slides. O que falta para "parecer M3 Expressive" são componentes e forma, não a fonte |
| Regras | App recusa conta de psicólogo. Novo psicólogo vê só dados a partir do vínculo. Desligar o diário avisa que bloqueia tudo e oferece "só os próximos". O pedido de histórico anterior com aceite do paciente é o primeiro item abaixo da linha de corte |
| shadcn/MUI | Não adotar: não entregam M3 Expressive; manter react-aria-components |
| Testes | Branch Neon nova e descartável, com banco vazio |
| Modelos | Fable 5.2: segurança, corretude, verificação adversarial. Opus 5.5 xhigh: desempenho, conformidade. Opus 5.5 high: complexidade, UI/UX, operação. Sonnet 5.5 xhigh: implementação |
| Mobile | Testado no Expo Go. Não há build local nesta máquina (JDK 27, sem Android SDK): nada depende dele |
| Deploy e demo | Só o banco está no Neon; demo indefinida: preparar ambiente ao vivo e vídeo de reserva |
| Documentos | Alterar depende da orientadora: nada conta com isso |
| Parte escrita | Existe e o Kenai está atualizando; estado desconhecido |
| Senha do dono no commit `1eae948` | Já trocada |

## Resultado da auditoria de stack (já feita no levantamento)

| App | Situação | Atualizar ou remover | Manter | Depois da banca |
|---|---|---|---|---|
| Server | 0 vulnerabilidades, nada deprecado, tudo na última major | `nodemailer` 10.5, `express-rate-limit` 8.7.4; declarar `engines` | Express 5, pg, bcrypt, jsonwebtoken, zod, helmet | Argon2id, logger estruturado, remover `dotenv` |
| Web | 1 alerta alto transitivo (`follow-redirects` via `axios`), sem efeito no navegador | `axios` 1.21.1 (zera o alerta), `vite`, `react-router`, `react-query` em patch | React 19, Vite 8, react-aria-components, react-hook-form, lucide | trocar os 3 gráficos de `recharts` pelo `GraficoLinhas` próprio |
| Mobile | Expo SDK 58 é o estável mais recente; 12 alertas só em ferramentas de build | `npx expo install --fix`; remover `babel-plugin-module-resolver` e `@react-navigation/bottom-tabs` (sem uso) | react-navigation 7, Reanimated 4, gifted-charts, axios, bottom-sheet | expo-router, TanStack Query no app |

- **shadcn/ui, MUI, Material Web:** não. O shadcn traz a estética dele, o MUI não implementa M3 Expressive e usa Emotion (conflita com a CSP), o Material Web está em manutenção. O caminho fiel ao M3 é o atual: componentes próprios sobre react-aria-components.
- **Ferramentas que faltam:** CI; Biome só como lint (o typescript-eslint não aceita TypeScript 7, e o formatador conflitaria com as branches abertas); Playwright para a fumaça do web.
- **Não rodar** `npm audit fix --force` no mobile: ele rebaixa o Expo para o SDK 53.

## Como o trabalho cabe no prazo

Subagentes implementam; o limite é a revisão. Cada pessoa revisa um lote de PR por dia útil. De 12 a 27/11 há 11 dias úteis (20/11 é feriado), ou seja, cerca de 22 lotes. O levantamento listou trabalho para quase 50, então o plano é uma fila ordenada com linha de corte.

| Data | Marco |
|---|---|
| 11/11 | Fase 0: árvore limpa, banco de teste, baseline |
| 12 a 13/11 | portões de Prisma e NativeWind; começam a fila, a revisão e os CTs |
| 17/11 | API publicada enviando e-mail; se não, a demo passa a ser local |
| 20/11 | feriado: o grupo lê o relatório da revisão e fecha as pendências |
| 27/11 | congelamento de funcionalidade |
| 30/11 e 01/12 | estabilização; congelamento de código |
| 01 a 04/12 | evidências no commit congelado, ensaio, vídeo de reserva |

Ordem de valor para a banca (corta-se do fim para o começo): 1) caminho da demo, F3, deploy, CTs com evidência; 2) F4/F6, F9, F10; 3) autenticação e vínculo P1; 4) ponte Tailwind e piloto Prisma; 5) contraste, tokens e tipografia; 6) endurecimento; 7) componentes novos do M3E; 8) telas em NativeWind.

## Regras de execução

- A aprovação autoriza a Fase 0, a revisão multiagente, os dois portões e os lotes de correção da fila. Lotes de funcionalidade começam por um desenho curto no chat que você aprova. Tailwind, Prisma, deploy e design do mobile têm plano escrito próprio (`superpowers:writing-plans`, em `docs/superpowers/plans/`).
- Uma branch e um PR por lote, Conventional Commits em pt-BR. Eu faço commit e push em branch e abro o PR; o merge na `main` é do grupo.
- Implementação com `superpowers:subagent-driven-development` e TDD: implementador Sonnet xhigh, revisor em contexto novo.
- Mudança de contrato entre servidor e cliente sai num PR único com os dois lados. PR com migration reserva o número em `BACKLOG.md` e traz o passo de aplicá-la no banco da equipe e no de demo.
- Todo PR traz "O que mudou, Por quê, Como testar, Como explicar na banca".
- Antes de mexer no mobile: ler a documentação versionada do Expo SDK 58 (regra do `AGENTS.md`).
- Estado entre sessões em `docs/auditoria-2026-11/ESTADO.md`. Workflows separados por plataforma e retomáveis: o limite de uso já interrompeu o levantamento três vezes.

## Fase 0: Preparação (11/11)

1. **Árvore limpa.** `apps/server/src/db.ts` tem uma edição acidental não commitada (linha 1 virou ` qimport`) que impede o servidor de subir: `git restore apps/server/src/db.ts`. Depois, `npm ci` nos 3 apps.
2. **Versionar o levantamento.** Extrair os 22 resultados dos journals da sessão (`…/subagents/workflows/wf_7df8e57f-a77/journal.jsonl` e `…/wf_0f34cc3a-ba7/journal.jsonl`) para `docs/auditoria-2026-11/levantamento/<agente>.md` com `INDICE.md`, na branch `docs/auditoria-2026-11` (inclui `docs/revisao-por-pares.md`, hoje fora do git).
3. **Banco de teste sem dado da equipe.** Você roda `! npx neonctl auth`. Crio a branch Neon `revisao-tcc-2026-11`; nela, redefino a senha dos dois papéis por SQL ou pelo console do Neon (para a credencial do dono da equipe não circular), crio o banco vazio `psychelink_teste` e monto `apps/server/.env.test` a partir do `.env.test.old`, trocando só as duas URLs (pooler com `psychelink_app`, direta com o dono), sem imprimir valores. `npm run migrar:test` aplica as 7 migrations do zero. Se a migração do zero falhar, o conserto vira o primeiro lote da Frente A.
4. **Trava antes do primeiro teste.** Na branch do lote A1, `apps/server/test/ajuda.ts` recusa rodar se o nome do banco não terminar em `_teste` ou se o host for o do `.env`. A trava do seed (`scripts/seed-dev.ts`) não serve de modelo: ela compara com o próprio `.env.test`.
5. **Baseline.** `SELECT current_user, rolbypassrls` (esperado `psychelink_app, false`), `SHOW timezone` (resolve a dúvida do fuso do check-in), `SMTP_HOST` vazio; `tsc --noEmit` nos 3 apps; `npm test` com contagem de passa e falha; `npm run build` no web; `npx expo install --check` no mobile.

## Revisão multiagente (começa em 12/11, em paralelo com a fila)

O levantamento já mapeou o código e achou cerca de 150 pontos. Os revisores recebem esses relatórios como "já conhecido", completam e verificam, em vez de recomeçar. A revisão lê a `main` e não bloqueia a fila: achado crítico ou alto entra na frente; o resto vai para `BACKLOG.md`.

| Setor | Server | Web | Mobile | Modelo |
|---|---|---|---|---|
| Segurança e confiança no cliente | matriz de autorização rota a rota; cada policy de RLS explicada em português; sessão, OTP, cripto | CSP, cookies, storage, `VITE_*`; para cada regra do front, abrir a rota do servidor e confirmar que ela também valida | SecureStore, logs, deep links, backup, `EXPO_PUBLIC_*`; mesma conferência com o servidor | Fable high |
| Corretude e concorrência | tabela ler-decidir-gravar × proteção; idempotência de cada escrita; fuso | duplo envio, cache obsoleto | respostas atrasadas, duplo toque, rascunho | Fable high |
| Desempenho | leitura estática: event loop, pool, awaits em série, índices; cold start | tamanho do bundle do build; waterfalls; re-render | thread JS × UI, listas, re-render por contexto | Opus xhigh |
| Complexidade e separação | arquivos longos, mistura HTTP/regra/SQL, duplicação | tela × regra × API; ausência de testes | tela × regra × API; ausência de testes | Opus high |
| UI/UX e acessibilidade | (não se aplica) | 15 sinais do M3E; WCAG 2.2; capturas em claro/escuro, 1440 e 375, se o ambiente de teste estiver de pé (`npm run dev:test`, `npm run seed:dev`, `vite`) | alvos, leitor de tela, fluxo do check-in e do SOS; capturas do Expo Go por `adb`, se houver aparelho | Opus high |

Transversais: conformidade LGPD e CFP 09/2024, incluindo os textos legais do app (`apps/mobile/src/constants/documentos.ts`) e o que eles prometem sem existir (Opus xhigh); prontidão de operação e deploy (Opus high).

Tamanho: 14 revisores (no web e no mobile, segurança e corretude são um revisor só), verificação em lote por revisor, um crítico por plataforma e uma síntese. Ordem: server (12/11), mobile, web, com parada entre os workflows; síntese até 19/11.

**Os 5 itens do prompt colado viram entregas nomeadas:**

| Item | De onde sai | Arquivo |
|---|---|---|
| 1 Testes de integração | baseline da Fase 0 + `levantamento/server_testes.md` | `01-testes.md`: ferramenta, banco separado, comando, contagem de passa e falha, e a tabela dos fluxos críticos deste sistema (cadastro, login, vínculo, consentimento, check-in, escalas, consultas, relatório) com teste em rota real, só com mock ou nenhum. Não há checkout, assinatura nem webhook |
| 2 Confiança no cliente | Segurança (web, mobile) + RLS | `02-confianca-no-cliente.md`: regras de permissão, papel e consentimento que só existem no front; `VITE_*` e `EXPO_PUBLIC_*` classificadas como públicas ou secretas; tabelas sem RLS e cada policy explicada em português |
| 3 Race condition | Corretude (server) | `03-race-conditions.md`: cada trecho, o que acontece com 2 requisições iguais, o que protege, e se o banco sozinho resolveria |
| 4 Idempotência | Corretude (server) | `04-idempotencia.md`: sem webhooks nem gateway de pagamento (declarado "não se aplica"); reenvio e duplo toque em cada escrita |
| 5 Separação | Complexidade (3 apps) | `05-separacao.md`: arquivos mais longos, o que misturam, candidato nº 1 por app |

**Conceitos entregues a cada revisor** (checklists completos em `levantamento/checklists_*.md`, colados no prompt):

- Segurança: BOLA/BFLA/IDOR, sessão e CSRF, JWT (RFC 8725), OTP e enumeração, mass assignment, rate limit e DoS (bcrypt 72 bytes), AES-GCM (nonce, AAD, rotação), RLS (FORCE, papéis, contexto por transação com pooler), cadeia de suprimentos, MASVS no mobile.
- Corretude: race condition, atomicidade e isolamento, `UNIQUE`/`EXCLUDE`, lock de linha e advisory lock, idempotência, duplo envio, fuso.
- Desempenho: throughput, latência p50/p95/p99, event loop (bloqueio e lag), threadpool da libuv, concorrência × paralelismo, backpressure e esgotamento do pool, pooler e cold start do Neon, N+1, awaits em série, índices, paginação por cursor, timeouts, estado em memória × load balancer, encerramento gracioso; Core Web Vitals; thread JS × UI e worklets.
- Complexidade: ciclomática e cognitiva, coesão e acoplamento, SRP, duplicação entre apps, código morto, tipos, Big-O das estatísticas.
- UI/UX: Nielsen, WCAG 2.2 AA, sinais do M3 Expressive, copy não diagnóstica, UX de crise, estados vazio/carregando/erro.

**Regras dos revisores:** cada achado traz `arquivo:linha`, cenário concreto de falha, severidade, correção proposta e o teste que o prova. Achado de severidade média ou maior passa por um verificador Fable instruído a refutar. Refutado sai; "provável" fica marcado. O crítico aponta áreas não cobertas e só elas ganham segunda rodada.

**Saída** em `docs/auditoria-2026-11/`: `RELATORIO.md`, `setores/*.md`, `01` a `05`, `BACKLOG.md` (reúne os pontos do levantamento e os da revisão: ID, severidade, esforço, onde, correção, teste, já corrigido por qual lote) e uma página Artifact privada com o relatório para o grupo.

## Portões de viabilidade (12 a 13/11, branches descartáveis)

| Portão | Passa se | Se falhar |
|---|---|---|
| Prisma (2h) | `prisma` e `@prisma/client` 7.10.1 fixados, adapter pg, `moduleFormat` cjs; `npm run build` e `node dist/index.js` respondem; as rotas de anotações (`apps/server/src/routes/psicologo/pacientes.ts`) em Prisma dentro de transação com `set_config` deixam a suíte verde sem editar testes e os processos de teste terminam sozinhos; sem `set_config` o Prisma lê 0 anotações; depois de 6 minutos ocioso a rota responde 200 | não migra; a explicação técnica vai para a apresentação |
| NativeWind (3h) | `npx expo export` gera o bundle e um aluno confirma no Expo Go: tela convertida abre; o `ThemeContext` troca sistema, claro e escuro; o slider do check-in anima; três telas não convertidas continuam iguais. Ordem: NativeWind 5 RC, depois Uniwind, depois NativeWind 4 com Tailwind 3 | StyleSheet com tokens |

O portão do NativeWind decide a forma do design do mobile (lotes B9 e B10): se passar, os tokens nascem no tema Tailwind; se não, em `src/theme`.

## Fila de lotes

- **Correção** (segue direto, com TDD): A1, A2, A6, A10, B1, B2, B3, B8.
- **Funcionalidade** (desenho curto aprovado no chat antes): A3, A7, A11, B4 a B7.
- **Plano escrito próprio:** deploy e demo (A4, A5), ponte Tailwind (A8), piloto Prisma (A9), design do mobile (B9, B10), telas em NativeWind (B11).
- **Dependências:** o grupo mescla os PRs do Dependabot #27 e #29 a #32 depois que o CI do A1 existir; `npx expo install --fix` e a remoção das duas dependências sem uso do mobile entram no B2.

### Frente A: server e web

| # | Lote | Arquivos principais | Pronto quando |
|---|---|---|---|
| A1 | Trava da suíte, CI e testes do check-in que já funciona | `apps/server/test/ajuda.ts`, `.github/workflows/ci.yml`, novo `test/checkin.test.ts` | CI roda `tsc` nos 3 apps e a suíte em Postgres de contêiner migrado do zero; criar, 409 no mesmo dia, limites de campo e 401 do check-in cobertos |
| A2 | F3: hábitos e intensidade gravados (contrato único, com B3) | migration `0008`, `src/routes/checkin.ts`, `src/schemas.ts`, `scripts/seed-dev.ts`, `test/ajuda.ts`, `test/pacientes.test.ts`; web `src/lib/psicologoApi.ts`; mobile `screens/paciente/checkin/checkin.tsx` | teste falha antes e passa depois: um `POST /checkin` com os 6 hábitos aparece no painel e no relatório do psicólogo |
| A3 | Histórico do paciente no servidor | `src/routes/checkin.ts`, `src/lib/cursor.ts`, `src/lib/periodo.ts` | `/checkin/resumo` devolve os registros mais recentes em ordem crescente, aceita 7/30/90 e informa poucos dados (regra `MIN_REGISTROS_SEMANA` do dashboard); rota paginada do histórico com detalhe |
| A4 | API publicada | `Dockerfile`, `docker-compose.yml` com Postgres local, `GET /health` com `SELECT 1` em `src/app.ts` | API no Render responde `/health` e um código de verificação chega a uma caixa de e-mail real até 17/11 |
| A5 | Web publicado e ambiente de demo | `apps/web/vercel.json` (rewrite de `/api`, header CSP), CSP de build em `apps/web/index.html`, error boundary em `src/App.tsx` | login em 2 etapas, vínculo e painel funcionam no domínio do Vercel; branch Neon `demo` com seed |
| A6 | Autenticação P1 | `src/routes/auth.ts`, `auth-psicologo.ts`, `checkin.ts`, `src/lib/rota.ts` | contagem do OTP atômica, com teste de concorrência; `/auth/login` recusa conta de psicólogo; 429 em JSON nas três rotas; corpo ausente responde 400 |
| A7 | Vínculo novo não herda dados | migration com policies de `checkin_diario` e `habito` a partir de `vinculo.criado_em` e trigger `SECURITY DEFINER` (modelo da `0005`) que desmarca diários ao encerrar; `src/routes/psicologo/{checkins,pacientes,dashboard,relatorios}.ts`, `src/lib/resumo.ts`; `vincular()` dos testes aceita data | psicólogo B não lê check-in nem diário anteriores ao vínculo dele, por rota e por SQL direto |
| A8 | Ponte Tailwind | `apps/web/vite.config.ts`, `src/styles/`, 2 ou 3 componentes folha | capturas idênticas nas telas tocadas; CSP estrita intacta; `DESIGN.md` atualizado |
| A9 | Piloto Prisma, se o portão passou | `prisma/schema.prisma` por `db pull`, rotas de anotações | suíte verde sem alterar testes de contrato; reversível em um commit; `docs/` explica a fronteira Prisma × SQL |
| A10 | Ajustes do web | foco visível em Menu e Select; `pacienteId` em `GET /psicologo/consultas`; item "Chats (em breve)" removido; enfáticos em peso 500 e token da fonte de títulos em `tokens.css`; `axios` 1.21.1 e patches | axe sem violações; alerta do `npm audit` zerado |
| A11 | Aceite de termos gravado (contrato único) | migration, `src/routes/auth.ts`, `src/schemas.ts`; mobile `screens/auth/registro.tsx`, `hooks/useAuth.ts` | o servidor recusa cadastro sem aceite e guarda versão e data |

### Frente B: mobile

| # | Lote | Arquivos principais | Pronto quando |
|---|---|---|---|
| B1 | Sessão e SOS | `src/navigation/AppNavigator.tsx`, `src/hooks/useAuth.ts`, `src/screens/paciente/sos/sos.tsx` | app reaberto com sessão válida vai direto ao início; sessão expirada volta ao Login; SOS abre sem login e sem rede; a discagem usa `openURL` com tratamento de erro, sem `canOpenURL` |
| B2 | O que aparece na demo | selo de demonstração em `checkin.tsx`; `dashboard/dados.tsx` recarrega ao focar e não plota ausente como 0; Chat fora de `MainTabNavigator.tsx`; contorno e texto secundário em `src/theme/index.ts` | contraste AA nos dois temas; 5 destinos na barra |
| B3 | Medicação na etapa de hábitos | no PR do A2 | os 6 hábitos saem do app |
| B4 | F9: SOS completo | `sos.tsx`, navegação | SAMU 192 e Bombeiros 193 na tela; atalho do SOS em check-in, escala e consentimento |
| B5 | F6: dashboard do paciente | `dashboard/dados.tsx`, `src/lib/checkinService.ts` | filtros 7/30/90, gráfico de sono, aviso com menos de 3 registros |
| B6 | F4: histórico | nova tela e rota de navegação | linha do tempo decrescente com detalhe por registro |
| B7 | F10: lembrete local | `expo-notifications`, `app.json`, preferências em `components/ui/SheetConta.tsx` | lembrete diário configurável chega no Expo Go (a documentação do SDK 58 confirma notificação local no Expo Go; push remoto não) |
| B8 | Diário: bloquear tudo ou só os próximos | `screens/paciente/consentimento/consentimento.tsx` (a rota de parar o compartilhamento já existe em `src/routes/paciente/consentimento.ts`) | ao desligar, um diálogo explica o efeito e oferece as duas opções |
| B9, B10 | Design do mobile | tokens de tipografia, espaçamento, raio e movimento alinhados ao `tokens.css` do web; fontes por `expo-font`; valores soltos trocados nas telas principais; indicador em pílula na barra; botão sem gradiente | comparação de fontes aprovada pelo grupo; capturas antes e depois |
| B11 | Telas em NativeWind, se o portão passou | até 3 telas | abrem no Expo Go iguais às originais |

### Abaixo da linha de corte (sobem nesta ordem se sobrar tempo)

Pedido de histórico anterior com aceite do paciente e reinício do consentimento em vínculo novo (plano próprio); endurecimento do server (schema zod de ambiente, `EMAIL_PEPPER` obrigatório, senha limitada em bytes, `jwt.verify` com `algorithms`, SMTP fora da transação, pool com `max` e timeouts, token de redefinição de uso único, corrida do CRP duplicado, `obterOuCriarPacienteId` atômico, log sem o objeto de erro inteiro); logout do app por código estruturado; componentes do M3E no web (tamanhos de botão, button group, navigation rail, loading indicator) e no mobile; restante das telas em NativeWind; APK por EAS Build; Biome como lint; Vitest.

## Trilhas que correm ao lado da fila

| Trilha | Conteúdo | Pronto quando |
|---|---|---|
| Testes e evidências | A partir de 12/11: CTs reescritos no modelo da devolutiva (valores concretos, negativos, fronteira com 2, 3 e 4 registros, acesso antes e depois da revogação, acesso por ID direto) e mapa de cada CT para um teste automatizado ou roteiro manual com tela. CTs de chat, push e recomendação ficam "Bloqueado, fora do escopo", com a ata do council copiada de `.claude/` para `docs/`. De 01 a 03/12: execução no commit congelado, com saída datada da suíte, medição do NF2.2 (check-in em até 3 minutos) e do bloqueio após revogação, fumaça em Playwright no web | cada CT com resultado obtido, status, data e evidência; matriz F1 a F20 com status |
| Deploy e demo | Lotes A4 e A5, mais: e-mail a partir do Render (o plano gratuito bloqueia as portas 25, 465 e 587: usar relay em outra porta ou API HTTP; se não der até 17/11, instância paga por um mês ou demo local com `docker-compose`); o app também chama a API pelo domínio do Vercel, para os dois caminhos terem os mesmos proxies, e `TRUST_PROXY` é medido; ping em `/health` a cada 4 minutos durante a banca (Render dorme em 15 minutos, Neon em 5, e os clientes desistem em 15 segundos); contas da demo com e-mails reais do grupo; Expo Go precisa do notebook com o Metro e de um hotspot próprio; roteiro e vídeo de reserva | vínculo, check-in e painel de ponta a ponta no ambiente publicado |
| Documentos | `PROPOSTA-DOCUMENTOS.md` até 13/11, para levar à orientadora: slides 9, 10 e 13 a 15, requisitos F7/F10/F15/F20, "TLS 1.3 em todas as requisições", "retenção de 5 anos após o vínculo"; lista do que mudou no sistema para o Kenai, com conferência do texto em 20/11; QTS sem "lorem ipsum"; `README` que ensina a subir os 3 apps; uma página "como explicar na banca" por decisão (SQL + RLS, Prisma só nas anotações, Catppuccin sobre M3, trabalho futuro, uso de assistentes de IA e divisão real do trabalho) | entregue ao grupo |

## Congelamento e ensaio (27/11 a 04/12)

27/11: nada de funcionalidade nova. 30/11 e 01/12: só regressão. Depois: suíte completa e fumaça; roteiro da demo executado duas vezes sem erro; vídeo de reserva gravado; app aberto em dois aparelhos; Neon e Render aquecidos antes da apresentação; plano B local com `docker-compose`. O que não estiver mesclado em 01/12 fica na branch como trabalho futuro.

## Código existente a reusar

- `rota()`, `limite()`, `lerOuNegar()` em `apps/server/src/lib/rota.ts` (as rotas de `auth.ts` e `checkin.ts` ainda repetem isso à mão).
- `emTransacao`, `comContextoPaciente`, `comContextoPsicologo` em `apps/server/src/lib/contextoseguro.ts`.
- Helpers de teste em `apps/server/test/ajuda.ts`: `iniciar`, `criarCliente`, `entrar`, `criarPaciente`, `criarCheckin`, `vincular`, `bearer`, `limpar`.
- `UPDATE … WHERE … RETURNING` do 2FA (`src/routes/auth-psicologo.ts`) e o advisory lock por e-mail do cadastro, como modelos de escrita atômica.
- Período 7/30/90 e `MIN_REGISTROS_SEMANA` do dashboard do psicólogo, para o F6 do paciente.
- Web: `apps/web/src/components/ui/*`, `src/styles/tokens.css`, `GraficoLinhas`, `ConsentimentoAusente`.
- Mobile: `apps/mobile/src/theme`, `ToqueAnimado`, `lib/hapticos.ts`.

## Verificação

- Fase 0: a suíte roda no banco `psychelink_teste` e a contagem fica registrada; `tsc` limpo nos 3 apps.
- Revisão: todo achado médio ou maior tem veredito de verificador; os 5 arquivos do prompt existem; backlog publicado.
- Fila: cada lote cumpre o seu "Pronto quando"; correção tem teste que falha antes e passa depois; CI verde no PR; lotes do mobile conferidos por um aluno no Expo Go.
- Entrega: demo de ponta a ponta duas vezes; cada CT com evidência datada; vídeo gravado.

## Pendências do grupo (não bloqueiam o início)

| Pendência | Quem | Até |
|---|---|---|
| A orientadora autoriza alterar slides, requisitos e CTs? | grupo, com `PROPOSTA-DOCUMENTOS.md` em mãos | 16/11 |
| Formato da demonstração (ao vivo ou vídeo) e horário da banca | grupo | 20/11 |
| Fonte dos títulos, depois da comparação visual | grupo | antes do lote B9 |
| CRP: a pesquisa recomenda situação pendente/verificado com conferência manual por um admin no portal do CFP; API paga (franquia de cerca de R$ 100 por mês) só depois | grupo | 20/11 |
| Cadastro de menores de 18 (os Termos do app dizem 18+) | grupo | antes do congelamento |
| Itens do PHQ-9, GAD-7 e DASS-21 conferidos com as versões oficiais, como `apps/server/docs/escalas.md` pede | psicóloga que acompanha o grupo | antes da banca |
| Estado da parte escrita | Kenai | 20/11 |

## Fora do escopo

Chat, push remoto, marketplace, recomendação de exercícios, expo-router, troca de bcrypt, axios ou recharts, shadcn/MUI, workspaces e pacote compartilhado, API paga de CRP, esquema de cor gerado por Material Color Utilities, build nativo local.
