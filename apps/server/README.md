# PsycheLink — Server

Backend do PsycheLink: Express + TypeScript + PostgreSQL.

## Rodando localmente

1. Crie um banco Postgres (ex.: [Neon](https://neon.tech), gratuito) e pegue
   a `DATABASE_URL` de conexão.
2. Aplique o schema:
   ```bash
   psql "$DATABASE_URL" -f schema.sql
   ```
3. Configure o `.env`:
   ```bash
   cp .env.example .env
   ```
   Preencha pelo menos `DATABASE_URL` e `JWT_SECRET` (qualquer string longa
   e aleatória serve em dev). Sem `SMTP_HOST` configurado, os códigos de
   verificação de e-mail aparecem apenas no console do servidor — o
   suficiente para testar o fluxo localmente sem configurar um SMTP de
   verdade.
4. Instale as dependências e suba o servidor:
   ```bash
   npm install
   npm run dev
   ```
   Por padrão sobe em `http://localhost:3000` (ver `PORT` no `.env`).

## Scripts

| Comando        | Descrição                                      |
| -------------- | ----------------------------------------------- |
| `npm run dev`   | Sobe o servidor com reload automático (`tsx watch`) |
| `npm run build` | Compila para `dist/` (`tsc`)                     |
| `npm start`     | Roda o build compilado (`node dist/index.js`)    |

## Rotas

Todas as rotas de auth ficam sob `/` (sem prefixo) — ver
`src/routes/auth.ts`:

| Método | Rota                     | Descrição                                      |
| ------ | ------------------------ | ----------------------------------------------- |
| POST   | `/registro`               | Cria/atualiza cadastro pendente e envia código   |
| POST   | `/verificar-email`        | Confirma o código de 6 dígitos do cadastro       |
| POST   | `/reenviar-codigo`        | Reenvia o código (cooldown de 1 minuto)          |
| POST   | `/login`                  | Login — retorna JWT                              |
| GET    | `/me`                     | Dados do usuário logado (requer `Authorization`) |
| POST   | `/esqueci-senha`          | Envia código de redefinição de senha             |
| POST   | `/verificar-codigo-senha` | Confirma o código e retorna um token temporário  |
| POST   | `/redefinir-senha`        | Define a nova senha com o token acima            |

Rotas de psicólogo ficam sob `/psicologo` (ver `src/routes/psicologo.ts`),
protegidas por JWT.

## Banco de dados

`schema.sql` contém as tabelas usadas pelo código (`users`,
`verificacoes_email`, `psicologo`, `paciente`, `vinculo`, `alerta`),
inferidas a partir das queries em `src/`. Ajuste conforme o projeto evoluir.
