import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { api } from './api';
import { pedirPermissao } from './lembretes';

// Avisos do psicólogo (escala ou recomendação nova): o servidor manda pelo Expo Push, sem
// detalhe nenhum no texto. Diferente dos lembretes, precisam de internet e de credencial FCM.
const CHAVE = 'avisosPush:v1';
const CANAL = 'avisos';

/** O Expo Go do Android não recebe push remoto: só o aplicativo instalado. `expoGoConfig` vem preenchido
 * também no APK; o ambiente de execução é o que distingue o Expo Go (storeClient). */
export const semPushNoExpoGo =
  Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// A escolha vale para quem a fez: outra conta neste celular não herda o aviso ligado.
type Escolha = { token: string; usuarioId: number };

async function lerEscolha(): Promise<Escolha | null> {
  try {
    const salvo = await AsyncStorage.getItem(CHAVE);
    return salvo ? (JSON.parse(salvo) as Escolha) : null;
  } catch {
    return null;
  }
}

export async function avisosLigados(usuarioId: number) {
  return (await lerEscolha())?.usuarioId === usuarioId;
}

async function tokenDoAparelho() {
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
}

/** Pede a permissão e registra o aparelho. `false`: permissão negada. Falha de token ou de rede lança. */
export async function ligarAvisos(usuarioId: number): Promise<boolean> {
  await Notifications.setNotificationChannelAsync(CANAL, {
    name: 'Avisos do seu psicólogo',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
  if (!(await pedirPermissao())) return false;
  const token = await tokenDoAparelho();
  await api.post('/paciente/push', { token });
  await AsyncStorage.setItem(CHAVE, JSON.stringify({ token, usuarioId } satisfies Escolha));
  return true;
}

/** Tira o token do servidor e esquece a escolha. Se o servidor não responder, lança e o aviso segue ligado. */
export async function desligarAvisos() {
  const escolha = await lerEscolha();
  if (escolha) await api.delete('/paciente/push', { data: { token: escolha.token } });
  await AsyncStorage.removeItem(CHAVE).catch(() => undefined);
}

/** No início da sessão: o token do aparelho pode mudar, então reenvia o atual. Nunca lança. */
export async function renovarAvisos(usuarioId: number) {
  try {
    const escolha = await lerEscolha();
    if (!escolha) return;
    if (escolha.usuarioId !== usuarioId) {
      await AsyncStorage.removeItem(CHAVE);
      return;
    }
    if (!(await Notifications.getPermissionsAsync()).granted) return;
    const token = await tokenDoAparelho();
    await api.post('/paciente/push', { token });
    if (token !== escolha.token) await AsyncStorage.setItem(CHAVE, JSON.stringify({ token, usuarioId } satisfies Escolha));
  } catch (erro: any) {
    console.warn('Não foi possível renovar o token dos avisos:', erro?.name);
  }
}
