import { api } from './api';
import type { ChaveHabito } from './rotulos';

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
  consultasHoje: { id: number; pacienteId: number; nome: string; inicio: string; fim: string; status: StatusConsulta }[];
  escalas: {
    pendentes: number;
    respondidasRecentes: {
      aplicacaoId: number;
      pacienteId: number;
      nome: string;
      sigla: string;
      respondidoEm: string;
      scoreTotal: number;
      item9DiferenteDeZero: boolean | null;
    }[];
  };
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
  // null sem consentimento de humor nem de hábitos.
  registros: number | null;
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
  habitos: ({ diasRegistrados: number } & Record<ChaveHabito, number>) | null;
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

// `tipo` é aberto: um tipo novo chega só com `tipo` e `em` e é mostrado de forma neutra.
export type ItemEventoTempo = { tipo: string; em: string; sigla?: string; scoreTotal?: number | null; status?: StatusConsulta };
export type ItemLinhaDoTempo = ItemCheckinTempo | ItemEventoTempo;

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
    intensidadeEmocao: number | null;
    emocoes: string[] | null;
    gatilhos: string[] | null;
    sonoHoras: number | null;
    qualidadeSono: string | null;
    habitos: Record<ChaveHabito, boolean> | null;
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

export type StatusAplicacao = 'pendente' | 'em_andamento' | 'concluida' | 'cancelada';

export type EscalaCatalogo = {
  id: number;
  sigla: string;
  nome: string;
  totalQuestoes: number;
  pontuacaoMaxima: number;
  validacaoRef: string;
};

export type Aplicacao = {
  id: number;
  escala: { sigla: string; nome: string; pontuacaoMaxima: number };
  status: StatusAplicacao;
  solicitadoEm: string;
  respondidoEm: string | null;
  scoreTotal: number | null;
  subscores: Record<string, number> | null;
  item9DiferenteDeZero: boolean | null;
};

export type AplicacaoListada = Aplicacao & { pacienteId: number; pacienteNome: string };

export type DetalheAplicacao = AplicacaoListada & {
  instrucao: string;
  subescalas: Record<string, { rotulo: string; itens: number[] }> | null;
  itens: { numero: number; enunciado: string; resposta: number | null; rotuloResposta: string | null }[];
};

export type StatusConsulta = 'agendada' | 'concluida' | 'cancelada' | 'remarcada';

export type Consulta = {
  id: number;
  pacienteId: number;
  pacienteNome: string;
  inicio: string;
  fim: string;
  status: StatusConsulta;
  remarcadaDe: number | null;
  observacao: string | null;
};

export type NovaConsulta = { pacienteId: number; inicio: string; fim: string; observacao?: string };

export type CabecalhoRelatorio = {
  psicologo: { nome: string; crp: string };
  periodo: { de: string; ate: string };
  geradoEm: string;
};

export type LinhaRelatorioGeral = {
  pacienteId: number;
  nome: string;
  consentimentos: Pick<Consentimentos, 'humor' | 'habitos' | 'escalas'>;
  registros: number | null;
  humorMedio: number | null;
  ansiedadeMedia: number | null;
  sonoMedioHoras: number | null;
  escalasConcluidas: number | null;
  consultas: Record<StatusConsulta, number>;
};

export type RelatorioGeral = { cabecalho: CabecalhoRelatorio; pacientes: LinhaRelatorioGeral[] };

export type RelatorioPaciente = {
  cabecalho: CabecalhoRelatorio & { paciente: { id: number; nome: string } };
  consentimentos: Consentimentos;
  serieDiaria: RegistroResumo[];
  frequenciaEmocional: ResumoPaciente['frequenciaEmocional'];
  habitos: ResumoPaciente['habitos'];
  distribuicaoHorario: ResumoPaciente['distribuicaoHorario'];
  escalas: Aplicacao[];
  consultas: { id: number; inicio: string; fim: string; status: StatusConsulta }[];
  anotacoes: { id: number; criadoEm: string; conteudo: string }[] | null;
};

export type PedidoRelatorio = { de: string; ate: string } & (
  | { tipo: 'geral' }
  | { tipo: 'paciente'; pacienteId: number; incluirAnotacoes: boolean }
);

type MetaValor = string | number | boolean;

export type EventoAuditoria = {
  id: number;
  acao: string;
  atorPapel: 'psicologo' | 'paciente' | null;
  pacienteId: number | null;
  pacienteNome: string | null;
  metadados: Record<string, MetaValor>;
  criadoEm: string;
  ip: string | null;
};

export type FiltroAuditoria = { acao?: string; pacienteId?: number; de?: string; ate?: string };

export type Sessao = { id: string; criadoEm: string; ultimoUsoEm: string; ip: string | null; userAgent: string | null; atual: boolean };

export const listarEscalas = async () => (await api.get<{ escalas: EscalaCatalogo[] }>('/psicologo/escalas')).data.escalas;

export const solicitarEscala = (pacienteId: number, escalaId: number) =>
  api.post(`/psicologo/pacientes/${pacienteId}/escalas`, { escalaId });

export const cancelarAplicacao = (id: number) => api.post(`/psicologo/aplicacoes/${id}/cancelar`);

export const listarAplicacoesDoPaciente = async (id: number) =>
  (await api.get<{ aplicacoes: Aplicacao[]; consentimentos: Consentimentos }>(`/psicologo/pacientes/${id}/escalas`)).data;

export const listarAplicacoes = async (status: StatusAplicacao | undefined, cursor?: string) =>
  (
    await api.get<{ aplicacoes: AplicacaoListada[]; proximoCursor: string | null }>('/psicologo/aplicacoes', {
      params: { status, cursor },
    })
  ).data;

export const buscarAplicacao = async (id: number) =>
  (await api.get<{ aplicacao: DetalheAplicacao }>(`/psicologo/aplicacoes/${id}`)).data.aplicacao;

export const listarConsultas = async (de: string, ate: string) =>
  (await api.get<{ consultas: Consulta[] }>('/psicologo/consultas', { params: { de, ate } })).data.consultas;

export const criarConsulta = async (dados: NovaConsulta) =>
  (await api.post<{ consulta: Consulta }>('/psicologo/consultas', dados)).data.consulta;

export const alterarConsulta = (id: number, dados: { status?: 'concluida' | 'cancelada'; observacao?: string }) =>
  api.patch(`/psicologo/consultas/${id}`, dados);

export const remarcarConsulta = (id: number, dados: { inicio: string; fim: string }) =>
  api.post(`/psicologo/consultas/${id}/remarcar`, dados);

export type RelatorioBuscado = { tipo: 'geral'; dados: RelatorioGeral } | { tipo: 'paciente'; dados: RelatorioPaciente };

export async function buscarRelatorio(pedido: PedidoRelatorio): Promise<RelatorioBuscado> {
  const { de, ate } = pedido;
  if (pedido.tipo === 'geral') {
    return { tipo: 'geral', dados: (await api.get<RelatorioGeral>('/psicologo/relatorios/geral', { params: { de, ate } })).data };
  }
  const { pacienteId, incluirAnotacoes } = pedido;
  return {
    tipo: 'paciente',
    dados: (await api.get<RelatorioPaciente>(`/psicologo/relatorios/pacientes/${pacienteId}`, { params: { de, ate, incluirAnotacoes } })).data,
  };
}

export const registrarExportacao = async (pedido: PedidoRelatorio) =>
  (await api.post<{ numero: number }>('/psicologo/relatorios/exportacoes', pedido)).data.numero;

export const listarAcoesAuditoria = async () =>
  (await api.get<{ acoes: { acao: string; rotulo: string }[] }>('/psicologo/auditoria/acoes')).data.acoes;

export const listarAuditoria = async (filtro: FiltroAuditoria, cursor?: string) =>
  (await api.get<{ eventos: EventoAuditoria[]; proximoCursor: string | null }>('/psicologo/auditoria', { params: { ...filtro, cursor } })).data;

export const atualizarMe = async (dados: { nome: string; especialidade: string }) =>
  (await api.patch<Psicologo>('/psicologo/me', dados)).data;

export const trocarSenha = (senhaAtual: string, novaSenha: string) =>
  api.post('/psicologo/me/senha', { senhaAtual, novaSenha });

export const excluirConta = (senha: string) => api.post('/psicologo/me/excluir', { senha });

export const listarSessoes = async () => (await api.get<{ sessoes: Sessao[] }>('/psicologo/me/sessoes')).data.sessoes;

export const encerrarOutrasSessoes = async () =>
  (await api.post<{ encerradas: number }>('/psicologo/me/sessoes/encerrar-outras')).data.encerradas;
