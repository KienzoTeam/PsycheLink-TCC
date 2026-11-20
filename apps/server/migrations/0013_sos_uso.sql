-- Registro de uso do SOS (F9) para o psicólogo, com consentimento próprio e desligado por padrão
-- (opt-in): ninguém deve deixar de abrir o SOS por medo de ser visto. Só data e hora, nunca o que
-- foi feito na tela.
ALTER TABLE consentimento ADD COLUMN compartilha_sos boolean NOT NULL DEFAULT false;

CREATE TABLE sos_uso (
    id bigserial PRIMARY KEY,
    paciente_id integer NOT NULL REFERENCES paciente(id) ON DELETE CASCADE,
    criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sos_uso_paciente ON sos_uso (paciente_id, criado_em DESC);

ALTER TABLE sos_uso ENABLE ROW LEVEL SECURITY;
ALTER TABLE sos_uso FORCE ROW LEVEL SECURITY;

CREATE POLICY sos_uso_paciente ON sos_uso TO psychelink_app
    USING (paciente_id = app_paciente_id());

CREATE POLICY sos_uso_psicologo ON sos_uso FOR SELECT TO psychelink_app
    USING (EXISTS (
        SELECT 1 FROM vinculo v JOIN consentimento c ON c.paciente_id = v.paciente_id AND c.compartilha_sos
         WHERE v.paciente_id = sos_uso.paciente_id
           AND v.psicologo_id = app_psicologo_id() AND v.status = 'ativo'));
