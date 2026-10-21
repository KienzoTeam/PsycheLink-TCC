import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { auth } from './routes/auth';
import { authPsicologo } from './routes/auth-psicologo';
import { checkin } from './routes/checkin';
import { paciente } from './routes/paciente';
import { psicologo } from './routes/psicologo';
import { exigirOrigem } from './lib/sessaoWeb';

export const app = express();

// Número de proxies confiáveis à frente do servidor; sem isso o rate limit usa o IP do proxy.
app.set('trust proxy', Number(process.env.TRUST_PROXY) || false);

// Cabeçalhos de segurança padrão (X-Content-Type-Options, sem X-Powered-By, etc.)
app.use(helmet());

app.use(express.json({ limit: '10kb' }));

// Sem ALLOWED_ORIGINS nenhuma origem cross-site é liberada (o app mobile nativo não usa CORS).
const origensPermitidas = process.env.ALLOWED_ORIGINS?.split(',').map((o) => o.trim());
app.use(cors({ origin: origensPermitidas ?? false }));

app.use(['/auth', '/psicologo', '/paciente'], (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// CSRF das rotas com cookie: escritas só com Origin na allowlist (WEB_ORIGINS).
app.use(['/auth/psicologo', '/psicologo'], exigirOrigem);

// Prefixos alinhados com o aplicativo mobile
app.use('/auth', auth);
app.use('/auth', authPsicologo);
app.use('/checkin', checkin);
app.use('/psicologo', psicologo);
app.use('/paciente', paciente);

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
