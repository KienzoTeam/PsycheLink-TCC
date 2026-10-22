import { parseDate, toCalendarDate } from '@internationalized/date';
import type { DateValue } from 'react-aria-components';
import type { Periodo } from '../components/ui/DateRangePicker';

// Limite do servidor para `de` a `ate` (as duas pontas contam).
export const MAX_DIAS_PERIODO = 366;

export const diaIso = (valor: DateValue) => toCalendarDate(valor).toString();

export const diasDoPeriodo = (periodo: Periodo) =>
  toCalendarDate(periodo.end).compare(toCalendarDate(periodo.start)) + 1;

/** O período de mesmo tamanho que termina no dia anterior ao início deste. */
export function periodoAnterior(periodo: Periodo): Periodo {
  const fim = toCalendarDate(periodo.start).subtract({ days: 1 });
  return { start: fim.subtract({ days: diasDoPeriodo(periodo) - 1 }), end: fim };
}

/** Dia vindo da URL ou de um campo: texto inválido vale como ausente. */
export function lerDia(texto: string | null) {
  try {
    return texto ? parseDate(texto) : null;
  } catch {
    return null;
  }
}
