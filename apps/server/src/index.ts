import 'dotenv/config';
import { app } from './app';
import { pool } from './db';
import { remetente, transporteDeEmail } from './lib/mailer';

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
if (transporte === 'Brevo' && !/^[^\s@<>"]+@[^\s@<>"]+$/.test(remetente().email)) {
  console.error(
    'EMAIL_FROM ausente ou sem e-mail válido (use Nome <email> ou só o e-mail, sem aspas em volta do valor): o Brevo recusará todos os envios.',
  );
}

const PORT = process.env.PORT || 3000;
const servidor = app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));

// O Node como PID 1 do contêiner ignora o SIGTERM, e cada reinício no Render esperaria o prazo até o SIGKILL.
process.on('SIGTERM', () => {
  servidor.close(() => void pool.end().finally(() => process.exit(0)));
});
