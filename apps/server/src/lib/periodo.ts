import { z } from 'zod';

export const dia = z.iso.date();

/** Dias corridos de `de` a `ate`, as duas pontas incluídas. */
export const diasEntre = (de: string, ate: string): number =>
  (Date.parse(ate) - Date.parse(de)) / 86_400_000 + 1;

/** De não depois de ate e no máximo 366 dias; com um dos lados ausente não há o que conferir. */
export function periodoValido(de?: string, ate?: string): boolean {
  if (de === undefined || ate === undefined) return true;
  const dias = diasEntre(de, ate);
  return dias >= 1 && dias <= 366;
}
