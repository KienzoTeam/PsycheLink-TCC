import type { ReactNode } from 'react';
import { ToggleButton } from 'react-aria-components';
import { Check } from 'lucide-react';
import { cx } from '../../lib/cx';
import css from './Chip.module.css';

export type Emocao = 'feliz' | 'triste' | 'ansioso' | 'calmo' | 'irritado' | 'cansado';

// A cor da emoção é só uma marca: o rótulo sempre acompanha.
export function Chip({ emocao, children }: { emocao?: Emocao; children: ReactNode }) {
  return (
    <span className={css.chip}>
      {emocao && <span className={cx(css.marca, css[emocao])} aria-hidden />}
      {children}
    </span>
  );
}

type PropsFiltro = {
  isSelected: boolean;
  isDisabled?: boolean;
  onChange: (selecionado: boolean) => void;
  children: ReactNode;
};

export function ChipFiltro({ isSelected, isDisabled, onChange, children }: PropsFiltro) {
  return (
    <ToggleButton isSelected={isSelected} isDisabled={isDisabled} onChange={onChange} className={cx(css.chip, css.filtro)}>
      {isSelected && <Check aria-hidden />}
      {children}
    </ToggleButton>
  );
}
