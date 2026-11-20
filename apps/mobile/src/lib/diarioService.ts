import { api } from './api';

export type EntradaDiario = { id: number; texto: string | null; compartilhado: boolean; criadoEm: string };

export async function listarDiario(): Promise<EntradaDiario[]> {
  return (await api.get<{ entradas: EntradaDiario[] }>('/paciente/diario')).data.entradas;
}

export async function escreverNoDiario(texto: string, compartilhado: boolean): Promise<EntradaDiario> {
  return (await api.post<{ entrada: EntradaDiario }>('/paciente/diario', { texto, compartilhado })).data.entrada;
}

export async function compartilharEntrada(id: number, compartilhado: boolean): Promise<EntradaDiario> {
  return (await api.patch<{ entrada: EntradaDiario }>(`/paciente/diario/${id}`, { compartilhado })).data.entrada;
}

export async function apagarEntrada(id: number): Promise<void> {
  await api.delete(`/paciente/diario/${id}`);
}
