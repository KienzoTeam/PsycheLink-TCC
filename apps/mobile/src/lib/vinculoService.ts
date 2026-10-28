import { isAxiosError } from 'axios';
import { api } from './api';

export type Vinculo = {
  psicologo: { nome: string; crp: string };
  desde: string;
};

export type Escolhas = {
  humor: boolean;
  habitos: boolean;
  escalas: boolean;
  diario: boolean;
};

/** `diarioCompartilhados` é quantos textos do diário estão liberados agora. */
export type Consentimento = Escolhas & { atualizadoEm: string | null; diarioCompartilhados: number };

export async function buscarVinculo(): Promise<Vinculo | null> {
  const { data } = await api.get<{ vinculo: Vinculo | null }>('/paciente/vinculo');
  return data.vinculo;
}

export async function vincular(codigo: string): Promise<Vinculo> {
  const { data } = await api.post<{ vinculo: Vinculo }>('/paciente/vinculo', { codigo });
  return data.vinculo;
}

export async function encerrarVinculo(): Promise<void> {
  await api.post('/paciente/vinculo/encerrar');
}

export async function buscarConsentimento(): Promise<Consentimento> {
  const { data } = await api.get<Consentimento>('/paciente/consentimento');
  return data;
}

export async function salvarConsentimento({
  humor,
  habitos,
  escalas,
  diario,
}: Escolhas): Promise<Consentimento> {
  const { data } = await api.put<Consentimento>('/paciente/consentimento', {
    humor,
    habitos,
    escalas,
    diario,
  });
  return data;
}

export async function pararDeCompartilharDiario(): Promise<number> {
  const { data } = await api.post<{ revogados: number }>('/paciente/consentimento/diario/parar');
  return data.revogados;
}

/** Mensagem do servidor (400, 409, 429...) quando houver; senão o texto padrão. */
export function mensagemDeErro(erro: unknown, padrao: string): string {
  if (isAxiosError<{ error?: string }>(erro) && erro.response?.data?.error) {
    return erro.response.data.error;
  }
  return padrao;
}
