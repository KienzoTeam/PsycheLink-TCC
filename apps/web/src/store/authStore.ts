import { create } from "zustand";
import { authApi } from "../services/api";
import type { LoginCredentials, RegisterData } from "../types/auth";
import type { User } from "../types/user";

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  error: null,

  login: async (credentials) => {
    set({ loading: true, error: null });
    try {
      const user = await authApi.login(credentials);
      set({ user, loading: false });
    } catch {
      // TODO(api): substituir por mensagem real vinda do backend.
      set({ error: "Não foi possível entrar. Tente novamente.", loading: false });
    }
  },

  register: async (data) => {
    set({ loading: true, error: null });
    try {
      const user = await authApi.register(data);
      set({ user, loading: false });
    } catch {
      set({
        error: "Não foi possível criar sua conta. Tente novamente.",
        loading: false,
      });
    }
  },

  logout: () => set({ user: null, error: null }),
}));
