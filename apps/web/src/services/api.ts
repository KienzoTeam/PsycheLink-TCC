import axios, { AxiosError } from "axios";
import type { AuthResponse, User } from "../types/user";

/**
 * Cliente HTTP para a API do PsycheLink (apps/server).
 *
 * O backend já existe e está implementado em `apps/server` (Express + PG).
 * Este módulo troca os mocks locais que existiam aqui por chamadas reais,
 * mantendo assinaturas simples para os componentes de auth.
 */
export const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export const api = axios.create({
  baseURL: API_BASE_URL,
});

// Anexa o token salvo em todas as requisições autenticadas.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("@app:token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** Extrai a mensagem de erro padronizada que o backend retorna em `{ error }`. */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const data = (err as AxiosError<{ error?: string }>).response?.data;
    if (data?.error) return data.error;
  }
  return fallback;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  nome: string;
  email: string;
  password: string;
  dataNascimento: string;
}

export const authApi = {
  async login(payload: LoginPayload): Promise<AuthResponse["token"]> {
    const { data } = await api.post<{ token: string }>("/login", payload);
    return data.token;
  },

  async registro(payload: RegisterPayload): Promise<{ message: string; precisaVerificacao: boolean }> {
    const { data } = await api.post("/registro", payload);
    return data;
  },

  async verificarEmail(email: string, codigo: number): Promise<{ message: string }> {
    const { data } = await api.post("/verificar-email", { email, codigo });
    return data;
  },

  async reenviarCodigo(email: string): Promise<{ message: string }> {
    const { data } = await api.post("/reenviar-codigo", { email });
    return data;
  },

  async esqueciSenha(email: string): Promise<{ message: string }> {
    const { data } = await api.post("/esqueci-senha", { email });
    return data;
  },

  async verificarCodigoSenha(email: string, codigo: number): Promise<{ token: string }> {
    const { data } = await api.post("/verificar-codigo-senha", { email, codigo });
    return data;
  },

  async redefinirSenha(token: string, password: string): Promise<{ message: string }> {
    const { data } = await api.post("/redefinir-senha", { token, password });
    return data;
  },

  async me(): Promise<User> {
    const { data } = await api.get<User>("/me");
    return data;
  },
};
