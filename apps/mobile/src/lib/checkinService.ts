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

  // Chama o endpoint POST /checkin alinhado com o servidor
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

/** Busca o histórico já pronto pra alimentar os gráficos de "Meus Dados". */
export async function buscarResumoCheckins(): Promise<ResumoCheckins> {
  // Chama GET /checkin/resumo alinhado com o servidor
  const response = await api.get<ResumoCheckins>('/checkin/resumo');
  return response.data;
}

export type PainelCheckin = {
  semDados: boolean;
  humorMedio?: number | null;
  humorVariacaoSemana?: number | null;
  ansiedadeMedia?: number | null;
  ansiedadeVariacaoSemana?: number | null;
  sonoMedioHoras?: number | null;
  qualidadeSonoPredominante?: string | null;
  checkinsEstaSemana?: number;
  emocoesRecentes?: string[];
  percepcao?: string;
};

export async function buscarPainelCheckin(): Promise<PainelCheckin> {
  // Chama GET /checkin/painel alinhado com o servidor
  const response = await api.get<PainelCheckin>('/checkin/painel');
  return response.data;
}