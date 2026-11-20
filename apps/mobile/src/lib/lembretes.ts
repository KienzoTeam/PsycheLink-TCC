import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Lembretes do F10, agendados no próprio celular: funcionam sem internet e sem servidor de push.
export type TipoLembrete = 'manha' | 'noite' | 'semanal';
export type Lembrete = { ativo: boolean; hora: number; minuto: number };
export type Lembretes = Record<TipoLembrete, Lembrete> & { oferecido: boolean };

export const LEMBRETES_PADRAO: Lembretes = {
  manha: { ativo: false, hora: 9, minuto: 0 },
  noite: { ativo: false, hora: 21, minuto: 0 },
  semanal: { ativo: false, hora: 10, minuto: 0 }, // segunda-feira
  oferecido: false,
};

export const lembretesSuportados = Platform.OS !== 'web';

const CHAVE = 'lembretes:v1';
const CANAL = 'lembretes';
const SEGUNDA = 2; // expo-notifications: 1 = domingo

const TEXTOS: Record<TipoLembrete, { title: string; body: string; tela: 'Checkin' | 'Dados' }> = {
  manha: { title: 'Bom dia', body: 'Como você está começando o dia? Registre no seu check-in.', tela: 'Checkin' },
  noite: { title: 'Como foi seu dia?', body: 'Se ainda não fez o check-in de hoje, ainda dá tempo.', tela: 'Checkin' },
  semanal: { title: 'Sua semana', body: 'Veja como foram seus últimos dias em Meus Dados.', tela: 'Dados' },
};

export async function carregarLembretes(): Promise<Lembretes> {
  try {
    const salvo = await AsyncStorage.getItem(CHAVE);
    return salvo ? { ...LEMBRETES_PADRAO, ...JSON.parse(salvo) } : LEMBRETES_PADRAO;
  } catch {
    return LEMBRETES_PADRAO;
  }
}

/** No Android 13+ o pedido de permissão só aparece depois de existir um canal. */
export async function pedirPermissao(): Promise<boolean> {
  if (!lembretesSuportados) return false;
  await Notifications.setNotificationChannelAsync(CANAL, {
    name: 'Lembretes',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
  const atual = await Notifications.getPermissionsAsync();
  if (atual.granted) return true;
  if (!atual.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/** Salva e reagenda do zero: estes três são os únicos agendamentos locais do app. */
export async function salvarLembretes(lembretes: Lembretes) {
  await AsyncStorage.setItem(CHAVE, JSON.stringify(lembretes));
  if (!lembretesSuportados) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const tipo of ['manha', 'noite', 'semanal'] as const) {
    const { ativo, hora: hour, minuto: minute } = lembretes[tipo];
    if (!ativo) continue;
    const { tela, ...texto } = TEXTOS[tipo];
    await Notifications.scheduleNotificationAsync({
      content: { ...texto, data: { tela } },
      trigger:
        tipo === 'semanal'
          ? { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: SEGUNDA, hour, minute, channelId: CANAL }
          : { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: CANAL },
    });
  }
}

/** Ao sair da conta: outra pessoa pode entrar neste celular. */
export async function desligarLembretes() {
  await AsyncStorage.removeItem(CHAVE).catch(() => undefined);
  if (lembretesSuportados) await Notifications.cancelAllScheduledNotificationsAsync().catch(() => undefined);
}

export const formatarHora = ({ hora, minuto }: Lembrete) =>
  `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`;
