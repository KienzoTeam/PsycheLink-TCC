/**
 * Cliente HTTP para a API do PsycheLink.
 *
 * Hoje não existe backend real conectado — os métodos abaixo são mocks que
 * simulam latência de rede e sempre retornam sucesso, para permitir que o
 * fluxo de login/cadastro seja construído e testado de ponta a ponta.
 *
 * Quando `apps/api` estiver disponível, troque o corpo de cada método por
 * uma chamada real (fetch/axios) para `API_BASE_URL`, mantendo a mesma
 * assinatura para não quebrar quem consome este módulo.
 */
import type { LoginCredentials, RegisterData } from "../types/auth";
import type { User } from "../types/user";

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3333";

const MOCK_NETWORK_DELAY_MS = 900;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fakeUserFromEmail(email: string, name?: string): User {
  return {
    id: crypto.randomUUID(),
    name: name?.trim() || email.split("@")[0],
    email,
    role: "paciente",
  };
}

export const authApi = {
  async login(credentials: LoginCredentials): Promise<User> {
    await wait(MOCK_NETWORK_DELAY_MS);
    // TODO(api): substituir por POST /auth/login e tratar 401/erros do servidor.
    return fakeUserFromEmail(credentials.email);
  },

  async register(data: RegisterData): Promise<User> {
    await wait(MOCK_NETWORK_DELAY_MS);
    // TODO(api): substituir por POST /auth/register e tratar conflitos (email já cadastrado).
    return fakeUserFromEmail(data.email, data.name);
  },
};
