import axios, { isAxiosError } from 'axios';
import { codigoDeErro } from './erros';
import { queryClient } from './queryClient';

declare module 'axios' {
  interface AxiosRequestConfig {
    _repetida?: boolean;
  }
}

// A sessão vive em cookies httpOnly (mesma origem via proxy em /api): nada de token em storage.
export const api = axios.create({ baseURL: '/api', withCredentials: true, timeout: 15000 });

const PREFIXO_AUTH = '/auth/';
let renovacao: Promise<void> | null = null;

async function renovar(): Promise<void> {
  try {
    await api.post('/auth/psicologo/refresh');
  } catch (erro) {
    // 409: outra aba já rotacionou o cookie, então o repetir da original já usa o novo.
    if (isAxiosError(erro) && erro.response?.status === 409 && codigoDeErro(erro) === 'REFRESH_CONCORRENTE') return;
    // Em "/" (tela de entrada) não há para onde voltar: recarregar a mesma página giraria em laço.
    if (isAxiosError(erro) && erro.response?.status === 401 && window.location.pathname !== '/') {
      queryClient.clear();
      window.location.assign('/');
    }
    throw erro;
  }
}

// Uma única renovação em voo: 401s concorrentes esperam o mesmo resultado.
function renovarSessao(): Promise<void> {
  renovacao ??= renovar().finally(() => {
    renovacao = null;
  });
  return renovacao;
}

api.interceptors.response.use(undefined, async (erro: unknown) => {
  if (!isAxiosError(erro) || erro.response?.status !== 401 || !erro.config) throw erro;
  const original = erro.config;
  // Rotas de auth respondem 401 por credencial inválida ou sessão encerrada: renovar não resolve.
  if (original._repetida || original.url?.startsWith(PREFIXO_AUTH)) throw erro;

  try {
    await renovarSessao();
  } catch {
    throw erro;
  }
  return api.request({ ...original, _repetida: true });
});
