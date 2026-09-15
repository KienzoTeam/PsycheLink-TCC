// TODO(api): quando o backend existir, este arquivo deve vir de `packages/shared/src/types/user.ts`
// e ser importado como `@psychelink/shared` (ou caminho equivalente do monorepo).

export type UserRole = "paciente" | "psicologo";

export interface User {
  id: number;
  nome: string;
  email: string;
  data_nascimento: string;
  created_at?: string;
  email_verificado: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Psicologo {
  id: number;
  user_id: number;
  crp: string;
  especialidade?: string;
  telefone?: string;
}

export interface Paciente {
  id: number;
  user_id: number;
  nome: string;
  email: string;
}

export interface Alerta {
  id: number;
  paciente_id: number;
  paciente_nome: string;
  tipo: string;
  descricao: string;
  nivel: 'BAIXO' | 'MEDIO' | 'ALTO';
  created_at: string;
}