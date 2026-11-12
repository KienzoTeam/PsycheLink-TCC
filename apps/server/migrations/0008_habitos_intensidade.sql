-- O app do paciente envia seis hábitos e a intensidade da emoção em cada check-in; até aqui o
-- servidor só guardava três hábitos e descartava a intensidade. Acrescenta as colunas que faltam.
ALTER TABLE habito
  ADD COLUMN hidratacao boolean DEFAULT false,
  ADD COLUMN limite_telas boolean DEFAULT false,
  ADD COLUMN contato_social boolean DEFAULT false;

ALTER TABLE checkin_diario
  ADD COLUMN intensidade_emocao integer CHECK (intensidade_emocao BETWEEN 1 AND 10);
