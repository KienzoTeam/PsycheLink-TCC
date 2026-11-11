# Server: arquitetura

> Levantamento em modo leitura, 10 e 11/11/2026. Agente `server_arquitetura`, Opus 5.5 (effort high). Nada foi executado além de leitura de código, `npm view/audit/outdated` e documentação pública; "verificado" quer dizer lido no código, não testado. Linhas citadas são do commit `0864143`.

## Resumo

Mapeei apps/server/src fora da camada de banco. Li inteiros app.ts, index.ts, schemas.ts, todo lib/ e todo routes/. Nada foi executado; tudo vem da leitura do código. O lado do psicólogo (paciente/* e psicologo/*) segue um padrão uniforme: rota()+limite()+lerOuNegar(), vínculo checado em SQL, consentimento por categoria e auditoria. Já auth.ts, auth-psicologo.ts e checkin.ts são código manual mais antigo: limite() duplicado que devolve 429 em texto puro, req.body lido sem validação e try/catch à mão. Achados principais, todos confirmados no código: (1) POST /checkin não grava a tabela habito, então os hábitos enviados pelo app se perdem; (2) GET /checkin/resumo devolve os 30 check-ins mais ANTIGOS; (3) corpo ausente no /auth/* dá 500, e corpo acima de 10kb também dá 500 em vez de 413; (4) a contagem de tentativas do OTP de e-mail não é atômica; (5) /checkin fica sem Cache-Control no-store; (6) /registro-psicologo segura uma transação e um lock enquanto espera o SMTP; (7) o rate limit fica na memória, separado por rota e por IP, e zera a cada restart. Não há health check, encerramento gracioso nem log estruturado. EMAIL_PEPPER cai em JWT_SECRET ou em string vazia, e ENCRYPTION_KEY só é validada no primeiro uso.

## Relatório

## 1. Cadeia de middlewares (app.ts, verificado)
Ordem: `trust proxy = Number(TRUST_PROXY)||false` (app.ts:14) → `helmet()` padrão (:17) → `express.json({limit:'10kb'})` (:19; sem urlencoded) → `cors({origin: ALLOWED_ORIGINS ?? false})` sem `credentials` (:23) → `Cache-Control: no-store` só em `/auth`, `/psicologo`, `/paciente` (:25), **e não em `/checkin`** → `exigirOrigem` (allowlist de Origin para métodos que não são GET/HEAD) em `/auth/psicologo` e `/psicologo` (:31; sessaoWeb.ts:152) → routers. A autenticação fica dentro de cada router: `verificarToken` (Bearer) em `/paciente` (paciente/index.ts:11) e em cada rota de `/checkin`; `exigirSessaoWeb`+`exigirPsicologo` em `/psicologo` (psicologo/index.ts:40). O rate limit é por rota. Em `/checkin` ele vem antes do token; em `/paciente` e `/psicologo`, depois da autenticação. Ou seja, a autenticação, que consulta o banco, roda antes do limite.
Erros: o handler 1 só trata `SyntaxError` com `body`, devolvendo 400 (app.ts:48). O handler 2 responde 500 genérico e faz `console.error(err)` (app.ts:63). Por isso um 413 (corpo >10kb) ou 415 do body-parser vira 500. Já o `rota()` (lib/rota.ts:21) captura e responde 500 por conta própria.

## 2. Autenticação e sessão
**Paciente (mobile):** JWT HS256 `{id,email}` de 1 dia, emitido em `/auth/login` (auth.ts:410). Não tem refresh nem aud/typ, e o `verify` não fixa o algoritmo (auth.ts:40). O cliente guarda o token (lado mobile, fora deste escopo). Revogação: `users.sessao_invalidada_em` é comparado com o `iat`, com 10 s de folga (auth.ts:56-62). O logout derruba todos os dispositivos (auth.ts:444). `/auth/login` **não confere perfil**: um psicólogo recebe token mobile e o `obterOuCriarPacienteId` cria a linha de paciente para ele (lib/paciente.ts:9).
**Psicólogo (web):** login em 2 etapas. (1) Senha → desafio 2FA: id de 32 bytes, código de 6 dígitos com sha256(código:desafioId:pepper), 10 min, no máximo 5 tentativas, consumidas de forma atômica (auth-psicologo.ts:131). O reenvio tem intervalo de 60 s e zera as tentativas até 30 min após a criação (:182). (2) A sessão vai na tabela `sessao`: o refresh tem 32 bytes e só o hash sha256 é gravado. Duração absoluta de 12 h, 30 min de inatividade (sessaoWeb.ts:19). Cookies httpOnly+Secure+SameSite=Strict: `pl_at` (JWT 15 min, aud `web-psicologo`, typ `access`, sid) e `pl_rt` (path `/api/auth/psicologo/refresh`). O refresh é rotacionado a cada uso, com janela de 10 s para corrida e detecção de reuso que revoga a sessão e audita (auth-psicologo.ts:221-281). Cada requisição faz `UPDATE sessao` (sessaoWeb.ts:134). Logout revoga só o sid atual. Troca e redefinição de senha revogam as sessões web e os desafios na mesma transação (sessaoWeb.ts:104).
**OTP de e-mail (cadastro e recuperação):** `randomInt(100000,1e6)`, ~19,9 bits; sha256(código:email:PEPPER); 15 min; 5 tentativas. Leitura→comparação→incremento **não são atômicos** (auth.ts:112-133). Reenvio e esqueci-senha zeram as tentativas após 60 s (auth.ts:103-106,135). O token de redefinição é um JWT `{email,tipo}` de 10 min, reutilizável dentro da janela. PEPPER = `EMAIL_PEPPER || JWT_SECRET || ''` (codigo.ts:3). O código de vínculo é 6 dígitos guardado como HMAC com o mesmo PEPPER, 24 h, no máximo 10 ativos.

## 3. Inventário de rotas
| Método caminho | Perfil | Validação | Limite/15min | Vínculo/consent. | Auditoria |
|---|---|---|---|---|---|
| POST /auth/registro | público | zod+normalizarEmail | 10 IP* | — | não |
| POST /auth/verificar-email, /verificar-codigo-senha | público | **req.body direto** | 10 IP* | — | não |
| POST /auth/reenviar-codigo, /esqueci-senha | público | **direto** | 5 IP* | — | não |
| POST /auth/redefinir-senha | token JWT | senhaSchema+typeof | 5 IP* | — | **não** |
| POST /auth/login | público | **direto** | 10 IP* | — | **não** |
| GET /auth/me, POST /auth/logout | Bearer | — | **nenhum** | — | não |
| POST /auth/psicologo/login | público | direto (`?.`) | 10 IP* | perfil no SQL | login_ok/falha |
| POST /auth/psicologo/2fa, /2fa/reenviar | desafio | zod | 20 / 5 IP* | — | 2fa_ok/falha; reenvio não |
| POST /auth/psicologo/refresh, /logout | cookie | z.uuid / — | 30 / 20 IP* | — | reuso / logout |
| POST /auth/registro-psicologo | público | zod | 10 IP* | — (sem Origin) | não |
| POST /checkin (+/checkins) | Bearer | zod (arrays sem tamanho máximo) | 20 IP* | RLS paciente | não |
| GET /checkin/resumo, /painel (+aliases) | Bearer | — | 60 IP* | RLS | não |
| GET/POST /paciente/vinculo, POST /encerrar | Bearer | zod no POST | 60 / 5 por usuário / 10 | próprio | criado/encerrado |
| GET/PUT /paciente/consentimento, POST /diario/parar | Bearer | lerOuNegar | 60/30/30 | próprio | alterado/revogado |
| GET /paciente/escalas/pendentes, /aplicacoes/:id (GET faz escrita), POST /:id/respostas | Bearer | idDe+zod | 60/60/30 | paciente_id | respondida |
| GET /paciente/consultas | Bearer | — | 60 | próprio | não |
| GET/PATCH /psicologo/me, POST /me/senha, GET /me/sessoes, POST /me/sessoes/encerrar-outras | web | zod | 60/30/5/60/10 | — | senha, sessões; PATCH não |
| GET /psicologo/pacientes, /:id/resumo, /:id/linha-do-tempo | web | lerOuNegar | 60 | vinculoOuNegar+consent | painel_visualizado (só resumo) |
| POST /:id/encerrar-vinculo; GET/POST /:id/anotacoes | web | idDe / anotacaoSchema | 10 / 60 | WHERE psicologo / vinculoOuNegar | sim |
| /psicologo/vinculo/codigos (POST/GET/DELETE), /historico | web | idDe | 30/60/30/60 | psicologo_id | gerar/revogar |
| GET /psicologo/checkins, /checkins/:id | web | lerOuNegar/idDe | 60 | JOIN vínculo+humor | só detalhe |
| GET /psicologo/dashboard | web | zod | 60 | JOIN vínculo+consent | não |
| /psicologo/escalas, /pacientes/:id/escalas (GET/POST), /aplicacoes(/:id, /cancelar) | web | zod | 30-60 | vínculo+escalas | solicitar/cancelar/ver |
| /psicologo/consultas GET/POST/PATCH/:id/remarcar | web | zod | 60 | vinculoAtivoDe/FOR SHARE | sim |
| /psicologo/relatorios/geral, /pacientes/:id, POST /exportacoes | web | zod | 60/60/30 | vínculo+consent | visualizado/exportado (geral não) |
| /psicologo/auditoria, /acoes | web | zod | 60 | SQL por ator/vínculo | — |
`*` = `limite` local sem `message`: o 429 sai em texto puro ("Too many requests…"), não em `{error}`.
Lacunas: rotas de /auth sem zod; /auth/me e /auth/logout sem limite; nenhuma rota do paciente audita check-in ou login; `diario` em /psicologo/checkins/:id (checkins.ts:212) e em /pacientes/:id/resumo (pacientes.ts:200) depende só do `diario_compartilhado` do check-in. O resumo devolve o diário mesmo sem consentimento de humor/hábitos, e aí as datas aparecem, o que contradiz resumo.ts:60. Os comentários se contradizem: schemas.ts:52 vs consentimento.ts:20 vs pacientes.ts:196.

## 4. Padrões concorrentes, duplicações, código morto
- Padrão novo: rota()/limite()/lerOuNegar()/vinculoOuNegar()/comContexto*. Padrão antigo: auth.ts, checkin.ts, auth-psicologo.ts, com `limite` redefinido 3 vezes (auth.ts:17, auth-psicologo.ts:35, checkin.ts:12), safeParse manual, mensagens de erro em formatos diferentes. auth-psicologo usa async sem try (depende do Express 5), e /registro-psicologo tem BEGIN/COMMIT manual em vez de emTransacao.
- Duplicados: `media` (checkin.ts:60 vs estatistica.ts:1); `QUALIDADE_SONO_REVERSO` (checkin.ts:20 vs checkins.ts:3); a decifragem+split+contagem de emoções (checkin.ts:239-260, 348-363 vs resumo.ts:80, checkins.ts:28); o SQL de gravarCodigo (auth.ts:98 vs auth-psicologo.ts:387). Nomes iguais com sentidos diferentes: `vinculoAtivoDe` (fragmento SQL em lib/vinculo.ts:23 vs função async em paciente/vinculo.ts:18).
- Código morto: `dominioTemMX` (validarEmail.ts:26) nunca é chamado, e `VALIDAR_MX` aparece no .env.example mas nada o lê. Os aliases `/checkin/checkins*` não são usados pelo mobile. `checkinSchema.intensidade` e `.habitos` são validados e descartados. `TokenPayload.email` sem uso.
- Rota importando de rota: `verificarToken` está em routes/auth.ts; `perfilDe` vem de psicologo/conta.ts para relatorios.

## 5. Trabalho pesado e estado em processo
- bcrypt custo 10, assíncrono no threadpool: registro (hash + compare dentro do lock), logins e troca de senha. `HASH_REFERENCIA` usa hashSync no import.
- SMTP dentro do request: /auth/registro (depois do COMMIT), /auth/psicologo/login e /2fa/reenviar (espera até 10+10+15 s). Em **/registro-psicologo o envio acontece com a transação aberta**, segurando advisory lock + FOR UPDATE (auth-psicologo.ts:374). O Pool usa o padrão (max 10, sem connectionTimeout), então 10 envios lentos esgotam o pool. reenviar e esqueci-senha usam fire-and-forget (auth.ts:94): o e-mail se perde num restart.
- Laços: /psicologo/checkins com filtro de emoção faz até 10 consultas em série e 1000 decifragens (checkins.ts:74). O dashboard faz 8 consultas em série num único client: não dá para paralelizar dentro da transação, mas dá para reduzir. Cada requisição /psicologo custa ≥2 idas ao banco antes da regra (UPDATE sessao + SELECT psicologo), mais BEGIN, set_config e COMMIT. `obterChave()` decodifica base64 a cada cifra.
- Estado em memória: só o MemoryStore do express-rate-limit, um por chamada a `limite()`. Com 2 ou mais instâncias o limite se multiplica, e um restart zera tudo. Atrás de proxy sem TRUST_PROXY, todos dividem um IP: o proxy do Vite não manda X-Forwarded-For. Os locks são do Postgres (advisory/FOR UPDATE), corretos com várias instâncias.

## 6. Configuração e segredos
Variáveis lidas: DATABASE_URL, JWT_SECRET, ENCRYPTION_KEY (presença checada no boot, index.ts:4), PORT, TRUST_PROXY, ALLOWED_ORIGINS, WEB_ORIGINS, EMAIL_PEPPER, SMTP_HOST/PORT/USER/PASS, EMAIL_FROM, NODE_ENV. O tamanho da ENCRYPTION_KEY só é validado no primeiro uso, então o servidor sobe e falha com 500. O tamanho do JWT_SECRET não é validado, e um único segredo serve 3 tipos de token. O PEPPER cai em JWT_SECRET ou `''`. Sem SMTP_HOST em produção, nenhum e-mail sai e nada é avisado. Sem NODE_ENV=production e sem SMTP, o e-mail e o OTP vão para o console (mailer.ts:31). WEB_ORIGINS ausente nega as escritas (falha fechada, bom). `console.error(err)` imprime o erro inteiro do pg (`detail` pode trazer valores, como o e-mail). As respostas ao cliente são genéricas.

## 7. Operação
Não há handler de SIGTERM, `server.close` nem `pool.end`. Também não há health check nem ajuste de timeouts HTTP (valem os padrões do Node). O log é só `console.*`, sem log de acesso nem request-id. `pool.on('error')` evita a queda do processo (db.ts:17).

## 8. Arquivos e funções longos
pacientes.ts 490 linhas (linha-do-tempo ~115 linhas, com UNION de 6 SELECTs; resumo ~90), auth.ts 451, auth-psicologo.ts 411 (registro-psicologo ~117), checkin.ts 403 (painel ~135, mais `gerarPercepcao`, que é regra de negócio no arquivo da rota), dashboard.ts (handler ~140, com 8 SQLs). Todas as rotas misturam HTTP, regra e SQL inline. Só resumo.ts, escalas.ts e estatistica.ts separam a regra.

## Achados

| Severidade | Confiança | Achado | Onde | Detalhe |
|---|---|---|---|---|
| alta | verificado | Hábitos do check-in são descartados (tabela habito nunca é gravada) | apps/server/src/routes/checkin.ts:162-209; schemas.ts:50 | checkinSchema valida `habitos` e `intensidade`, mas o INSERT só grava checkin_diario. Não existe `INSERT INTO habito` em src: só seed-dev.ts:322 e test/ajuda.ts:150 gravam essa tabela. Com isso os hábitos e o consentimento de hábitos no painel do psicólogo (resumo.ts:97, checkins.ts:207) ficam sempre nulos em uso real. |
| media | verificado | GET /checkin/resumo devolve os 30 check-ins mais antigos | apps/server/src/routes/checkin.ts:223-228 | `ORDER BY data ASC LIMIT 30`: depois de 30 registros, o gráfico do app fica preso no primeiro mês. Deveria ordenar DESC e inverter, ou filtrar por período. |
| media | verificado | Rotas /auth/* leem req.body.x sem guarda: requisição sem corpo JSON dá 500 | apps/server/src/routes/auth.ts:222,260,281,303,340,385 | body-parser 2.4 deixa req.body undefined quando não há corpo (node_modules/body-parser/lib/read.js:53). O TypeError acontece fora do try e, no Express 5, cai no handler global: 500 com stack no log. auth-psicologo usa `req.body?.`. Faltam schemas zod nessas rotas. |
| media | verificado | Contador de tentativas do OTP de e-mail não é atômico | apps/server/src/routes/auth.ts:112-133 | Faz SELECT tentativas, compara e depois UPDATE +1. Requisições paralelas passam do limite de 5. O reenvio zera as tentativas a cada 60 s. Somando o rate limit por IP, que reseta e é contornável trocando de IP, isso abre caminho para força bruta lenta do código de 6 dígitos na recuperação de senha. O 2FA web já faz isso certo (UPDATE…RETURNING, auth-psicologo.ts:131). |
| media | verificado | SMTP enviado com transação aberta e locks em /registro-psicologo | apps/server/src/routes/auth-psicologo.ts:305-398; db.ts:7 | Um client do pool fica preso com advisory lock e FOR UPDATE durante o envio, que pode levar até ~35 s pelos timeouts do mailer. Pool padrão max=10 sem connectionTimeoutMillis: cadastros simultâneos com SMTP lento travam a API inteira. |
| media | verificado | Rate limit em memória, separado por rota, por IP, com 429 em texto puro nas rotas de auth | apps/server/src/lib/rota.ts:6; auth.ts:17; auth-psicologo.ts:35; checkin.ts:12; app.ts:14 | Cada limite() cria um MemoryStore: zera no restart e se multiplica com N instâncias. Os limites são independentes por rota. As três cópias locais não definem `message`, então o 429 vem em texto ('Too many requests…') e o app espera data.error. Atrás de proxy sem TRUST_PROXY todos dividem o mesmo bucket (o proxy do Vite não envia XFF), e 60/15min por rota pode ser pouco para um painel com React Query. |
| media | verificado | /checkin sem Cache-Control: no-store | apps/server/src/app.ts:25 | O no-store cobre /auth, /psicologo e /paciente, mas /checkin/painel e /checkin/resumo devolvem dados de saúde mental sem ele. O teste hardening.test.ts:11 também não cobre /checkin. |
| media | verificado | Exibição do diário ignora compartilha_diario e consentimento de humor/hábitos; comentários contraditórios | apps/server/src/routes/psicologo/checkins.ts:212; pacientes.ts:196-204; schemas.ts:52; paciente/consentimento.ts:20; lib/resumo.ts:60 | O diário sai só com diario_compartilhado do check-in. No /resumo ele sai com as datas mesmo quando humor e hábitos estão desligados, o que contradiz a regra de resumo.ts:60 de que nem data nem volume saem. schemas.ts diz que é preciso também o consentimento de diário; consentimento.ts diz que esse consentimento é só o valor inicial do interruptor. Falta definir a regra. |
| media | verificado | Segredos fracos ou validação tardia | apps/server/src/lib/codigo.ts:3; index.ts:4; lib/criptografia.ts:11; lib/mailer.ts:31 | PEPPER = EMAIL_PEPPER \|\| JWT_SECRET \|\| ''. Tamanho do JWT_SECRET não validado, e um segredo para 3 tipos de token. ENCRYPTION_KEY com tamanho errado sobe e falha no primeiro check-in. Sem SMTP_HOST em produção, nenhum e-mail sai e nada é avisado. Sem NODE_ENV=production, o OTP e o e-mail vão para o console. |
| baixa | verificado | Corpo >10kb ou Content-Type inválido vira 500 | apps/server/src/app.ts:48-64 | O primeiro handler só trata SyntaxError. Os HttpError 413/415 do body-parser caem no handler genérico e viram 500 em vez de usar err.status. |
| baixa | verificado | /auth/login do app aceita conta de psicólogo e cria perfil de paciente | apps/server/src/routes/auth.ts:384-422; lib/paciente.ts:9 | /auth/registro bloqueia o psicólogo (auth.ts:176), mas o login não confere perfil. Com o token mobile, POST /checkin, PUT consentimento ou POST vinculo criam linha em paciente para o psicólogo, gerando perfil misto. |
| baixa | verificado | Auditoria fora da transação da ação | apps/server/src/lib/auditoria.ts:38; ex.: psicologo/pacientes.ts:410, consultas.ts:134 | registrarAuditoria usa o pool depois do COMMIT. Se o INSERT falhar, a ação fica feita sem registro e o cliente recebe 500. Faltam também auditoria em /auth/login (mobile), em check-in e na redefinição de senha. |
| baixa | verificado | Sem encerramento gracioso, health check, timeouts ou log estruturado | apps/server/src/index.ts:12 | Só app.listen. Sem SIGTERM, server.close, pool.end, /health, request-id ou log de acesso. O console.error(err) imprime o erro inteiro do pg, e o `detail` pode trazer valores como o e-mail. |
| baixa | provavel | Data do check-in em CURRENT_DATE do banco (GMT) e painel na data local do servidor | migrations/0001_baseline.sql:114; routes/checkin.ts:50,278; lib/checkins.ts:5 | Se o TimeZone do Neon for GMT, como afirma o comentário de lib/checkins.ts, check-ins depois das 21h em São Paulo contam no dia seguinte, e o UNIQUE (paciente_id,data) barra o do dia seguinte. O corte semanal do painel usa o fuso do processo Node. |
| info | verificado | Código duplicado e morto | checkin.ts:20,60,239; auth-psicologo.ts:387; validarEmail.ts:26; checkin.ts:162,212,270 | media/QUALIDADE_SONO_REVERSO/contagem de emoções duplicadas em lib; SQL do gravarCodigo copiado; dominioTemMX e VALIDAR_MX sem uso; aliases /checkin/checkins* sem chamador no mobile; nome vinculoAtivoDe com dois sentidos. |

## Perguntas para o grupo

- Qual é a regra do diário: o psicólogo vê o texto só com a marcação do check-in, ou também precisa de compartilha_diario? E o diário pode aparecer quando humor e hábitos estão desligados (hoje as datas aparecem)?
- Os hábitos (exercício/meditação/medicação) entram no TCC? Hoje o app envia e o servidor descarta.
- Onde o servidor vai rodar (Render/Railway/VPS, com ou sem proxy, quantas instâncias)? Isso define TRUST_PROXY e se o rate limit precisa de store externo.
- Uma conta de psicólogo pode usar o app mobile como paciente, ou /auth/login deve recusá-la?
- Na migração para Prisma: como fica o set_config por transação (RLS), os advisory locks, o FOR SHARE, as CTEs com escrita e o erro 23P01? Isso vai exigir $queryRaw e transações interativas na maior parte das rotas.
