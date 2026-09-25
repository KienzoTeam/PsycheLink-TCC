/**
 * Checagem sintática LEVE, só para UX instantânea.
 * Não bloqueia digitação; a validação definitiva é sempre a do servidor
 * (normaliza IDN/punycode + zod + MX).
 */
export function erroEmail(valor: string): string | null {
  const v = valor.trim();
  if (!v) return 'Informe seu e-mail.';
  const arroba = v.lastIndexOf('@');
  if (arroba <= 0 || arroba === v.length - 1) return 'E-mail inválido.';
  if (!v.slice(arroba + 1).includes('.')) return 'E-mail inválido.';
  return null;
}
