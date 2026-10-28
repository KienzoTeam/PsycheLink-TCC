-- Consultas: agenda do psicólogo, sem sobreposição entre as agendadas, com observação cifrada.

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE consulta (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    psicologo_id integer NOT NULL,
    paciente_id integer NOT NULL,
    inicio timestamptz NOT NULL,
    fim timestamptz NOT NULL,
    status text NOT NULL DEFAULT 'agendada',
    remarcada_de integer,
    -- Texto do psicólogo (cifrado); nunca sai para o paciente.
    observacao text,
    criado_em timestamptz NOT NULL DEFAULT now(),
    atualizado_em timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fk_consulta_psicologo FOREIGN KEY (psicologo_id) REFERENCES psicologo(id) ON DELETE CASCADE,
    CONSTRAINT fk_consulta_paciente FOREIGN KEY (paciente_id) REFERENCES paciente(id) ON DELETE CASCADE,
    CONSTRAINT fk_consulta_remarcada_de FOREIGN KEY (remarcada_de) REFERENCES consulta(id) ON DELETE SET NULL,
    CONSTRAINT consulta_status_check CHECK (status IN ('agendada', 'concluida', 'cancelada', 'remarcada')),
    CONSTRAINT consulta_duracao_check CHECK (fim - inicio BETWEEN interval '15 minutes' AND interval '4 hours'),
    -- Intervalo semiaberto: uma consulta pode começar quando a anterior termina.
    CONSTRAINT consulta_sem_sobreposicao
        EXCLUDE USING gist (psicologo_id WITH =, tstzrange(inicio, fim) WITH &&) WHERE (status = 'agendada')
);

CREATE INDEX idx_consulta_psicologo_inicio ON consulta (psicologo_id, inicio);
CREATE INDEX idx_consulta_paciente_inicio ON consulta (paciente_id, inicio);

ALTER TABLE consulta ENABLE ROW LEVEL SECURITY;
ALTER TABLE consulta FORCE ROW LEVEL SECURITY;

-- O psicólogo lê e escreve as próprias consultas de pacientes com vínculo ativo (sem DELETE:
-- consulta não se apaga, muda de status). O paciente só lê as suas.
CREATE POLICY consulta_psicologo_le ON consulta FOR SELECT TO psychelink_app
    USING (psicologo_id = app_psicologo_id() AND EXISTS (
        SELECT 1 FROM vinculo v
         WHERE v.paciente_id = consulta.paciente_id
           AND v.psicologo_id = app_psicologo_id() AND v.status = 'ativo'));

CREATE POLICY consulta_psicologo_cria ON consulta FOR INSERT TO psychelink_app
    WITH CHECK (psicologo_id = app_psicologo_id() AND EXISTS (
        SELECT 1 FROM vinculo v
         WHERE v.paciente_id = consulta.paciente_id
           AND v.psicologo_id = app_psicologo_id() AND v.status = 'ativo'));

CREATE POLICY consulta_psicologo_altera ON consulta FOR UPDATE TO psychelink_app
    USING (psicologo_id = app_psicologo_id() AND EXISTS (
        SELECT 1 FROM vinculo v
         WHERE v.paciente_id = consulta.paciente_id
           AND v.psicologo_id = app_psicologo_id() AND v.status = 'ativo'))
    WITH CHECK (psicologo_id = app_psicologo_id() AND EXISTS (
        SELECT 1 FROM vinculo v
         WHERE v.paciente_id = consulta.paciente_id
           AND v.psicologo_id = app_psicologo_id() AND v.status = 'ativo'));

CREATE POLICY consulta_paciente_le ON consulta FOR SELECT TO psychelink_app
    USING (paciente_id = app_paciente_id());

-- Encerrar o vínculo cancela as consultas futuras agendadas: sem vínculo o psicólogo não as
-- enxerga, e elas continuariam ocupando o horário dele (409 sem causa visível).
-- SECURITY DEFINER pelo mesmo motivo de cancelar_aplicacoes_do_vinculo (0005).
CREATE FUNCTION cancelar_consultas_do_vinculo() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
    UPDATE consulta SET status = 'cancelada', atualizado_em = now()
     WHERE paciente_id = NEW.paciente_id AND psicologo_id = NEW.psicologo_id
       AND status = 'agendada' AND inicio > now();
    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_vinculo_encerrado_consultas
    AFTER UPDATE OF status ON vinculo
    FOR EACH ROW WHEN (OLD.status = 'ativo' AND NEW.status = 'encerrado')
    EXECUTE FUNCTION cancelar_consultas_do_vinculo();
