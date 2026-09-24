import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { auth } from './routes/auth';
import { checkin } from './routes/checkin';

if (!process.env.DATABASE_URL || !process.env.JWT_SECRET || !process.env.ENCRYPTION_KEY) {
  console.error(
    'Variáveis obrigatórias ausentes no .env: DATABASE_URL, JWT_SECRET, ENCRYPTION_KEY',
  );
  process.exit(1);
}

const app = express();

// Cabeçalhos de segurança padrão (X-Content-Type-Options, sem X-Powered-By
// revelando "Express", etc.) — não muda comportamento de nenhuma rota.
app.use(helmet());

app.use(express.json({ limit: '10kb' }));

// Sem ALLOWED_ORIGINS definido, mantém o comportamento atual (aberto) pra
// não travar o desenvolvimento local. Em produção, defina no .env algo como
// ALLOWED_ORIGINS=https://app.psychelink.com,https://painel.psychelink.com
const origensPermitidas = process.env.ALLOWED_ORIGINS?.split(',').map((o) => o.trim());
app.use(cors(origensPermitidas ? { origin: origensPermitidas } : undefined));

app.use(auth);
app.use(checkin);

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

// Rede de segurança final: qualquer erro que nenhuma rota tratou cai aqui.
// Sem isso, o handler padrão do Express podia devolver stack trace pro
// cliente — inaceitável com dado de saúde mental envolvido. Loga o erro
// completo no servidor, mas o app só recebe uma mensagem genérica.
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
