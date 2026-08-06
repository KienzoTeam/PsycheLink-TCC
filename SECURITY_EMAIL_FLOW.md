# Cadastro e confirmação de e-mail seguros

Esta refatoração substitui o cadastro sem confirmação por **double opt-in com OTP de seis dígitos**. O servidor só marca `users.email_verified_at` depois de o código enviado ao endereço ter sido confirmado. Portanto, a validade sintática, um eventual MX e qualquer resposta do provedor **não** substituem a confirmação do OTP.

## Achados no código anterior

| Área | Problema encontrado | Correção aplicada |
| --- | --- | --- |
| API de cadastro | Aceitava qualquer valor não vazio como e-mail. | `normalizeEmail()` converte o domínio com `node:url.domainToASCII` e valida o endereço canônico com a biblioteca madura `validator.isEmail`. Não há regex de e-mail escrita pela aplicação. |
| Domínios internacionais | Nenhuma normalização de IDN/Unicode. | `ana@exemplo.公司` tem o domínio convertido para Punycode antes da validação e da persistência. |
| Confirmação | A conta era criada e podia entrar imediatamente; a tela de código continha o código de demonstração fixo `847291` e não chamava API. | Tokens OTP aleatórios, com hash HMAC, expiração de 10 minutos, uso único e no máximo 5 tentativas. Login exige `email_verified_at`. |
| Enumeração e força bruta | Cadastro e recuperação revelavam estados e não havia limitação. | Respostas genéricas para solicitações de código, `express-rate-limit`, códigos sempre hasheados e comparação em tempo constante. |
| App | A checagem era somente `email.includes('@')`, bloqueava apenas no envio e apontava para `http://localhost:3000`. | Feedback leve com Zod durante a UX, sem travar a digitação; URL pública configurável por `EXPO_PUBLIC_API_URL`. |
| Recuperação de senha | O fluxo navegava entre telas sem verificar um código no servidor. | Também usa OTP de uso único no servidor, em uma tabela separada do OTP de confirmação. |
| Transporte de e-mail | Não havia emissor transacional nem separação de ambiente. | Integração HTTP com Resend em produção; em desenvolvimento o código vai apenas ao log local. Não há — e não deve haver — chamada SMTP `RCPT TO`. |

> O `ssl: { rejectUnauthorized: false }` do servidor anterior também foi removido. Em produção, configure uma URL PostgreSQL com CA verificável; não desabilite a validação TLS globalmente.

## Backend TypeScript

Os fontes estão em `apps/server/src`. Instale e valide:

```bash
cd apps/server
cp .env.example .env
npm ci
psql "$DATABASE_URL" -f migrations/001_email_verification.sql
npm run typecheck
npm run dev
```

A migração pressupõe que `users.id` seja `INTEGER`, como no esquema original típico. Se o projeto usa UUID, substitua os dois `user_id INTEGER` da migração pelo mesmo tipo de `users.id` antes de executá-la. Revise duplicidades em `users.email` antes de criar o índice único.

### Variáveis importantes

- `JWT_SECRET` e `EMAIL_VERIFICATION_PEPPER`: segredos **distintos**, aleatórios e com pelo menos 32 caracteres.
- `RESEND_API_KEY` e `EMAIL_FROM`: obrigatórios em `NODE_ENV=production`. O envio é pela API HTTP do provedor.
- `APP_ORIGINS`: lista de origens web permitidas, obrigatória em produção. Apps nativos não enviam cabeçalho `Origin`.
- `VERIFY_EMAIL_MX=true`: ativa `dns.promises.resolveMx`. É opcional, tem cache/timeout e pode rejeitar domínios legítimos que recebem e-mail por fallback de A/AAAA; nunca é usado como prova de posse.

### Endpoints

| Método e rota | Corpo | Resultado |
| --- | --- | --- |
| `POST /api/auth/register` | `nome`, `email`, `password`, `dataNascimento` (`YYYY-MM-DD`) | Cria uma conta pendente e envia OTP, quando aplicável. Retorna `202` genérico. |
| `POST /api/auth/email-verification/confirm` | `email`, `code` | Consome o OTP e confirma a conta (`204`). |
| `POST /api/auth/email-verification/resend` | `email` | Invalida OTP pendente anterior e pede outro (`202` genérico). |
| `POST /api/auth/login` | `email`, `password` | Só emite JWT para conta confirmada. |
| `POST /api/auth/password-reset/request` | `email` | Fluxo genérico de recuperação para contas confirmadas. |
| `POST /api/auth/password-reset/confirm` | `email`, `code`, `password` | Consome o OTP de recuperação e troca a senha (`204`). |

O código OTP não é salvo em texto puro: o banco recebe somente HMAC SHA-256 do par `tokenId:código`, protegido pelo pepper de ambiente. Ao reenviar, os códigos pendentes são consumidos; depois de cinco falhas o token deixa de ser aceito. A normalização implementada dá suporte a **domínios** Unicode/IDN por Punycode; não habilita local parts SMTPUTF8, que exigiriam compatibilidade explícita do provedor transacional.

## React Native / Expo

O app usa `zod` para uma verificação **leve** no formulário (`apps/mobile/src/lib/emailValidation.ts`). Essa verificação tem a finalidade de orientar a pessoa usuária e aceita domínios internacionais; a API continua sendo a autoridade de validação e normalização. O campo mostra erro apenas depois de perder foco ou de tentar continuar, portanto não impede a digitação.

Configure uma URL que seja alcançável pelo dispositivo/browser:

```bash
cd apps/mobile
cp .env.example .env
# EXPO_PUBLIC_API_URL="https://api.seu-dominio.example"
npm ci
npx tsc --noEmit
```

Não use `localhost` na configuração de um app publicado nem no preview web: o navegador ou telefone não está dentro do processo da API. Para desenvolvimento em dispositivo físico, exponha a API por uma URL/túnel seguro ou use o IP de rede apropriado somente no ambiente local.

O novo fluxo é:

1. Formulário de cadastro envia os dados à API e navega à tela **Confirme seu e-mail**.
2. A pessoa informa o OTP recebido, inclusive por preenchimento automático/cola.
3. A API valida e consome o OTP; só então libera login.
4. Reenvio tem espera local de 60 segundos, limite no servidor e invalida o OTP anterior.

## Limites deliberados

- Validar formato ou MX não confirma uma caixa postal. Somente a posse do OTP confirma o endereço.
- A API não usa SMTP `RCPT TO`, pois isso facilita enumeração e provoca bloqueios/rate limiting.
- Para revogar JWTs emitidos antes de uma redefinição de senha, adicione um `token_version` em `users` e inclua-o/verifique-o no JWT. O access token atual já tem duração curta de 15 minutos.
