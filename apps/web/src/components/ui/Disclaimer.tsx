import { Info } from 'lucide-react';
import css from './Disclaimer.module.css';

const TEXTO_PADRAO = 'Gerado por estatística descritiva. Interpretação clínica é responsabilidade exclusiva do psicólogo.';

export function Disclaimer({ children = TEXTO_PADRAO }: { children?: string }) {
  return (
    <p className={css.aviso}>
      <Info aria-hidden />
      {children}
    </p>
  );
}
