import type {
  AuthFormErrors,
  LoginCredentials,
  RegisterData,
} from "../types/auth";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// O backend (senhaSchema) exige no mínimo 8 caracteres — mantido igual aqui
// para o erro aparecer no formulário em vez de só na resposta da API.
const MIN_PASSWORD_LENGTH = 8;
const BIRTH_DATE_REGEX = /^(\d{2})\/(\d{2})\/(\d{4})$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

export function isValidBirthDate(value: string): boolean {
  const match = BIRTH_DATE_REGEX.exec(value.trim());
  if (!match) return false;

  const dia = Number(match[1]);
  const mes = Number(match[2]);
  const ano = Number(match[3]);
  const date = new Date(Date.UTC(ano, mes - 1, dia));
  const isRealDate =
    date.getUTCDate() === dia && date.getUTCMonth() === mes - 1 && date.getUTCFullYear() === ano;

  return isRealDate && date.getTime() < Date.now();
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

  if (!data.birthDate || !isValidBirthDate(data.birthDate)) {
    errors.birthDate = "Informe uma data de nascimento válida (dd/mm/aaaa)";
  }

  return errors;
}
