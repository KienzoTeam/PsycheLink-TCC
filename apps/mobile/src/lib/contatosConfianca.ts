import AsyncStorage from '@react-native-async-storage/async-storage';
const CHAVE = '@psychelink:contatos_confianca';

export type ContatoConfianca = {
  id: string;
  nome: string;
  telefone: string;
  papel: string;
};

// Leitura dos contatos existentes 
export async function lerContatos(): Promise<ContatoConfianca[]> {
  try {
    const bruto = await AsyncStorage.getItem(CHAVE);
    if (!bruto) return [];

    const dados = JSON.parse(bruto);

    // Proteção essencial: garante que o dado parseado é realmente um array
    return Array.isArray(dados) ? (dados as ContatoConfianca[]) : [];
  } catch (erro) {
    console.warn('Não foi possível ler os contatos de confiança:', erro);
    return [];
  }
}

//Salva a lista completa de contatos no armazenamento local com tratamento de erro.
export async function salvarContatos(contatos: ContatoConfianca[]): Promise<boolean> {
  try {
    await AsyncStorage.setItem(CHAVE, JSON.stringify(contatos));
    return true;
  } catch (erro) {
    console.error('Erro ao salvar os contatos de confiança:', erro);
    return false;
  }
}
 //Limpa todos os contatos salvos (útil para logout ou reset).
 
export async function limparContatos(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CHAVE);
  } catch (erro) {
    console.warn('Não foi possível limpar os contatos:', erro);
  }
}