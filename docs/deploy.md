# Publicar o PsycheLink: guia para o grupo

Este guia leva a API, o painel e o envio de e-mail para a internet, e deixa um plano B que roda só no notebook. Siga na ordem. Cada passo diz onde clicar e o que copiar para onde.

**Meta de 17/11:** o endereço `/health` da API publicada responde 200, e um cadastro de paciente feito contra a API publicada recebe o código num e-mail real que não é o do dono da conta do Brevo. Se o Brevo não aceitar o remetente Gmail, ou se o Render não subir até 16/11, a demo vira o plano B local (seção 9).

## 0. O que vamos montar

```
celular ou navegador ──> Vercel (painel e repasse de /api) ──> Render (API) ──> Neon (banco)
                                                                  └──> Brevo (envia o e-mail com o código)
```

| Serviço | Para que serve | Quem cria a conta |
|---|---|---|
| Brevo | Envia o e-mail com o código de verificação | Qualquer pessoa do grupo, com o e-mail do grupo |
| Neon | Banco de dados (já existe; vamos criar uma cópia isolada para a demo) | Dono do projeto atual no Neon |
| Render | Roda a API (servidor) | Alguém do grupo; precisa de um dono da organização do GitHub para liberar o repositório |
| Vercel | Hospeda o painel web | O dono da conta que vai rodar o comando de deploy |

Por que o painel passa pelo Vercel para falar com a API: o login do painel usa cookies que só valem no mesmo endereço do painel (`SameSite=Strict`, `path=/api`). O Vercel repassa tudo que começa com `/api` para o Render, e o navegador acha que só fala com um site. O app do celular usa o mesmo caminho.

**Antes de começar**
- Os comandos abaixo são para um terminal bash (Linux, macOS ou o "Git Bash" que vem com o Git no Windows), rodados na pasta do repositório.
- Dentro de `apps/server` rode `npm ci` uma vez (instala as dependências do servidor).
- **Segredo** é qualquer chave ou senha. Nunca cole um segredo no repositório, num commit, num issue ou num chat. Eles vão só nos campos dos sites e em arquivos `.env*` locais (o Git já ignora esses arquivos). Guarde-os num gerenciador de senhas do grupo.
- Os segredos da demo são **novos**: não reaproveite `JWT_SECRET`, `ENCRYPTION_KEY` nem senhas do banco da equipe.
- Gerar um segredo (rode uma vez para cada um e copie a saída):
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
  ```
  A `ENCRYPTION_KEY` tem formato próprio (32 bytes em base64):
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  ```

## 1. Brevo (e-mail)

O Render gratuito bloqueia as portas de e-mail comuns (SMTP), então a API envia e-mail pela API web do Brevo. O servidor usa o Brevo quando existe a variável `BREVO_API_KEY`. O Brevo muda o desenho do site de tempos em tempos: se um nome de menu abaixo não existir, procure o equivalente (o caminho da chave de API, passo 3, está na documentação oficial; o do remetente, passo 2, não foi conferido).

1. Abra o site do Brevo e clique em **Sign up free**. Use o e-mail do grupo, confirme o e-mail e preencha o formulário do perfil (nome, empresa ou instituição, endereço). O Brevo às vezes revisa contas novas antes de liberar envios; se aparecer aviso de conta em análise, comece este passo cedo.
2. **Verificar o remetente.** Clique no seu nome no canto superior direito, depois em **Senders, Domains & Dedicated IPs**, aba **Senders**, botão **Add a sender**. Preencha o nome (`PsycheLink`) e o e-mail do grupo. O Brevo manda uma mensagem de confirmação para esse e-mail: abra e confirme.
   - O Brevo só envia de remetente verificado. Como o grupo não tem domínio próprio, o remetente é um Gmail. Se o Brevo aceita isso é o que o teste do passo 4 confirma.
3. **Gerar a chave de API.** Menu do seu nome, **SMTP & API**, aba **API keys**, botão **Generate a new API key**. Dê o nome `psychelink-demo`, clique em **Generate** e copie a chave na hora (ela aparece uma vez só). Guarde-a como segredo. Ela vai para o Render como `BREVO_API_KEY`.
4. **Testar o envio** para um e-mail que não seja o do dono da conta Brevo (peça a outra pessoa do grupo). No terminal:
   ```bash
   echo "Cole a chave do Brevo e tecle Enter (ela não aparece na tela):"; read -rs CHAVE_BREVO
   curl -s -w "\nHTTP %{http_code}\n" https://api.brevo.com/v3/smtp/email \
     -H "api-key: $CHAVE_BREVO" -H "content-type: application/json" \
     -d '{"sender":{"name":"PsycheLink","email":"<e-mail do remetente verificado>"},"to":[{"email":"<e-mail de outra pessoa>"}],"subject":"Teste PsycheLink","htmlContent":"<p>Teste</p>"}'
   ```
   - `HTTP 201` e um `messageId`: o Brevo aceitou. Confirme que a mensagem **chegou** na caixa da outra pessoa (olhe também o spam). Aceitar não garante entregar.
   - `HTTP 400` falando do remetente: o e-mail do `sender` não está verificado (volte ao passo 2).
   - `HTTP 401`: a chave está errada. Se a chave está certa e o erro continua, veja nas configurações de segurança da conta se há restrição de IPs autorizados e desligue-a: o IP do Render muda.
   - Se o Brevo recusa Gmail como remetente, ou o e-mail nunca chega: avise o grupo e siga para o plano B (seção 9).

## 2. Neon (banco da demo)

A demo usa um banco **novo e vazio**, numa branch separada, para nenhum dado da equipe ir para a demo. Branch é uma cópia do projeto que você pode mexer sem afetar a original.

1. No console do Neon, abra o projeto da equipe, **Branches** na barra lateral, **New branch**.
   - **Parent branch:** a principal (o padrão).
   - **Name:** `demo`.
   - Dados: deixe **Current data** (o padrão). A branch leva uma cópia dos bancos da principal, mas a API só vai usar o banco novo do passo seguinte. Apague a branch `demo` depois da banca.
   - **Desmarque "Automatically delete branch after"**. Ele vem marcado com 1 dia e apagaria a demo sozinho.
   - Clique em **Create**.
2. No menu de branches, no alto da barra lateral, selecione `demo`. Em **Databases**, clique em **Add database**, nome `psychelink_demo`, dono `neondb_owner`, **Create**.
3. Pegue a URL do dono para migrar. Clique em **Connect** e escolha: branch `demo`, database `psychelink_demo`, role `neondb_owner`, e **desligue** "Connection pooling" (a migração usa conexão direta). Copie a URL.
4. Crie o arquivo `apps/server/.env.demo` com uma linha só (o Git ignora arquivos `.env*`; troque `sslmode=require` por `sslmode=verify-full` se a URL vier assim):
   ```
   DATABASE_URL_DIRETA="<URL do dono, banco psychelink_demo>"
   ```
5. Crie as tabelas, dentro de `apps/server`:
   ```bash
   npx tsx --env-file=.env.demo scripts/migrar.ts
   ```
   Saem sete linhas `000N_...sql: aplicada`. Não use `npm run migrar` aqui: ele lê o `.env` do banco da equipe.
6. **Trocar a senha do `psychelink_app`.** É o papel (usuário do banco) que a API usa; ele só tem as permissões de que a aplicação precisa. A branch herda os papéis **e as senhas** da principal, então a senha da equipe também valeria na demo: troque-a. Com a branch `demo` selecionada, abra **Roles**, menu do `psychelink_app`, **Reset password**, **Reset**, e copie a senha gerada. O fundamento de por que a API não usa o dono está em `apps/server/docs/rls.md`.
7. Pegue a URL que a API vai usar: **Connect**, branch `demo`, database `psychelink_demo`, role `psychelink_app`, "Connection pooling" **ligado** (o endereço terá `-pooler`). Ela vai para o Render como `DATABASE_URL`. Confira que a URL tem `/psychelink_demo?` antes dos parâmetros e que traz `sslmode=verify-full` (se vier `sslmode=require`, troque): com `verify-full` o certificado do servidor é verificado.

O banco da demo começa vazio. O seed com contas de e-mail real é do lote A5 (o seed de hoje só escreve no banco de testes e usa contas `@psychelink.test`, que não recebem código). Para testar, cadastre-se pelo painel ou pelo app.

## 3. Render (API)

1. Crie a conta no Render entrando com o GitHub.
2. **Liberar o repositório.** O repositório é privado e da organização `KienzoTeam`. No painel do Render: **New**, **Web Service**, aba do GitHub, **Configure account** (ou "Install the Render app"), escolha a organização `KienzoTeam` e dê acesso ao repositório do PsycheLink. Quem instala o app na organização precisa ser dono dela; se não for, o dono recebe um pedido de aprovação.
3. **New**, **Web Service**, escolha o repositório e preencha:
   - **Name:** `psychelink-api`. O endereço fica `https://psychelink-api.onrender.com`. Se o nome já estiver em uso, o Render acrescenta letras; anote o endereço real (aparece no alto da página do serviço) e use-o na seção 4.
   - **Language:** `Docker`.
   - **Branch:** a que contém `apps/server/Dockerfile` (`main`, depois de mesclar o pull request do deploy).
   - **Region:** a mais perto da região do projeto no Neon (cada consulta ao banco paga a distância).
   - **Root Directory:** `apps/server` (em **Advanced**; ou depois, em Settings, **Build & Deploy**). O Dockerfile e a pasta de build são relativos a ela, então o **Dockerfile Path** fica no padrão.
   - **Instance Type:** `Free`.
4. Em **Environment Variables**, adicione cada variável (**+ Add Environment Variable**, ou **Add from .env**). **Cole os valores sem aspas.**

   | Variável | Valor |
   |---|---|
   | `DATABASE_URL` | URL do passo 2.7 (`psychelink_app`, `-pooler`, banco `psychelink_demo`) |
   | `JWT_SECRET` | segredo novo (seção 0) |
   | `ENCRYPTION_KEY` | chave nova, 32 bytes em base64 (seção 0) |
   | `EMAIL_PEPPER` | segredo novo |
   | `BREVO_API_KEY` | chave do passo 1.3 |
   | `EMAIL_FROM` | `PsycheLink <e-mail do remetente verificado>`, ou só o e-mail |
   | `NODE_ENV` | `production` |
   | `VALIDAR_MX` | `true` (confere se o domínio do e-mail recebe e-mail) |
   | `WEB_ORIGINS` | `https://psychelink-web.vercel.app` (provisório; confirme no passo 5) |
   | `ALLOWED_ORIGINS` | o mesmo valor de `WEB_ORIGINS` |
   | `TRUST_PROXY` | `2` (provisório; meça no passo 6) |

   O Render define a porta sozinho (`PORT`, 10000) e o servidor a lê: não precisa criá-la.
5. **Health Check Path:** em **Advanced** na criação, ou depois em Settings, **Health Checks**, **Edit**: `/health`. É a rota que o Render chama para saber se a API está viva.
6. **Create Web Service.** O primeiro build leva alguns minutos. Nos logs, procure `Envio de e-mail: Brevo` e `Servidor rodando na porta 10000`. Se aparecer `EMAIL_FROM ausente ou sem e-mail válido`, corrija a variável.
7. Abra `https://psychelink-api.onrender.com/health` (com o seu endereço). Deve mostrar `{"ok":true}`.

Cada mudança de variável reinicia o serviço (**Save and deploy**).

## 4. Vercel (painel)

1. Crie a conta no Vercel (plano Hobby, gratuito). O Hobby não conecta repositório de organização, então o painel sobe **pelo terminal, a partir do notebook, pela conta do dono**, e o deploy é manual: repita o passo 4 a cada versão nova do painel.
2. Em `apps/web/vercel.json`, a regra `/api/:caminho*` aponta para `https://psychelink-api.onrender.com`. **Se o endereço do seu serviço no Render for outro, troque o trecho do `destination`** e faça commit antes do deploy. O mesmo arquivo manda qualquer outro caminho para `/index.html` (o painel troca de tela sem recarregar) e aplica a política de segurança de conteúdo (CSP), a mesma de `apps/web/DESIGN.md`.
3. No terminal:
   ```bash
   cd apps/web
   npx vercel login
   npx vercel --prod
   ```
   O `login` abre o navegador ou pede um e-mail. Na primeira vez, o `vercel --prod` pergunta qual conta (`Which team?`: a pessoal), qual projeto (`Which project?`: **Create a new project**) e o nome (`Name?`: `psychelink-web`). Em seguida mostra o que detectou (Vite) e pergunta `Customize settings?`: responda `N`. Ele cria a pasta `.vercel` aqui; **não faça commit dela**. Se alguma pergunta vier diferente, escolha o equivalente: projeto novo, nome `psychelink-web`, configurações padrão.
4. **Descobrir o endereço do painel.** No site do Vercel, abra o projeto `psychelink-web`, **Settings**, **Domains**: o domínio de produção (algo como `https://psychelink-web.vercel.app`) é o endereço do painel e não muda entre deploys. Não use o endereço longo que o terminal imprime ao fim do deploy: ele é de uma versão específica e, com a proteção padrão do Vercel, pede login. Se o domínio de produção também pedir login do Vercel, em **Settings**, **Deployment Protection**, escolha **Standard Protection**.
5. **Conferir.**
   - `curl https://psychelink-web.vercel.app/api/health` deve responder `{"ok":true}`: o repasse de `/api` até o Render funciona.
   - Abra o endereço no navegador: a tela de acesso do painel aparece.
   - Cadastre-se como psicólogo, receba o código no e-mail, entre (login em duas etapas) e abra a tela **Vínculo**.

## 5. Fechar o círculo: origens da API

O Render aceita escritas do painel só vindas de origens listadas. Volte ao Render, **Environment**, e confira que `WEB_ORIGINS` e `ALLOWED_ORIGINS` são exatamente o domínio de produção do passo 4.4: com `https://`, sem barra no final. Se o Vercel deu outro nome ao projeto, corrija agora e use **Save and deploy**. Sintoma de valor errado: o cadastro ou o login no painel responde 403.

## 6. `TRUST_PROXY` (o IP de cada pessoa)

O pedido passa por Vercel e Render antes de chegar na API. A API só enxerga o IP real de quem pediu se souber **quantos intermediários** confiar (`TRUST_PROXY`). O IP é usado no limite de tentativas (rate limit) e no registro das sessões. Com o número errado:
- baixo demais: todo mundo parece ter o IP do intermediário, o limite junta todos os usuários num IP só e a demo recebe erro 429;
- alto demais: a API aceita um IP forjado por quem manda o cabeçalho.

Meça antes de fixar:
1. Entre no painel pelo endereço do Vercel e abra **Minha área**, **Sessões**. A sessão atual mostra `IP ...`.
2. Veja o IP público de quem está testando: `curl https://api64.ipify.org` (esse endereço devolve o IPv6 quando a rede tem; use `https://api.ipify.org` para IPv4).
3. Se os dois forem iguais, o número está certo. Se não, mude `TRUST_PROXY` no Render (tente 1, 2 e 3), espere reiniciar, entre de novo (para criar uma sessão nova) e compare.
4. Refaça a medição na rede da banca (hotspot) no dia anterior.

## 7. App do celular

O app passa pelos mesmos intermediários do painel. No arquivo `apps/mobile/.env` (o Git ignora), escreva:

```
EXPO_PUBLIC_API_URL=https://psychelink-web.vercel.app/api
```

(com o seu domínio de produção do Vercel). O Expo lê o `.env` sozinho e troca o valor no código ao montar o app: depois de salvar, recarregue o app (no Expo Go, agite o aparelho e toque em **Reload**). Para voltar ao servidor local, apague a linha.

## 8. Verificação do marco

Marque cada item:
- [ ] `https://<endereço do Render>/health` responde 200 com `{"ok":true}`.
- [ ] `https://<endereço do Vercel>/api/health` responde igual.
- [ ] O cabeçalho de segurança chega: `curl -sI https://<endereço do Vercel>/ | grep -i content-security-policy`.
- [ ] Um cadastro de paciente contra a API publicada manda o código para um e-mail real que **não** é o do dono da conta Brevo. Sem abrir o app:
  ```bash
  curl -s -w "\nHTTP %{http_code}\n" https://<endereço do Vercel>/api/auth/registro \
    -H "content-type: application/json" \
    -d '{"nome":"Teste Demo","email":"<e-mail real de outra pessoa>","password":"<senha com 8 ou mais caracteres>","dataNascimento":"1998-05-20"}'
  ```
  A resposta é a mesma exista ou não a conta. O código chega por e-mail (olhe o spam). Se não chegar, abra os logs do Render e procure `[SMTP Error]`: `code: 'EBREVO'` com `responseCode: 401` é chave errada, `400` é remetente não verificado, e `EBREVO` sem `responseCode` é falha de rede até o Brevo.

### Dia da banca (05/12)

1. **10 minutos antes**, abra `https://<endereço do Vercel>/api/health`. O Render dorme após 15 minutos sem tráfego e leva cerca de 1 minuto para acordar; o Neon suspende após 5 minutos parado. Os apps desistem em 15 segundos, então o primeiro acesso de verdade não pode ser o que acorda tudo.
2. Deixe um ping a cada 4 minutos rodando num terminal separado até o fim:
   ```bash
   while true; do echo "$(date +%T) $(curl -s -o /dev/null -w '%{http_code}' --max-time 20 https://<endereço do Vercel>/api/health)"; sleep 240; done
   ```
   Deve imprimir `200` em toda linha. Pare com `Ctrl+C`.
3. Use um **hotspot próprio** (o roteador do celular) para o celular e o notebook, e teste tudo nessa rede no dia anterior. Rede de evento costuma bloquear ou limitar.
4. Se o `/health` não responder 200 depois de 10 minutos de tentativa, não insista: mude para o plano B (seção 9), que deve estar testado no dia anterior.

## 9. Plano B: tudo no notebook

O `docker-compose.yml` da raiz sobe um Postgres e a API em contêineres, sem Neon, Render nem Vercel. O painel roda com `npm run dev` e o celular usa a rede local. Precisa de Docker (Docker Desktop no Windows e macOS). Com Podman, troque `docker compose` por `podman compose`.

1. Crie `apps/server/.env.compose` (o Git ignora). **Sem aspas** nos valores, e senhas só com letras e números (elas entram em URLs): `node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"`.
   ```
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=<senha do dono do banco>
   POSTGRES_DB=psychelink
   DATABASE_URL=postgresql://psychelink_app:<senha do app>@banco:5432/psychelink
   DATABASE_URL_DIRETA=postgresql://postgres:<senha do dono do banco>@banco:5432/psychelink
   JWT_SECRET=<segredo novo>
   EMAIL_PEPPER=<segredo novo>
   ENCRYPTION_KEY=<chave nova, 32 bytes em base64>
   VALIDAR_MX=false
   WEB_ORIGINS=http://localhost:5173
   ALLOWED_ORIGINS=http://localhost:5173
   ```
   `banco` é o nome do serviço do Postgres dentro do compose. Para e-mail de verdade, acrescente `BREVO_API_KEY` e `EMAIL_FROM` (como no Render). **Sem eles, e sem `NODE_ENV`, o código de verificação aparece no log da API**: `docker compose logs -f api`.
2. Suba tudo (na raiz do repositório). A primeira vez baixa e compila a imagem:
   ```bash
   docker compose up -d --build
   ```
3. Crie as tabelas e defina a senha do `psychelink_app`, a mesma que você escreveu em `DATABASE_URL`:
   ```bash
   docker compose exec api npx tsx scripts/migrar.ts
   docker compose exec banco psql -U postgres -d psychelink -c "ALTER ROLE psychelink_app PASSWORD '<senha do app>'"
   ```
   (Antes dessas duas etapas o `/health` responde 503: a API ainda não consegue entrar no banco. É o mesmo roteiro de `apps/server/docs/rls.md`.)
4. Confira: `curl http://127.0.0.1:3000/health` responde `{"ok":true}`.
5. Painel: `cd apps/web && npm ci && npm run dev`, e abra `http://localhost:5173`.
6. Celular: a API só atende o próprio notebook (`127.0.0.1`). Para o celular alcançá-la na mesma rede, em `docker-compose.yml` troque `'127.0.0.1:3000:3000'` por `'3000:3000'` e rode `docker compose up -d` de novo. O app em modo local acha o IP do notebook sozinho. Faça isso só em rede sua (hotspot): a porta fica aberta para a rede.
7. Parar: `docker compose down` (guarda o banco). `docker compose down -v` apaga o banco.

O seed de contas de demonstração (lote A5) vai usar este mesmo roteiro.

## 10. Se algo der errado

| Sintoma | Causa provável |
|---|---|
| `/health` no Render responde 503 | A API não entra no banco: confira `DATABASE_URL` (papel `psychelink_app`, senha nova, banco `psychelink_demo`, `-pooler`) e se o passo 2.6 foi feito |
| `/health` demora no primeiro acesso | Render e Neon acordando (cerca de 1 minuto): é esperado, por isso o ping da banca |
| Cadastro ou login no painel dá 403 | `WEB_ORIGINS` não é exatamente o endereço do painel (seção 5) |
| Erro 429 para todo mundo | `TRUST_PROXY` baixo demais (seção 6) |
| O código não chega | Logs do Render, procure `[SMTP Error]` (seção 8); olhe o spam |
| O painel abre mas as chamadas falham | O endereço em `apps/web/vercel.json` não é o do Render (seção 4.2) |
| O build do Render falha | Abra o log do deploy: costuma ser **Root Directory** diferente de `apps/server` ou branch sem o Dockerfile |
