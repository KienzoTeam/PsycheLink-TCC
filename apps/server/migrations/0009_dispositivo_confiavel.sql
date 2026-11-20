-- "Confiar neste dispositivo por 30 dias" no 2FA: depois do código certo, o navegador (cookie) ou o
-- celular (SecureStore) guarda um token; no login seguinte, com a senha certa, o código é dispensado.
-- Só o hash do token fica aqui. Trocar ou redefinir a senha revoga todos os da conta.
CREATE TABLE dispositivo_confiavel (
    token_hash text PRIMARY KEY,
    user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    criado_em timestamptz NOT NULL DEFAULT now(),
    ultimo_uso_em timestamptz NOT NULL DEFAULT now(),
    expira_em timestamptz NOT NULL,
    revogado_em timestamptz,
    user_agent text
);

CREATE INDEX idx_dispositivo_confiavel_user ON dispositivo_confiavel (user_id);
