# Estado da execução do plano

Atualizado em 11/11/2026. O plano está em [`PLANO.md`](PLANO.md); o levantamento que o fundamenta, em [`levantamento/INDICE.md`](levantamento/INDICE.md).

## Fase 0: Preparação

| Passo | Estado |
|---|---|
| Árvore limpa | Feito. `apps/server/src/db.ts` restaurado (tinha ` qimport` na linha 1); `npm ci` nos 3 apps |
| Levantamento versionado | Feito nesta branch (`docs/auditoria-2026-11`) |
| Banco de teste na branch Neon | **Parado: precisa de `npx neonctl auth` rodado por alguém do grupo** |
| Trava da suíte (`apps/server/test/ajuda.ts`) | Pendente; é o primeiro commit do lote A1 |
| Baseline | Parcial, abaixo. Falta a suíte do server, que depende do banco de teste |

## Baseline medido em 11/11 (commit `0864143`)

| Verificação | Resultado |
|---|---|
| `npx tsc --noEmit` no server | limpo |
| `npx tsc --noEmit` no mobile | limpo |
| `npm run build` no web (inclui `tsc --noEmit`) | passa em menos de 1 s |
| Bundle do web | `index` 431,6 kB (136,7 kB gzip); `VisaoGeral` 383,7 kB (110,1 kB gzip, é o `recharts`, só carrega na aba Visão geral do perfil); `psicologoApi` 89,6 kB; `DateRangePicker` 79,4 kB; demais telas entre 3 e 20 kB |
| `npm ci` no server | 0 vulnerabilidades |
| `npx expo install --check` no mobile | 8 pacotes um patch atrás do SDK 58: `expo` 58.0.21 (esperado ~58.0.24), `expo-constants`, `expo-font`, `expo-haptics`, `expo-linear-gradient`, `expo-secure-store`, `expo-status-bar`, `react-native-safe-area-context` 5.10.1 (esperado ~5.11.1). Entra no lote B2 com `npx expo install --fix` |
| `npm test` no server | não rodou: falta `apps/server/.env.test` |
| Fuso do banco (`SHOW timezone`) | não medido: depende do banco de teste |

## Próximos passos

1. Alguém do grupo roda `npx neonctl auth` nesta máquina. Com isso eu crio a branch Neon `revisao-tcc-2026-11`, o banco vazio `psychelink_teste` e o `.env.test`.
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
