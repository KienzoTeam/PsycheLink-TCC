import { Platform } from 'react-native';
import Constants from 'expo-constants';
import axios from 'axios';
import { obterTokenSeguro, removerTokenSeguro } from './authToken';

const devHost = Constants.expoConfig?.hostUri?.split(':')[0];

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Platform.OS === 'web' || !devHost ? 'http://localhost:3000' : `http://${devHost}:3000`);

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

// Anexa Bearer em toda chamada
api.interceptors.request.use(async (config) => {
  const token = await obterTokenSeguro();

  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Se a sessão morreu no server, limpa o token local
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const msg = String(error?.response?.data?.error ?? '').toLowerCase();

    if (
      status === 401 ||
      (status === 403 && (msg.includes('sessão') || msg.includes('token') || msg.includes('acesso')))
    ) {
      // Não limpa em EMAIL_NAO_VERIFICADO (403 de login legítimo)
      if (error?.response?.data?.codigo !== 'EMAIL_NAO_VERIFICADO') {
        await removerTokenSeguro();
      }
    }

    return Promise.reject(error);
  },
);