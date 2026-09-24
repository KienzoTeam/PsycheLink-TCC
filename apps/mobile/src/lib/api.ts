import { Platform } from 'react-native';
import Constants from 'expo-constants';
import axios from 'axios';
import { obterTokenSeguro } from './authToken';

const devHost = Constants.expoConfig?.hostUri?.split(':')[0];

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Platform.OS === 'web' || !devHost ? 'http://localhost:3000' : `http://${devHost}:3000`);

export const api = axios.create({ baseURL: API_URL });

// Anexa o Bearer token automaticamente em toda chamada — evita repetir
// `obterTokenSeguro()` + header manual em cada service novo.
api.interceptors.request.use(async (config) => {
  const token = await obterTokenSeguro();

  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});
