# RLS e papel da aplicação

Implementado em `migrations/0003_papel_app_rls.sql`. Medido no banco de dev (branch Neon, PostgreSQL 18).

## Por que um papel novo

`neondb_owner`, dono das tabelas e usado pela aplicação até o WP1, tem `BYPASSRLS` (é membro de `neon_superuser`) e não consegue remover o atributo de si mesmo. `BYPASSRLS` vale até com `FORCE ROW LEVEL SECURITY`, então a policy de `checkin_diario` nunca filtrou nada: sem contexto, com `app.paciente_id = -1` ou com id real, o dono lia as mesmas linhas.

`psychelink_app` é `LOGIN NOSUPERUSER NOBYPASSRLS`, não é dono de nada e só recebe o que a aplicação usa:

- `USAGE` no schema `public`; `SELECT/INSERT/UPDATE/DELETE` nas tabelas; `USAGE/SELECT` nas sequences.
- `auditoria`: só `SELECT/INSERT` (o trigger de imutabilidade continua valendo para o dono).
- `schema_migrations`: nada. Quem migra é o dono.
- `ALTER DEFAULT PRIVILEGES` cobre tabelas e sequences criadas depois por quem roda a migração. Tabela futura só de acréscimo precisa de um `REVOKE` próprio.

`DATABASE_URL` (pooler) usa `psychelink_app`. `DATABASE_URL_DIRETA` continua `neondb_owner` e serve só para migrar e para fixtures de teste.

## Contextos

Toda leitura de tabela com RLS roda numa transação que seta uma variável local (`set_config(..., true)`, compatível com o pooler em modo transaction):

| Helper (`src/lib/contextoseguro.ts`) | Variável | Quem usa |
|---|---|---|
| `comContextoPaciente(id, fn)` | `app.paciente_id` | rotas do mobile (`/checkin`, `/paciente`) |
| `comContextoPsicologo(id, fn)` | `app.psicologo_id` | rotas `/psicologo` |

Sem a variável, `app_paciente_id()` e `app_psicologo_id()` devolvem NULL e nenhuma linha passa (falha fechada). A aplicação continua conferindo o vínculo e o consentimento por categoria; o RLS é a segunda barreira, por linha.

## Policies

Todas `TO psychelink_app`. "Vínculo" é `EXISTS (SELECT 1 FROM vinculo v WHERE v.paciente_id = <paciente da linha> AND v.psicologo_id = app_psicologo_id() AND v.status = 'ativo')`.

| Tabela | Paciente (`app.paciente_id`) | Psicólogo (`app.psicologo_id`) |
|---|---|---|
| `checkin_diario` | tudo, `paciente_id` igual (policy `checkin_isolamento_paciente`, inalterada) | só `SELECT`, com vínculo |
| `habito` | tudo, via `checkin_diario` pai | só `SELECT`, com vínculo via pai |
| `consentimento` | tudo, `paciente_id` igual | só `SELECT`, com vínculo |
| `aplicacao_escala` | tudo, `paciente_id` igual | só `SELECT`, com vínculo |
| `resposta_escala` | tudo, via `aplicacao_escala` pai | só `SELECT`, com vínculo via pai |
| `anotacao_clinica` | nenhuma | tudo, só as próprias (`psicologo_id = app.psicologo_id`) |

`ENABLE` e `FORCE ROW LEVEL SECURITY` em todas. Encerrar o vínculo (`status = 'encerrado'`) tira o acesso na hora, no banco e na aplicação.

## Tabelas sem RLS

| Tabela | Motivo |
|---|---|
| `users`, `psicologo`, `paciente` | Lidas antes de existir contexto: login, cadastro, resolução do perfil e do id do paciente. Não guardam dado clínico. |
| `vinculo`, `codigo_vinculo` | A própria policy consulta `vinculo`; o resgate do código acontece antes de existir vínculo. O acesso é filtrado na aplicação por `psicologo_id` / `paciente_id`. |
| `sessao`, `desafio_2fa`, `verificacoes_email` | Autenticação, sem contexto de paciente ou psicólogo. Guardam só hashes. |
| `auditoria` | Escrita por qualquer fluxo, inclusive o de login; imutável por trigger e por `GRANT`. |
| `escala` | Catálogo, sem dado de pessoa. |
| `alerta`, `mensagem` | Sem rota hoje. Ganham policy quando ganharem (chat e alertas estão fora desta rodada); até lá o papel da app tem `GRANT` mas nenhum código as toca. |

## Banco da equipe (ação manual)

As migrações não rodam no banco da equipe sem confirmação. Quando rodar:

1. Conferir antes da `0004`: `SELECT status, count(*) FROM vinculo GROUP BY 1;` e pacientes com mais de um vínculo `ativo`. A `0004` encerra vínculos fora de `ativo`/`encerrado` e, com mais de um ativo por paciente, mantém o de maior id.
2. Rodar `npm run migrar` (`DATABASE_URL_DIRETA`, como `neondb_owner`). Cria o papel sem senha.
3. Definir a senha fora do repositório, no console do Neon (Roles) ou com `ALTER ROLE psychelink_app PASSWORD '<senha forte>'` como `neondb_owner`. 32 bytes aleatórios em base64url servem.
4. Trocar `DATABASE_URL` do servidor para `psychelink_app` no mesmo host pooler, mantendo `sslmode=verify-full&channel_binding=require`.
5. Conferir: `SELECT current_user, rolbypassrls FROM pg_roles WHERE rolname = current_user;` deve dar `psychelink_app` e `false`.

Sem o passo 4 a aplicação continua funcionando como `neondb_owner`, mas sem RLS efetivo.

## Testes (`test/rls.test.ts`)

- O papel da aplicação tem `rolbypassrls = false`.
- Sem contexto, `pool.query` direto em cada tabela com RLS devolve 0 linhas.
- Psicólogo B, sem vínculo, recebe 0 linhas do paciente de A mesmo com SQL direto no contexto dele; o psicólogo A recebe.
- Contexto de paciente não lê anotação, nem de si mesmo; o de psicólogo não escreve em `checkin_diario`.
- O papel da aplicação não tem `UPDATE` nem `DELETE` em `auditoria`.

Fixtures em tabelas com RLS e a limpeza usam um pool do dono (`dono` em `test/ajuda.ts`).
