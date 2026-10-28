import { EyeOff } from 'lucide-react';
import css from './ConsentimentoAusente.module.css';

export function ConsentimentoAusente({ children = 'O paciente não compartilha esta categoria.' }: { children?: string }) {
  return (
    <p className={css.aviso}>
      <EyeOff aria-hidden />
      {children}
    </p>
  );
}
