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
    // O switch só aparece com texto; sem texto não há o que compartilhar.
    diarioCompartilhado: rascunho.notas.trim() !== '' && rascunho.diarioCompartilhado,
  };

  // Chama o endpoint POST /checkin alinhado com o servidor
  const response = await api.post<{ checkin: CheckinSalvo }>('/checkin', payload);

  return response.data.checkin;
}

/** Preferência `diario` do paciente: valor inicial do interruptor "Compartilhar este texto". */
export async function buscarDiarioPadrao(): Promise<boolean> {
  const { data } = await api.get<{ diario: boolean }>('/paciente/consentimento');
  return data.diario;
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

export type Habitos = {
  hidratacao: boolean;
  exercicio: boolean;
  meditacao: boolean;
  limiteTelas: boolean;
  contatoSocial: boolean;
  medicacao: boolean;
};

export type RegistroHistorico = {
  id: number;
  data: string; // 'YYYY-MM-DD'
  horario: string | null; // 'HH:MM' (Brasília)
  humor: number | null;
  ansiedade: number | null;
  sonoHoras: number | null;
  qualidadeSono: string | null;
  emocoes: string[] | null;
  gatilhos: string[] | null;
  habitos: Habitos | null;
  notas: string | null;
  diarioCompartilhado: boolean;
};

export type Historico = {
  dias: number;
  registros: RegistroHistorico[]; // do mais novo para o mais antigo
  frequenciaEmocional: FrequenciaEmocional[];
};

/** GET /checkin/historico: alimenta o Histórico (F4) e Meus Dados (F6). */
export async function buscarHistorico(dias: number): Promise<Historico> {
  const { data } = await api.get<Historico>('/checkin/historico', { params: { dias } });
  return data;
}

export type PainelCheckin = {
  semDados: boolean;
  inativo?: boolean;
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