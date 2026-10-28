/**
 * Rascunho do check-in em nível de módulo: sobrevive a background kill
 * dentro da sessão, morre junto com a sessão (logout chama resetarRascunho).
 * Sem persistência em disco — protótipo.
 */
export type RascunhoCheckin = {
  etapa: number;
  emocoes: string[];
  intensidade: number;
  humor: number;
  ansiedade: number;
  horasSono: number;
  qualidadeSono: string | null;
  contextos: string[];
  habitos: string[];
  notas: string;
  diarioCompartilhado: boolean;
};

let rascunho: RascunhoCheckin | null = null;

export function salvarRascunho(novo: RascunhoCheckin) {
  rascunho = novo;
}

export function lerRascunho(): RascunhoCheckin | null {
  return rascunho;
}

export function resetarRascunho() {
  rascunho = null;
}
