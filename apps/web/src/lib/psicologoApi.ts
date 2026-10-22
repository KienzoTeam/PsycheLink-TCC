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

export type StatusDados = 'ativo' | 'esparso' | 'sem_registros';

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
  // null quando o paciente não compartilha humor: o servidor não revela o volume.
  status: StatusDados | null;
  registros7d: number | null;
  vinculadoEm: string;
};

export type Dashboard = {
  pacientesVinculados: number;
  serieVinculos: { data: string; total: number }[];
  checkinsRecentes: { pacienteId: number; nome: string; em: string; emocoes: string[] | null }[];
  // `acao` é texto aberto: o servidor pode acrescentar ações novas.
  atividadeRecente: { pacienteId: number; nome: string; acao: string; em: string }[];
  dadosInsuficientes: { pacienteId: number; nome: string; registros7d: number }[];
  medias: { n: number; humor: number | null; ansiedade: number | null; sono: number | null };
};

export type RegistroResumo = {
  id: number;
  data: string;
  horario: string | null;
  humor: number | null;
  ansiedade: number | null;
  sonoHoras: number | null;
  qualidadeSono: string | null;
  emocoes: string[] | null;
  gatilhos: string[] | null;
};

export type FaixaHorario = 'madrugada' | 'manha' | 'tarde' | 'noite';

export type ResumoPeriodo = {
  registros: number;
  humorMedio: number | null;
  ansiedadeMedia: number | null;
  sonoMedioHoras: number | null;
};

export type ResumoPaciente = {
  paciente: { id: number; nome: string };
  consentimentos: Consentimentos;
  periodoDias: number;
  registros: RegistroResumo[];
  frequenciaEmocional: { emocao: string; quantidade: number }[];
  habitos: { diasRegistrados: number; exercicio: number; meditacao: number; medicacao: number } | null;
  diario: { data: string; texto: string }[];
  distribuicaoHorario: Record<FaixaHorario, number> | null;
  comparacao: { atual: ResumoPeriodo; anterior: ResumoPeriodo } | null;
  correlacaoSonoHumor: { r: number; n: number } | null;
  esparso: boolean | null;
};

export type ParamsResumo = { de: string; ate: string; compararDe?: string; compararAte?: string };

export type ItemCheckinTempo = {
  tipo: 'checkin';
  em: string;
  id: number;
  data: string;
  horario: string | null;
  emocoes: string[] | null;
  humor: number | null;
  ansiedade: number | null;
  sonoHoras: number | null;
};

// `tipo` é aberto: escalas e consultas chegam como tipos novos e são mostrados de forma neutra.
export type ItemLinhaDoTempo = ItemCheckinTempo | { tipo: string; em: string };

export const ehCheckinTempo = (item: ItemLinhaDoTempo): item is ItemCheckinTempo => item.tipo === 'checkin';

export type PaginaLinhaDoTempo = {
  consentimentos: Consentimentos;
  itens: ItemLinhaDoTempo[];
  proximoCursor: string | null;
};

export type Anotacao = { id: number; conteudo: string; criadoEm: string };

export type CheckinListado = {
  id: number;
  pacienteId: number;
  nome: string;
  data: string;
  horario: string | null;
  emocoes: string[] | null;
  humor: number | null;
  ansiedade: number | null;
  sonoHoras: number | null;
};

export type FiltroCheckins = { pacienteId?: number; de?: string; ate?: string; emocao?: string };

export type DetalheCheckin = {
  checkin: {
    id: number;
    pacienteId: number;
    nome: string;
    data: string;
    horario: string | null;
    humor: number | null;
    ansiedade: number | null;
    emocoes: string[] | null;
    gatilhos: string[] | null;
    sonoHoras: number | null;
    qualidadeSono: string | null;
    habitos: { exercicio: boolean; meditacao: boolean; medicacao: boolean } | null;
    diario: string | null;
  };
  consentimentos: Consentimentos;
};

export type StatusCodigo = 'ativo' | 'expirado' | 'usado' | 'revogado';

export type CodigoVinculo = {
  id: number;
  status: StatusCodigo;
  criadoEm: string;
  expiraEm: string;
  usadoEm: string | null;
  revogadoEm: string | null;
};

export type CodigoGerado = { id: number; codigo: string; expiraEm: string };

export type VinculoHistorico = {
  pacienteId: number;
  nome: string;
  status: 'ativo' | 'encerrado';
  vinculadoEm: string;
  encerradoEm: string | null;
  encerradoPor: 'psicologo' | 'paciente' | null;
};

export const buscarMe = async () => (await api.get<Psicologo>('/psicologo/me')).data;

export const buscarDashboard = async (periodo: number) =>
  (await api.get<Dashboard>('/psicologo/dashboard', { params: { periodo } })).data;

type FiltroPacientes = { busca?: string; status?: StatusDados; cursor?: string; limite?: number };

export const listarPacientes = async (filtro: FiltroPacientes) =>
  (
    await api.get<{ pacientes: PacienteResumo[]; proximoCursor: string | null }>('/psicologo/pacientes', {
      params: { ...filtro, busca: filtro.busca || undefined },
    })
  ).data;

// O seletor de pacientes precisa da lista inteira, então segue o cursor até o fim.
export async function listarTodosPacientes() {
  const todos: PacienteResumo[] = [];
  let cursor: string | undefined;
  do {
    const pagina = await listarPacientes({ cursor, limite: 100 });
    todos.push(...pagina.pacientes);
    cursor = pagina.proximoCursor ?? undefined;
  } while (cursor);
  return todos;
}

export const buscarResumo = async (id: number, params: ParamsResumo) =>
  (await api.get<ResumoPaciente>(`/psicologo/pacientes/${id}/resumo`, { params })).data;

export const listarLinhaDoTempo = async (id: number, params: { de: string; ate: string; cursor?: string }) =>
  (await api.get<PaginaLinhaDoTempo>(`/psicologo/pacientes/${id}/linha-do-tempo`, { params })).data;

// O servidor devolve 'YYYY-MM-DD HH:mm' sem fuso, em UTC: vira ISO para formatar como os demais instantes.
const instanteDaAnotacao = (a: Anotacao): Anotacao => ({ ...a, criadoEm: `${a.criadoEm.replace(' ', 'T')}:00Z` });

export const listarAnotacoes = async (id: number) =>
  (await api.get<{ anotacoes: Anotacao[] }>(`/psicologo/pacientes/${id}/anotacoes`)).data.anotacoes.map(
    instanteDaAnotacao,
  );

export const criarAnotacao = async (id: number, conteudo: string) =>
  instanteDaAnotacao((await api.post<{ anotacao: Anotacao }>(`/psicologo/pacientes/${id}/anotacoes`, { conteudo })).data.anotacao);

export const encerrarVinculo = (id: number) => api.post(`/psicologo/pacientes/${id}/encerrar-vinculo`);

export const listarCheckins = async (filtro: FiltroCheckins, cursor?: string) =>
  (
    await api.get<{ itens: CheckinListado[]; proximoCursor: string | null }>('/psicologo/checkins', {
      params: { ...filtro, cursor },
    })
  ).data;

export const buscarCheckin = async (id: number) => (await api.get<DetalheCheckin>(`/psicologo/checkins/${id}`)).data;

export const gerarCodigoVinculo = async () => (await api.post<CodigoGerado>('/psicologo/vinculo/codigos')).data;

export const listarCodigos = async () =>
  (await api.get<{ codigos: CodigoVinculo[] }>('/psicologo/vinculo/codigos')).data.codigos;

export const revogarCodigo = (id: number) => api.delete(`/psicologo/vinculo/codigos/${id}`);

export const listarHistoricoVinculos = async () =>
  (await api.get<{ vinculos: VinculoHistorico[] }>('/psicologo/vinculo/historico')).data.vinculos;
