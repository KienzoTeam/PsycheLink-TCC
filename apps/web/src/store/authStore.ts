import { create } from "zustand";
import { authApi, getApiErrorMessage, type LoginPayload, type RegisterPayload } from "../services/api";
import type { User } from "../types/user";

const TOKEN_KEY = "@app:token";

interface AuthState {
  user: User | null;
  token: string | null;
  /** true enquanto tentamos restaurar a sessão a partir do token salvo. */
  initializing: boolean;
  loading: boolean;
  error: string | null;

  login: (credentials: LoginPayload) => Promise<void>;
  register: (data: RegisterPayload) => Promise<{ message: string; precisaVerificacao: boolean }>;
  logout: () => void;
  fetchMe: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem(TOKEN_KEY),
  initializing: true,
  loading: false,
  error: null,

  login: async (credentials) => {
    set({ loading: true, error: null });
    try {
      const token = await authApi.login(credentials);
      localStorage.setItem(TOKEN_KEY, token);
      set({ token });

      const user = await authApi.me();
      set({ user, loading: false });
    } catch (err) {
      set({ loading: false, error: getApiErrorMessage(err, "Não foi possível entrar. Tente novamente.") });
      // Relançado para que o AuthForm trate casos especiais (ex.: e-mail não verificado).
      throw err;
    }
  },

  register: async (data) => {
    set({ loading: true, error: null });
    try {
      const result = await authApi.registro(data);
      set({ loading: false });
      return result;
    } catch (err) {
      set({
        loading: false,
        error: getApiErrorMessage(err, "Não foi possível criar sua conta. Tente novamente."),
      });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    set({ user: null, token: null, error: null });
  },

  fetchMe: async () => {
    const token = get().token;
    if (!token) {
      set({ initializing: false });
      return;
    }
    try {
      const user = await authApi.me();
      set({ user, initializing: false });
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      set({ token: null, user: null, initializing: false });
    }
  },

  clearError: () => set({ error: null }),
}));
