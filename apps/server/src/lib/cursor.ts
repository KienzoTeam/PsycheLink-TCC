import { z } from 'zod';

/** Cursor opaco de paginação keyset: os valores da última linha, em JSON base64url. */
export const codificarCursor = (valores: unknown[]): string =>
  Buffer.from(JSON.stringify(valores)).toString('base64url');

/** Schema de query que decodifica o cursor e valida a forma dos valores. */
export const cursorDe = <T extends z.ZodType>(forma: T) =>
  z
    .string()
    .max(300)
    .transform((texto, ctx) => {
      try {
        return JSON.parse(Buffer.from(texto, 'base64url').toString('utf8')) as unknown;
      } catch {
        ctx.addIssue({ code: 'custom', message: 'Cursor inválido.' });
        return z.NEVER;
      }
    })
    .pipe(forma);
