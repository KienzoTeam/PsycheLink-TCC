export type AuthMode = "login" | "register";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  /** dd/mm/aaaa — exigido pelo backend (`registroSchema`). */
  birthDate?: string;
}

export type AuthFormErrors = Partial<
  Record<"name" | "email" | "password" | "confirmPassword" | "birthDate", string>
>;
