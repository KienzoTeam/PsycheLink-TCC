import { descriptografar } from './criptografia';

export const QUALIDADE_SONO_REVERSO: Record<number, string> = { 1: 'Ruim', 2: 'Regular', 3: 'Boa' };

// criado_em é timestamp sem fuso gravado com o relógio UTC do banco (TimeZone GMT no Neon).
export const CHECKIN_EM = "(c.criado_em AT TIME ZONE 'UTC')";
export const CHECKIN_HORARIO = `to_char(${CHECKIN_EM} AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI')`;

/** Descriptografa um campo; falha isolada não derruba a resposta inteira. */
export function lerSeguro(valor: string | null): string | null {
  if (!valor) return null;
  try {
    return descriptografar(valor);
  } catch (erro) {
    console.warn('Não foi possível descriptografar um campo do paciente:', erro);
    return null;
  }
}

export function separarLista(texto: string | null): string[] | null {
  if (texto === null) return null;
  return texto
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export const emocoesDe = (cifrado: string | null) => separarLista(lerSeguro(cifrado));
