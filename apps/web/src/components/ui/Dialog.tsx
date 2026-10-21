import type { ReactNode } from 'react';
import { Dialog as DialogoAria, Heading, Modal, ModalOverlay } from 'react-aria-components';
import css from './Dialog.module.css';

type Props = {
  titulo: string;
  isOpen: boolean;
  onOpenChange: (aberto: boolean) => void;
  acoes?: ReactNode;
  children: ReactNode;
};

export function Dialog({ titulo, isOpen, onOpenChange, acoes, children }: Props) {
  return (
    <ModalOverlay isDismissable isOpen={isOpen} onOpenChange={onOpenChange} className={css.fundo}>
      <Modal className={css.painel}>
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
