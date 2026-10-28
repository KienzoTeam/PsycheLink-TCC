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
| `aplicacao_escala` | tudo, `paciente_id` igual | `SELECT` e `INSERT` com vínculo e `psicologo_id` próprio; `UPDATE` só para virar `cancelada` (0005) |
| `resposta_escala` | tudo, via `aplicacao_escala` pai | só `SELECT`, com vínculo via pai (legada, ver abaixo) |
| `anotacao_clinica` | nenhuma | tudo, só as próprias (`psicologo_id = app.psicologo_id`) |
| `consulta` | só `SELECT`, `paciente_id` igual | `SELECT`, `INSERT` e `UPDATE` com vínculo e `psicologo_id` próprio; sem `DELETE` (0006) |

`ENABLE` e `FORCE ROW LEVEL SECURITY` em todas. Encerrar o vínculo (`status = 'encerrado'`) tira o acesso na hora, no banco e na aplicação.

## Escritas do psicólogo (0005 e 0006)

Até a 0004 o psicólogo só lia (a única escrita dele, `anotacao_clinica`, era "tudo, só as próprias"). Escalas e consultas pedem escrita, então entraram policies por comando, sem `FOR ALL`:

- `aplicacao_escala`: `INSERT` exige `status = 'pendente'`; `UPDATE` exige `status = 'cancelada'` depois da escrita, então o psicólogo não consegue gravar score nem resposta. Quem responde é o paciente, pela policy dele. A policy de leitura da 0003 passou a exigir também `psicologo_id = app_psicologo_id()`: as aplicações de um psicólogo anterior no mesmo paciente (e as respostas por item delas) não aparecem para o seguinte.
- `consulta`: sem `DELETE`. A consulta muda de status em vez de sumir. O paciente lê as suas, mas as rotas dele nunca selecionam `observacao`, que é texto do psicólogo; o RLS é por linha, a coluna fica por conta da consulta SQL.
- Escrever com `psicologo_id` de outro, ou em paciente sem vínculo ativo, falha com `row-level security`.

## Triggers de encerramento do vínculo

`trg_vinculo_encerrado_aplicacoes` (0005) e `trg_vinculo_encerrado_consultas` (0006) rodam quando um vínculo vai de `ativo` para `encerrado`, seja pelo psicólogo ou pelo paciente:

- cancelam as aplicações abertas daquele par. Sem isso uma aberta esquecida bloquearia a mesma escala pedida pelo próximo psicólogo (409 sem causa visível) e o paciente ainda a responderia para ninguém.
- cancelam as consultas futuras agendadas. Sem vínculo o psicólogo não as enxerga, e elas continuariam ocupando o horário dele.

As funções são `SECURITY DEFINER` (dono = quem migra), porque o papel da aplicação não passa pela RLS sem contexto. Isso depende de o dono ter `BYPASSRLS`, como o `neondb_owner`; num dono sem o atributo a `FORCE` valeria para a função e ela não cancelaria nada.

## `resposta_escala` (legada)

As respostas por item moram em `aplicacao_escala.respostas_cifradas`: um JSON cifrado com `criptografar`, gravado na mesma `UPDATE` do score. A tabela antiga guarda `valor_resposta integer` em claro; usá-la deixaria cada item legível no banco. Ela fica sem uso e sem linhas, com `COMMENT` apontando para a coluna nova. A policy dela não mudou.

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
   Conferir antes da `0005`: `SELECT status, count(*) FROM aplicacao_escala GROUP BY 1;`. Status fora do ciclo novo viram `cancelada`, abertas duplicadas do mesmo (paciente, escala) ficam só com a mais nova, e uma linha `concluida` sem score nem respostas faria a migração falhar no `CHECK` (nenhuma rota gravava isso até aqui).
2. Rodar `npm run migrar` (`DATABASE_URL_DIRETA`, como `neondb_owner`). Cria o papel sem senha. A `0006` roda `CREATE EXTENSION btree_gist`, que o dono do Neon pode criar.
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
- `consulta` entra na lista das tabelas sem contexto (0 linhas), no isolamento entre psicólogos e no do paciente.
- `test/escalas.test.ts` e `test/consultas.test.ts` cobrem as escritas: solicitar sem vínculo ou com `psicologo_id` alheio, gravar score como psicólogo, apagar, alterar consulta como paciente, e os triggers de encerramento.

Fixtures em tabelas com RLS e a limpeza usam um pool do dono (`dono` em `test/ajuda.ts`).
