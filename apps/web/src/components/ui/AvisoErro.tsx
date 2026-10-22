import { CircleAlert } from 'lucide-react';
import css from './AvisoErro.module.css';

// Erro de uma ação (envio de formulário): ícone e texto, nunca só cor.
export function AvisoErro({ children }: { children: string }) {
  return (
    <p role="alert" className={css.aviso}>
      <CircleAlert aria-hidden />
      {children}
    </p>
  );
}
