import { isAxiosError } from 'axios';
import { api } from './api';

export type EscalaPendente = {
  aplicacaoId: number;
  sigla: string;
  nome: string;
  solicitadoEm: string;
  psicologo: { nome: string };
};

export type Opcao = { valor: number; rotulo: string };

export type Aplicacao = {
  aplicacaoId: number;
  sigla: string;
  nome: string;
  instrucao: string;
  itens: string[];
  opcoes: Opcao[];
};

export async function buscarEscalasPendentes(): Promise<EscalaPendente[]> {
  const { data } = await api.get<EscalaPendente[]>('/paciente/escalas/pendentes');
  return data;
}

/** A primeira abertura marca a aplicação como em andamento no servidor. */
export async function buscarAplicacao(aplicacaoId: number): Promise<Aplicacao> {
  const { data } = await api.get<Aplicacao>(`/paciente/aplicacoes/${aplicacaoId}`);
  return data;
}

// O servidor devolve o score, mas o paciente não o vê: só o psicólogo interpreta.
export async function enviarRespostas(aplicacaoId: number, respostas: number[]): Promise<void> {
  await api.post(`/paciente/aplicacoes/${aplicacaoId}/respostas`, { respostas });
}

// Sem resposta do servidor conta como desligado: o texto de conclusão não promete o que não sabe.
export async function escalasCompartilhadas(): Promise<boolean> {
  try {
    const { data } = await api.get<{ escalas: boolean }>('/paciente/consentimento');
    return data.escalas;
  } catch {
    return false;
  }
}

export function mensagemDeErro(erro: unknown, padrao: string): string {
  return (isAxiosError<{ error?: string }>(erro) && erro.response?.data?.error) || padrao;
}
