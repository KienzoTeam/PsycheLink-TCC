import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { auth } from './routes/auth';
import { psicologoRouter } from './routes/psicologo';

if (!process.env.DATABASE_URL || !process.env.JWT_SECRET) {
  console.error('Variáveis obrigatórias ausentes no .env: DATABASE_URL, JWT_SECRET');
  process.exit(1);
}

const app = express();
app.use(express.json({ limit: '10kb' }));
app.use(cors());

// Registra as rotas
app.use(auth);
app.use('/psicologo', psicologoRouter);

// JSON malformado no corpo → resposta JSON consistente (o app lê data.error).
app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (err instanceof SyntaxError && 'body' in (err as object)) {
      return res.status(400).json({ error: 'Dados inválidos.' });
    }
    next(err);
  }
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));