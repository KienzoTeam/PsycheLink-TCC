import { api } from './api';

// Mesmo intervalo mínimo que o servidor impõe entre dois envios de código.
export const ESPERA_REENVIO_MS = 60_000;

// O servidor responde isto quando o desafio de 2FA expirou, esgotou as tentativas ou foi substituído.
export const MSG_CODIGO_ENCERRADO = 'Código inválido ou expirado. Solicite um novo.';

type DesafioDoisFatores = { desafioId: string; emailMascarado: string; reenviarEm: string };

type DadosCadastro = {
  nome: string;
  email: string;
  password: string;
  dataNascimento: string;
  crp: string;
  especialidade?: string;
  aceites?: { versao: string };
};

// Navegador confiável: a API abre a sessão direto e responde { ok: true }, sem desafio.
export const entrar = async (email: string, password: string) =>
  (await api.post<DesafioDoisFatores | { ok: true }>('/auth/psicologo/login', { email, password })).data;

export const confirmarDoisFatores = (desafioId: string, codigo: string, confiar: boolean) =>
  api.post('/auth/psicologo/2fa', { desafioId, codigo, confiar });

export const reenviarDoisFatores = async (desafioId: string) =>
  new Date((await api.post<{ reenviarEm: string }>('/auth/psicologo/2fa/reenviar', { desafioId })).data.reenviarEm).getTime();

export const cadastrar = (dados: DadosCadastro) => api.post('/auth/registro-psicologo', dados);

export const verificarEmail = (email: string, codigo: string) =>
  api.post('/auth/verificar-email', { email, codigo: Number(codigo) });

export const reenviarCodigoEmail = (email: string) => api.post('/auth/reenviar-codigo', { email });

export const esqueciSenha = (email: string) => api.post('/auth/esqueci-senha', { email });

export const verificarCodigoSenha = async (email: string, codigo: string) =>
  (await api.post<{ token: string }>('/auth/verificar-codigo-senha', { email, codigo: Number(codigo) })).data.token;

export const redefinirSenha = (token: string, password: string) =>
  api.post('/auth/redefinir-senha', { token, password });
