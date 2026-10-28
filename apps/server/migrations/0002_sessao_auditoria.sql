-- Sessão web do psicólogo, desafio de 2FA por e-mail e auditoria imutável.

CREATE TABLE sessao (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id integer NOT NULL,
    refresh_hash text NOT NULL,
    refresh_anterior_hash text,
    rotacionado_em timestamptz,
    criado_em timestamptz NOT NULL DEFAULT now(),
    ultimo_uso_em timestamptz NOT NULL DEFAULT now(),
    expira_absoluto_em timestamptz NOT NULL,
    revogada_em timestamptz,
    ip inet,
    user_agent text,
    CONSTRAINT fk_sessao_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessao_user ON sessao (user_id);

CREATE TABLE desafio_2fa (
    id text PRIMARY KEY,
    user_id integer NOT NULL,
    codigo_hash text NOT NULL,
    expira_em timestamptz NOT NULL,
    tentativas integer NOT NULL DEFAULT 0,
    reenviado_em timestamptz NOT NULL DEFAULT now(),
    criado_em timestamptz NOT NULL DEFAULT now(),
    usado_em timestamptz,
    CONSTRAINT fk_desafio_2fa_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_desafio_2fa_user ON desafio_2fa (user_id);

CREATE TABLE auditoria (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ator_user_id integer,
    ator_papel text,
    acao text NOT NULL,
    paciente_id integer,
    alvo_tipo text,
    alvo_id text,
    ip inet,
    user_agent text,
    metadados jsonb NOT NULL DEFAULT '{}',
    criado_em timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT auditoria_ator_papel_check CHECK (ator_papel IN ('psicologo', 'paciente')),
    CONSTRAINT fk_auditoria_ator FOREIGN KEY (ator_user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_auditoria_paciente FOREIGN KEY (paciente_id) REFERENCES paciente(id) ON DELETE SET NULL
);

CREATE INDEX idx_auditoria_ator ON auditoria (ator_user_id, criado_em DESC);
CREATE INDEX idx_auditoria_paciente ON auditoria (paciente_id, criado_em DESC);

-- O ON DELETE SET NULL das FKs chega aqui como UPDATE: só passa quem apenas anula
-- ator_user_id ou paciente_id e deixa o resto da linha intacto.
CREATE FUNCTION auditoria_imutavel() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'UPDATE'
       AND to_jsonb(NEW) - 'ator_user_id' - 'paciente_id' = to_jsonb(OLD) - 'ator_user_id' - 'paciente_id'
       AND (NEW.ator_user_id IS NULL OR NEW.ator_user_id = OLD.ator_user_id)
       AND (NEW.paciente_id IS NULL OR NEW.paciente_id = OLD.paciente_id)
    THEN
        RETURN NEW;
    END IF;
    RAISE EXCEPTION 'auditoria é imutável (%)', TG_OP;
END;
$$;

CREATE TRIGGER trg_auditoria_imutavel
    BEFORE UPDATE OR DELETE ON auditoria
    FOR EACH ROW EXECUTE FUNCTION auditoria_imutavel();

REVOKE UPDATE, DELETE ON auditoria FROM PUBLIC;
