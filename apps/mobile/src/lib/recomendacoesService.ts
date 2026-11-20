import { api } from './api';

/** `exercicioId` vem do catálogo do app (constants/data.ts); nulo é uma recomendação livre. */
export type Recomendacao = {
  id: number;
  exercicioId: string | null;
  titulo: string;
  descricao: string | null;
  nota: string | null;
  criadoEm: string;
  feitoEm: string | null;
  canceladoEm: string | null;
};

export async function buscarRecomendacoes(): Promise<Recomendacao[]> {
  const { data } = await api.get<{ recomendacoes: Recomendacao[] }>('/paciente/recomendacoes');
  return data.recomendacoes;
}

export async function marcarRecomendacaoFeita(id: number): Promise<void> {
  await api.post(`/paciente/recomendacoes/${id}/feito`);
}
