import type { Emocao } from '../components/ui/Chip';
import type { FaixaHorario, StatusAplicacao, StatusCodigo, StatusConsulta, StatusDados } from './psicologoApi';

const EMOCOES: readonly Emocao[] = ['feliz', 'triste', 'ansioso', 'calmo', 'irritado', 'cansado'];

const maiuscula = (texto: string) => {
  const limpo = texto.trim();
  return limpo ? limpo[0]!.toUpperCase() + limpo.slice(1) : limpo;
};

/** A emoção do catálogo do app, ou undefined para um texto livre. */
export const emocaoDe = (texto: string) => EMOCOES.find((emocao) => emocao === texto.trim().toLowerCase());

export const rotuloEmocao = (texto: string) => maiuscula(texto.toLowerCase());

/** Cor da marca da emoção; texto fora do catálogo fica neutro. */
export const corDaEmocao = (texto: string) => {
  const emocao = emocaoDe(texto);
  return emocao ? `var(--emocao-${emocao})` : 'var(--cor-contorno)';
};

// Os seis hábitos do check-in na ordem de exibição; `chave` é a do JSON do servidor (apps/server/src/lib/habitos.ts).
export const HABITOS = [
  { chave: 'hidratacao', rotulo: 'Hidratação' },
  { chave: 'exercicio', rotulo: 'Exercício' },
  { chave: 'meditacao', rotulo: 'Meditação' },
  { chave: 'limiteTelas', rotulo: 'Limite de telas' },
  { chave: 'contatoSocial', rotulo: 'Contato social' },
  { chave: 'medicacao', rotulo: 'Medicação' },
] as const;

export type ChaveHabito = (typeof HABITOS)[number]['chave'];

const GATILHOS: Record<string, string> = {
  trabalho: 'Trabalho',
  familia: 'Família',
  relacionamento: 'Relacionamento',
  saude: 'Saúde',
  financas: 'Finanças',
};

export const rotuloGatilho = (texto: string) => GATILHOS[texto.trim().toLowerCase()] ?? maiuscula(texto);

// Status descreve só o volume de registros dos últimos 7 dias, nunca estado clínico.
export const STATUS_DADOS: Record<StatusDados, string> = {
  ativo: 'Ativo',
  esparso: 'Esparso',
  sem_registros: 'Sem registros',
};

export const STATUS_CODIGO: Record<StatusCodigo, string> = {
  ativo: 'Ativo',
  expirado: 'Expirado',
  usado: 'Usado',
  revogado: 'Revogado',
};

export const STATUS_APLICACAO: Record<StatusAplicacao, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

export const AVISO_ESCALA = 'Instrumento de acompanhamento. O resultado é o escore bruto e não é diagnóstico.';

export const STATUS_CONSULTA: Record<StatusConsulta, string> = {
  agendada: 'Agendada',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
  remarcada: 'Remarcada',
};

export const FAIXAS_HORARIO: ReadonlyArray<{ id: FaixaHorario; rotulo: string; faixa: string }> = [
  { id: 'madrugada', rotulo: 'Madrugada', faixa: '0h às 6h' },
  { id: 'manha', rotulo: 'Manhã', faixa: '6h às 12h' },
  { id: 'tarde', rotulo: 'Tarde', faixa: '12h às 18h' },
  { id: 'noite', rotulo: 'Noite', faixa: '18h às 24h' },
];

// Único mapa das ações de auditoria e eventos da linha do tempo em texto humano; o desconhecido cai no texto neutro.
const ACOES: Record<string, string> = {
  vinculo_criado: 'Vínculo criado',
  vinculo_encerrado: 'Vínculo encerrado',
  consentimento_alterado: 'Compartilhamento alterado',
  checkin_registrado: 'Check-in registrado',
  escala_solicitada: 'Escala solicitada',
  escala_respondida: 'Escala respondida',
};

export const rotuloAcao = (acao: string) => ACOES[acao] ?? 'Atividade registrada';
