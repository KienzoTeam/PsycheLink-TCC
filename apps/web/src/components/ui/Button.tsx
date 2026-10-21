import type { ReactNode } from 'react';
import { Button as BotaoAria, type ButtonProps } from 'react-aria-components';
import { LoaderCircle } from 'lucide-react';
import { cx } from '../../lib/cx';
import css from './Button.module.css';

type Props = Omit<ButtonProps, 'className' | 'style' | 'children'> & {
  variante?: 'filled' | 'tonal' | 'outlined' | 'text';
  icone?: ReactNode;
  children: ReactNode;
};

export function Button({ variante = 'filled', icone, children, ...resto }: Props) {
  return (
    <BotaoAria {...resto} className={cx(css.botao, css[variante])}>
      {({ isPending }) => (
        <>
          {isPending ? <LoaderCircle className={css.giro} aria-hidden /> : icone}
          {children}
        </>
      )}
    </BotaoAria>
  );
}
