import { api } from './api';
import { RascunhoCheckin } from './rascunhoCheckin';

export type CheckinSalvo = {
  id: number;
  data: string;
  criado_em: string;
};

/**
 * Envia o rascunho do check-in pro backend. Lança o erro do axios adiante
 * (com `error.response.data.error` já no formato que o resto do app usa)
 * pra quem chamar decidir como mostrar a falha.
 */
export async function enviarCheckin(rascunho: RascunhoCheckin): Promise<CheckinSalvo> {
  const payload = {
    emocoes: rascunho.emocoes,
    intensidade: rascunho.intensidade,
    humor: rascunho.humor,
    ansiedade: rascunho.ansiedade,
    horasSono: rascunho.horasSono,
    qualidadeSono: rascunho.qualidadeSono,
    contextos: rascunho.contextos,
    habitos: rascunho.habitos,
    notas: rascunho.notas || undefined,
  };

  const response = await api.post<{ checkin: CheckinSalvo }>('/checkins', payload);

  return response.data.checkin;
}

export type PontoSerieTemporal = {
  data: string; // 'YYYY-MM-DD'
  humor: number | null;
  ansiedade: number | null;
};

export type FrequenciaEmocional = {
  emocao: string;
  quantidade: number;
};

export type ResumoCheckins = {
  serieTemporal: PontoSerieTemporal[];
  frequenciaEmocional: FrequenciaEmocional[];
};

/** Busca o histórico já pronto pra alimentar os gráficos de "Meus Dados". */
export async function buscarResumoCheckins(): Promise<ResumoCheckins> {
  const response = await api.get<ResumoCheckins>('/checkins/resumo');
  return response.data;
}
