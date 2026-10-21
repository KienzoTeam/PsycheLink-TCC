import 'dotenv/config';
import { app } from './app';

if (!process.env.DATABASE_URL || !process.env.JWT_SECRET || !process.env.ENCRYPTION_KEY) {
  console.error(
    'Variáveis obrigatórias ausentes no .env: DATABASE_URL, JWT_SECRET, ENCRYPTION_KEY',
  );
  process.exit(1);
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
