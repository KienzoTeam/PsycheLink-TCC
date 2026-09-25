import crypto from 'crypto';

/**
 * Criptografia simétrica (AES-256-GCM) pra campos de texto sensíveis — diário emocional, contextos/gatilhos, etc.
 
 */

const ALGORITMO = 'aes-256-gcm';
const TAMANHO_IV = 12; // recomendado pelo Node pra GCM

function obterChave(): Buffer {
  const chaveBase64 = process.env.ENCRYPTION_KEY;

  if (!chaveBase64) {
    throw new Error('ENCRYPTION_KEY não definida no .env');
  }

  const chave = Buffer.from(chaveBase64, 'base64');

  if (chave.length !== 32) {
    throw new Error(
      'ENCRYPTION_KEY precisa decodificar pra exatamente 32 bytes (256 bits) em base64.',
    );
  }

  return chave;
}

/** Criptografa um texto. Formato do resultado: "iv.authTag.dados", tudo em base64. */
export function criptografar(textoPlano: string): string {
  const iv = crypto.randomBytes(TAMANHO_IV);
  const cipher = crypto.createCipheriv(ALGORITMO, obterChave(), iv);

  const criptografado = Buffer.concat([
    cipher.update(textoPlano, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString('base64')}.${authTag.toString('base64')}.${criptografado.toString('base64')}`;
}

/** Desfaz `criptografar`. Lança erro se o formato ou a chave não conferirem. */
export function descriptografar(textoCriptografado: string): string {
  const partes = textoCriptografado.split('.');

  if (partes.length !== 3) {
    throw new Error('Formato de texto criptografado inválido.');
  }

  const [ivB64, authTagB64, dadosB64] = partes;

  const decipher = crypto.createDecipheriv(ALGORITMO, obterChave(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(authTagB64, 'base64'));

  const decriptografado = Buffer.concat([
    decipher.update(Buffer.from(dadosB64, 'base64')),
    decipher.final(),
  ]);

  return decriptografado.toString('utf8');
}

/** Atalho: criptografa, mas deixa null/undefined passarem direto como null. */
export function criptografarOuNulo(texto: string | null | undefined): string | null {
  if (!texto) return null;
  return criptografar(texto);
}
