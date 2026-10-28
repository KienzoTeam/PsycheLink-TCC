import type { QueryClient } from '@tanstack/react-query';

// Telas que leem escalas ou consultas: depois de mudar uma, todas as que estiverem abertas releem o servidor.
const invalidar = (cliente: QueryClient, chaves: string[]) =>
  Promise.all(chaves.map((queryKey) => cliente.invalidateQueries({ queryKey: [queryKey] })));

export const invalidarEscalas = (cliente: QueryClient) => invalidar(cliente, ['aplicacoes', 'paciente', 'dashboard']);

export const invalidarConsultas = (cliente: QueryClient) => invalidar(cliente, ['consultas', 'dashboard']);
