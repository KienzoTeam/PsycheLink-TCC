# Server: estratégia de testes

> Levantamento em modo leitura, 10 e 11/11/2026. Agente `server_testes`, Opus 5.5 (effort high). Nada foi executado além de leitura de código, `npm view/audit/outdated` e documentação pública; "verificado" quer dizer lido no código, não testado. Linhas citadas são do commit `0864143`.

## Resumo

A suíte do servidor tem 16 arquivos *.test.ts e 2 helpers (ajuda.ts, comoDono.ts), não 18 testes. São cerca de 203 casos em node:test via tsx. Todos sobem o Express de verdade em porta efêmera e chamam as rotas por HTTP com fetch. Os dados vêm do banco Neon real: as fixtures são gravadas com o papel dono e a limpeza apaga só o que foi criado, por id, e-mail, IP ou alvo. Não há truncate nem transação por teste. Os mocks se limitam a console.log (captura dos códigos OTP), mailer.sendMail, bcrypt.compare e crypto.randomInt. A cobertura de autorização é muito boa: login web em 2 etapas, sessão web, vínculo, RLS, consultas, escalas, relatórios e auditoria. Nenhum código impede a suíte de rodar contra o banco errado; a única barreira é o arquivo .env.test, que hoje não existe, então `npm test` deve falhar logo no início (não executei). O fluxo central do paciente (POST /checkin, /checkin/resumo, /checkin/painel) não tem nenhum teste. Achei também que a rota de check-in aceita `habitos` e nunca grava na tabela habito; os testes não pegam isso porque as fixtures gravam habito direto no banco. Web e mobile não têm teste nem ferramenta de teste, e não há CI: só existe .github/dependabot.yml.

## Relatório

# Estratégia de testes: PsycheLink (foco no servidor)

## 1. Como a suíte roda (verificado)
- **Runner:** node:test via tsx. O comando `npm test` (apps/server/package.json, script `test`) roda `tsx --env-file=.env.test --network-family-autoselection-attempt-timeout=3000 --test "test/**/*.test.ts"`. Node local é v26.13.0.
- **Arquivos:** test/ tem 16 `*.test.ts` e 2 helpers (`ajuda.ts`, `comoDono.ts`). São 197 `it(` no texto; o loop de rls.test.ts:92 gera mais 7, então são cerca de 203 casos.
- **Como o app é exercitado:** HTTP real. `iniciar(app)` faz `app.listen(0,'127.0.0.1')` (ajuda.ts:23-34). `criarCliente` é um fetch com jar de cookies manual e um IP aleatório 10.x.x.x em `X-Forwarded-For` (ajuda.ts:207-240). `carregarApp` limpa o require.cache de `src/app` para recarregar com outro ambiente, em geral `TRUST_PROXY=1` (ajuda.ts:44-53). Há chamada direta a funções em `pontuar()` (escalas.test.ts:57-79), `enviarCodigo` (hardening.test.ts:65-117) e `comContextoPsicologo/Paciente`, que são SQL direto sob RLS (rls.test.ts, escalas.test.ts:530-563, consultas.test.ts:409-445).
- **Mocks:** `console.log`, para capturar o OTP do mailer em modo dev (ajuda.ts:196-203); `mailer.sendMail` com SMTP_HOST falso (cadastro-concorrente.test.ts:9, cadastro-sem-revelar.test.ts:10-29); `bcrypt.compare` como espião (auth.test.ts:37); `crypto.randomInt`, para forçar colisão (vinculo.test.ts:135). Nenhum e-mail real sai.
- **Banco:** Postgres real, o mesmo de `dev:test` e `seed:dev`. Há dois pools: o `pool` da app conecta como `psychelink_app`, sem BYPASSRLS; o `dono` usa `DATABASE_URL_DIRETA` como `neondb_owner`, com BYPASSRLS (ajuda.ts:12-14; docs/rls.md:16). As fixtures são INSERTs diretos (`criarUsuario`, `criarCheckin`, `definirConsentimento`, `vincular`). O schema vem das migrations, aplicadas à mão com `npm run migrar:test`; a suíte não migra nada.
- **Limpeza:** não há TRUNCATE nem transação por teste. `limpar()` roda no `after` de cada arquivo (ajuda.ts:166-189): numa transação, desliga o trigger `trg_auditoria_imutavel`, apaga da `auditoria` por ator, paciente, IP e `ALVO_TESTE`, religa o trigger, faz `DELETE FROM users WHERE id = ANY` (o resto vai em cascata) e fecha os pools. Os arquivos de cadastro apagam também por e-mail (cadastro.test.ts:19, cadastro-sem-revelar.test.ts:63). rls.test.ts:74 faz `DELETE FROM escala WHERE id`.
- **Paralelismo:** os arquivos rodam em processos paralelos (comentário em ajuda.ts:16-18; é o padrão do node --test). Dentro de um arquivo a execução é sequencial e as fixtures do `before` são compartilhadas. O isolamento entre arquivos vem de dados aleatórios: e-mail `teste-<hex>@psychelink.test`, CRP aleatório, IP aleatório e `ALVO_TESTE` com o pid.
- **E-mail em teste:** sem `SMTP_HOST` e fora de produção, o código vai para o console e o teste lê de lá (`capturarCodigos`). Com `SMTP_HOST` definido, `sendMail` é mockado.

## 2. Segurança da execução
- **Guarda:** nenhuma no código de teste (verificado). Ninguém confere host ou nome do banco, `NODE_ENV` ou alguma marca de ambiente. A única barreira é `--env-file=.env.test`. Esse arquivo **não existe** hoje (`ls` deu "No such file"); só existe `.env.test.old`. Pelo comportamento do Node, `--env-file` com arquivo ausente aborta, então `npm test` deve falhar logo no início (provável, não executado). O seed tem guarda própria, que confere se o host é o mesmo do .env.test (scripts/seed-dev.ts:23-32). `migrar.ts` não tem guarda nenhuma.
- **Guardas indiretas:** com `NODE_ENV=production` ou `SMTP_HOST` real, o OTP não chega ao console e `entrar()` lança erro (ajuda.ts:264). rls.test.ts:79-83 falha se `DATABASE_URL` for um papel com BYPASSRLS. Nenhuma das duas evita as escritas feitas antes da falha.
- **Operações destrutivas:** `ALTER TABLE auditoria DISABLE/ENABLE TRIGGER`, que pede lock ACCESS EXCLUSIVE na tabela de auditoria; `DELETE FROM auditoria` com o trigger desligado; `DELETE FROM users` (cascata); `DELETE FROM escala`; `UPDATE`s em `users`, `sessao`, `desafio_2fa`, `verificacoes_email`, `codigo_vinculo` e `vinculo`. Todas são filtradas, sem DROP nem TRUNCATE. Há um risco residual: `ip = ANY(ipsUsados)` apagaria eventos reais de auditoria vindos de um IP 10.x que coincidisse, num banco compartilhado.
- **Para rodar com segurança:**
  1. Um banco descartável: branch Neon própria ou Postgres local, nunca o do `.env`.
  2. Criar `.env.test` com as chaves de `.env.test.old`: `DATABASE_URL`, `DATABASE_URL_DIRETA`, `JWT_SECRET`, `EMAIL_PEPPER`, `ENCRYPTION_KEY` (32 bytes em base64), `VALIDAR_MX`, `PORT`, `ALLOWED_ORIGINS`, `NODE_ENV` (diferente de production), `WEB_ORIGINS` (precisa conter exatamente `http://localhost:5173`, ajuda.ts:191), `SMTP_HOST` (vazio) e `EMAIL_FROM`. Os valores não foram lidos. Obs.: `VALIDAR_MX` não é lido em lugar nenhum do src, e `dominioTemMX` não é usado.
  3. Rodar `npm run migrar:test` como dono.
  4. `ALTER ROLE psychelink_app PASSWORD ...` e apontar `DATABASE_URL` para esse papel (docs/rls.md:83-86).
  5. O dono precisa de BYPASSRLS e ser dono das tabelas, para o DISABLE TRIGGER e as fixtures.

## 3. Matriz de cobertura (I = integração na rota real; U = unitário/SQL direto; — = nenhum)
| Fluxo | Situação |
|---|---|
| Cadastro de paciente | I: sem revelar conta, concorrência, refazer pendente (cadastro.test.ts:71-104; cadastro-sem-revelar:86-130; cadastro-concorrente:28). Validação de campos: — |
| Verificação de e-mail | I só no caminho feliz e no conflito de CRP (cadastro.test.ts:48-68). Código errado, expirado ou limite de tentativas: — |
| Reenvio de código | I: anti-enumeração e cooldown (cadastro-sem-revelar:133-182). Não testa que o código reenviado confirma a conta |
| Login do paciente | I: sucesso e e-mail inexistente com bcrypt (auth.test.ts:18-48). Senha errada do paciente, e-mail não verificado e token adulterado ou expirado: — |
| Refresh/logout mobile | — (`/auth/logout` invalida via `sessao_invalidada_em`, auth.ts:442; não testado) |
| Esqueci/redefinir senha | I: esqueci-senha anti-enumeração (cadastro-sem-revelar:184-201). Redefinir só com JWT forjado (sessao-web:261-292). `/verificar-codigo-senha`: — |
| Cadastro de psicólogo | I: CRP e pendente (cadastro.test.ts:53-68, 98-103). Formato de CRP inválido: — |
| Login do psicólogo em 2 etapas | I completo: tentativas, expiração, reuso, reenvio, teto de 30 min (auth-psicologo.test.ts) |
| Sessão web | I completo: cookies, rotação, concorrência, reuso, inatividade, 12 h, logout, encerrar outras sessões (sessao-web.test.ts:45-217, 341-400) |
| Código de vínculo | I: geração, HMAC, limite de 10, colisão, resgate, inválidos com resposta igual, 409, 429 (vinculo.test.ts:67-253) |
| Encerramento de vínculo | I pelos dois lados (vinculo:255-299); U de RLS (rls:139-150); efeito em escalas e consultas (escalas:502, consultas:387, defesa-sem-rls) |
| Consentimento | I: PUT audita o diff e parar diário (vinculo:301-381). O efeito no psicólogo só foi testado mudando o consentimento por fixture direta (escalas:436-450, 493-498; pacientes:164-197), nunca pelo PUT do paciente seguido de leitura do psicólogo |
| Check-in (criar, duplicado, limites) | **—** (POST /checkin, 409 `uk_paciente_data` e checkinSchema não testados) |
| Hábitos | **—**, e com bug: POST /checkin aceita `habitos` (schemas.ts:50) mas não há `INSERT INTO habito` em src/ nem trigger nas migrations |
| Diário | Leitura pelo psicólogo: I (pacientes:455-492). Escrita pelo paciente: — |
| Resumo/painel do paciente | — (`/checkin/resumo`, `/checkin/painel`) |
| Dashboard do psicólogo | I (pacientes:501-582; escalas:453; consultas:356) |
| Painel individual | I (pacientes:269-401) |
| Anotações clínicas | I: B recebe 404 (pacientes:126-140); fica cifrada (585-596); auditada (auditoria:92); fora do relatório (relatorios:181, 208). U: paciente não lê via RLS (rls:162). Não existe rota de anotação por id |
| Escalas | I: solicitar, 409, corrida, responder, pontuação, idempotência, cancelar, intruso (escalas.test.ts). Item 9 só tem o caso `false` (281-282): falta o `true` e o efeito no dashboard |
| Consultas | I completo: conflito, corrida, remarcar, cancelar, RLS (consultas.test.ts) |
| Relatórios e exportação | I (relatorios.test.ts); a exportação só audita, o PDF é feito no web e não tem teste |
| Auditoria | I para registro; U para imutabilidade (auditoria.test.ts:138-196; auditoria-psicologo) |
| RLS | U (rls.test.ts; defesa-sem-rls com o dono) |
| Rate limit | Só o limite por usuário no resgate (vinculo:245) e o 429 de negócio do reenvio de 2FA (auth-psicologo:236). Limites por IP: —, e os IPs aleatórios os contornam de propósito |
| CSRF/origem | I (sessao-web:219-247); CORS, Cache-Control e trust proxy (hardening.test.ts) |

## 4. Casos que a devolutiva cobra
- **Senha incorreta:** existe para o psicólogo (auth-psicologo:53; sessao-web:348). Falta para o paciente.
- **Usuário inexistente:** existe nos dois logins.
- **Sem autenticação:** existe em escalas:168, 337; vinculo:221; consultas:349; relatorios:275; auditoria-psicologo:207-208. Falta para `/checkin*` e `/auth/me`.
- **Fora da faixa:** existe em escalas (4, -1, 1.5), consultas (duração, 2001 caracteres), limite e cursor. Falta humor e ansiedade 0/11, sono 25 e notas acima de 2000 no check-in.
- **Salvamento duplicado:** existe em escalas (409 e resposta idempotente), consulta (conflito) e vínculo (409). **Falta o check-in no mesmo dia.**
- **Limiar de dados insuficientes:** `MIN_REGISTROS_SEMANA = 3` (pacientes.ts:19; dashboard.ts:10). Os testes cobrem 0, 1, 3 (implícito: p1 fora da lista, pacientes:549) e 4. **Falta 2**, e não há um caso explícito 2/3/4 no mesmo teste.
- **Antes e depois da revogação:** só por fixture direta no banco. Falta pelo PUT do paciente e falta o parar diário seguido de GET /psicologo/checkins/:id.
- **Identificador direto:** bem coberto (checkin alheio = inexistente, pacientes:142; aplicação, consulta, relatório e código por id).

## 5. Qualidade dos testes
- **Asserts fracos:** `assert.ok(...reenviarEm)` (auth-psicologo:239, 250); `>= 3`, `>= 2` e `> 0` (auditoria-psicologo:152, 155, 159); `corposVistos.length > 30` (escalas:567).
- **Dependência de ordem:**
  - escalas «linguagem» depende dos testes anteriores.
  - escalas:436-450 só restaura o consentimento se nenhum assert falhar antes (sem try/finally).
  - Fixtures compartilhadas e mutáveis em pacientes, escalas e relatórios.
- **Sleeps:** `esperaMs(50)` para provar que nada foi enviado (cadastro-sem-revelar:143, 199) pode passar por acaso. Há polling de 3 s e uma corrida de 1000 ms (sessao-web:305-309).
- **Passam por acaso:** as fixtures gravam `habito` direto e escondem o bug do POST.
- **Bomba-relógio:** as datas fixas em 2031 de consultas.test.ts:40 vão virar passado.
- **Fuso:** `criarCheckin` usa `CURRENT_DATE` do banco (UTC) e `defesa-sem-rls` usa uma data JS em UTC (suspeita de instabilidade entre 21h e 24h de São Paulo).
- **Helpers duplicados:** `ler`, `obter`, `Json`, `Web`, `dia()` (pacientes e relatorios idênticos), `novoPaciente` (4 variantes) e `auditoriaDe` (5 variantes).
- **Sem checagem de tipos nos testes:** o tsconfig tem `include: ["src"]`, então o typecheck não olha test/ e o tsx não confere tipos. Há comentários `eslint-disable` sem eslint instalado.
- `capturarCodigos` engole todo `console.log` do processo.

## 6. Lacunas priorizadas e CI
1. `checkin.test.ts`: criar, 409 no mesmo dia, limites do checkinSchema, 401, hábitos persistidos (corrigir o bug antes), diário compartilhado, resumo e painel.
2. Guarda de ambiente em ajuda.ts: recusar `NODE_ENV=production` e host igual ao do `.env`, reaproveitando a lógica de seed-dev.ts:23-32. Recriar `.env.test` apontando para uma branch descartável.
3. Revogação ponta a ponta: PUT ou parar diário pelo paciente, depois o psicólogo lê (antes e depois).
4. Limiar com 2, 3 e 4 registros num mesmo teste.
5. Auth mobile: senha errada, não verificado, token expirado ou forjado, `/auth/logout` invalidando o token, fluxo completo de `/verificar-codigo-senha` e `/redefinir-senha`, código de e-mail errado ou expirado.
6. Item 9 `true` e sua exibição.
7. Um teste de 429 por IP.
8. Datas relativas em consultas.

**CI:** não existe (`.github` só tem dependabot.yml). É preciso um workflow com Postgres de serviço ou branch Neon efêmera; `npm ci` nos três apps; gerar o `.env.test` a partir de secrets; `migrar:test`; `ALTER ROLE psychelink_app PASSWORD`; `npm test`; e `tsc --noEmit` nos três apps, incluindo test/. Web e mobile não têm teste nem ferramenta de teste: os scripts são só dev/build/preview e start/android/ios/web, sem vitest, jest, testing-library ou playwright.

## Achados

| Severidade | Confiança | Achado | Onde | Detalhe |
|---|---|---|---|---|
| alta | verificado | POST /checkin não tem nenhum teste (criar, duplicado no dia, limites, 401, resumo, painel) | apps/server/src/routes/checkin.ts:162-270; apps/server/test/ (nenhuma referência a '/checkin') | É o fluxo principal do paciente e é o que a devolutiva cobra: valores fora da faixa e salvamento duplicado. O 409 de uk_paciente_data e o checkinSchema (schemas.ts:42-54) não são testados. A revisão por pares já tinha apontado a falta de checkin.test.ts (docs/revisao-por-pares.md:134). |
| alta | verificado | Hábitos enviados pelo app nunca são gravados, e as fixtures escondem isso | apps/server/src/schemas.ts:50; apps/server/src/routes/checkin.ts:181; apps/server/test/ajuda.ts:149-154 | checkinSchema aceita habitos: string[], mas não existe INSERT INTO habito em src/ nem trigger nas migrations. Os testes de resumo, dashboard e relatório passam porque criarCheckin grava habito direto como dono. |
| alta | verificado | Nada no código impede a suíte de rodar contra o banco da equipe ou de produção | apps/server/package.json (script test); apps/server/test/ajuda.ts:14,166-189 | A única barreira é --env-file=.env.test. Não há checagem de host, nome do banco ou NODE_ENV (o seed tem, em scripts/seed-dev.ts:23-32). A limpeza desliga o trigger de imutabilidade da auditoria com lock ACCESS EXCLUSIVE e apaga linhas de auditoria por IP aleatório 10.x. |
| media | provavel | .env.test não existe: a suíte não roda hoje | apps/server/.env.test (ausente); .env.test.old presente | Os scripts test, migrar:test, dev:test e seed:dev dependem dele. Node com --env-file e arquivo ausente aborta (não executei). As chaves do .env.test.old servem de base; WEB_ORIGINS precisa conter http://localhost:5173 e SMTP_HOST precisa estar vazio. |
| media | verificado | Revogação de consentimento não é testada de ponta a ponta | apps/server/test/escalas.test.ts:436-450; pacientes.test.ts:164-197; vinculo.test.ts:315-372 | O efeito no psicólogo só é verificado mudando o consentimento por fixture direta (definirConsentimento). PUT /paciente/consentimento e /diario/parar só conferem o banco e a auditoria, sem ler como psicólogo antes e depois. É o CT-005-B da devolutiva. |
| media | verificado | Auth mobile com lacunas: senha errada, não verificado, token inválido, logout, redefinição completa | apps/server/test/auth.test.ts:17-49; apps/server/src/routes/auth.ts:302,339,442 | /auth/verificar-codigo-senha e /auth/logout não aparecem em nenhum teste. /redefinir-senha só é chamado com JWT forjado (sessao-web.test.ts:261-267). Código de verificação de e-mail errado ou expirado também não é testado. |
| media | verificado | Limiar de dados insuficientes sem o caso de 2 registros | apps/server/src/routes/psicologo/pacientes.ts:19; dashboard.ts:10; test/pacientes.test.ts:204-206,549 | MIN_REGISTROS_SEMANA = 3. Os testes cobrem 0, 1, 3 (implícito) e 4. A devolutiva pede 2, 3 e 4 no mesmo período. |
| media | verificado | Item 9 do PHQ-9 só tem o caso false | apps/server/test/escalas.test.ts:281-282; src/routes/psicologo/dashboard.ts:160 | Nenhum teste confere item9_diferente_de_zero=true nem o campo item9DiferenteDeZero no dashboard. É sinal de risco clínico. |
| media | verificado | Sem CI e sem testes em web e mobile | .github/dependabot.yml (único arquivo); apps/web/package.json; apps/mobile/package.json | Não há workflow. Web e mobile não têm script de teste nem dependência de teste (vitest, jest, testing-library, playwright). |
| baixa | verificado | Limites por IP do express-rate-limit nunca são testados | apps/server/test/ajuda.ts:205-210; src/lib/rota.ts:6-12 | Cada cliente de teste usa um IP aleatório para não esbarrar nos limites. Só o limite por usuário do resgate de vínculo tem 429 testado (vinculo.test.ts:245). |
| baixa | verificado | Datas fixas em 2031 nos testes de consultas | apps/server/test/consultas.test.ts:40 | Os testes de consultas futuras (próximas do paciente, cancelamento ao encerrar vínculo) vão quebrar quando 2031 chegar. |
| baixa | verificado | Asserts fracos, sleeps e dependência de ordem | auth-psicologo.test.ts:239,250; auditoria-psicologo.test.ts:152-159; escalas.test.ts:436-450,567; cadastro-sem-revelar.test.ts:143,199; sessao-web.test.ts:305-309 | Há esperaMs(50) para provar ausência de envio, contagens com >=, o teste de linguagem que depende dos anteriores e um consentimento que só é restaurado se nenhum assert falhar antes (sem try/finally). |
| baixa | verificado | Testes fora do typecheck e helpers duplicados | apps/server/tsconfig.json (include: src); pacientes.test.ts:40-46 e relatorios.test.ts:43-49 | tsc não olha test/ e o tsx não confere tipos. ler, obter, Json, dia, novoPaciente e auditoriaDe aparecem repetidos em vários arquivos. |
| baixa | suspeita | Possível instabilidade de fuso entre 21h e 24h de São Paulo | apps/server/test/ajuda.ts:134; defesa-sem-rls.test.ts:33-34 | criarCheckin usa CURRENT_DATE do banco (UTC) e diaIso usa a data UTC do JS. Perto da meia-noite UTC, os dias e as janelas de 7 dias podem divergir do que as rotas calculam em São Paulo. Não testei. |

## Perguntas para o grupo

- O banco de .env.test.old é uma branch Neon separada da do .env? Alguém pode confirmar o host sem expor a senha?
- Os hábitos do check-in deveriam ser gravados pelo POST /checkin? Hoje o array é aceito e descartado.
- O CI vai usar uma branch Neon efêmera ou Postgres em container? A segunda opção exige criar o papel psychelink_app com senha depois da migração.
- Na migração para Prisma, a suíte HTTP atual continua como rede de segurança? Ela testa contratos de rota e RLS, então pode ficar como está.
