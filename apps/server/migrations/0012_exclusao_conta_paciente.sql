-- Exclusão da conta pelo paciente: fica agendada por 30 dias (pode desistir entrando e cancelando)
-- e depois a conta é apagada de vez, com os dados em cascata (LGPD: eliminação).
ALTER TABLE users ADD COLUMN exclusao_agendada_em timestamptz;

-- As anotações do psicólogo são registro dele, guardado por 5 anos (CFP): sobrevivem à exclusão,
-- sem o paciente. Até aqui a FK apagava junto.
ALTER TABLE anotacao_clinica ALTER COLUMN paciente_id DROP NOT NULL;
ALTER TABLE anotacao_clinica DROP CONSTRAINT fk_anotacao_paciente;
ALTER TABLE anotacao_clinica
    ADD CONSTRAINT fk_anotacao_paciente FOREIGN KEY (paciente_id) REFERENCES paciente(id) ON DELETE SET NULL;
