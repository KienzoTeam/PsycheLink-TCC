import { createHash, createHmac, randomInt, timingSafeEqual } from 'node:crypto';

const PEPPER = process.env.EMAIL_PEPPER || process.env.JWT_SECRET || '';

export const gerarCodigo = (): number => randomInt(100_000, 1_000_000);

export const hashCodigo = (codigo: number, email: string): string =>
  createHash('sha256').update(`${codigo}:${email}:${PEPPER}`).digest('hex');

export function codigoConfere(codigo: number, email: string, hash: string): boolean {
  const calculado = Buffer.from(hashCodigo(codigo, email), 'hex');
  let armazenado: Buffer;
  try {
    armazenado = Buffer.from(hash, 'hex');
  } catch {
    return false;
  }
  return armazenado.length === calculado.length && timingSafeEqual(calculado, armazenado);
}

/** Código de vínculo: 6 dígitos, com zeros à esquerda, de um CSPRNG. */
export const gerarCodigoVinculo = (): string => String(randomInt(1_000_000)).padStart(6, '0');

/** Só o HMAC fica no banco; o prefixo separa este uso dos hashes de e-mail. */
export const hmacCodigoVinculo = (codigo: string): string =>
  createHmac('sha256', PEPPER).update(`vinculo:${codigo}`).digest('hex');
