-- Diário fora do check-in (F8): várias entradas por dia, cada uma com o próprio interruptor de
-- compartilhamento. O texto vai cifrado (criptografar), como o diário do check-in.
CREATE TABLE diario_entrada (
    id bigserial PRIMARY KEY,
    paciente_id integer NOT NULL REFERENCES paciente(id) ON DELETE CASCADE,
    texto text NOT NULL,
    compartilhado boolean NOT NULL DEFAULT false,
    criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_diario_entrada_paciente ON diario_entrada (paciente_id, criado_em DESC);

ALTER TABLE diario_entrada ENABLE ROW LEVEL SECURITY;
ALTER TABLE diario_entrada FORCE ROW LEVEL SECURITY;

CREATE POLICY diario_entrada_paciente ON diario_entrada TO psychelink_app
    USING (paciente_id = app_paciente_id());

-- O psicólogo só lê o que o paciente marcou como compartilhado, com vínculo ativo.
CREATE POLICY diario_entrada_psicologo ON diario_entrada FOR SELECT TO psychelink_app
    USING (compartilhado AND EXISTS (
        SELECT 1 FROM vinculo v
         WHERE v.paciente_id = diario_entrada.paciente_id
           AND v.psicologo_id = app_psicologo_id() AND v.status = 'ativo'));
