import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { auth } from './routes/auth';
import { authPsicologo } from './routes/auth-psicologo';
import { checkin } from './routes/checkin';
import { psicologo } from './routes/psicologo';

if (!process.env.DATABASE_URL || !process.env.JWT_SECRET || !process.env.ENCRYPTION_KEY) {
  console.error(
    'Variáveis obrigatórias ausentes no .env: DATABASE_URL, JWT_SECRET, ENCRYPTION_KEY',
  );
  process.exit(1);
}

const app = express();

// Cabeçalhos de segurança padrão (X-Content-Type-Options, sem X-Powered-By, etc.)
app.use(helmet());

app.use(express.json({ limit: '10kb' }));

// Configuração de CORS
const origensPermitidas = process.env.ALLOWED_ORIGINS?.split(',').map((o) => o.trim());
app.use(cors(origensPermitidas ? { origin: origensPermitidas } : undefined));

// ✅ ROTAS PREFIXADAS (Alinhadas 100% com o aplicativo Mobile)
app.use('/auth', auth);
app.use('/auth', authPsicologo);
app.use('/checkin', checkin);
app.use('/psicologo', psicologo);

// JSON malformado no corpo → resposta JSON consistente (o app lê data.error)
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

// Trata erros globais
app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error('Erro não tratado:', err);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));