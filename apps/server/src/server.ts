import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import bcrypt from 'bcrypt';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { Pool, PoolClient } from 'pg';
import { z } from 'zod';
import { config } from './config.js';
import { createEmailSender } from './email.js';
import { assertEmailDomainHasMx, InvalidEmailError, normalizeEmail } from './email-validation.js';

const app = express();
const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.isProduction ? { rejectUnauthorized: true } : undefined,
});
const emailSender = createEmailSender();

app.set('trust proxy', config.trustProxy ? 1 : false);
app.use(helmet());
app.use(express.json({ limit: '10kb' }));
app.use(
  cors({
    origin(origin, callback) {
      // Aplicativos nativos não enviam Origin. Para browsers, aceite somente a allowlist.
      if (!origin || config.appOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origem não permitida.'));
    },
  }),
);

const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' },
});

const otpRequestRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Muitos pedidos de código. Aguarde alguns minutos e tente novamente.' },
});

const otpConfirmRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de código. Aguarde alguns minutos e tente novamente.' },
});

const registrationSchema = z.object({
  nome: z.string().trim().min(2).max(120),
  email: z.unknown(),
  password: z.string().min(8).max(128),
  dataNascimento: z.string().date(),
});

const credentialsSchema = z.object({
  email: z.unknown(),
  password: z.string().min(1).max(128),
});

const emailOnlySchema = z.object({ email: z.unknown() });

const otpSchema = z.object({
  email: z.unknown(),
  code: z.string().trim().length(6).refine(
    (value) => Number.isSafeInteger(Number(value)) && Number(value) >= 100000 && Number(value) <= 999999,
    'Código inválido.',
  ),
});

const passwordResetConfirmationSchema = otpSchema.extend({
  password: z.string().min(8).max(128),
});

type OtpPurpose = 'email-verification' | 'password-reset';

type UserRecord = {
  id: number | string;
  email: string;
  password_hash: string;
  email_verified_at: Date | null;
};

type OtpRecord = {
  id: string;
  code_hash: string;
  expires_at: Date;
  attempts: number;
  user_id: number | string;
};

type AuthenticatedRequest = Request & { auth?: { id: number | string; email: string } };

const tokenTableFor: Record<OtpPurpose, string> = {
  'email-verification': 'email_verification_tokens',
  'password-reset': 'password_reset_tokens',
};

function otpHash(tokenId: string, code: string): string {
  return createHmac('sha256', config.emailVerificationPepper)
    .update(`${tokenId}:${code}`)
    .digest('hex');
}

function hashesMatch(expected: string, received: string): boolean {
  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(received, 'hex'));
}

function createOtp(): string {
  // randomInt evita viés de módulo e entrega exatamente seis dígitos, sem regex.
  return String(randomInt(100000, 1000000));
}

async function issueOtp(client: PoolClient, userId: number | string, purpose: OtpPurpose): Promise<string> {
  const table = tokenTableFor[purpose];
  const tokenId = randomUUID();
  const code = createOtp();

  await client.query(
    `UPDATE ${table} SET consumed_at = NOW() WHERE user_id = $1 AND consumed_at IS NULL`,
    [userId],
  );
  await client.query(
    `INSERT INTO ${table} (id, user_id, code_hash, expires_at)
     VALUES ($1, $2, $3, NOW() + INTERVAL '10 minutes')`,
    [tokenId, userId, otpHash(tokenId, code)],
  );

  return code;
}

async function findOrCreateUnverifiedUser(
  input: z.infer<typeof registrationSchema>,
  email: string,
): Promise<{ shouldSendOtp: boolean; code?: string }> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query<Pick<UserRecord, 'id' | 'email_verified_at'>>(
      'SELECT id, email_verified_at FROM users WHERE email = $1 FOR UPDATE',
      [email],
    );

    if (existing.rows[0]?.email_verified_at) {
      await client.query('COMMIT');
      return { shouldSendOtp: false };
    }

    let userId = existing.rows[0]?.id;
    if (!userId) {
      const passwordHash = await bcrypt.hash(input.password, config.bcryptRounds);
      const inserted = await client.query<Pick<UserRecord, 'id'>>(
        `INSERT INTO users (nome, email, password_hash, data_nascimento, email_verified_at)
         VALUES ($1, $2, $3, $4, NULL)
         ON CONFLICT (email) DO NOTHING
         RETURNING id`,
        [input.nome.trim(), email, passwordHash, input.dataNascimento],
      );
      userId = inserted.rows[0]?.id;

      if (!userId) {
        const concurrent = await client.query<Pick<UserRecord, 'id' | 'email_verified_at'>>(
          'SELECT id, email_verified_at FROM users WHERE email = $1 FOR UPDATE',
          [email],
        );
        if (concurrent.rows[0]?.email_verified_at) {
          await client.query('COMMIT');
          return { shouldSendOtp: false };
        }
        userId = concurrent.rows[0]?.id;
      }
    }

    if (!userId) {
      throw new Error('Não foi possível preparar o cadastro.');
    }

    const code = await issueOtp(client, userId, 'email-verification');
    await client.query('COMMIT');
    return { shouldSendOtp: true, code };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function issueOtpForExistingEmail(email: string, purpose: OtpPurpose): Promise<string | undefined> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query<Pick<UserRecord, 'id' | 'email_verified_at'>>(
      'SELECT id, email_verified_at FROM users WHERE email = $1 FOR UPDATE',
      [email],
    );
    const user = result.rows[0];
    const shouldSend = purpose === 'email-verification' ? !user?.email_verified_at : Boolean(user?.email_verified_at);

    if (!user || !shouldSend) {
      await client.query('COMMIT');
      return undefined;
    }

    const code = await issueOtp(client, user.id, purpose);
    await client.query('COMMIT');
    return code;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

type ConsumeOtpResult = 'success' | 'invalid' | 'expired-or-locked';

async function consumeOtp(
  email: string,
  code: string,
  purpose: OtpPurpose,
  newPassword?: string,
): Promise<ConsumeOtpResult> {
  const table = tokenTableFor[purpose];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query<OtpRecord>(
      `SELECT token.id, token.code_hash, token.expires_at, token.attempts, token.user_id
       FROM ${table} token
       INNER JOIN users account ON account.id = token.user_id
       WHERE account.email = $1 AND token.consumed_at IS NULL
       ORDER BY token.created_at DESC
       LIMIT 1
       FOR UPDATE`,
      [email],
    );
    const token = result.rows[0];

    if (!token || token.expires_at.getTime() <= Date.now() || token.attempts >= 5) {
      await client.query('ROLLBACK');
      return 'expired-or-locked';
    }

    if (!hashesMatch(token.code_hash, otpHash(token.id, code))) {
      await client.query(`UPDATE ${table} SET attempts = attempts + 1 WHERE id = $1`, [token.id]);
      await client.query('COMMIT');
      return 'invalid';
    }

    if (purpose === 'email-verification') {
      await client.query(
        'UPDATE users SET email_verified_at = COALESCE(email_verified_at, NOW()) WHERE id = $1',
        [token.user_id],
      );
    } else if (newPassword) {
      const passwordHash = await bcrypt.hash(newPassword, config.bcryptRounds);
      await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, token.user_id]);
    }

    await client.query(`UPDATE ${table} SET consumed_at = NOW() WHERE id = $1`, [token.id]);
    await client.query('COMMIT');
    return 'success';
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function sendGenericOtpResponse(res: Response): void {
  res.status(202).json({
    message: 'Se o endereço puder receber esta solicitação, enviaremos um código de seis dígitos.',
  });
}

app.post('/api/auth/register', otpRequestRateLimit, async (req, res, next) => {
  try {
    const input = registrationSchema.parse(req.body);
    const email = normalizeEmail(input.email);
    if (config.verifyEmailMx) {
      await assertEmailDomainHasMx(email);
    }

    const result = await findOrCreateUnverifiedUser(input, email);
    if (result.shouldSendOtp && result.code) {
      await emailSender.sendOtp({ to: email, code: result.code, purpose: 'email-verification' });
    }

    // Resposta deliberadamente genérica: não revela se o endereço já existe.
    sendGenericOtpResponse(res);
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/email-verification/resend', otpRequestRateLimit, async (req, res, next) => {
  try {
    const input = emailOnlySchema.parse(req.body);
    const email = normalizeEmail(input.email);
    const code = await issueOtpForExistingEmail(email, 'email-verification');
    if (code) {
      await emailSender.sendOtp({ to: email, code, purpose: 'email-verification' });
    }
    sendGenericOtpResponse(res);
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/email-verification/confirm', otpConfirmRateLimit, async (req, res, next) => {
  try {
    const input = otpSchema.parse(req.body);
    const email = normalizeEmail(input.email);
    const result = await consumeOtp(email, input.code.trim(), 'email-verification');

    if (result !== 'success') {
      res.status(400).json({ error: 'Código inválido, expirado ou bloqueado. Solicite um novo código.' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/password-reset/request', otpRequestRateLimit, async (req, res, next) => {
  try {
    const input = emailOnlySchema.parse(req.body);
    const email = normalizeEmail(input.email);
    const code = await issueOtpForExistingEmail(email, 'password-reset');
    if (code) {
      await emailSender.sendOtp({ to: email, code, purpose: 'password-reset' });
    }
    sendGenericOtpResponse(res);
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/password-reset/confirm', otpConfirmRateLimit, async (req, res, next) => {
  try {
    const input = passwordResetConfirmationSchema.parse(req.body);
    const email = normalizeEmail(input.email);
    const result = await consumeOtp(email, input.code.trim(), 'password-reset', input.password);

    if (result !== 'success') {
      res.status(400).json({ error: 'Código inválido, expirado ou bloqueado. Solicite um novo código.' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/login', loginRateLimit, async (req, res, next) => {
  try {
    const input = credentialsSchema.parse(req.body);
    const email = normalizeEmail(input.email);
    const result = await pool.query<UserRecord>(
      'SELECT id, email, password_hash, email_verified_at FROM users WHERE email = $1',
      [email],
    );
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(input.password, user.password_hash))) {
      res.status(401).json({ error: 'E-mail ou senha inválidos.' });
      return;
    }

    if (!user.email_verified_at) {
      res.status(403).json({
        code: 'EMAIL_NOT_VERIFIED',
        error: 'Confirme seu e-mail antes de entrar. Solicite um novo código se necessário.',
      });
      return;
    }

    const token = jwt.sign({ sub: String(user.id), email: user.email }, config.jwtSecret, {
      algorithm: 'HS256',
      expiresIn: '15m',
    });
    res.json({ token });
  } catch (error) {
    next(error);
  }
});

function verifyAccessToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authorization = req.header('authorization');
  const [scheme, token] = authorization?.split(' ') ?? [];

  if (scheme !== 'Bearer' || !token) {
    res.status(401).json({ error: 'Acesso negado.' });
    return;
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] }) as JwtPayload;
    if (!payload.sub || typeof payload.email !== 'string') {
      throw new Error('Token sem os dados esperados.');
    }
    req.auth = { id: payload.sub, email: payload.email };
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
}

app.get('/api/me', verifyAccessToken, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await pool.query(
      `SELECT id, nome, email, data_nascimento
       FROM users
       WHERE id = $1 AND email_verified_at IS NOT NULL`,
      [req.auth?.id],
    );
    if (!user.rows[0]) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    res.json(user.rows[0]);
  } catch (error) {
    next(error);
  }
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Rota não encontrada.' });
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof z.ZodError || error instanceof InvalidEmailError) {
    res.status(400).json({ error: 'Dados de entrada inválidos.' });
    return;
  }

  if (error instanceof Error && error.message === 'Origem não permitida.') {
    res.status(403).json({ error: error.message });
    return;
  }

  console.error('Erro não tratado:', error);
  res.status(500).json({ error: 'Não foi possível concluir a solicitação.' });
});

app.listen(config.port, '0.0.0.0', () => {
  console.info(`API PsycheLink disponível na porta ${config.port}`);
});
