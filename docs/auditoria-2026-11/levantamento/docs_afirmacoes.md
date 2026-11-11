# Documentos: afirmações × repositório

> Levantamento em modo leitura, 10 e 11/11/2026. Agente `docs_afirmacoes`, Opus 5.5 (effort high). Nada foi executado além de leitura de código, `npm view/audit/outdated` e documentação pública; "verificado" quer dizer lido no código, não testado. Linhas citadas são do commit `0864143`.

## Resumo

Auditei slides (out/2026), Descrição Completa, Requisitos F1–F20, "Desenvolvimento WEB" e o Manual ETEC contra o código. O núcleo de segurança é real e verificável: 2FA por e-mail, sessão web com JWT de 15 min e refresh rotativo com detecção de reuso, AES-256-GCM por campo, auditoria com trigger de imutabilidade, RLS e código de vínculo por CSPRNG/HMAC.
Os slides prometem stack que não existe: Prisma, TailwindCSS, Docker, Vercel e Render. Também mostram uma paleta lavanda/rosa que não está no código.
Notificações (push, FCM, expo-notifications), chat, marketplace, recomendação de exercícios e direitos LGPD de portabilidade e eliminação não existem. A retenção é de 5 anos a partir da criação da anotação, não do fim do vínculo. Não há testes OWASP nem TLS 1.3 garantido.
O risco mais grave para a demo: hábitos (F3) são coletados e nunca gravados. O painel do psicólogo só mostra hábitos vindos do seed. O gráfico do paciente congela nos 30 check-ins mais antigos.
O paciente entra no app sem vínculo, o que contradiz a afirmação de alinhamento à CFP.
Há coisas boas não documentadas que valem apresentar: consultas/calendário com bloqueio de conflito, RLS testada, gestão de sessões, recuperação de senha e anti-enumeração.
O Manual não traz critérios de nota nem prazos: delega ao PPP e ao orientador. Exige apresentação escrita obrigatória com formatação ABNT.

## Relatório

## 1. Afirmações técnicas x repositório

Legenda: **V** verdadeiro, **P** parcial, **F** falso, **NV** não verificável no repo. Tudo foi lido por mim, salvo onde está marcado como *suspeita*.

### Stack e infraestrutura
| Afirmação (fonte) | Status | Evidência |
|---|---|---|
| TailwindCSS (slides p.13) | F | `apps/web/package.json` não tem tailwind; o web usa CSS Modules + `src/styles/tokens.css`; o mobile usa StyleSheet |
| Prisma (slides p.14) | F | `apps/server/package.json`: `pg ^8.23.1`; SQL manual em `migrations/0001..0007.sql` |
| Docker (slides p.15; Descrição 7.2) | F | não há Dockerfile nem compose (`find` vazio) |
| Vercel / Render (slides p.15) | F/NV | não há config; `apps/web/.env.example` usa proxy para localhost; `apps/mobile/.env.example` usa `http://IP:3000` |
| Figma (p.13) | NV | só `TCC_PsycheLink/wireframe incompleto.png` (citado em `PRODUCT.md:46`) |
| FCM / push (Descrição 7.2; F10, F19, F20) | F | `apps/mobile/package.json` não tem `expo-notifications` nem firebase; a reunião do council (`meeting-notes.md:35`) deixou push e FCM de fora |
| Python + pandas (7.2) | F | a estatística é em TS: `apps/server/src/lib/estatistica.ts` |
| MongoDB | não prometido nos docs lidos | descartado em `meeting-notes.md:17` |
| Express, TS, PostgreSQL/Neon, React+Vite, Expo/RN, Git/GitHub | V | package.json dos três apps; `db.ts:3-6`; `.github/dependabot.yml` |
| M3 Expressive + Catppuccin, spring, háptico (p.11-12) | V | `tokens.css:3,18,223-227`; `lib/hapticos.ts`; `ToqueAnimado.tsx` (withSpring) |
| Paleta Lavanda #E6E6FA / Rosa #FFB5C0 (p.9-10) | F | nenhuma das duas cores aparece em `apps/*/src` |
| "MVC monolítico" (7.1) | P | é uma API REST Express com dois clientes; não há camadas MVC |

### Segurança
| Afirmação | Status | Evidência |
|---|---|---|
| 2FA obrigatório para o psicólogo | V | código por e-mail (`auth-psicologo.ts:47-168`); sem TOTP (`PRODUCT.md:39`) |
| JWT de 15 min + refresh com rotação | P | só no web: `sessaoWeb.ts:14`, `auth-psicologo.ts:220-281` (detecta reuso). O paciente mobile recebe JWT de **1 dia sem refresh** (`auth.ts:410-414`) e o logout tem tolerância de 10 s (`auth.ts:60`) |
| TLS 1.3 em todas as requisições | F/NV | o servidor sobe em HTTP puro (`index.ts:12`); o mobile em dev usa http; só a conexão com o banco tem TLS verificado (`db.ts:3`, `hardening.test.ts:119`). Nada força TLS 1.3 |
| AES-256 em repouso nas colunas sensíveis | P | AES-256-GCM (`criptografia.ts:8`) em emoção, contexto e diário (`checkin.ts:170-172`), anotações (`pacientes.ts:470`) e respostas de escala. Humor, ansiedade e sono ficam em claro (`checkin.ts:181-197`) |
| Log de auditoria imutável de todos os acessos | P | o trigger e o REVOKE existem (`0002:56-73`, `0003:17`), mas não auditam o GET do dashboard (`dashboard.ts:57`), a lista de check-ins (`checkins.ts:59`) nem `/relatorios/geral` (`relatorios.ts:73`). `login_ok` é gravado antes do 2FA (`auth-psicologo.ts:116`). O dono do banco pode remover o trigger |
| Revogação em menos de 5 s | P (não medido) | o consentimento é lido a cada request (`vinculo.ts:42-56`), sem cache. É imediato por desenho, mas não há medição nem teste de tempo |
| Retenção de 5 anos após o fim do vínculo | F | anotação: `expira_em = criação + 5 anos` e fica oculta depois (`pacientes.ts:436,467-468`). `ON DELETE CASCADE` apaga tudo (`0001:784-896`). Check-ins e escalas não têm política de retenção |
| CSPRNG no código de vínculo, 24 h, uso único | V | `codigo.ts:22` (randomInt) + HMAC (`:25`); `psicologo/vinculo.ts:25` |
| Testes OWASP Top 10 | F | nenhum mapeamento. Existem `hardening.test.ts` (Cache-Control, CORS, proxy, log de OTP, TLS do banco) e `defesa-sem-rls.test.ts` |
| Direitos do titular: portar e eliminar (5.2) | F | só aparecem como texto em `mobile/src/constants/documentos.ts:91,145`; não há rota |
| "Paciente só acessa o app após vínculo" (5.3) | F | `login.tsx:32` leva direto para `Main`; a vinculação é opcional |
| "Psicólogo recebe notificação do vínculo" (3.2) | F | não há push; existe só a "atividade recente" |

### Funcionais: Requisitos F1–F20
V: F1, F5, F12, F13, F14 (via impressão do navegador), F16, F17.
P: F2 (intensidade validada e descartada), F6 (sem filtro de período nem gráfico de sono; bug `ORDER BY data ASC LIMIT 30` em `checkin.ts:227-228`), F8 (diário só dentro do check-in), F9 (só CVV em `sos.tsx:11`; o 192 aparece só depois de uma escala, em `responderEscala.tsx:243`; não há 193; o acesso não é registrado), F11 (o CRP só tem o formato validado), F18 e F19 (sem notificação).
F: **F3** (hábitos não são gravados: o INSERT em `checkin.ts:181-197` não inclui hábitos, e a tabela `habito` só tem exercício, meditação e medicação, `0001:223-229`), F4 (o mobile não tem linha do tempo; `dados.tsx:182` é um gráfico de frequência), F7, F10, F15, F20.

### Descrição completa (12 + 12)
Paciente: F1 V; F2 P; F3 F; F4 F; F5 escalas V (o PHQ-2 está no catálogo, `0005:49-53`); F6 consentimento P (a categoria "Dashboard e análises" não existe: são só 4 flags, `paciente/vinculo.ts:86`); F7 dashboard P; F8 chat F; F9 diário P; F10 SOS P; F11 vínculo V; F12 notificações F.
Psicólogo: FP1 V (2FA por e-mail); FP2 V; FP3 V; FP4 P (retenção); FP5 V; FP6 P; FP7 F; FP8 V (`EncerrarVinculo.tsx`); FP9 marketplace F; FP10 perfil público F; FP11 P; FP12 F.
Métricas da seção 6.2: Pearson V (`estatistica.ts`), distribuição por horário V (`pacientes.ts:194`), alerta de esparsidade V no web (`pacientes.ts:19,77`) e ausente no app.
"Mapa de Gatilhos" (slides p.22): P. Os contextos são gravados cifrados, mas não existe tela de "mapa".

### Metodologia
- **Testes contínuos: P.** São 15 arquivos com cerca de 197 casos `it/test`, só no servidor, e todos precisam de banco. Não há CI (`.github` só tem dependabot), não há testes no web nem no mobile, e não existe `checkin.test.ts`.
- **Pair programming, Scrum, Kanban, Trello: NV.** A autoria no git está concentrada: Iago 151+10 commits, Henzo 104, Eduardo 16, Kenai 0 (`git shortlog`). 98 commits trazem `Co-Authored-By` de agentes de IA (76 Opus, 16 Sonnet, 6 arena-agent).
- **Pesquisa com 102/11 respostas e metas da seção 10 (SUS ≥ 70 etc.): NV no repo.**

## 2. Implementado e ausente dos documentos (vale apresentar)
- **Consultas/calendário:** `0006_consultas.sql` com restrição contra sobreposição (l.22), cancelamento em cascata quando o vínculo é encerrado (trigger l.63-73), web `rotas/calendario/*`, mobile `consultas.tsx`, 19 testes. No "Desenvolvimento WEB" aparece só como sugestão.
- **RLS no Postgres:** `0003`, `docs/rls.md`, `rls.test.ts`, `defesa-sem-rls.test.ts`. A aplicação confere o vínculo mesmo sem RLS (`vinculo.ts:18-26`).
- **Sessões web:** expiração absoluta de 12 h, inatividade de 30 min (`sessaoWeb.ts:18-21`), aba "sessões" com revogação (`MinhaArea.tsx:43,209`), detecção de reuso de refresh.
- **Recuperação de senha** (`auth.ts:280-380`, `esqueciSenha/novaSenha.tsx`, `RecuperarSenha.tsx`) e verificação de e-mail no cadastro.
- **Anti-enumeração de contas** (`cadastro-sem-revelar.test.ts`), rate limit, helmet, CSRF por allowlist de Origin (`app.ts:31`), cookies httpOnly/SameSite=Strict.
- **Item 9 do PHQ-9** leva a CVV e SAMU (`0007`, `responderEscala.tsx:242-243`); subescalas do DASS-21.
- **Auditoria visível ao próprio psicólogo** (`rotas/auditoria`), linguagem não diagnóstica e disclaimer (`PRODUCT.md:35-38`).
- Termos e política no app (`documentos.ts`), contatos de confiança no SecureStore que funcionam offline, tema claro/escuro, Dependabot.

## 3. Riscos para a banca (saída A: implementar / saída B: corrigir o documento)
1. **Hábitos não gravados com painel populado pelo seed.** Uma demo ao vivo expõe o problema. A: colunas novas + INSERT, cerca de 0,5–1 dia (baixo). B: não se sustenta, o requisito aparece na tela. **Implementar.**
2. **Prisma, Tailwind, Docker, Vercel e Render no slide.** A: dias a semanas, com risco de quebrar RLS e testes. B: minutos (trocar por pg/SQL, CSS Modules/StyleSheet, Neon) e citar a migração como trabalho futuro. **Corrigir.**
3. **Push e notificações (F10, F19, F20, FP12, NF19.1 de 1 min).** A: lembrete local de cerca de 1 dia; push de 1–3 dias, só Android (`meeting-notes.md:18`). B: reescrever como trabalho futuro (horas).
4. **Chat (F7/FP7), marketplace (FP9/FP10), F15.** B em horas, como ADR de escopo. A está fora do prazo.
5. **TLS 1.3, AES em todas as colunas, auditoria de "todos os acessos".** B: descrever o que existe (horas). A: HTTPS na hospedagem, mais auditoria nos GETs agregados (cerca de 0,5 dia).
6. **"JWT de 15 min + refresh" generalizado.** B: restringir ao web (minutos). A: refresh no mobile (1–2 dias).
7. **Retenção de 5 anos e direitos LGPD.** B: declarar como limitação do protótipo (horas). A: política, exclusão lógica e exportação (dias).
8. **OWASP Top 10.** B: remover a afirmação. A: tabela que mapeia os testes existentes às categorias (cerca de 0,5 dia).
9. **Vínculo pré-existente (CFP).** A: barrar o app sem vínculo (cerca de 0,5 dia). B: ajustar o texto.
10. **SOS sem 192/193** (F9). A: 1–2 h. **Implementar.**
11. **Bug do `LIMIT 30 ASC` e F4/F6 no mobile.** A: o bug leva cerca de 1 h; períodos e histórico, 0,5–1 dia cada.
12. **Paleta lavanda/rosa x Catppuccin.** B: ajustar os slides 9-10.
13. **Autoria e IA:** a banca pode perguntar sobre pair programming e uso de IA. B: declarar na metodologia o uso de assistentes e a divisão real do trabalho.
14. Rótulos "Engenharia de Software" e "Ano 2025/2026" e a stack "Express ou Django" na Descrição: corrigir.

## 4. O que o Manual de TCC exige (2022)
- **Formato:** apresentação escrita **obrigatória** (Regulamento Geral, art. 1º §2º, citado na p.13). Os 13 tipos possíveis são listados nas p.14-15. Software e protótipo só valem **associados** a um produto escrito (art. 1º §3º). A escolha fica com a habilitação e o PPP da Etec.
- **Para software, Relatório Técnico** (p.85-87): pré-textuais obrigatórios (capa, folha de rosto, resumo, sumário), introdução, desenvolvimento e conclusão, referências. Para software, o relatório "prioriza as partes ou trechos do código para validação do seu processo técnico" (p.86). Os elementos são detalhados na seção Monografia.
- **Formatação ABNT** (p.33-35): A4; Arial ou Calibri 12 (10 em citações longas, notas e legendas); entrelinha 1,5; parágrafo 0/6 pt; margens de 3 cm (esquerda/superior) e 2 cm (direita/inferior); páginas contadas desde a folha de rosto e numeradas a partir da Introdução, no canto superior direito.
- **Etapas** (p.13-14): 1ª etapa com cronograma, problema, hipóteses, objetivos e justificativa; 2ª etapa com pesquisa bibliográfica e empírica.
- **Avaliação e apresentação:** o Manual **não traz critérios de nota, prazos nem regras de apresentação oral**. Banca validadora, feira ou produto final "poderão" ser exigidos pelo PPP (p.12). O orientador define o resto (p.16, p.21).
- **LGPD** (p.19): cita a Lei 13.709/2018 e indica o contato lgpd@cps.sp.gov.br.
- "Henzo Barbosa - 3DS - PDTCC.pdf" é um texto sobre elementos pré, pós e textuais, não uma especificação do projeto.

Limitações: não rodei testes nem o app. Não abri os .env. Do Manual li só o sumário e as p.9-21, 33-36, 76-77 e 85-87 e 100-102.

## Achados

| Severidade | Confiança | Achado | Onde | Detalhe |
|---|---|---|---|---|
| critica | verificado | Hábitos (F3) coletados mas nunca gravados; painel mostra só dados do seed | apps/server/src/routes/checkin.ts:181-197; apps/server/migrations/0001_baseline.sql:223-229 | O INSERT de check-in não grava hábitos e a tabela habito só tem exercicio/meditacao/medicacao. Numa demo ao vivo, o check-in feito na hora aparece no painel do psicólogo sem hábitos. |
| alta | verificado | Slides prometem Prisma, TailwindCSS, Docker, Vercel e Render | Psychelink.pdf p.13-15; apps/*/package.json | O servidor usa pg com SQL manual; a UI usa CSS Modules e StyleSheet. Não há Dockerfile nem config de deploy. É o mais fácil de o avaliador conferir. |
| alta | verificado | Notificações push/FCM inexistentes (F10, F19, F20, FP12, NF19.1) | apps/mobile/package.json; meeting-notes.md:35 | Não há expo-notifications nem firebase. O council decidiu deixar fora, mas os documentos ainda prometem. |
| alta | verificado | TLS 1.3 em todas as requisições não garantido | apps/server/src/index.ts:12; apps/mobile/.env.example | O servidor escuta em HTTP e o mobile em dev usa http://IP:3000. Só a conexão com o banco tem TLS verificado (db.ts:3). |
| alta | verificado | Retenção de 5 anos após encerramento do vínculo é falsa | apps/server/src/routes/psicologo/pacientes.ts:436,467-468; 0001_baseline.sql:784-896 | A anotação expira 5 anos após a criação e fica oculta depois. ON DELETE CASCADE apaga tudo. Check-ins e escalas não têm política de retenção. |
| media | verificado | Paciente usa o app sem vínculo, contrariando o alinhamento CFP declarado | apps/mobile/src/screens/auth/login.tsx:32 | Após o login, o paciente vai direto para Main; a vinculação é opcional. A Descrição 5.3 afirma o contrário. |
| media | verificado | JWT 15 min + refresh com rotação só no web; mobile usa JWT de 1 dia | apps/server/src/routes/auth.ts:410-414,56-61; lib/sessaoWeb.ts:14 | O paciente não tem refresh e o logout tem tolerância de 10 s. |
| media | verificado | Auditoria não cobre todos os acessos; login_ok antes do 2FA | routes/psicologo/dashboard.ts:57; checkins.ts:59; relatorios.ts:73; auth-psicologo.ts:116 | A imutabilidade por trigger é real (0002:56-73), mas GETs agregados não são auditados. |
| media | verificado | AES-256 em repouso só em parte das colunas | apps/server/src/routes/checkin.ts:170-197 | Humor, ansiedade e sono ficam em claro; emoção, contexto, diário, anotações e respostas são cifrados com AES-256-GCM. |
| media | verificado | Testes OWASP Top 10 inexistentes; sem CI; sem testes web/mobile | apps/server/test/; .github/dependabot.yml | São cerca de 197 casos só no servidor, sem mapeamento para o OWASP, e não há checkin.test.ts. |
| media | verificado | Chat, marketplace, perfil público e recomendação de exercícios ausentes | apps/mobile/src/screens/paciente/chat/chat.tsx:45,64; Sidebar.tsx:18 | O chat é demonstração. F15, FP9 e FP10 não têm código. Precisa de ADR de escopo. |
| media | verificado | Gráfico do paciente congela nos 30 check-ins mais antigos; F4/F6 incompletos no app | apps/server/src/routes/checkin.ts:227-228; apps/mobile/src/screens/paciente/dashboard/dados.tsx:182 | ORDER BY data ASC LIMIT 30. Não há linha do tempo, filtro de período nem alerta de esparsidade no mobile. |
| media | verificado | SOS só com CVV; faltam SAMU 192, Bombeiros 193 e registro de acesso | apps/mobile/src/screens/paciente/sos/sos.tsx:11 | O 192 aparece só depois de uma escala (responderEscala.tsx:243). Corrigir custa 1-2 h. |
| media | verificado | Direitos LGPD de portabilidade/eliminação só declarados em texto | apps/mobile/src/constants/documentos.ts:91,145 | Não há rota para exportar ou excluir a conta. |
| baixa | verificado | Paleta lavanda/rosa dos slides não existe no código | Psychelink.pdf p.9-10; apps/web/src/styles/tokens.css:18 | O código usa Catppuccin Latte/Mocha, o que contradiz os slides 9-10 e é coerente com o slide 11. |
| baixa | verificado | Pair programming e autoria não comprováveis; forte uso de agentes de IA | git shortlog; trailers Co-Authored-By em 98 commits | A autoria está concentrada em dois integrantes e um não tem commits. Vale declarar o uso de IA na metodologia. |
| baixa | provavel | CRP validado só no formato; revogação <5 s não medida | apps/server/src/schemas.ts; lib/vinculo.ts:42-56 | O consentimento é lido a cada request, então a revogação é imediata por desenho, mas falta medição. F11 pede CRP validado. |

## Perguntas para o grupo

- Qual produto escrito o PPP da Etec exige (Monografia ou Relatório Técnico) e há banca oral com critérios próprios? O Manual não define isso.
- Qual a data exata da banca, para fixar o congelamento de escopo?
- Vão corrigir os slides 13-15 (stack) antes da apresentação, ou apresentar Prisma/Tailwind como migração futura?
- Os hábitos (F3) entram agora, com colunas de hidratação, redes sociais e contato social, ou viram limitação declarada?
- A demo usa servidor publicado com HTTPS (qual hospedagem?) ou notebook na mesma rede Wi-Fi em HTTP?
- Política de retenção: 5 anos a partir do fim do vínculo, com bloqueio, ou exclusão total declarada como limitação?
- O app deve exigir vínculo antes do primeiro check-in, para sustentar a afirmação sobre a CFP?
- Onde estão as evidências do questionário (102/11 respostas) e haverá avaliação SUS como promete a Descrição, seção 10?
- Como o grupo vai declarar a divisão de trabalho e o uso de assistentes de IA na metodologia?
