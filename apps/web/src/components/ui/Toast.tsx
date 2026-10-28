import { Button, Text, UNSTABLE_Toast as Toast, UNSTABLE_ToastContent as ToastContent, UNSTABLE_ToastQueue as ToastQueue, UNSTABLE_ToastRegion as ToastRegion } from 'react-aria-components';
import { CircleAlert, Info, X } from 'lucide-react';
import css from './Toast.module.css';

type Conteudo = { titulo: string; descricao?: string; tipo: 'info' | 'erro' };

const TEMPO_MS = 6000;

const fila = new ToastQueue<Conteudo>({ maxVisibleToasts: 3 });

export function notificar(conteudo: Omit<Conteudo, 'tipo'> & { tipo?: Conteudo['tipo'] }) {
  fila.add({ tipo: 'info', ...conteudo }, { timeout: TEMPO_MS });
}

export function RegiaoToast() {
  return (
    <ToastRegion queue={fila} aria-label="Notificações" className={css.regiao}>
      {({ toast }) => (
        <Toast toast={toast} className={css.toast}>
          {toast.content.tipo === 'erro' ? <CircleAlert aria-hidden /> : <Info aria-hidden />}
          <ToastContent className={css.conteudo}>
            <Text slot="title" className={css.titulo}>
              {toast.content.titulo}
            </Text>
            {toast.content.descricao && (
              <Text slot="description" className={css.descricao}>
                {toast.content.descricao}
              </Text>
            )}
          </ToastContent>
          <Button slot="close" aria-label="Fechar notificação" className={css.fechar}>
            <X aria-hidden />
          </Button>
        </Toast>
      )}
    </ToastRegion>
  );
}
