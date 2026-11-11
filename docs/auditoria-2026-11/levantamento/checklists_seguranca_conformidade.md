# Checklists: segurança e conformidade

> Levantamento em modo leitura, 10 e 11/11/2026. Agente `checklists_seguranca_conformidade`, Opus 5.5 (effort high). Nada foi executado além de leitura de código, `npm view/audit/outdated` e documentação pública; "verificado" quer dizer lido no código, não testado. Linhas citadas são do commit `0864143`.

## Resumo

Fiz checklists de segurança (API, web, mobile) e de conformidade (LGPD + CFP) para a stack do projeto. Conferi na web, em 2026-11-10, a versão vigente de cada referência. Uma leitura rápida do código já achou pontos concretos para os revisores. O JWT do mobile é verificado sem fixar algoritmo nem audiência (auth.ts:40, :348). O AES-GCM não usa AAD nem versão de chave (criptografia.ts). O limite de senha é de 72 caracteres e não de 72 bytes (schemas.ts:25). O pepper cai para JWT_SECRET ou para string vazia (codigo.ts:3). O app.json não define allowBackup nem bloqueio de captura de tela. Os pontos bons já presentes: RLS com FORCE e papel NOBYPASSRLS, set_config local à transação, auditoria com trigger imutável, e cookies HttpOnly, Secure e SameSite=Strict com checagem de Origin.

## Recomendação

Entregar o relatorio_md aos agentes revisores como checklist. Pedir que comecem pelos itens marcados [TOP5] de cada bloco e que marquem cada item como confirmado no código, ausente ou não aplicável, citando caminho:linha. Pedir também que validem com teste os achados de leitura rápida listados no relatório: o JWT do mobile, o AAD do AES-GCM, o limite de 72 bytes, o fallback do pepper, o allowBackup e o FLAG_SECURE. Nas afirmações de conformidade do TCC, ficar só no texto honesto descrito no bloco D.

## Relatório

# Checklists de revisão: segurança e conformidade (stack PsycheLink, 2026-11-10)

Legenda: [TOP5] = um dos 5 itens de maior risco do bloco. "Achado" = observado nesta leitura (V = verificado no código, S = suspeita a confirmar).

Referências vigentes conferidas (detalhes em fontes):
- OWASP Top 10:2025: A01 Broken Access Control, A02 Misconfiguration, A03 Supply Chain, A04 Crypto, A05 Injection, A06 Insecure Design, A07 Authentication, A08 Integrity, A09 Logging & Alerting, A10 Exceptional Conditions.
- OWASP API Top 10 2023 continua sendo a edição atual.
- ASVS 5.0.0 (mai/2025); MASVS 2.1.0 e MASTG 2.0.0 (jun/2026).
- RFC 8725 (BCP 225, sem revisão); NIST SP 800-63B-4 (jul/2025).

## Achados da leitura rápida (passar aos revisores)
- V `apps/server/src/routes/auth.ts:40` e `:348`: o `jwt.verify` do mobile e o do token de redefinição não fixam `algorithms`, `audience` nem `issuer`. Os dois usam o mesmo `JWT_SECRET` do cookie web. Hoje a separação depende só do formato do payload (`id`, `tipo`, `typ`), o que é frágil (RFC 8725 §3.1, §3.11 e §3.12).
- V `auth.ts:326`: o token de redefinição vale 10 min e não é de uso único. Pode ser reutilizado dentro da janela.
- V `apps/server/src/lib/criptografia.ts`: o GCM não usa AAD (o texto cifrado pode ser trocado entre linhas ou colunas) e o formato não tem versão de chave (não dá para rotacionar).
- V `apps/server/src/schemas.ts:25`: `max(72)` conta caracteres, não bytes. Senha com acento ou emoji passa de 72 bytes e o bcrypt trunca em silêncio.
- V `apps/server/src/lib/codigo.ts:3`: `PEPPER = EMAIL_PEPPER || JWT_SECRET || ''`. O segredo é reutilizado e pode ficar vazio sem falhar.
- V `apps/server/src/index.ts:4`: o boot não exige `EMAIL_PEPPER`, `WEB_ORIGINS` nem `TRUST_PROXY`.
- V `apps/server/src/app.ts:62`: `console.error(err)` imprime o erro inteiro. Um erro do pg pode trazer parâmetros (`detail`).
- V `apps/mobile/app.json`: não define `android.allowBackup` (o padrão é true) nem `blockedPermissions`, não tem `scheme` (sem deep link próprio) e não usa expo-screen-capture.
- V `apps/mobile/src/lib/contatosConfianca.ts:37`: no target web, os contatos vão para o localStorage.
- V pontos positivos: RLS com FORCE e papel `NOBYPASSRLS` (`migrations/0003`); `set_config(...,true)` por transação (`lib/contextoseguro.ts`); trigger de auditoria imutável (`migrations/0002:56-73`); cookies `HttpOnly`, `Secure` e `SameSite=Strict`, com allowlist de Origin (`lib/sessaoWeb.ts`); `HASH_REFERENCIA` contra timing; `express.json({limit:'10kb'})`; token mobile com `WHEN_UNLOCKED_THIS_DEVICE_ONLY`.

## A. API/servidor (Express 5 + pg + Neon/RLS)
**Acesso (API1/API5, A01)**
- [TOP5] Toda rota `/psicologo/*` com `:pacienteId` checa vínculo ativo no SQL (ou pela RLS) e não só no front. Procurar: `pool.query` direto fora de `comContextoPsicologo` (rotas `psicologo/*.ts` usam `pool.query`).
- [TOP5] A RLS cobre todas as tabelas com dado clínico. Procurar: tabela sem `ENABLE` e `FORCE ROW LEVEL SECURITY`; policy que aceita `current_setting(...)` vazio ou NULL; `current_setting('app.x', true)` sem tratar NULL.
- O app conecta como `psychelink_app`, não como dono ou `neondb_owner` (BYPASSRLS). Procurar: o papel embutido em `DATABASE_URL`, verificável só pelo nome da chave e pela doc. As migrations rodam por `DATABASE_URL_DIRETA`.
- O contexto vale só por transação: nada de `SET` de sessão (o pooler do Neon é PgBouncer em modo transaction).
- BFLA: rota de paciente não aceita token web e vice-versa. Procurar: `verificarToken` versus `exigirSessaoWeb` montados no prefixo certo.
- Mass assignment: os handlers usam `schema.parse(req.body)` e montam colunas explícitas. Procurar: spread de `req.body` em INSERT/UPDATE, ou zod sem `.strict()` quando importa.

**Autenticação, sessão e JWT**
- [TOP5] JWT: `algorithms:['HS256']`, `audience`/`issuer` distintos por uso (mobile, web, reset) e, de preferência, segredos separados; `exp` curto; claim `typ` checado (RFC 8725).
- Sessão web: refresh rotativo com detecção de reuso, 12 h absolutas e 30 min de inatividade (o código tem os dois prazos). Revogar tudo ao trocar senha (já existe `derrubarAcessosWeb`).
- Token mobile de 1 dia sem revogação por sessão (só `sessao_invalidada_em`). Avaliar logout de dispositivo.
- CSRF: `exigirOrigem` cobre POST, PUT, PATCH e DELETE. Nenhuma rota GET pode ter efeito colateral. Origin ausente gera 403 (ok).
- OTP/2FA e recuperação: CSPRNG (`randomInt`) ok. Conferir limite de tentativas por código (e não só por IP), expiração, uso único, invalidação ao pedir novo e comparação em tempo constante (`codigoConfere` ok).
- Enumeração: as respostas de cadastro, recuperação e login são idênticas para e-mail existente ou não, incluindo `EMAIL_NAO_VERIFICADO` (auth.ts:401 revela que a conta existe, mas só depois da senha correta) e o tempo do envio de e-mail (fazer o envio fora do caminho da resposta).
- Senha (NIST 800-63B-4): mínimo de 15 caracteres para senha como fator único (8 se houver MFA), sem regra de composição, checagem contra lista de senhas vazadas e limite em bytes ≤72 (`Buffer.byteLength`). bcrypt com custo 10 está no limite: o cheat sheet pede 10 ou mais, e o ideal é medir.

**Entrada, injeção e DoS**
- SQL só parametrizado (`$1`). Procurar: template string com variável dentro de `query(` (o `${SESSAO_VIVA}` é constante, ok). Ordenação e paginação usam whitelist.
- [TOP5] Rate limit por rota sensível (login, OTP, reset, vínculo) e por conta. Atrás de proxy, `trust proxy` igual ao número de saltos; se for `false` em produção, o limite pega o IP do proxy.
- Custo: bcrypt em login sem conta gasta CPU (aceitável com rate limit); listas com `LIMIT` máximo; `statement_timeout` no papel.

**Cabeçalhos, CORS, erros e logs**
- helmet ativo; CORS com `origin:false` por padrão (ok); `Cache-Control: no-store` (ok).
- O handler de erro não devolve stack. Logs sem e-mail, código OTP, token, `detail` do pg ou texto clínico. Procurar: `console.error(..., err)` em todas as rotas.
- Erro assíncrono no Express 5 chega ao handler (promise rejeitada); conferir que nenhum `catch` engole erro e responde 200 (A10).

**Criptografia, segredos e auditoria**
- [TOP5] AES-256-GCM com IV aleatório de 12 bytes (ok), AAD ligada a tabela, coluna e id, prefixo de versão de chave e plano de rotação ou re-cifragem. Cobertura: todos os campos de texto livre (diário, contexto, anotação clínica, respostas?) passam por `criptografar`.
- Segredos: `.env` fora do git (`git log --all -- '*.env'`); segredos distintos (JWT, pepper, chave de cifra); falha no boot se faltar algum.
- Auditoria: `REVOKE UPDATE, DELETE` mais trigger (ok). Registrar leitura de dado clínico pelo psicólogo, exportação e mudança de consentimento. `metadados` sem conteúdo. O dono do banco ainda pode apagar: declarar o limite.
- Supply chain (A03): `package-lock` versionado, `npm audit`/`npm ci`, nenhum `postinstall` estranho, versões fixadas.
- Produção: TLS `sslmode=verify-full` (`db.ts`), HTTPS na borda, HSTS, `NODE_ENV=production`.

## B. Web (React SPA + Vite)
- [TOP5] Nenhum token no `localStorage`/`sessionStorage` (hoje só tema e pins, ok). A sessão fica só em cookie HttpOnly.
- [TOP5] XSS: sem `dangerouslySetInnerHTML` (não encontrado), sem `href` vindo do usuário sem checar o esquema (`javascript:`), e sem HTML em tooltip do recharts.
- [TOP5] CSP no servidor estático ou no proxy de produção: `default-src 'self'`, sem `unsafe-inline`. Atenção: `public/tema-inicial.js` precisa ser arquivo externo ou ter hash.
- Cookies: `Secure`, `HttpOnly`, `SameSite=Strict` e `path=/api` (ok). Confirmar que a produção serve web e API na mesma origem, porque o proxy do Vite só vale em dev.
- CSRF: o axios com `withCredentials` depende do Origin check. Nada de GET que muda estado.
- [TOP5] Redirecionamento aberto: `?next=`/`returnTo` pós-login aceita só caminho relativo começando com `/` e não com `//`.
- Cache, histórico e impressão: dado clínico fora da URL (ids opacos, nunca nome ou e-mail em querystring); `no-store` nas respostas; queryClient limpo no logout (`queryClient.clear()`); CSS `@media print` em relatórios com aviso de sigilo.
- [TOP5] Confiança no cliente: esconder um botão no front não autoriza nada. Toda checagem é repetida na API (ver bloco A).
- Dependências: `npm audit`, poucas libs, sem script de CDN de terceiros.

## C. Mobile (Expo SDK 58 / RN 0.88)
- [TOP5] Token e dados sensíveis só no SecureStore com `WHEN_UNLOCKED_THIS_DEVICE_ONLY` (token ok). AsyncStorage sem dado de saúde nem cache de check-in. O target web (react-native-web) cai no localStorage: desativar ou documentar.
- [TOP5] `android.allowBackup:false` no app.json, para evitar backup no Google Drive de AsyncStorage e caches (MASVS-STORAGE).
- [TOP5] Captura de tela e app em segundo plano: `expo-screen-capture` (`preventScreenCaptureAsync`, que usa FLAG_SECURE e deixa a prévia de recentes em branco) nas telas de check-in, escalas e diário.
- [TOP5] Segredos no bundle: todo `EXPO_PUBLIC_*` é público. Procurar: chave, pepper ou URL de admin no código mobile. Só `EXPO_PUBLIC_API_URL` é aceitável.
- [TOP5] Rede: release só com HTTPS. URL `http://` permitida só em `__DEV__`. Sem `usesCleartextTraffic` em release (o Expo não tem chave para isso no app config; conferir o manifest gerado).
- Logs: sem `console.log` de token, resposta ou e-mail; remover os logs em release (babel `transform-remove-console`).
- Deep links: não há `scheme` hoje. Se um for adicionado, nenhum link pode carregar token, código ou ação sem confirmação.
- Permissões: contatos pedidos só ao abrir o SOS, com justificativa (`NSContactsUsageDescription`), e `blockedPermissions` para o que não for usado. Contatos ficam só no aparelho, sem envio à API.
- Bloqueio do app (biometria/PIN, expo-local-authentication) é opcional. Se não houver, declarar como limitação.
- Offline: fila local de check-ins cifrada ou inexistente; o SOS (CVV 188, `tel:`) funciona sem rede.

## D. Conformidade LGPD + CFP
- [TOP5] Base legal (art. 11): para o paciente, consentimento específico e destacado por finalidade (I), ou tutela da saúde por profissional (II, f). Procurar: tabela `consentimento` com finalidade, versão do termo, data/hora e origem.
- [TOP5] Revogação (art. 8 §5, art. 18 IX): o paciente revoga no app e o efeito é imediato na API (a policy ou consulta checa o consentimento vigente, não só a UI). A revogação fica auditada e a versão anterior é preservada.
- Direitos (art. 18): acesso e exportação (portabilidade) dos próprios dados, correção, eliminação e informação sobre compartilhamento com o psicólogo, de graça. Procurar: endpoints `/paciente/me/dados`, exclusão de conta.
- [TOP5] Retenção (art. 15-16) e guarda do CFP: o registro documental do psicólogo tem guarda mínima de 5 anos (Res. CFP 01/2009). Isso conflita com o pedido de eliminação do paciente. Separar o diário do paciente (eliminável) do registro clínico do psicólogo (guarda legal, art. 16 I) e documentar.
- Minimização (art. 6 III): sem CPF ou endereço se não forem necessários; texto livre cifrado; métricas agregadas no dashboard.
- [TOP5] Menores (art. 14): o cadastro tem `data_nascimento`. Bloquear menores de 18 ou exigir consentimento do responsável (o §1º fala de criança; para adolescente vale o melhor interesse). A Res. CFP 09/2024, art. 4º VIII c, pede verificar a faixa etária. A Lei 15.211/2025 (ECA Digital) pode se aplicar (não verificado).
- [TOP5] Incidente (art. 48; Res. CD/ANPD 15/2024): comunicar à ANPD e aos titulares em 3 dias úteis (prazo dobrado para agente de pequeno porte, conferir), registro do incidente guardado 5 anos, e um runbook mínimo no repositório.
- Encarregado (art. 41): identidade e contato publicados na política de privacidade (há dispensa possível para pequeno porte, Res. CD/ANPD 2/2022, que não se aplica a alto risco).
- Segurança (arts. 46-49): as evidências são o bloco A (RLS, cifra, auditoria).
- CFP 09/2024: art. 7º, parágrafo único (informar ao paciente os recursos que garantem o sigilo); art. 4º VI e art. 5º (urgência e emergência, o SOS e o item 9 do PHQ-9 devem gerar encaminhamento e não só um alerta); art. 8º (guarda e registro). Escalas: PHQ-9, GAD-7 e DASS-21 não são testes privativos do SATEPSI (o art. 2º, parágrafo único, se aplica a testes; não verificado no caso dessas escalas).
- Afirmações honestas para o TCC: "protótipo acadêmico; aplica controles técnicos alinhados à LGPD arts. 46-49 e à ASVS 5.0 nível 1/2 (lista auditável); não processa dados reais; não houve RIPD formal, DPO nomeado, pentest independente nem parecer jurídico ou do CRP". Evitar: "conforme a LGPD", "certificado", "seguro", "aprovado pelo CFP".

## Incertezas
- A ANPD não publicou guia específico de dados de saúde (é tema da agenda 2025-2026). O guia de alto risco foi arquivado (Voto 11/2025).
- A guarda do prontuário psicológico tem fontes divergentes: 5 anos (CFP 01/2009) ou 20 anos (Lei 13.787/2018, citada pelo CRP-08).
- O texto da Res. CFP 09/2024 foi lido em espelho (Legisweb), não no DOU.
- O enquadramento do ECA Digital e da Lei 15.352/2026 não foi lido.
- Os pontos marcados S e a cobertura de RLS por rota precisam de revisão completa (aqui foi só grep).

## Riscos

- BOLA/IDOR entre psicólogos, se alguma rota /psicologo usar pool.query fora do contexto RLS e sem filtrar por vínculo.
- Confusão de tokens JWT: o mesmo segredo serve mobile, web e reset, e o verify do mobile não fixa algoritmo nem audiência.
- AES-GCM sem AAD e sem versão de chave: texto cifrado trocável entre registros e rotação inviável.
- Truncamento do bcrypt: o limite de 72 caracteres deixa passar mais de 72 bytes.
- Backup Android ativo por padrão e telas sensíveis capturáveis, inclusive na prévia de apps recentes.
- Cadastro de menores sem consentimento do responsável.
- Conflito entre eliminação a pedido do paciente e guarda obrigatória do registro do psicólogo.
- Afirmações de conformidade além do que um protótipo comprova.

## Incertezas

- A ANPD não tem guia publicado sobre dados de saúde. As metas de fiscalização 2026-2027 (Res. CD/ANPD 30 e 31/2025) vêm de fonte secundária.
- A guarda do prontuário psicológico diverge entre 5 anos (CFP 01/2009) e 20 anos (Lei 13.787/2018).
- Não verifiquei se o ECA Digital (Lei 15.211/2025) se aplica a app de saúde mental usado por adolescentes.
- Li a Res. CFP 09/2024 em espelho não oficial. Não confirmei o enquadramento de PHQ-9, GAD-7 e DASS-21 no SATEPSI.
- O mínimo de 15 caracteres do NIST 800-63B-4 para senha como fator único veio da memória do texto e não foi relido nesta sessão.
- Um glossário citou uma próxima edição do API Top 10 em 2026, sem corroboração.
- Não analisei rota por rota se os endpoints do psicólogo usam comContextoPsicologo; vi só por grep que várias rotas usam pool.query direto.
- Não abri o .env, então não confirmei que DATABASE_URL usa o papel psychelink_app.

## Fontes

- https://top10.owasp.org/2025 (acesso 2026-11-10; A01-A10 2025; final jan/2026 segundo esecurityplanet/metacompliance)
- https://owasp.org/API-Security/ (edição 2023 vigente; confirmação por fontes secundárias de 2026, ex. https://cloudinsight.cc/en/blog/owasp-api-top-10)
- https://github.com/OWASP/ASVS (ASVS 5.0.0, 30/05/2025)
- https://github.com/OWASP/mastg/releases (MASTG v2.0.0, jun/2026); https://github.com/OWASP/owasp-masvs/releases (MASVS v2.1.0, jan/2024)
- https://cheatsheetseries.owasp.org/IndexTopTen.html (acesso 2026-11-10: Authentication, Session Management, Password Storage, JSON Web Token, CSRF Prevention, REST Security, Nodejs Security, Logging, CSP, Forgot Password, Mass Assignment, Secrets Management, Cryptographic Storage, NPM Security)
- https://datatracker.ietf.org/doc/rfc8725/ (BCP 225, fev/2020, sem sucessor)
- https://csrc.nist.gov/pubs/sp/800/63/b/4/final (SP 800-63B-4, 31/07/2025)
- https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm (LGPD compilada, acesso 2026-11-10)
- https://www.legisweb.com.br/legislacao/?id=462577 (Res. CFP 09/2024, 18/07/2024, DOU 30/07/2024)
- https://www.legisweb.com.br/legislacao/?id=112145 (Res. CFP 01/2009, guarda mínima de 5 anos)
- https://www.gov.br/anpd/pt-br/assuntos/regulacao/agenda-regulatoria-1 (dados de saúde na agenda 2025-2026)
- https://www.mattosfilho.com.br/unico/anpd-guia-dados-risco/ (guia de alto risco não aprovado)
- https://www.mattosfilho.com.br/unico/regulamento-incidente-seguranca/ (Res. CD/ANPD 15/2024, 3 dias úteis)
- https://neon.com/docs/connect/connection-pooling (PgBouncer em modo transaction)
- https://docs.expo.dev/versions/latest/config/app/ (v58: allowBackup padrão true, blockedPermissions)
- https://docs.expo.dev/versions/v58.0.0/sdk/screen-capture/ (FLAG_SECURE)
