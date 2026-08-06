import { useState } from 'react';
import { Alert, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { getApiBaseUrl } from '../config/api';
import { getEmailSyntaxError } from '../lib/emailValidation';

const TOKEN_KEY = 'psychelink_token';

type ApiErrorBody = {
  error?: string;
  code?: string;
};

class ApiError extends Error {
  public constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ApiErrorBody;
    throw new ApiError(response.status, payload.error ?? 'Não foi possível concluir a solicitação.', payload.code);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error && error.message.includes('EXPO_PUBLIC_API_URL')) {
    return error.message;
  }
  return fallback;
}

export function useAuth() {
  const [carregando, setCarregando] = useState(false);

  const salvarTokenSeguro = async (token: string) => {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.setItem(TOKEN_KEY, token);
      return;
    }
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  };

  const login = async (
    email: string,
    senha: string,
    onSuccess: () => void,
    onEmailNotVerified?: () => void,
  ) => {
    if (getEmailSyntaxError(email)) {
      Alert.alert('Atenção', 'Informe um e-mail válido.');
      return;
    }
    if (!senha) {
      Alert.alert('Atenção', 'Informe sua senha.');
      return;
    }

    setCarregando(true);
    try {
      const response = await post<{ token: string }>('/api/auth/login', {
        email: email.trim(),
        password: senha,
      });
      await salvarTokenSeguro(response.token);
      onSuccess();
    } catch (error) {
      if (error instanceof ApiError && error.code === 'EMAIL_NOT_VERIFIED') {
        Alert.alert('Confirme seu e-mail', error.message);
        onEmailNotVerified?.();
        return;
      }
      Alert.alert('Falha no login', errorMessage(error, 'Não foi possível conectar ao servidor. Verifique sua rede.'));
    } finally {
      setCarregando(false);
    }
  };

  const registro = async (
    nome: string,
    email: string,
    senha: string,
    dataNascimento: string,
    onSuccess: (canonicalInputEmail: string) => void,
  ) => {
    setCarregando(true);
    try {
      await post('/api/auth/register', {
        nome: nome.trim(),
        email: email.trim(),
        password: senha,
        dataNascimento,
      });
      onSuccess(email.trim());
    } catch (error) {
      Alert.alert('Não foi possível iniciar a confirmação', errorMessage(error, 'Tente novamente mais tarde.'));
    } finally {
      setCarregando(false);
    }
  };

  const verificarEmail = async (email: string, code: string, onSuccess: () => void) => {
    setCarregando(true);
    try {
      await post('/api/auth/email-verification/confirm', { email: email.trim(), code });
      onSuccess();
    } catch (error) {
      Alert.alert('Não foi possível confirmar o e-mail', errorMessage(error, 'Verifique o código e tente novamente.'));
    } finally {
      setCarregando(false);
    }
  };

  const reenviarVerificacaoEmail = async (email: string): Promise<boolean> => {
    setCarregando(true);
    try {
      await post('/api/auth/email-verification/resend', { email: email.trim() });
      Alert.alert('Código solicitado', 'Se o endereço puder receber a confirmação, enviaremos um novo código.');
      return true;
    } catch (error) {
      Alert.alert('Não foi possível reenviar o código', errorMessage(error, 'Tente novamente mais tarde.'));
      return false;
    } finally {
      setCarregando(false);
    }
  };

  const solicitarRedefinicaoSenha = async (email: string, onSuccess: () => void) => {
    if (getEmailSyntaxError(email)) {
      Alert.alert('Atenção', 'Informe um e-mail válido.');
      return;
    }

    setCarregando(true);
    try {
      await post('/api/auth/password-reset/request', { email: email.trim() });
      onSuccess();
    } catch (error) {
      Alert.alert('Não foi possível solicitar o código', errorMessage(error, 'Tente novamente mais tarde.'));
    } finally {
      setCarregando(false);
    }
  };

  const redefinirSenha = async (
    email: string,
    code: string,
    senha: string,
    onSuccess: () => void,
  ) => {
    setCarregando(true);
    try {
      await post('/api/auth/password-reset/confirm', { email: email.trim(), code, password: senha });
      onSuccess();
    } catch (error) {
      Alert.alert('Não foi possível redefinir a senha', errorMessage(error, 'Verifique o código e tente novamente.'));
    } finally {
      setCarregando(false);
    }
  };

  return {
    login,
    registro,
    verificarEmail,
    reenviarVerificacaoEmail,
    solicitarRedefinicaoSenha,
    redefinirSenha,
    carregando,
  };
}
