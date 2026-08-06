import { resolveMx } from 'node:dns/promises';
import { domainToASCII } from 'node:url';
import validator from 'validator';
import { z } from 'zod';

const rawEmailSchema = z.string().trim().min(3).max(254);

export class InvalidEmailError extends Error {
  public constructor() {
    super('Informe um endereço de e-mail válido.');
  }
}

/**
 * Preserva a parte local, converte somente o domínio Unicode para ASCII/Punycode
 * e deixa a validação sintática para o validador maduro do Zod.
 */
export function normalizeEmail(rawEmail: unknown): string {
  const parsed = rawEmailSchema.safeParse(rawEmail);
  if (!parsed.success) {
    throw new InvalidEmailError();
  }

  const candidate = parsed.data.normalize('NFC');
  const separatorPosition = candidate.lastIndexOf('@');

  if (separatorPosition <= 0 || separatorPosition === candidate.length - 1) {
    throw new InvalidEmailError();
  }

  const localPart = candidate.slice(0, separatorPosition);
  const unicodeDomain = candidate.slice(separatorPosition + 1);
  const asciiDomain = domainToASCII(unicodeDomain);

  if (!asciiDomain) {
    throw new InvalidEmailError();
  }

  // O produto trata e-mails como identificadores sem distinção de maiúsculas/minúsculas.
  // A parte local aceita aqui é ASCII (SMTPUTF8 não está habilitado), portanto toLowerCase é estável.
  const canonicalEmail = `${localPart.toLowerCase()}@${asciiDomain.toLowerCase()}`;
  // validator é uma biblioteca madura; a aplicação não mantém regex de e-mail.
  if (!validator.isEmail(canonicalEmail, { allow_utf8_local_part: false })) {
    throw new InvalidEmailError();
  }

  return canonicalEmail;
}

type MxCacheEntry = {
  hasMx: boolean;
  expiresAt: number;
};

const mxCache = new Map<string, MxCacheEntry>();
const MX_CACHE_TTL_MS = 5 * 60 * 1000;
const MX_LOOKUP_TIMEOUT_MS = 3 * 1000;

/**
 * Opcional: MX é apenas um sinal de infraestrutura, não uma prova de posse.
 * A confirmação definitiva continua sendo o OTP recebido no e-mail.
 */
export async function domainHasMxRecord(domain: string): Promise<boolean> {
  const cached = mxCache.get(domain);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.hasMx;
  }

  let timeout: NodeJS.Timeout | undefined;
  try {
    const records = await Promise.race([
      resolveMx(domain),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error('Consulta MX excedeu o tempo limite.')), MX_LOOKUP_TIMEOUT_MS);
      }),
    ]);
    const hasMx = records.length > 0;
    mxCache.set(domain, { hasMx, expiresAt: Date.now() + MX_CACHE_TTL_MS });
    return hasMx;
  } catch {
    mxCache.set(domain, { hasMx: false, expiresAt: Date.now() + MX_CACHE_TTL_MS });
    return false;
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

export async function assertEmailDomainHasMx(email: string): Promise<void> {
  const separatorPosition = email.lastIndexOf('@');
  const domain = email.slice(separatorPosition + 1);

  if (!(await domainHasMxRecord(domain))) {
    throw new InvalidEmailError();
  }
}
