import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Token de "confiar neste celular": vai no cabeçalho x-dispositivo do login e dispensa o código
// por e-mail (a senha continua obrigatória). Sobrevive ao logout de propósito: é do aparelho, não da sessão.
const CHAVE = 'psychelink_dispositivo';

export async function lerDispositivo(): Promise<string | null> {
  if (Platform.OS === 'web') return localStorage.getItem(CHAVE);
  return SecureStore.getItemAsync(CHAVE).catch(() => null);
}

export async function guardarDispositivo(token: string) {
  if (Platform.OS === 'web') return localStorage.setItem(CHAVE, token);
  // Falhar aqui só faz o próximo login pedir código de novo: não derruba o login.
  await SecureStore.setItemAsync(CHAVE, token, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  }).catch(() => undefined);
}
