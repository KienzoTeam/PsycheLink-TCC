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
}

export type AuthFormErrors = Partial<
  Record<"name" | "email" | "password" | "confirmPassword", string>
>;
