import { api } from './api';
import { RascunhoCheckin } from './rascunhoCheckin';

export type CheckinSalvo = {
  id: number;
  data: string;
  criado_em: string;
};

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

  // Chama POST /checkin no servidor
  const response = await api.post<{ checkin: CheckinSalvo }>('/checkin', payload);

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

export async function buscarResumoCheckins(): Promise<ResumoCheckins> {
  // Chama GET /checkin/resumo no servidor
  const response = await api.get<ResumoCheckins>('/checkin/resumo');
  return response.data;
}