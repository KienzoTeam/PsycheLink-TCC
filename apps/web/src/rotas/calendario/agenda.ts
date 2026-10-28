import {
  endOfMonth,
  endOfWeek,
  fromDate,
  parseDate,
  parseTime,
  startOfMonth,
  startOfWeek,
  toCalendarDate,
  toCalendarDateTime,
  toZoned,
  today,
  DateFormatter,
  type CalendarDate,
} from '@internationalized/date';
import { FUSO } from '../../lib/formatar';
import { lerDia } from '../../lib/periodo';

export type Visao = 'dia' | 'semana' | 'mes';

const LOCALE = 'pt-BR';
export const MIN_DURACAO = 15;
export const MAX_DURACAO = 240;
export const PASSO_DURACAO = 5;

export const hoje = () => today(FUSO);

/** Primeiro e último dia exibidos. No mês, os dias de fora do mês ficam desabilitados na grade e não precisam de dados. */
export function intervalo(visao: Visao, dia: CalendarDate) {
  if (visao === 'dia') return { de: dia, ate: dia };
  if (visao === 'semana') return { de: startOfWeek(dia, LOCALE), ate: endOfWeek(dia, LOCALE) };
  return { de: startOfMonth(dia), ate: endOfMonth(dia) };
}

export const deslocar = (visao: Visao, dia: CalendarDate, sentido: 1 | -1) =>
  dia.add(visao === 'dia' ? { days: sentido } : visao === 'semana' ? { weeks: sentido } : { months: sentido });

/** Dia civil em São Paulo de um instante ISO. */
export const diaDoInstante = (iso: string) => toCalendarDate(fromDate(new Date(iso), FUSO));

export function minutosDoDia(iso: string) {
  const z = fromDate(new Date(iso), FUSO);
  return z.hour * 60 + z.minute;
}

export const lerDiaOuHoje = (texto: string | null) => lerDia(texto) ?? hoje();

const formato = (opcoes: Intl.DateTimeFormatOptions) => new DateFormatter(LOCALE, { ...opcoes, timeZone: FUSO });
const completo = formato({ dateStyle: 'full' });
const longo = formato({ dateStyle: 'long' });
const curto = formato({ day: 'numeric', month: 'short' });
const mesAno = formato({ month: 'long', year: 'numeric' });
const diaSemana = formato({ weekday: 'short' });

const emSp = (dia: CalendarDate) => dia.toDate(FUSO);

export function tituloDe(visao: Visao, dia: CalendarDate) {
  if (visao === 'dia') return completo.format(emSp(dia));
  if (visao === 'mes') return mesAno.format(emSp(dia));
  const { de, ate } = intervalo('semana', dia);
  return `${curto.format(emSp(de))} a ${longo.format(emSp(ate))}`;
}

export const diaPorExtenso = (dia: CalendarDate) => completo.format(emSp(dia));
export const abreviacaoDoDia = (dia: CalendarDate) => diaSemana.format(emSp(dia));

/** Dia e hora digitados (horário de São Paulo) → instante ISO em UTC. */
export function instanteDe(dia: string, hora: string, somarMinutos = 0) {
  return toZoned(toCalendarDateTime(parseDate(dia), parseTime(hora)), FUSO).add({ minutes: somarMinutos }).toAbsoluteString();
}

/** Campos do formulário a partir de um instante ISO. */
export function camposDe(inicio: string, fim: string) {
  const z = fromDate(new Date(inicio), FUSO);
  return {
    dia: toCalendarDate(z).toString(),
    hora: `${String(z.hour).padStart(2, '0')}:${String(z.minute).padStart(2, '0')}`,
    minutos: String(Math.round((Date.parse(fim) - Date.parse(inicio)) / 60_000)),
  };
}
