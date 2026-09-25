import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const CHAVE = 'psychelink_hapticos';
// Cache em memória: os pontos de disparo leem de forma síncrona.
let ativo = true; // Padrão ligado; 'off' persistido desliga.

export async function carregarHapticos(): Promise<boolean> {
  try {
    const bruto =
      Platform.OS === 'web'
        ? localStorage.getItem(CHAVE)
        : await SecureStore.getItemAsync(CHAVE);
    ativo = bruto !== 'off'; // Ausente ou inválido = ligado.
  } catch {
    ativo = true;
  }
  return ativo;
}

export async function definirHapticos(valor: boolean): Promise<void> {
  ativo = valor;
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(CHAVE, valor ? 'on' : 'off');
    } else {
      await SecureStore.setItemAsync(CHAVE, valor ? 'on' : 'off');
    }
  } catch {
    // Sem persistência: a preferência vale para esta sessão.
  }
}

/** Impacto leve nas seleções; silencioso quando o usuário desliga a vibração. */
export function vibrarLeve(): void {
  if (!ativo) return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}
