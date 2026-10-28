-- Papel de aplicação sem BYPASSRLS e policies de RLS por contexto (ver docs/rls.md).
-- A senha de psychelink_app não vive no repositório: ALTER ROLE psychelink_app PASSWORD '...'.

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'psychelink_app') THEN
        CREATE ROLE psychelink_app LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
    END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO psychelink_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO psychelink_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO psychelink_app;

-- A auditoria é só de acréscimo; o controle de migrações é do dono.
REVOKE UPDATE, DELETE ON auditoria FROM psychelink_app;
REVOKE ALL ON schema_migrations FROM psychelink_app;

-- Tabelas futuras criadas por quem roda a migração. Quem criar outra tabela só de acréscimo
-- precisa repetir o REVOKE acima.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO psychelink_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO psychelink_app;

-- Contexto da requisição, definido por set_config(..., true) dentro da transação.
-- Sem a variável (ou vazia) o resultado é NULL e nenhuma linha passa.
CREATE OR REPLACE FUNCTION app_paciente_id() RETURNS integer LANGUAGE sql STABLE AS
$$ SELECT NULLIF(current_setting('app.paciente_id', true), '')::integer $$;

CREATE OR REPLACE FUNCTION app_psicologo_id() RETURNS integer LANGUAGE sql STABLE AS
$$ SELECT NULLIF(current_setting('app.psicologo_id', true), '')::integer $$;

ALTER TABLE habito ENABLE ROW LEVEL SECURITY;
ALTER TABLE habito FORCE ROW LEVEL SECURITY;
ALTER TABLE consentimento ENABLE ROW LEVEL SECURITY;
ALTER TABLE consentimento FORCE ROW LEVEL SECURITY;
ALTER TABLE anotacao_clinica ENABLE ROW LEVEL SECURITY;
ALTER TABLE anotacao_clinica FORCE ROW LEVEL SECURITY;
ALTER TABLE aplicacao_escala ENABLE ROW LEVEL SECURITY;
ALTER TABLE aplicacao_escala FORCE ROW LEVEL SECURITY;
ALTER TABLE resposta_escala ENABLE ROW LEVEL SECURITY;
ALTER TABLE resposta_escala FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS checkin_psicologo_vinculado ON checkin_diario;
DROP POLICY IF EXISTS habito_paciente ON habito;
DROP POLICY IF EXISTS habito_psicologo_vinculado ON habito;
DROP POLICY IF EXISTS consentimento_paciente ON consentimento;
DROP POLICY IF EXISTS consentimento_psicologo_vinculado ON consentimento;
DROP POLICY IF EXISTS anotacao_psicologo ON anotacao_clinica;
DROP POLICY IF EXISTS aplicacao_paciente ON aplicacao_escala;
DROP POLICY IF EXISTS aplicacao_psicologo_vinculado ON aplicacao_escala;
DROP POLICY IF EXISTS resposta_paciente ON resposta_escala;
DROP POLICY IF EXISTS resposta_psicologo_vinculado ON resposta_escala;

-- checkin_diario: a policy do paciente (checkin_isolamento_paciente) já existe e não muda.
CREATE POLICY checkin_psicologo_vinculado ON checkin_diario FOR SELECT TO psychelink_app
    USING (EXISTS (
        SELECT 1 FROM vinculo v
         WHERE v.paciente_id = checkin_diario.paciente_id
           AND v.psicologo_id = app_psicologo_id() AND v.status = 'ativo'));

-- habito e resposta_escala não têm paciente_id: herdam do registro pai.
CREATE POLICY habito_paciente ON habito TO psychelink_app
    USING (EXISTS (
        SELECT 1 FROM checkin_diario c
         WHERE c.id = habito.checkin_id AND c.paciente_id = app_paciente_id()));

CREATE POLICY habito_psicologo_vinculado ON habito FOR SELECT TO psychelink_app
    USING (EXISTS (
        SELECT 1 FROM checkin_diario c JOIN vinculo v ON v.paciente_id = c.paciente_id
         WHERE c.id = habito.checkin_id
           AND v.psicologo_id = app_psicologo_id() AND v.status = 'ativo'));

CREATE POLICY consentimento_paciente ON consentimento TO psychelink_app
    USING (paciente_id = app_paciente_id());

CREATE POLICY consentimento_psicologo_vinculado ON consentimento FOR SELECT TO psychelink_app
    USING (EXISTS (
        SELECT 1 FROM vinculo v
         WHERE v.paciente_id = consentimento.paciente_id
           AND v.psicologo_id = app_psicologo_id() AND v.status = 'ativo'));

-- Anotação é do psicólogo que a escreveu; o paciente nunca a lê.
CREATE POLICY anotacao_psicologo ON anotacao_clinica TO psychelink_app
    USING (psicologo_id = app_psicologo_id());

CREATE POLICY aplicacao_paciente ON aplicacao_escala TO psychelink_app
    USING (paciente_id = app_paciente_id());

CREATE POLICY aplicacao_psicologo_vinculado ON aplicacao_escala FOR SELECT TO psychelink_app
    USING (EXISTS (
        SELECT 1 FROM vinculo v
         WHERE v.paciente_id = aplicacao_escala.paciente_id
           AND v.psicologo_id = app_psicologo_id() AND v.status = 'ativo'));

CREATE POLICY resposta_paciente ON resposta_escala TO psychelink_app
    USING (EXISTS (
        SELECT 1 FROM aplicacao_escala a
         WHERE a.id = resposta_escala.aplicacao_id AND a.paciente_id = app_paciente_id()));

CREATE POLICY resposta_psicologo_vinculado ON resposta_escala FOR SELECT TO psychelink_app
    USING (EXISTS (
        SELECT 1 FROM aplicacao_escala a JOIN vinculo v ON v.paciente_id = a.paciente_id
         WHERE a.id = resposta_escala.aplicacao_id
           AND v.psicologo_id = app_psicologo_id() AND v.status = 'ativo'));
