import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';
import { Dialog as DialogoAria, Heading, Modal, ModalOverlay } from 'react-aria-components';
import css from './Dialog.module.css';

type Props = {
  titulo: string;
  isOpen: boolean;
  onOpenChange: (aberto: boolean) => void;
  acoes?: ReactNode;
  // Para diálogos com várias ações lado a lado.
  larga?: boolean;
  children: ReactNode;
};

export function Dialog({ titulo, isOpen, onOpenChange, acoes, larga, children }: Props) {
  return (
    <ModalOverlay isDismissable isOpen={isOpen} onOpenChange={onOpenChange} className={css.fundo}>
      <Modal className={cx(css.painel, larga && css.larga)}>
        <DialogoAria className={css.dialogo}>
          <Heading slot="title" className={css.titulo}>
            {titulo}
          </Heading>
          <div className={css.corpo}>{children}</div>
          {acoes && <div className={css.acoes}>{acoes}</div>}
        </DialogoAria>
      </Modal>
    </ModalOverlay>
  );
}
