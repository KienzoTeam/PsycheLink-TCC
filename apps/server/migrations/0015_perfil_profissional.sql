-- Perfil profissional do psicólogo, visível ao paciente vinculado (sem diretório público).
ALTER TABLE psicologo
    ADD COLUMN abordagem text,
    ADD COLUMN sobre text,
    ADD COLUMN modalidades text[] NOT NULL DEFAULT '{}',
    ADD COLUMN atende_em text,
    ADD COLUMN contato text,
    ADD CONSTRAINT ck_psicologo_modalidades CHECK (modalidades <@ ARRAY['presencial', 'online']::text[]);
