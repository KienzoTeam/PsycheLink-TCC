/** 'YYYY-MM-DD' → 'DD/MM' */
export function formatarDataCurta(iso: string): string {
  const [, mes, dia] = iso.split('-');
  return `${dia}/${mes}`;
}

/** Dias corridos entre a data (YYYY-MM-DD) e hoje. */
export function diasDesde(iso: string): number {
  const [ano, mes, dia] = iso.split('-').map(Number);
  const hoje = new Date();
  const hojeUtc = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return Math.round((hojeUtc - Date.UTC(ano, mes - 1, dia)) / 86_400_000);
}

/** Média de valores não nulos, com uma casa decimal. */
export function media(valores: Array<number | null | undefined>): number | null {
  const validos = valores.filter((v): v is number => v !== null && v !== undefined);
  if (validos.length === 0) return null;
  return Number((validos.reduce((soma, v) => soma + v, 0) / validos.length).toFixed(1));
}

export function primeiroNome(nome: string): string {
  return nome.split(' ')[0] ?? nome;
}

/** Iniciais para o avatar: primeira letra do primeiro e do último nome. */
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? '';
  const ultima = partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? '') : '';
  return (primeira + ultima).toUpperCase();
}

const FUSO = 'America/Sao_Paulo';
const formatoDataHora = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: FUSO });
const formatoData = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: FUSO });
const formatoNumero = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const formatoVariacao = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1, signDisplay: 'exceptZero' });

/** Instante ISO → 'DD/MM/AAAA HH:mm' em America/Sao_Paulo. */
export const formatarDataHora = (iso: string) => formatoDataHora.format(new Date(iso));

/** Instante ISO → 'DD/MM/AAAA' em America/Sao_Paulo. */
export const formatarData = (iso: string) => formatoData.format(new Date(iso));

/** Dia civil 'YYYY-MM-DD' → 'DD/MM/AAAA'. O meio-dia UTC cai no mesmo dia em São Paulo. */
export const formatarDia = (dia: string) => formatoData.format(new Date(`${dia}T12:00:00Z`));

/** Data e horário de um check-in (dia civil + 'HH:mm' de São Paulo, quando existir). */
export const formatarCheckin = (dia: string, horario: string | null) =>
  horario ? `${formatarDia(dia)} às ${horario}` : formatarDia(dia);

export const formatarNumero = (valor: number) => formatoNumero.format(valor);

/** Diferença entre períodos como número neutro: '+0,8', '-1,2'. */
export const formatarVariacao = (valor: number) => formatoVariacao.format(valor);

export const plural = (n: number, singular: string, pluralizado: string) => `${n} ${n === 1 ? singular : pluralizado}`;
