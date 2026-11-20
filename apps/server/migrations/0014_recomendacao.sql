-- Recomendações de exercício (F15): o psicólogo escolhe um exercício do app (exercicio_id) ou
-- escreve um próprio; título, descrição e nota vão cifrados num JSON (texto do psicólogo sobre o
-- paciente). O paciente só marca como feito; cancelar é do psicólogo.
CREATE TABLE recomendacao (
    id bigserial PRIMARY KEY,
    paciente_id integer NOT NULL REFERENCES paciente(id) ON DELETE CASCADE,
    psicologo_id integer NOT NULL REFERENCES psicologo(id) ON DELETE CASCADE,
    exercicio_id text,
    conteudo_cifrado text NOT NULL,
    criado_em timestamptz NOT NULL DEFAULT now(),
    feito_em timestamptz,
    cancelado_em timestamptz
);

CREATE INDEX idx_recomendacao_paciente ON recomendacao (paciente_id, criado_em DESC);

ALTER TABLE recomendacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE recomendacao FORCE ROW LEVEL SECURITY;

-- Paciente: lê as suas e só consegue marcar como feita (a aplicação só atualiza feito_em).
CREATE POLICY recomendacao_paciente_leitura ON recomendacao FOR SELECT TO psychelink_app
    USING (paciente_id = app_paciente_id());
CREATE POLICY recomendacao_paciente_feito ON recomendacao FOR UPDATE TO psychelink_app
    USING (paciente_id = app_paciente_id() AND cancelado_em IS NULL)
    WITH CHECK (paciente_id = app_paciente_id());

-- Psicólogo: as próprias, com vínculo ativo.
CREATE POLICY recomendacao_psicologo ON recomendacao TO psychelink_app
    USING (psicologo_id = app_psicologo_id() AND EXISTS (
        SELECT 1 FROM vinculo v
         WHERE v.paciente_id = recomendacao.paciente_id
           AND v.psicologo_id = app_psicologo_id() AND v.status = 'ativo'));
