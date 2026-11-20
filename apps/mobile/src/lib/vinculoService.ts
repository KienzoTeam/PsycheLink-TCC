import { isAxiosError } from 'axios';
import { api } from './api';

export type Vinculo = {
  psicologo: { nome: string; crp: string };
  desde: string;
};

/** Perfil que o psicólogo preenche; só o paciente vinculado o recebe. Campo vazio vem como null. */
export type PerfilProfissional = {
  especialidade: string | null;
  abordagem: string | null;
  sobre: string | null;
  modalidades: ('presencial' | 'online')[];
  atendeEm: string | null;
  contato: string | null;
};

export type Escolhas = {
  humor: boolean;
  habitos: boolean;
  escalas: boolean;
  diario: boolean;
  sos: boolean;
};

/** `diarioCompartilhados` é quantos textos do diário estão liberados agora. */
export type Consentimento = Escolhas & { atualizadoEm: string | null; diarioCompartilhados: number };

export async function buscarVinculo(): Promise<Vinculo | null> {
  const { data } = await api.get<{ vinculo: Vinculo | null }>('/paciente/vinculo');
  return data.vinculo;
}

export async function buscarPerfilDoPsicologo(): Promise<PerfilProfissional> {
  const { data } = await api.get<{ perfil: PerfilProfissional }>('/paciente/vinculo/psicologo');
  return data.perfil;
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
  sos,
}: Escolhas): Promise<Consentimento> {
  const { data } = await api.put<Consentimento>('/paciente/consentimento', {
    humor,
    habitos,
    escalas,
    diario,
    sos,
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
