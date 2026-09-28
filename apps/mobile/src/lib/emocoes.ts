// ids salvos no check-in -> rótulos exibidos ao paciente.
export const ROTULOS_EMOCAO: Record<string, string> = {
  feliz: 'Feliz',
  triste: 'Triste',
  ansioso: 'Ansioso',
  calmo: 'Calmo',
  irritado: 'Irritado',
  cansado: 'Cansado',
};

export function rotularEmocao(id: string): string {
  const chave = id.trim().toLowerCase();
  return ROTULOS_EMOCAO[chave] ?? (chave ? chave[0].toUpperCase() + chave.slice(1) : id);
}
