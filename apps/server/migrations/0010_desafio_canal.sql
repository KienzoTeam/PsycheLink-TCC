-- O 2FA passa a valer também no app do paciente. O canal separa os desafios: um código pedido no
-- app nunca abre sessão no painel web, e um do painel nunca vira token do app.
ALTER TABLE desafio_2fa
  ADD COLUMN canal text NOT NULL DEFAULT 'web' CHECK (canal IN ('web', 'app'));
