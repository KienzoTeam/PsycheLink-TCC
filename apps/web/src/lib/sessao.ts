import { CHAVE_SESSAO, setAuthToken } from './api';

// O token fica em sessionStorage: some ao fechar a aba e não é compartilhado entre abas.
export const obterToken = (): string | null => sessionStorage.getItem(CHAVE_SESSAO);

export function iniciarSessao(token: string) {
  sessionStorage.setItem(CHAVE_SESSAO, token);
  setAuthToken(token);
}

export function encerrarSessao() {
  sessionStorage.removeItem(CHAVE_SESSAO);
  setAuthToken(null);
}

/** Reaplica o token salvo ao recarregar a página. */
export function restaurarSessao() {
  const token = obterToken();
  if (token) setAuthToken(token);
}
