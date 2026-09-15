# PsycheLink — Web

Frontend web do PsycheLink: React + TypeScript + Vite + Tailwind CSS v4.

## Status atual

O fluxo de **login e cadastro** está implementado e conectado ao backend
real (`apps/server`): cadastro com verificação de e-mail por código de 6
dígitos, login com JWT, e uma rota protegida (`/dashboard`) que só é
acessível com sessão válida.

## Rodando localmente

Este frontend depende do backend em `apps/server` estar rodando (ver o
README de lá para configurar `.env` e o banco). Com o backend no ar:

```bash
npm install
cp .env.example .env   # ajuste VITE_API_URL se o backend não estiver em :3000
npm run dev
```

Abre em `http://localhost:5173`. As rotas disponíveis são:

- `/login` — tela de entrada
- `/register` — tela de cadastro
- `/dashboard` — tela protegida, exibida após login/cadastro bem-sucedidos

`/login` e `/register` compartilham a mesma instância de `AuthLayout`
(rota dinâmica `/:authMode`) para que o painel de marca e o formulário não
sejam recriados a cada troca de aba — só o conteúdo interno do formulário
anima. Ver comentários em `components/features/auth/AuthLayout.tsx`.

## Scripts

| Comando           | Descrição                              |
| ------------------ | --------------------------------------- |
| `npm run dev`       | Sobe o servidor de desenvolvimento Vite |
| `npm run build`     | Type-check + build de produção          |
| `npm run lint`      | Roda o ESLint                           |
| `npm run preview`   | Serve o build de produção localmente    |

## Estrutura de pastas

```
src/
├── assets/                     # imagens, fontes locais
├── components/
│   ├── ui/                     # componentes genéricos (Button, TextField, Spinner, Collapse)
│   └── features/
│       ├── auth/                # login/cadastro (AuthForm, AuthLayout, TabToggle, BrandPanel,
│       │                          CodeVerificationForm)
│       ├── checkin/              # placeholder — feature futura
│       ├── dashboard/            # placeholder — feature futura
│       ├── chat/                 # placeholder — feature futura
│       ├── escalas/              # placeholder — feature futura
│       └── vinculo/              # placeholder — feature futura
├── hooks/                       # useReveal, useReplayOnChange...
├── pages/                       # DashboardPage...
├── services/
│   ├── api.ts                   # cliente HTTP (axios) para apps/server
│   └── socket.ts                # placeholder para conexão Socket.io (chat)
├── store/
│   └── authStore.ts             # estado de autenticação (Zustand) + persistência do token JWT
├── types/                       # tipos compartilhados do domínio (User, Auth...)
├── utils/
│   └── validation.ts            # validação de formulários de auth
├── App.tsx                      # rotas (react-router-dom)
└── main.tsx
```

## Animações do login/cadastro

- `Collapse` (`components/ui/Collapse.tsx`): anima a altura de cada campo
  condicional (Nome, Data de nascimento, Confirmar senha, "Esqueceu a
  senha?") individualmente ao aparecer/desaparecer, sem medir altura via JS
  — usa `grid-template-rows` (`0fr` ↔ `1fr`).
- `useReplayOnChange` (`hooks/useReplayOnChange.ts`): reaplica a animação de
  "switch" (fade + slide vertical) no bloco de campos toda vez que o modo
  muda, sem depender de desmontagem/remontagem do formulário.
- O painel de marca (`BrandPanel`) anima apenas uma vez, ao carregar a
  página — ele não reage à troca entre login/cadastro.

## Fluxo de autenticação

1. **Cadastro** (`/register`): envia nome, e-mail, senha e data de
   nascimento para `POST /registro`. O backend cria o usuário (ou atualiza,
   se já existia um cadastro pendente com o mesmo e-mail) e envia um código
   de 6 dígitos por e-mail (ou só no console do servidor, se `SMTP_HOST`
   não estiver configurado — ver README de `apps/server`).
2. **Confirmação do código**: o formulário troca para
   `CodeVerificationForm`, que chama `POST /verificar-email`. Ao confirmar,
   o app tenta logar automaticamente com o e-mail/senha já digitados.
3. **Login** (`/login`): `POST /login`. Se a conta existir mas o e-mail
   ainda não tiver sido confirmado, o backend responde com
   `codigo: "EMAIL_NAO_VERIFICADO"` e o formulário manda a pessoa direto
   para a tela de código, sem precisar cadastrar de novo.
4. Login bem-sucedido retorna um JWT, salvo em `localStorage`. O app então
   busca `GET /me` para popular o usuário na store e libera `/dashboard`
   (via `ProtectedRoute`).
5. Ao recarregar a página, `App.tsx` chama `fetchMe()` para restaurar a
   sessão a partir do token salvo, sem precisar logar de novo.

**Ainda não implementado na UI** (mas já suportado pelo backend): o fluxo de
"Esqueceu a senha?" (`/esqueci-senha`, `/verificar-codigo-senha`,
`/redefinir-senha`) — o botão continua desabilitado no formulário até essa
tela ser construída.

## Variáveis de ambiente

Veja `.env.example`. `VITE_API_URL` deve apontar para onde o `apps/server`
estiver rodando (padrão: `http://localhost:3000`, que é a porta padrão do
servidor — ver `apps/server/.env.example`).
