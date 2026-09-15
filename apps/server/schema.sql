-- Schema do PsycheLink, inferido a partir das queries em apps/server/src.
-- Não existia um arquivo de schema no projeto original — isso é necessário
-- para o backend funcionar contra um Postgres (ex.: Neon) de verdade.
--
-- Rode este arquivo uma vez no banco apontado por DATABASE_URL, por exemplo:
--   psql "$DATABASE_URL" -f schema.sql

CREATE TABLE IF NOT EXISTS users (
  id               SERIAL PRIMARY KEY,
  nome             VARCHAR(120) NOT NULL,
  email            VARCHAR(255) NOT NULL UNIQUE,
  password_hash    VARCHAR(255) NOT NULL,
  data_nascimento  DATE NOT NULL,
  email_verificado BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Códigos OTP (verificação de e-mail e redefinição de senha).
-- Um registro por e-mail: cadastros/reenvios sobrescrevem o anterior
-- (ver "ON CONFLICT (email) DO UPDATE" em apps/server/src/routes/auth.ts).
CREATE TABLE IF NOT EXISTS verificacoes_email (
  email       VARCHAR(255) PRIMARY KEY REFERENCES users(email) ON DELETE CASCADE,
  codigo_hash VARCHAR(64) NOT NULL,
  expira_em   TIMESTAMPTZ NOT NULL,
  tentativas  INTEGER NOT NULL DEFAULT 0,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS psicologo (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  crp           VARCHAR(20) NOT NULL,
  especialidade VARCHAR(120)
);

CREATE TABLE IF NOT EXISTS paciente (
  id      SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS vinculo (
  id            SERIAL PRIMARY KEY,
  psicologo_id  INTEGER NOT NULL REFERENCES psicologo(id) ON DELETE CASCADE,
  paciente_id   INTEGER NOT NULL REFERENCES paciente(id) ON DELETE CASCADE,
  status        VARCHAR(20) NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'ENCERRADO')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (psicologo_id, paciente_id)
);

CREATE TABLE IF NOT EXISTS alerta (
  id           SERIAL PRIMARY KEY,
  paciente_id  INTEGER NOT NULL REFERENCES paciente(id) ON DELETE CASCADE,
  tipo         VARCHAR(60) NOT NULL,
  descricao    TEXT NOT NULL,
  nivel        VARCHAR(10) NOT NULL CHECK (nivel IN ('BAIXO', 'MEDIO', 'ALTO')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alerta_paciente ON alerta(paciente_id);
CREATE INDEX IF NOT EXISTS idx_vinculo_psicologo ON vinculo(psicologo_id);
