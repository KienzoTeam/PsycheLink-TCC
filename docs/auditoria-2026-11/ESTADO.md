# Estado da execução do plano

Atualizado em 11/11/2026. O plano está em [`PLANO.md`](PLANO.md); o levantamento que o fundamenta, em [`levantamento/INDICE.md`](levantamento/INDICE.md).

## Fase 0: Preparação

| Passo | Estado |
|---|---|
| Árvore limpa | Feito. `apps/server/src/db.ts` restaurado (tinha ` qimport` na linha 1); `npm ci` nos 3 apps |
| Levantamento versionado | Feito nesta branch (`docs/auditoria-2026-11`) |
| Banco de teste | Feito de outro jeito: Postgres 18 local em contêiner, banco vazio `psychelink_teste`, migrado do zero (ver "Como rodar a suíte"). A branch Neon ficou opcional: serve só para medir o fuso e o cold start reais do Neon, e depende de `npx neonctl auth` |
| Trava da suíte (`apps/server/test/ajuda.ts`) | Em andamento; é o primeiro commit do lote A1 |
| Baseline | Feito, abaixo |

## Baseline medido em 11/11 (commit `0864143`)

| Verificação | Resultado |
|---|---|
| `npx tsc --noEmit` no server | limpo |
| `npx tsc --noEmit` no mobile | limpo |
| `npm run build` no web (inclui `tsc --noEmit`) | passa em menos de 1 s |
| Bundle do web | `index` 431,6 kB (136,7 kB gzip); `VisaoGeral` 383,7 kB (110,1 kB gzip, é o `recharts`, só carrega na aba Visão geral do perfil); `psicologoApi` 89,6 kB; `DateRangePicker` 79,4 kB; demais telas entre 3 e 20 kB |
| `npm ci` no server | 0 vulnerabilidades |
| `npx expo install --check` no mobile | 8 pacotes um patch atrás do SDK 58: `expo` 58.0.21 (esperado ~58.0.24), `expo-constants`, `expo-font`, `expo-haptics`, `expo-linear-gradient`, `expo-secure-store`, `expo-status-bar`, `react-native-safe-area-context` 5.10.1 (esperado ~5.11.1). Entra no lote B2 com `npx expo install --fix` |
| `npm run migrar:test` em banco vazio | as 7 migrations aplicam do zero em PostgreSQL 18.6 comum (fora do Neon); 20 tabelas |
| Papel da aplicação | `psychelink_app`, `rolbypassrls = false`, não é superusuário |
| `npm test` no server | **203 testes em 65 suítes: 203 passam, 0 falham**, em 4,2 s; os processos terminam sozinhos |
| Fuso do banco (`SHOW timezone`) | `Etc/UTC` no contêiner. O do Neon não foi medido (o padrão dele também é UTC); se for UTC, um check-in feito depois das 21h de Brasília cai no dia seguinte |

## Como rodar a suíte do server

Precisa de um Postgres 18 local e de `apps/server/.env.test` (fora do git).

```bash
# 1. Postgres descartável (docker ou podman), só em 127.0.0.1
podman run -d --name psychelink-pg-teste -e POSTGRES_PASSWORD=<senha-do-dono> \
  -e POSTGRES_DB=psychelink_teste -p 127.0.0.1:54329:5432 docker.io/library/postgres:18

# 2. apps/server/.env.test: as chaves do .env.example, com
#    DATABASE_URL="postgresql://psychelink_app:<senha-da-app>@127.0.0.1:54329/psychelink_teste"
#    DATABASE_URL_DIRETA="postgresql://postgres:<senha-do-dono>@127.0.0.1:54329/psychelink_teste"
#    SMTP_HOST="" (o código de verificação sai no console e os testes leem de lá), VALIDAR_MX="false"

# 3. Esquema do zero e senha do papel da aplicação
cd apps/server && npm run migrar:test
psql "postgresql://postgres:<senha-do-dono>@127.0.0.1:54329/psychelink_teste" \
  -c "ALTER ROLE psychelink_app PASSWORD '<senha-da-app>'"

# 4. Suíte
npm test
```

Depois de reiniciar a máquina: `podman start psychelink-pg-teste`. O lote A4 troca o passo 1 por um `docker-compose.yml`.

## Próximos passos

1. Opcional: alguém do grupo roda `npx neonctl auth` nesta máquina, para medir o fuso e o cold start reais do Neon.
2. Lote A1 (trava da suíte, CI, testes do check-in que já funciona) e lote B1 (sessão e SOS no app).
3. Portões de viabilidade de Prisma e NativeWind, em branches descartáveis.
4. Revisão multiagente do server; depois mobile e web.
5. `PROPOSTA-DOCUMENTOS.md` até 13/11, para levar à orientadora.

## Pendências do grupo

As da tabela "Pendências do grupo" do plano. A primeira vence em 16/11: perguntar à orientadora se slides, requisitos e casos de teste podem ser alterados.

## Registro

| Data | O que aconteceu |
|---|---|
| 10/11 | Levantamento com 22 agentes de leitura; decisões do grupo sobre Prisma, Tailwind, NativeWind, escopo, tipografia e regras de produto |
| 11/11 | Uma crítica independente mostrou que a primeira versão do plano não cabia no prazo e tinha dois bloqueios (o Render gratuito bloqueia as portas de SMTP; a revisão humana é o gargalo). O plano foi refeito como fila com linha de corte e aprovado. Fase 0 iniciada |
