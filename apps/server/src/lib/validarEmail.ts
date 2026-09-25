import { domainToASCII } from 'node:url';
import { resolveMx } from 'node:dns/promises';
import { z } from 'zod';

// Regex só na checagem sintática final, sobre domínio já convertido a ASCII.
// Biblioteca madura (zod) em vez de regex manual → sem superfície de ReDoS.
// Obs.: no zod v4 o idiomático é z.email(); z.string().email() segue funcionando.
const emailSchema = z.string().email();

/** Trim + lowercase + domínio Unicode/IDN → punycode (RFC 3490). null se inválido. */
export function normalizarEmail(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const bruto = input.trim().toLowerCase();
  const arroba = bruto.lastIndexOf('@');
  if (arroba <= 0 || arroba === bruto.length - 1) return null;

  const dominioAscii = domainToASCII(bruto.slice(arroba + 1));
  if (!dominioAscii) return null;

  const email = `${bruto.slice(0, arroba)}@${dominioAscii}`;
  return emailSchema.safeParse(email).success ? email : null;
}

// honey: timeout de 5 s com fail-open — rede oscilante não pode impedir cadastro;
// virar fail-closed (+ cache de domínios aceitos) se validação estrita virar requisito.
export async function dominioTemMX(dominio: string): Promise<boolean> {
  try {
    const mx = await Promise.race([
      resolveMx(dominio),
      new Promise<never>((_, rejeita) =>
        setTimeout(() => rejeita(new Error('dns-timeout')), 5_000)
      ),
    ]);
    return mx.length > 0;
  } catch (e) {
    // Timeout = não sabemos → permite. Domínio inexistente (NXDOMAIN etc.) → nega.
    return e instanceof Error && e.message === 'dns-timeout';
  }
}
