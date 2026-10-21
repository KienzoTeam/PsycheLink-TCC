import type { ReactNode } from 'react';
import css from './Colapsavel.module.css';

type Props = { aberto: boolean; children: ReactNode };

// Cresce e encolhe a altura (0fr a 1fr) com desfoque, sem fade. Fechado, o conteúdo fica inerte:
// não recebe foco nem aparece para leitores de tela.
export function Colapsavel({ aberto, children }: Props) {
  return (
    <div className={css.trilho} data-aberto={aberto}>
      <div className={css.interno} inert={!aberto}>
        {children}
      </div>
    </div>
  );
}
