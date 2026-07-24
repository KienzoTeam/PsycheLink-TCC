import type {
  AuthFormErrors,
  LoginCredentials,
  RegisterData,
} from "../types/auth";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

export function validateLogin(data: LoginCredentials): AuthFormErrors {
  const errors: AuthFormErrors = {};

  if (!isValidEmail(data.email)) {
    errors.email = "Email inválido";
  }

  if (data.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Mínimo de ${MIN_PASSWORD_LENGTH} caracteres`;
  }

  return errors;
}

export function validateRegister(data: RegisterData): AuthFormErrors {
  const errors: AuthFormErrors = {};

  if (!data.name.trim()) {
    errors.name = "Informe seu nome completo";
  }

  if (!isValidEmail(data.email)) {
    errors.email = "Email inválido";
  }

  if (data.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Mínimo de ${MIN_PASSWORD_LENGTH} caracteres`;
  }

  if (data.password !== data.confirmPassword) {
    errors.confirmPassword = "As senhas não conferem";
  }

  return errors;
}
