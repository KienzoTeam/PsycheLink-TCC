# RLS e dono das tabelas

Fonte: `pg_dump --schema-only` e consultas ao catálogo no banco de dev (branch Neon, PostgreSQL 18.6). O banco da equipe não foi consultado; assuma que é igual até conferir.

## Estado atual

- **Policy (uma):** `checkin_isolamento_paciente` em `checkin_diario`, PERMISSIVE, `ALL`, para `PUBLIC`. USING e WITH CHECK: `paciente_id = NULLIF(current_setting('app.paciente_id', true), '')::integer`. Sem a variável o resultado é NULL, então nenhuma linha passa (falha fechada).
- **RLS ligado:** só `checkin_diario`, com `ENABLE` e `FORCE`. As outras 13 tabelas de `public` não têm RLS: `alerta`, `anotacao_clinica`, `aplicacao_escala`, `consentimento`, `escala`, `habito`, `mensagem`, `paciente`, `psicologo`, `resposta_escala`, `users`, `verificacoes_email`, `vinculo`.
- **Dono:** todas as tabelas pertencem a `neondb_owner`, o mesmo papel que a aplicação usa para conectar.
- **`neondb_owner` tem `BYPASSRLS`** (não é superuser, mas é membro de `neon_superuser`). `BYPASSRLS` ignora RLS mesmo com `FORCE`. O próprio papel não consegue removê-lo (`ALTER ROLE ... NOBYPASSRLS` retorna `permission denied`).

## `comContextoPaciente` protege algo hoje?

Não. Medido em transação revertida:

| Papel | Sem contexto | `app.paciente_id = -1` | Id real |
|---|---|---|---|
| `neondb_owner` (o da app) | 8 linhas | 8 linhas | 8 linhas |
| papel novo, sem `BYPASSRLS` | 0 | 0 | 5 |

A policy está correta. O papel de conexão é que a anula. Todo o isolamento de hoje está na aplicação (`vinculoOuNegar`, `WHERE paciente_id = $1`).

Em `routes/psicologo.ts` o psicólogo lê dados do paciente dentro de `comContextoPaciente(v.paciente_id, ...)`. Quem escolhe o paciente do contexto é o código, depois de conferir o vínculo. A policy atual não verifica vínculo nem psicólogo.

## Recomendação para o WP2

1. **Papel de aplicação não-dono (preferido).** Uma migração, rodada por `DATABASE_URL_DIRETA` como `neondb_owner`, cria `psychelink_app` com `LOGIN NOBYPASSRLS` e concede `USAGE` no schema, `SELECT/INSERT/UPDATE/DELETE` nas tabelas, `USAGE` nas sequences e `ALTER DEFAULT PRIVILEGES` para as tabelas futuras. A senha é definida fora do repo (console do Neon). `DATABASE_URL` (pooler) passa a usar `psychelink_app`; `DATABASE_URL_DIRETA` continua `neondb_owner`, só para migrar. Para um não-dono o RLS vale sem `FORCE`; manter o `FORCE` é defesa extra. Criar um papel de login `NOBYPASSRLS` funciona no Neon (testado, revertido).
2. **Policies por tabela, com `TO psychelink_app`:**
   - paciente: `paciente_id = app.paciente_id` em `consentimento`, `aplicacao_escala`, `consulta`; `habito` e `resposta_escala` via `EXISTS` no pai (`checkin_diario`, `aplicacao_escala`), porque não têm `paciente_id`.
   - psicólogo, só `SELECT`: `EXISTS (SELECT 1 FROM vinculo v WHERE v.paciente_id = <tabela>.paciente_id AND v.psicologo_id = app.psicologo_id AND v.status = 'ativo')`, nas mesmas tabelas e em `anotacao_clinica`.
   - `vinculo`, `users`, `psicologo`, `paciente` ficam sem RLS (login, cadastro e `vinculoOuNegar` leem sem contexto).
   - o consentimento por categoria continua filtrado na aplicação.
3. **`comContextoPsicologo(psicologoId, fn)`** no mesmo molde do atual: `set_config('app.psicologo_id', ..., true)` dentro de transação. Compatível com o pooler do Neon (modo transaction). `resumoPaciente` e a leitura de anotações (`psicologo.ts`, hoje `pool.query` direto em `anotacao_clinica`) passam por ele.
4. **Alternativa, se um segundo login não for viável:** manter a conexão como `neondb_owner` e executar `SET LOCAL ROLE psychelink_rls` (papel `NOLOGIN NOBYPASSRLS`, com `GRANT psychelink_rls TO neondb_owner`) no início de cada `comContexto*`. Foi testado e funciona, mas qualquer consulta fora do contexto continua com `BYPASSRLS` (falha aberta). Só use se a opção 1 não couber.
5. **Testes do WP2:** com `psychelink_app`, `pool.query` direto numa tabela com RLS devolve 0 linhas sem contexto; psicólogo B sem vínculo recebe 0 linhas do paciente de A; `SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user` é `false`. Os helpers de teste que inserem em tabelas com RLS precisam de contexto ou de um pool com `DATABASE_URL_DIRETA`.
