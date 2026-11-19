import type { ReactNode } from 'react';
import { Checkbox as CheckboxAria, type CheckboxProps } from 'react-aria-components';
import { Check } from 'lucide-react';
import css from './Checkbox.module.css';

export function Checkbox({ children, ...props }: Omit<CheckboxProps, 'className' | 'children'> & { children: ReactNode }) {
  return (
    <CheckboxAria {...props} className={css.checkbox}>
      <span className={css.alvo} aria-hidden>
        <span className={css.caixa}>
          <Check className={css.icone} strokeWidth={3} />
        </span>
      </span>
      <span className={css.rotulo}>{children}</span>
    </CheckboxAria>
  );
}
