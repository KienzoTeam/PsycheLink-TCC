import { Info } from 'lucide-react';
import css from './Disclaimer.module.css';

export function Disclaimer() {
  return (
    <p className={css.aviso}>
      <Info aria-hidden />
      Gerado por estatística descritiva. Interpretação clínica é responsabilidade exclusiva do psicólogo.
    </p>
  );
}
