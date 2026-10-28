import { cx } from '../../lib/cx';
import css from './Skeleton.module.css';

type Props = {
  forma?: 'linha' | 'titulo' | 'bloco' | 'circulo';
  className?: string;
};

// Só preenche espaço: o contêiner que carrega deve levar aria-busy e um texto para leitores de tela.
export function Skeleton({ forma = 'linha', className }: Props) {
  return <span aria-hidden className={cx(css.esqueleto, css[forma], className)} />;
}
