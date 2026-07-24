# PsycheLink — Web

Frontend web do PsycheLink: React + TypeScript + Vite + Tailwind CSS v4.

## Status atual

Apenas o fluxo de **login e cadastro** está implementado, funcionando como
**mock** (sem backend real ainda). O objetivo desta etapa é ter essa tela
pronta e bem estruturada para as próximas telas (dashboard, check-in,
escalas, chat, vínculo) serem construídas em cima da mesma base.

## Rodando localmente

```bash
npm install
npm run dev
```

Abre em `http://localhost:5173`. As rotas disponíveis são:

- `/login` — tela de entrada
- `/register` — tela de cadastro
- `/dashboard` — placeholder exibido após um login/cadastro "bem-sucedido" (mock)

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
│       ├── auth/                # tela de login/cadastro (AuthForm, AuthLayout, TabToggle, BrandPanel)
│       ├── checkin/              # placeholder — feature futura
│       ├── dashboard/            # placeholder — feature futura
│       ├── chat/                 # placeholder — feature futura
│       ├── escalas/              # placeholder — feature futura
│       └── vinculo/              # placeholder — feature futura
├── hooks/                       # useReveal, useReplayOnChange...
├── pages/                       # DashboardPage...
├── services/
│   ├── api.ts                   # cliente HTTP — hoje mockado, ver comentários no arquivo
│   └── socket.ts                # placeholder para conexão Socket.io (chat)
├── store/
│   └── authStore.ts             # estado de autenticação (Zustand)
├── types/                       # tipos compartilhados do domínio (User, Auth...)
├── utils/
│   └── validation.ts            # validação de formulários de auth
├── App.tsx                      # rotas (react-router-dom)
└── main.tsx
```

## Animações do login/cadastro

- `Collapse` (`components/ui/Collapse.tsx`): anima a altura de cada campo
  condicional (Nome, Confirmar senha, "Esqueceu a senha?") individualmente
  ao aparecer/desaparecer, sem medir altura via JS — usa
  `grid-template-rows` (`0fr` ↔ `1fr`).
- `useReplayOnChange` (`hooks/useReplayOnChange.ts`): reaplica a animação de
  "switch" (fade + slide vertical) no bloco de campos toda vez que o modo
  muda, sem depender de desmontagem/remontagem do formulário.
- O painel de marca (`BrandPanel`) anima apenas uma vez, ao carregar a
  página — ele não reage à troca entre login/cadastro.

## Sobre o mock de autenticação

Não existe backend conectado ainda (`apps/api`). `src/services/api.ts` simula
uma chamada de rede (delay + sempre sucesso) e retorna um usuário fake.
`src/store/authStore.ts` guarda esse usuário e dispara o redirecionamento
para `/dashboard`. Os pontos que precisarão mudar quando a API real existir
estão marcados com `// TODO(api)` no código.

## Variáveis de ambiente

Veja `.env.example`. Nenhuma é obrigatória hoje (o mock não faz requisições
reais), mas `VITE_API_URL` já está preparada para quando a integração com
`apps/api` for feita.
