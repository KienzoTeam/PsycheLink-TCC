FROM node:26-slim

WORKDIR /app

# package*.json antes do código: o npm ci só refaz quando as dependências mudam.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# O node:26-slim já traz o usuário node (sem privilégios).
USER node

# Sem EXPOSE: o Render fala na PORT que ele define (10000) e o servidor lê PORT.
# migrations/ e scripts/ ficam na imagem para rodar a migração de dentro do contêiner:
#   npx tsx scripts/migrar.ts   (as variáveis já vêm do ambiente; o `npm run migrar` exige um arquivo .env)
CMD ["node", "dist/index.js"]
