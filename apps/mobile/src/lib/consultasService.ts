import { api } from './api';

export type StatusConsulta = 'agendada' | 'concluida' | 'cancelada';

export type Consulta = {
  id: number;
  inicio: string;
  fim: string;
  status: StatusConsulta;
  psicologo: { nome: string };
};

export type Consultas = {
  proximas: Consulta[];
  passadas: Consulta[];
};

export async function buscarConsultas(): Promise<Consultas> {
  const response = await api.get<Consultas>('/paciente/consultas');
  return response.data;
}

/** Data e horário no fuso do aparelho; o ano só aparece quando não é o corrente. */
export function formatarConsulta(consulta: Consulta) {
  const inicio = new Date(consulta.inicio);
  const data = new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: inicio.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  }).format(inicio);
  const hora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return { data, horario: `${hora.format(inicio)} às ${hora.format(new Date(consulta.fim))}` };
}
