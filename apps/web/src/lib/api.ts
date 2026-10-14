import axios from 'axios';

export const CHAVE_SESSAO = 'psychelink_web_token';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
  timeout: 15000,
});

export function setAuthToken(token: string | null) {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete api.defaults.headers.common.Authorization;
}

// Se a sessão do psicólogo expirar ou for invalidada no meio do uso, volta para o login.
// Limitado às rotas /psicologo: erros de login (403 de perfil) não disparam redirecionamento.
api.interceptors.response.use(undefined, (erro) => {
  const status = erro?.response?.status;
  const url = String(erro?.config?.url ?? '');
  if ((status === 401 || status === 403) && url.startsWith('/psicologo')) {
    sessionStorage.removeItem(CHAVE_SESSAO);
    setAuthToken(null);
    window.location.assign('/');
  }
  return Promise.reject(erro);
});
