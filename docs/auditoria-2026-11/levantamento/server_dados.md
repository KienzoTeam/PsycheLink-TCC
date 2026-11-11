# Server: camada de dados

> Levantamento em modo leitura, 10 e 11/11/2026. Agente `server_dados`, Opus 5.5 (effort high). Nada foi executado além de leitura de código, `npm view/audit/outdated` e documentação pública; "verificado" quer dizer lido no código, não testado. Linhas citadas são do commit `0864143`.

## Resumo

Mapeamento da camada de dados de apps/server. Li inteiros db.ts, as libs centrais, as 7 migrations, migrar.ts, docs/rls.md e todas as rotas. Nada foi executado.
O desenho é sólido para um TCC. Há um papel da aplicação sem BYPASSRLS, FORCE RLS, contexto por set_config(...,true) dentro de transação (compatível com o pooler), EXCLUDE gist na agenda, índices únicos parciais (vínculo ativo, aplicação aberta, código aberto), UPDATE...WHERE...RETURNING no 2FA e no refresh, advisory lock por e-mail no cadastro e trigger de auditoria imutável.
Problemas verificados no código: (1) o OTP do paciente lê, compara e só depois incrementa as tentativas, então requisições paralelas passam do limite de 5; (2) não há UNIQUE em psicologo.crp, e duas verificações simultâneas podem deixar dois psicólogos verificados com o mesmo CRP; (3) obterOuCriarPacienteId não é atômico e dá 500 na corrida; (4) checkin_diario.data usa CURRENT_DATE em UTC, então o "um por dia" corta às 21h de Brasília; (5) GET /checkin/resumo devolve os 30 check-ins mais antigos, não os mais recentes; (6) os hábitos enviados no check-in são validados e descartados (a tabela habito nunca é gravada).
Outros pontos: o pool não define max, connectionTimeout nem statement_timeout; o cadastro de psicólogo segura transação e locks durante o envio SMTP; a auditoria é gravada fora da transação da ação; a cifra AES-GCM não usa AAD nem versão de chave; o pepper cai para JWT_SECRET ou ''.
Para Prisma: cerca de 135 linhas com .query em src (contagem por grep). O código usa muito CTE de escrita, LATERAL, ON CONFLICT, FOR UPDATE/SHARE OF, advisory lock, set_config, RLS, triggers SECURITY DEFINER, EXCLUDE gist e AT TIME ZONE, recursos que o Prisma não modela.

## Relatório

# Camada de dados do servidor (apps/server)

Legenda: **[V]** verificado (li o arquivo), **[S]** suspeita (não verifiquei, ou é inferência).

## 1. Esquema

**Tabelas da baseline** (`migrations/0001_baseline.sql`, um pg_dump): `users`, `paciente`, `psicologo`, `vinculo`, `consentimento`, `checkin_diario`, `habito`, `escala`, `aplicacao_escala`, `resposta_escala` (legada), `anotacao_clinica`, `alerta`, `mensagem` (sem rota), `verificacoes_email`. As 0002 a 0006 criam `sessao` (uuid), `desafio_2fa`, `auditoria` (bigint identity), `codigo_vinculo` e `consulta`. **[V]**

**UNIQUE [V]**
- `users.email` (0001:707). O e-mail é normalizado para minúsculas em `validarEmail.ts:13`.
- `paciente.user_id`, `psicologo.user_id`, `consentimento.paciente_id`, `habito.checkin_id`.
- `uk_paciente_data (paciente_id, data)` em checkin_diario (0001:691).
- `uk_aplicacao_questao`.
- `uk_escala_sigla` (0005:12).
- Índices únicos parciais: `uk_vinculo_ativo_paciente ... WHERE status='ativo'` (0004:29), `uk_codigo_vinculo_aberto (codigo_hmac) WHERE usado_em IS NULL AND revogado_em IS NULL` (0004:46) e `uk_aplicacao_aberta (paciente_id, escala_id) WHERE status IN ('pendente','em_andamento')` (0005:129).
- **Não existe UNIQUE em `psicologo.crp`.**

**CHECK [V]:** intensidades de 1 a 10; `vinculo_status_check`; `aplicacao_escala_status_check`; `aplicacao_escala_concluida_check` (concluída exige score, respondido_em e respostas_cifradas); `consulta_status_check`; `consulta_duracao_check` (de 15 min a 4 h); `auditoria_ator_papel_check`.

**EXCLUDE [V]:** `consulta_sem_sobreposicao EXCLUDE USING gist (psicologo_id WITH =, tstzrange(inicio,fim) WITH &&) WHERE (status='agendada')`, com btree_gist (0006:3,23).

**Enums:** não há tipos ENUM. Os estados são text/varchar com CHECK. **[V]**

**Índices redundantes [V]:** `idx_paciente_user` e `idx_psicologo_user` repetem o UNIQUE(user_id); `idx_checkin_paciente_data` repete `uk_paciente_data`.

**Funções e triggers [V]**
- `auditoria_imutavel()` (0002:56): trigger BEFORE UPDATE OR DELETE que só deixa passar o SET NULL das FKs.
- `app_paciente_id()` e `app_psicologo_id()` (0003:27): SQL STABLE, sem SECURITY DEFINER.
- `cancelar_aplicacoes_do_vinculo()` (0005:164) e `cancelar_consultas_do_vinculo()` (0006:63): **SECURITY DEFINER** com `SET search_path = public, pg_temp`, disparadas por AFTER UPDATE OF status em vinculo quando o status vai de ativo para encerrado.

**Colunas cifradas [V]:** `checkin_diario.emocao_predominante`, `contexto_gatilho`, `diario_livre`; `aplicacao_escala.respostas_cifradas`; `anotacao_clinica.conteudo`; `consulta.observacao`; `mensagem.conteudo_cifrado`.

**"Log imutável" [V]:** três camadas.
1. O trigger bloqueia UPDATE e DELETE, inclusive para o dono.
2. `REVOKE UPDATE, DELETE ON auditoria FROM PUBLIC` e `FROM psychelink_app` (0002:73, 0003:17).
3. O papel da aplicação não recebe TRUNCATE.

Limites: o dono pode fazer TRUNCATE (trigger de linha não dispara) ou `DISABLE TRIGGER`; não há encadeamento de hash; a gravação acontece fora da transação da ação (ver §3).

## 2. RLS

**Papéis [V]:** `neondb_owner` é dono, tem BYPASSRLS e é usado só para migrar e nas fixtures (`DATABASE_URL_DIRETA`). `psychelink_app` é `LOGIN NOSUPERUSER NOBYPASSRLS` (0003:7) e é o que a aplicação usa (`DATABASE_URL`, pooler).

**ENABLE + FORCE [V]:** checkin_diario, habito, consentimento, anotacao_clinica, aplicacao_escala, resposta_escala, consulta.

**Políticas por tabela [V]**
- O paciente tem acesso total às próprias linhas (`= app_paciente_id()`). Em habito e resposta_escala o acesso vem do registro pai.
- O psicólogo tem SELECT com `EXISTS vinculo ativo`.
- aplicacao_escala: INSERT só com `status='pendente'`; UPDATE só para virar `cancelada`. Desde a 0005 o psicólogo só lê o que ele mesmo aplicou.
- consulta: SELECT, INSERT e UPDATE para o psicólogo, sem DELETE; o paciente só lê.
- anotacao_clinica: só o psicólogo que escreveu.

**Sem RLS [V]:** users, paciente, psicologo, vinculo, codigo_vinculo, sessao, desafio_2fa, verificacoes_email, auditoria, escala, alerta, mensagem. Nessas tabelas o isolamento depende só do WHERE da aplicação.

**Contexto [V]:** `SELECT set_config($1,$2,true)` dentro de BEGIN/COMMIT (`contextoseguro.ts:23-27`). O valor vale só na transação, o que é compatível com PgBouncer em modo transação. Não se usa `SET LOCAL` e o nível de isolamento é o padrão, READ COMMITTED.

**Query fora do helper [V]:** em tabela com RLS, a leitura volta com 0 linhas (falha fechada) e a escrita falha com violação de RLS. Em tabela sem RLS, a query passa sem filtro. `vinculoAtivoDe()` e `vinculoOuNegar()` (`lib/vinculo.ts`) repetem a regra na aplicação, e `test/comoDono.ts` testa a aplicação rodando como dono.

**Dependência [V]:** as funções SECURITY DEFINER só cancelam algo porque o dono tem BYPASSRLS (`docs/rls.md:60`).

## 3. Pool e conexões

**Configuração** (`db.ts:7-13`) **[V]:** só `idleTimeoutMillis` de 4 min e `keepAlive`. Não define `max` (o padrão do pg é 10 **[S]**), `connectionTimeoutMillis` (o padrão espera para sempre **[S]**), `statement_timeout`, `query_timeout` nem `idle_in_transaction_session_timeout`. O SSL vem do `sslmode=verify-full` da URL. Há um `pool.on('error')` que só registra o erro.

**Transações [V]**
- `emTransacao` faz BEGIN, COMMIT e ROLLBACK, e chama `release()` no finally. Se o próprio ROLLBACK falhar, o erro do ROLLBACK sobe e esconde o original, e o client é devolvido ao pool com `release()` em vez de `release(err)`, então uma conexão quebrada pode voltar a ser usada. **[V]/[S]**
- `/registro-psicologo` gerencia a transação na mão (`auth-psicologo.ts:305-410`) e **espera o SMTP com a transação aberta, o advisory lock e o `FOR UPDATE OF u`** (linha 377). No pooler isso prende uma conexão de servidor por segundos.
- Locks em uso: `pg_advisory_xact_lock(hashtext(email))` (`auth.ts:161`, `auth-psicologo.ts:309`); `FOR SHARE` em users (`auth-psicologo.ts:156`); `FOR UPDATE OF c` (`paciente/vinculo.ts:69`); `FOR UPDATE OF a` (`paciente/escalas.ts:94`); `FOR UPDATE` em consentimento (`consentimento.ts:79`); `FOR SHARE OF v` (`lib/vinculo.ts:54`, `consultas.ts:116,205`).
- `registrarAuditoria` usa `pool.query` direto, depois do COMMIT da ação. Se a auditoria falhar, a ação fica gravada sem registro e a resposta é 500.

## 4. Corridas

| Fluxo | Local | 2 requisições iguais e simultâneas | Proteção |
|---|---|---|---|
| Cadastro paciente (e-mail) | auth.ts:160-196 | serializadas pelo lock | advisory lock + UNIQUE email **[V]** |
| Cadastro psicólogo (e-mail) | auth-psicologo.ts:309-320 | serializadas | advisory lock + FOR UPDATE + UNIQUE **[V]** |
| CRP duplicado | auth-psicologo.ts:336; auth.ts:236-245 | dois e-mails com o mesmo CRP confirmados ao mesmo tempo: em READ COMMITTED, cada `NOT EXISTS` não vê o commit do outro e **os dois ficam verificados** | **nada**; o banco sozinho não resolve sem uma coluna "verificado" em psicologo + UNIQUE parcial, ou um advisory lock por CRP **[V]** |
| OTP de e-mail e senha (paciente) | auth.ts:112-133 | lê `tentativas`, compara e só depois faz `+1`; N chamadas paralelas com tentativas=4 testam N códigos | **nada** no banco; só o rate limit por IP em memória (10/15 min, MemoryStore por processo) **[V]** |
| Consumo do OTP | auth.ts:319-331 | as duas recebem token de redefinição; o token JWT pode ser reusado por 10 min | nada **[V]** |
| Reenvio/cooldown | auth.ts:135-141, 269 | dois e-mails; vale o último código | nada (leitura e decisão separadas) **[V]** |
| 2FA (tentativas) | auth-psicologo.ts:131-136 | cada uma consome uma tentativa | UPDATE...WHERE tentativas<5 RETURNING **[V]** |
| 2FA (uso único) | auth-psicologo.ts:159-165 | só uma abre sessão | UPDATE WHERE usado_em IS NULL **[V]** |
| Login 2FA | auth-psicologo.ts:106-114 | dois desafios vivos (UPDATE e INSERT fora de transação) | nada; baixo impacto **[V]** |
| Refresh | auth-psicologo.ts:256-263 | uma vence, a outra recebe 409 | CAS `WHERE refresh_hash=$3` **[V]** |
| Código de vínculo (uso) | paciente/vinculo.ts:63-93 | dois pacientes: o segundo espera o lock, reavalia e recebe 400 | FOR UPDATE + UNIQUE parcial **[V]** |
| Um vínculo ativo | idem | o segundo resgate do mesmo paciente recebe 23505 e 409 | `uk_vinculo_ativo_paciente` **[V]** |
| Limite de 10 códigos | psicologo/vinculo.ts:24-29 | as duas contam 9 e inserem | nada (count em subquery) **[V]** |
| Criar paciente | lib/paciente.ts:9-18 | as duas fazem SELECT null, as duas fazem INSERT, uma estoura 23505 e devolve **500** | só o UNIQUE; falta `ON CONFLICT` **[V]** |
| Check-in diário | checkin.ts:179-208 | a segunda recebe 409 | `uk_paciente_data` **[V]**; o dia é **UTC** (`DEFAULT CURRENT_DATE`, TimeZone GMT conforme `lib/checkins.ts:5`) |
| Resposta de escala | paciente/escalas.ts:88-136 | a segunda espera, não acha aberta e compara as respostas decifradas: sucesso idêntico | FOR UPDATE OF a **[V]** |
| Solicitar escala | psicologo/escalas.ts:70 | 409 | `uk_aplicacao_aberta` **[V]** |
| Consultas | consultas.ts:113-129 | a segunda recebe 23P01 e 409 | EXCLUDE gist **[V]** |
| Remarcar | consultas.ts:202-223 | a segunda não acha `agendada` e recebe 404 | lock de vínculo + UPDATE condicional **[V]** |
| Encerrar vínculo | pacientes.ts:401; paciente/vinculo.ts:120 | a segunda recebe 404 | UPDATE WHERE status='ativo' RETURNING; triggers **[V]**. `anotacoes POST` não usa `travar` |
| Consentimento | consentimento.ts:77-99 | upsert correto; no primeiro uso as duas leem "nada" e podem gerar auditoria em dobro | ON CONFLICT + FOR UPDATE (que não trava linha inexistente) **[V]** |
| Numeração da exportação | relatorios.ts:249 | dois números | identity da auditoria: único, com lacunas, global (revela o volume de eventos do sistema) **[V]** |

**Proteção só em memória do processo:** os rate limits (`express-rate-limit` sem store compartilhado), que são a única barreira do OTP do paciente. O banco resolveria com `UPDATE verificacoes_email SET tentativas=tentativas+1 WHERE email=$1 AND tentativas<5 AND expira_em>now() RETURNING codigo_hash`, o mesmo padrão já usado no 2FA.

## 5. Idempotência

- **Retry seguro:** resposta de escala (comparação explícita), refresh (409 com retry), encerramento (404), PUT de consentimento (upsert), revogar código (404).
- **Retry duplica:** anotação, código de vínculo, consulta em outro horário, exportação. Nenhuma rota usa chave de idempotência.
- **Retry dá erro mesmo com a primeira gravação feita:** check-in (409 "já registrou").

## 6. Criptografia de campo

- **Algoritmo e formato [V]** (`criptografia.ts`): AES-256-GCM, IV aleatório de 12 B por chamada, tag de 16 B, guardado como texto `iv.tag.dados` em base64.
- **Sem AAD:** o texto cifrado não fica amarrado a linha, coluna ou paciente e pode ser trocado de lugar sem detecção.
- **Chave:** uma só, `ENCRYPTION_KEY` (32 B em base64, lida a cada chamada). Não há versão ou id de chave nem rotina de rotação.
- **Erros escondidos:** `lerSeguro` engole falhas de decifração e devolve null, o que esconde chave errada ou corrupção.
- **Em claro [V]:** intensidades, sono, qualidade, scores, subscores, `item9_diferente_de_zero` (marcador de ideação suicida), datas, nome, e-mail, data de nascimento, telefone, CRP, IP, metadados da auditoria. Motivo declarado: séries e agregação em SQL.
- **Hashes [V]:** `HASH_REFERENCIA` é um bcrypt de constante para igualar o tempo de resposta, não é HMAC. O OTP usa `sha256(codigo:email:PEPPER)` e o código de vínculo usa `HMAC-SHA256(PEPPER, 'vinculo:'+codigo)`. `PEPPER = EMAIL_PEPPER || JWT_SECRET || ''` (`codigo.ts:3`). Sem pepper, um espaço de 10^6 códigos é revertido offline a partir do banco. `index.ts` não exige EMAIL_PEPPER.

## 7. Consultas custosas

- **Bug [V]:** `checkin.ts:223-228` faz `ORDER BY data ASC LIMIT 30` e devolve os 30 check-ins mais antigos.
- **Varredura em lotes [V]:** a busca por emoção (`psicologo/checkins.ts:74`) faz até 10 queries de 100 linhas e decifra em JS. É inevitável com a cifra atual.
- **Auditoria [S]:** `psicologo/auditoria.ts:98-111` usa `OR` + `EXISTS` e filtra por `(t.em AT TIME ZONE)::date`, o que provavelmente leva a seq scan numa tabela que só cresce. O mesmo vale para a "atividade" do dashboard (filtro por `acao`, sem índice).
- **Filtros que não usam índice [S]:** `(inicio AT TIME ZONE ...)::date BETWEEN` em relatorios.ts:117,167.
- **Sem LIMIT [V]:** `/vinculo/historico`, `/anotacoes`, `/me/sessoes`. `anotacao_clinica` não tem índice por (psicologo_id, paciente_id).
- **Agregação em JS [V]:** médias do painel (`checkin.ts:330`) poderiam ser `avg` em SQL.
- **Limpeza [V]:** nada apaga `sessao` nem `desafio_2fa`.
- **Hábitos descartados [V]:** a tabela `habito` nunca é gravada, e `habitos` do checkinSchema (`schemas.ts:50`) é validado e jogado fora.

## 8. Fatos para migrar a Prisma

**Linhas com `.query` (grep) [V]:** auth-psicologo 25, auth 20, pacientes 10, dashboard 9, consultas(psi) 7, paciente/vinculo 7, relatorios 6, escalas(psi) 6, escalas(pac) 5, consentimento 5, conta 5, checkin 4, sessaoWeb 4, psi/vinculo 4, contextoseguro 4, checkins(psi) 3, paciente.ts 2, consultas(pac) 2, auditoria(psi) 2, e 1 cada em auditoria.ts, psicologo/index, resumo, lib/vinculo, lib/escalas. Total em src: cerca de 135. Fora de src: seed-dev 16, migrar 8.

**Recursos de SQL em uso [V]:** CTE de escrita (`WITH a AS (UPDATE/INSERT ... RETURNING)`), LATERAL, UNION ALL paginado por comparação de tupla (keyset), `count(*) FILTER`, `generate_series`, ON CONFLICT DO UPDATE/NOTHING, RETURNING, UPDATE ... FROM, FOR UPDATE/SHARE OF, `pg_advisory_xact_lock`, `set_config`, RLS, funções e triggers SECURITY DEFINER, EXCLUDE gist, índices parciais, `tstzrange`, intervalos, `AT TIME ZONE` duplo (colunas timestamp sem fuso misturadas com timestamptz), `to_char`, `json_build_object`, jsonb, inet/`host()`, ILIKE com escape. Não há window functions nem bytea.

**O que o Prisma não modela [S]:** EXCLUDE, policies, triggers e funções. Isso ficaria em SQL cru dentro das migrations. RLS exigiria `$transaction` interativa com `set_config` em cada transação.

**Testes [V]:** usam um Neon real (`.env.test`); `pool` como app e `dono` como owner (`test/ajuda.ts:14`); `comoDono.ts` troca a URL; um teste de concorrência real em `cadastro-concorrente.test.ts`.

**Runner [V]** (`scripts/migrar.ts`):
- tabela `schema_migrations(nome PK, aplicado_em)`;
- arquivos aplicados em ordem lexical, cada um numa transação junto com o próprio registro;
- pula a baseline se `public.users` existir;
- sem checksum, sem lock contra dois runners ao mesmo tempo, sem down migrations.

Ao migrar para Prisma Migrate será preciso criar uma baseline com `migrate resolve` **[S]**. Versões no npm em 2026-11-10: `pg` 8.23.1; a dist-tag latest de `prisma` aponta para 8.0.0-rc.33 (confirmar a versão estável antes de adotar). **[V via registry]**

## Achados

| Severidade | Confiança | Achado | Onde | Detalhe |
|---|---|---|---|---|
| alta | verificado | Limite de tentativas do OTP do paciente não é atômico | apps/server/src/routes/auth.ts:112-133 | conferirCodigo lê tentativas, compara e só depois faz +1, em queries separadas. Requisições paralelas com tentativas=4 testam vários códigos. A única outra barreira é o rate limit em memória por IP. Correção: UPDATE ... SET tentativas=tentativas+1 WHERE email=$1 AND tentativas<5 AND expira_em>now() RETURNING codigo_hash, como já é feito no 2FA. |
| media | verificado | CRP sem UNIQUE: verificação simultânea aceita CRP duplicado | apps/server/src/routes/auth.ts:236-245; migrations/0001_baseline.sql:322 | A unicidade do CRP depende de NOT EXISTS em READ COMMITTED. Duas confirmações de e-mail simultâneas com o mesmo CRP deixam os dois verificados. Precisa de restrição no banco (coluna de verificação em psicologo + UNIQUE parcial) ou de um advisory lock por CRP. |
| media | verificado | obterOuCriarPacienteId com corrida gera 500 | apps/server/src/lib/paciente.ts:9-18 | Faz SELECT e depois INSERT sem ON CONFLICT. Duas primeiras requisições simultâneas (check-in, vínculo, consentimento) fazem uma delas estourar paciente_user_id_key e devolver 500. Correção: INSERT ... ON CONFLICT (user_id) DO UPDATE SET user_id=EXCLUDED.user_id RETURNING id. |
| media | provavel | Dia do check-in é calculado em UTC | migrations/0001_baseline.sql:114; src/lib/checkins.ts:5 | data DEFAULT CURRENT_DATE com TimeZone GMT (segundo o comentário no código). Um check-in depois das 21h de Brasília conta no dia seguinte, e o paciente recebe 409 na manhã seguinte. CURRENT_DATE - 6 nas visões do psicólogo também usa UTC. |
| media | verificado | /checkin/resumo devolve os 30 check-ins mais antigos | apps/server/src/routes/checkin.ts:223-228 | ORDER BY data ASC LIMIT 30. Quando houver mais de 30 registros, o gráfico do app fica preso ao início do histórico. |
| media | verificado | Hábitos do check-in são descartados | apps/server/src/schemas.ts:50; src/routes/checkin.ts:181 | O campo habitos é validado e nunca gravado. A tabela habito não recebe INSERT em src, e as visões do psicólogo sempre mostram hábitos null. |
| media | verificado | Transação e locks presos durante o SMTP no cadastro de psicólogo | apps/server/src/routes/auth-psicologo.ts:305-398 | enviarCodigo roda com BEGIN aberto, advisory lock e FOR UPDATE. No pooler em modo transação isso prende uma conexão de servidor pelo tempo do SMTP. Junto com o pool sem connectionTimeout, pode esgotar conexões. |
| media | verificado | Pool sem timeouts nem max explícito | apps/server/src/db.ts:7-13 | Não define connectionTimeoutMillis, statement_timeout nem idle_in_transaction_session_timeout. Com o pool esgotado, as requisições esperam indefinidamente. |
| media | verificado | Auditoria gravada fora da transação da ação | apps/server/src/lib/auditoria.ts:38 | registrarAuditoria usa pool.query depois do COMMIT. Se a auditoria falhar, a ação fica feita sem registro e a resposta é 500. O 'log imutável' também não cobre TRUNCATE nem DISABLE TRIGGER pelo dono, e não tem encadeamento de hash. |
| media | verificado | Pepper cai para JWT_SECRET ou string vazia | apps/server/src/lib/codigo.ts:3; src/index.ts:4 | EMAIL_PEPPER não é obrigatório. Sem ele, o hash do OTP e o HMAC do código de vínculo usam JWT_SECRET (reuso de chave) ou ''. Com '', um espaço de 10^6 códigos é revertido offline a partir do banco. |
| baixa | verificado | AES-GCM sem AAD e sem versão de chave | apps/server/src/lib/criptografia.ts:30-62 | O texto cifrado não fica amarrado a paciente, linha ou coluna e pode ser trocado de lugar sem detecção. Uma chave única sem id impede rotação gradual. lerSeguro engole erros de decifração e esconde chave errada. |
| baixa | verificado | Marcador do item 9 do PHQ-9 em claro | migrations/0007_phq9_item9.sql:3 | item9_diferente_de_zero (ideação suicida) e os scores ficam em claro por necessidade de consulta. É uma decisão consciente, mas deve aparecer na justificativa LGPD art. 11 do TCC. |
| baixa | verificado | Consumo do OTP de redefinição não é único e o token pode ser reusado | apps/server/src/routes/auth.ts:319-331, 348-371 | Duas verificações paralelas recebem dois JWTs. O JWT de redefinição pode ser usado várias vezes por 10 min. |
| baixa | suspeita | Listagem de auditoria provavelmente faz seq scan | apps/server/src/routes/psicologo/auditoria.ts:89-113; src/routes/psicologo/dashboard.ts:105-124 | OR com EXISTS e filtro por expressão de data impedem o uso dos índices (ator, criado_em) e (paciente, criado_em). Não rodei EXPLAIN. |
| info | verificado | Limite de 10 códigos de vínculo pode ser ultrapassado | apps/server/src/routes/psicologo/vinculo.ts:24-29 | O count em subquery dentro do INSERT não serializa requisições concorrentes. |
| info | verificado | Sessões e desafios 2FA nunca são apagados; índices redundantes | migrations/0002_sessao_auditoria.sql; migrations/0001_baseline.sql:747-768 | Nada faz DELETE em sessao ou desafio_2fa. idx_paciente_user, idx_psicologo_user e idx_checkin_paciente_data repetem índices UNIQUE. |
| info | verificado | Runner de migrations sem lock nem checksum | apps/server/scripts/migrar.ts:8-49 | Cada arquivo roda numa transação, mas dois runners simultâneos podem aplicar a mesma migration, e editar um arquivo já aplicado não é detectado. |

## Perguntas para o grupo

- O dia do check-in deve seguir o calendário de São Paulo? Se sim, a coluna data precisa ser preenchida com (now() AT TIME ZONE 'America/Sao_Paulo')::date.
- Os hábitos do check-in (exercício, meditação, medicação) devem ser gravados na tabela habito ou o campo deve sair do app?
- O banco da equipe já usa psychelink_app na DATABASE_URL (passo 4 do docs/rls.md), ou a aplicação ainda roda como neondb_owner, sem RLS efetivo?
- Na migração para Prisma, a ideia é manter RLS, triggers e EXCLUDE em SQL cru dentro das migrations e aceitar $queryRaw nas consultas com LATERAL e CTE de escrita?
- EMAIL_PEPPER está definido em todos os ambientes? Ele pode passar a ser obrigatório no index.ts?
- O número do relatório exportado precisa ser sequencial por psicólogo, ou o id global da auditoria basta?
