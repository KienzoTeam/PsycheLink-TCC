-- Vínculo psicólogo-paciente: um ativo por paciente, encerramento com data e autor,
-- e código de vínculo de uso único gerado pelo psicólogo.

ALTER TABLE vinculo
    ADD COLUMN encerrado_em timestamptz,
    ADD COLUMN encerrado_por integer,
    ADD CONSTRAINT fk_vinculo_encerrado_por FOREIGN KEY (encerrado_por) REFERENCES users(id) ON DELETE SET NULL;

-- Estados fora de ativo/encerrado viram encerrados: 'pendente' nunca deu acesso, porque toda
-- consulta filtra 'ativo'. Se um paciente tiver mais de um ativo, fica o de maior id.
UPDATE vinculo
   SET status = 'encerrado', encerrado_em = now()
 WHERE status IS DISTINCT FROM 'ativo' AND status IS DISTINCT FROM 'encerrado';

UPDATE vinculo v
   SET status = 'encerrado', encerrado_em = now()
 WHERE v.status = 'ativo'
   AND EXISTS (SELECT 1 FROM vinculo o WHERE o.paciente_id = v.paciente_id AND o.status = 'ativo' AND o.id > v.id);

-- Sem default: um vínculo nunca nasce ativo por omissão.
ALTER TABLE vinculo
    ALTER COLUMN status DROP DEFAULT,
    ALTER COLUMN status SET NOT NULL,
    ADD CONSTRAINT vinculo_status_check CHECK (status IN ('ativo', 'encerrado')),
    ALTER COLUMN codigo_unico DROP NOT NULL; -- legado; o código agora vive em codigo_vinculo

-- O histórico guarda vários vínculos do mesmo par; a unicidade é só entre os ativos.
ALTER TABLE vinculo DROP CONSTRAINT uk_paciente_psicologo;
CREATE UNIQUE INDEX uk_vinculo_ativo_paciente ON vinculo (paciente_id) WHERE status = 'ativo';
CREATE INDEX idx_vinculo_psicologo ON vinculo (psicologo_id, status);

-- Expirado não sai do índice único: a expiração é tratada na leitura.
CREATE TABLE codigo_vinculo (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    psicologo_id integer NOT NULL,
    codigo_hmac text NOT NULL,
    expira_em timestamptz NOT NULL,
    usado_em timestamptz,
    usado_por_paciente_id integer,
    revogado_em timestamptz,
    criado_em timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fk_codigo_vinculo_psicologo FOREIGN KEY (psicologo_id) REFERENCES psicologo(id) ON DELETE CASCADE,
    CONSTRAINT fk_codigo_vinculo_paciente FOREIGN KEY (usado_por_paciente_id) REFERENCES paciente(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX uk_codigo_vinculo_aberto ON codigo_vinculo (codigo_hmac)
    WHERE usado_em IS NULL AND revogado_em IS NULL;
CREATE INDEX idx_codigo_vinculo_psicologo ON codigo_vinculo (psicologo_id, criado_em DESC);
