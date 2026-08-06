import 'dotenv/config';

function requireEnvironment(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`A variável de ambiente ${name} é obrigatória.`);
  }

  return value;
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

const nodeEnv = process.env.NODE_ENV ?? 'development';
const jwtSecret = requireEnvironment('JWT_SECRET');
const emailVerificationPepper = requireEnvironment('EMAIL_VERIFICATION_PEPPER');

if (jwtSecret.length < 32 || emailVerificationPepper.length < 32) {
  throw new Error('JWT_SECRET e EMAIL_VERIFICATION_PEPPER devem ter pelo menos 32 caracteres.');
}

const appOrigins = (process.env.APP_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (nodeEnv === 'production' && appOrigins.length === 0) {
  throw new Error('APP_ORIGINS é obrigatório em produção.');
}

export const config = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  port: parsePositiveInteger(process.env.PORT, 3000),
  databaseUrl: requireEnvironment('DATABASE_URL'),
  jwtSecret,
  emailVerificationPepper,
  appOrigins: new Set(appOrigins),
  verifyEmailMx: process.env.VERIFY_EMAIL_MX === 'true',
  bcryptRounds: parsePositiveInteger(process.env.BCRYPT_ROUNDS, 12),
  resendApiKey: process.env.RESEND_API_KEY?.trim(),
  emailFrom: process.env.EMAIL_FROM?.trim(),
  trustProxy: process.env.TRUST_PROXY === 'true',
};
