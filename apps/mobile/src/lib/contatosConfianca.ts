import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// SecureStore só aceita letras, números, ".", "-" e "_" na chave (o "@" antigo não vale).
const CHAVE = 'psychelink_contatos_confianca';
const CHAVE_ANTIGA = '@psychelink:contatos_confianca';

// Mesmas opções do token: não vai para backup nem para outro aparelho.
const OPCOES = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

// A doc do SecureStore não fixa limite, mas iOS antigos recusam valores acima de ~2 KB.
// Cada contato ocupa ~150 bytes no JSON, então 10 cabem folgados.
export const MAX_CONTATOS = 10;

export type ContatoConfianca = {
  id: string;
  nome: string;
  telefone: string;
  papel: string;
};

function interpretar(bruto: string | null): ContatoConfianca[] {
  if (!bruto) return [];
  try {
    const dados = JSON.parse(bruto);
    // Proteção essencial: garante que o dado parseado é realmente um array
    return Array.isArray(dados) ? (dados as ContatoConfianca[]) : [];
  } catch {
    return [];
  }
}

// Os logs aqui nunca incluem o erro: a mensagem do JSON.parse pode trazer pedaços do nome/telefone.
export async function lerContatos(): Promise<ContatoConfianca[]> {
  try {
    // No web não há SecureStore: segue no AsyncStorage (localStorage), como o token.
    if (Platform.OS === 'web') {
      return interpretar(await AsyncStorage.getItem(CHAVE_ANTIGA));
    }

    const seguro = await SecureStore.getItemAsync(CHAVE, OPCOES);
    const antigo = await AsyncStorage.getItem(CHAVE_ANTIGA);

    if (seguro !== null) {
      // Migração já feita; se o app morreu antes de apagar a cópia em texto puro, apaga agora.
      if (antigo !== null) await AsyncStorage.removeItem(CHAVE_ANTIGA).catch(() => {});
      return interpretar(seguro);
    }

    if (antigo !== null) {
      // Só apaga a chave antiga depois de gravar no SecureStore; se falhar, tenta de novo na próxima leitura.
      try {
        await SecureStore.setItemAsync(CHAVE, antigo, OPCOES);
        await AsyncStorage.removeItem(CHAVE_ANTIGA);
      } catch {
        console.warn('Não foi possível migrar os contatos de confiança para o armazenamento seguro.');
      }
    }
    return interpretar(antigo);
  } catch {
    console.warn('Não foi possível ler os contatos de confiança.');
    return [];
  }
}

// Salva a lista completa; devolve false se a gravação falhar, para a tela avisar o paciente.
export async function salvarContatos(contatos: ContatoConfianca[]): Promise<boolean> {
  try {
    const json = JSON.stringify(contatos);
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(CHAVE_ANTIGA, json);
    } else {
      await SecureStore.setItemAsync(CHAVE, json, OPCOES);
    }
    return true;
  } catch {
    console.error('Erro ao salvar os contatos de confiança.');
    return false;
  }
}

// Limpa todos os contatos salvos (útil para logout ou reset), inclusive a cópia antiga.
export async function limparContatos(): Promise<void> {
  // Cada apagamento é independente: uma falha não pode deixar o outro dado para trás.
  const tarefas = [AsyncStorage.removeItem(CHAVE_ANTIGA)];
  if (Platform.OS !== 'web') tarefas.push(SecureStore.deleteItemAsync(CHAVE));
  const resultados = await Promise.allSettled(tarefas);
  if (resultados.some((r) => r.status === 'rejected')) {
    console.warn('Não foi possível limpar os contatos.');
  }
}
