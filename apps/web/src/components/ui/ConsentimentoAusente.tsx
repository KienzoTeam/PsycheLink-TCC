import { EyeOff } from 'lucide-react';
import css from './ConsentimentoAusente.module.css';

export function ConsentimentoAusente() {
  return (
    <p className={css.aviso}>
      <EyeOff aria-hidden />
      O paciente não compartilha esta categoria.
    </p>
  );
}
