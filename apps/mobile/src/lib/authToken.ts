import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'psychelink_token';

// Espelho em memória do token (undefined = ainda não lido do armazenamento). Salvar e remover
// atualizam o espelho antes de tocar no armazenamento, então quem lê tokenEmMemoria() junto com
// a versão da sessão (api.ts) nunca vê um token de uma sessão com a versão de outra.
// No web o localStorage já é síncrono e compartilhado entre abas: lá a leitura é sempre direta,
// para uma aba não continuar com o token que outra já trocou.
let emMemoria: string | null | undefined;
export const tokenEmMemoria = () =>
  Platform.OS === 'web' ? localStorage.getItem(TOKEN_KEY) : emMemoria;

export const salvarTokenSeguro = async (token: string) => {
  if (!token || typeof token !== 'string') return;
  emMemoria = token;

  if (Platform.OS === 'web') {
    localStorage.setItem(TOKEN_KEY, token);
    return;
  }

  // Só com o aparelho desbloqueado e sem ir para backup/outro aparelho (o padrão migra no backup do iOS).
  await SecureStore.setItemAsync(TOKEN_KEY, token, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
};

export const obterTokenSeguro = async (): Promise<string | null> => {
  if (Platform.OS === 'web') return localStorage.getItem(TOKEN_KEY);
  if (emMemoria !== undefined) return emMemoria;

  const salvo = await SecureStore.getItemAsync(TOKEN_KEY);
  // Um login ou logout durante a leitura já definiu o espelho: ele vale mais que o lido.
  if (emMemoria === undefined) emMemoria = salvo;
  return emMemoria;
};

export const removerTokenSeguro = async () => {
  emMemoria = null;

  if (Platform.OS === 'web') {
    localStorage.removeItem(TOKEN_KEY);
    return;
  }

  await SecureStore.deleteItemAsync(TOKEN_KEY);
};