import { Bookmark } from 'lucide-react';
import css from './MarcadorItem9.module.css';

// Registro factual do valor de um item, sem interpretação: cor terciária e ícone neutros, nunca de alerta.
export function MarcadorItem9() {
  return (
    <span className={css.marcador}>
      <Bookmark aria-hidden />
      Item 9 respondido com valor diferente de 0
    </span>
  );
}
