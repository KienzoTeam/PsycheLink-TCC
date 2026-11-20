import { cancelarPush, inscreverPush } from './psicologoApi';

// Push do navegador para os avisos: registra o service worker, pede a permissão e manda a
// inscrição ao servidor. A chave pública (VAPID) vem do servidor; sem ela, o push fica desligado.
export const pushSuportado = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

const bytesDaChave = (base64: string) => {
  const b = atob((base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
};

export async function inscricaoAtual() {
  if (!pushSuportado()) return null;
  const registro = await navigator.serviceWorker.getRegistration('/');
  return (await registro?.pushManager.getSubscription()) ?? null;
}

export async function ativarPush(chavePublica: string): Promise<'ativado' | 'negado'> {
  if ((await Notification.requestPermission()) !== 'granted') return 'negado';
  const registro = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  await navigator.serviceWorker.ready;
  const inscricao = await registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytesDaChave(chavePublica) });
  await inscreverPush(inscricao.toJSON());
  return 'ativado';
}

export async function desativarPush() {
  const inscricao = await inscricaoAtual();
  if (!inscricao) return;
  await cancelarPush(inscricao.endpoint);
  await inscricao.unsubscribe();
}
