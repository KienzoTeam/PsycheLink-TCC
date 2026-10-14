import { api } from './api';

export type Psicologo = {
  id: number;
  nome: string;
  email: string;
  crp: string;
  especialidade: string | null;
};

export type Consentimentos = {
  humor: boolean;
  habitos: boolean;
  escalas: boolean;
  diario: boolean;
};

export type PacienteResumo = {
  id: number;
  nome: string;
  compartilhaHumor: boolean;
  compartilhaHabitos: boolean;
  compartilhaEscalas: boolean;
  compartilhaDiario: boolean;
  ultimoCheckin: { data: string; emocoes: string[] | null } | null;
  checkinsUltimos7Dias: number;
  humorMedio7d: number | null;
  ansiedadeMedia7d: number | null;
};

export type RegistroDiario = {
  data: string;
  humor: number | null;
  ansiedade: number | null;
  sonoHoras: number | null;
  qualidadeSono: string | null;
  emocoes: string[] | null;
  gatilhos: string[] | null;
};

export type DetalhePaciente = {
  paciente: { id: number; nome: string };
  consentimentos: Consentimentos;
  periodoDias: number;
  registros: RegistroDiario[];
  frequenciaEmocional: { emocao: string; quantidade: number }[];
  habitos: { diasRegistrados: number; exercicio: number; meditacao: number; medicacao: number } | null;
  diario: { data: string; texto: string }[];
};

export type Anotacao = { id: number; conteudo: string; criadoEm: string };

export const buscarMe = async () => (await api.get<Psicologo>('/psicologo/me')).data;

export const listarPacientes = async () =>
  (await api.get<{ pacientes: PacienteResumo[] }>('/psicologo/pacientes')).data;

export const buscarPaciente = async (id: number, dias: number) =>
  (await api.get<DetalhePaciente>(`/psicologo/pacientes/${id}/resumo`, { params: { dias } })).data;

export const listarAnotacoes = async (id: number) =>
  (await api.get<{ anotacoes: Anotacao[] }>(`/psicologo/pacientes/${id}/anotacoes`)).data.anotacoes;

export const criarAnotacao = async (id: number, conteudo: string) =>
  (await api.post<{ anotacao: Anotacao }>(`/psicologo/pacientes/${id}/anotacoes`, { conteudo })).data.anotacao;
