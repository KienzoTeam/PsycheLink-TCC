import 'dotenv/config';
import { app } from './app';
import { transporteDeEmail } from './lib/mailer';

if (!process.env.DATABASE_URL || !process.env.JWT_SECRET || !process.env.ENCRYPTION_KEY) {
  console.error(
    'Variáveis obrigatórias ausentes no .env: DATABASE_URL, JWT_SECRET, ENCRYPTION_KEY',
  );
  process.exit(1);
}

const transporte = transporteDeEmail();
if (transporte === 'nenhum') {
  console.error(
    'Nenhum envio de e-mail configurado em produção (BREVO_API_KEY ou SMTP_HOST): ninguém receberá códigos de verificação.',
  );
} else {
  console.log(`Envio de e-mail: ${transporte}`);
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
