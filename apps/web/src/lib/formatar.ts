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
