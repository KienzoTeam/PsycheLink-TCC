import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { auth } from './routes/auth';
import { authPsicologo } from './routes/auth-psicologo';
import { checkin } from './routes/checkin';
import { paciente } from './routes/paciente';
import { psicologo } from './routes/psicologo';
import { pool } from './db';
import { criarDepurarIp } from './lib/depurarIp';
import { ipDaPages } from './lib/ipDaPages';
import { exigirOrigem } from './lib/sessaoWeb';

export const app = express();

// Número de proxies confiáveis à frente do servidor; sem isso o rate limit usa o IP do proxy.
// Um número maior que a cadeia real faz o Express aceitar o X-Forwarded-For que o cliente escreveu,
// e o rate limit por IP pode ser burlado com um cabeçalho forjado.
const saltosDeProxy = Number(process.env.TRUST_PROXY) || false;
if (saltosDeProxy && saltosDeProxy > 3) {
  console.warn(
    `TRUST_PROXY=${saltosDeProxy} é alto: confira a cadeia real de proxies (DEBUG_IP=1 mostra o que chega).`,
  );
}
app.set('trust proxy', saltosDeProxy);

app.use(ipDaPages);

// Diagnóstico temporário do IP que o Express enxerga; desligado por padrão. Vem depois do
// ipDaPages para o `ip` logado ser o final (o do usuário, quando o PROXY_SEGREDO confere).
if (process.env.DEBUG_IP === '1') app.use(criarDepurarIp());

// Cabeçalhos de segurança padrão (X-Content-Type-Options, sem X-Powered-By, etc.)
app.use(helmet());

// Ping de saúde (Render, banca): sem autenticação nem rate limit.
app.get('/health', async (_req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  } catch {
    res.status(503).json({ ok: false });
  }
});

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
