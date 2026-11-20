-- Avisos do psicólogo (FP12): lista no painel, e-mail e push do navegador, configuráveis por tipo.
-- O aviso guarda só o tipo e o paciente; nunca conteúdo clínico.
CREATE TABLE notificacao (
    id bigserial PRIMARY KEY,
    psicologo_id integer NOT NULL REFERENCES psicologo(id) ON DELETE CASCADE,
    paciente_id integer REFERENCES paciente(id) ON DELETE SET NULL,
    tipo text NOT NULL,
    criado_em timestamptz NOT NULL DEFAULT now(),
    lida_em timestamptz
);

CREATE INDEX idx_notificacao_psicologo ON notificacao (psicologo_id, criado_em DESC);

ALTER TABLE notificacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacao FORCE ROW LEVEL SECURITY;
CREATE POLICY notificacao_psicologo ON notificacao TO psychelink_app
    USING (psicologo_id = app_psicologo_id());

-- {"tipo": {"painel": bool, "email": bool, "push": bool}}; o que faltar usa o padrão do código.
ALTER TABLE psicologo ADD COLUMN preferencias_avisos jsonb NOT NULL DEFAULT '{}';

-- Inscrições de push do navegador (Web Push). Sem dado clínico: endpoint e chaves do navegador.
CREATE TABLE push_navegador (
    endpoint text PRIMARY KEY,
    psicologo_id integer NOT NULL REFERENCES psicologo(id) ON DELETE CASCADE,
    p256dh text NOT NULL,
    auth text NOT NULL,
    criado_em timestamptz NOT NULL DEFAULT now()
);

-- Tokens do Expo Push do app do paciente (escala nova, recomendação nova).
CREATE TABLE push_dispositivo (
    token text PRIMARY KEY,
    user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_push_dispositivo_user ON push_dispositivo (user_id);
