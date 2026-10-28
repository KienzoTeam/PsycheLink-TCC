import { QueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

// Erro 4xx é resposta definitiva (404, 400): repetir só atrasa a tela de erro.
const repetir = (tentativas: number, erro: unknown) =>
  tentativas < 2 && !(isAxiosError(erro) && erro.response !== undefined && erro.response.status < 500);

export const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: repetir } },
});
