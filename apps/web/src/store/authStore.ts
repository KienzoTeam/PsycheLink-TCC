import { create } from 'zustand';

interface User {
  id: string;
  nome: string;
  email: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('@app:token'),
  setAuth: (user, token) => {
    localStorage.setItem('@app:token', token);
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem('@app:token');
    set({ user: null, token: null });
  },
}));