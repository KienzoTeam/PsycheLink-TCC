import type { ReactNode } from 'react';
import { Button as BotaoAria, type ButtonProps } from 'react-aria-components';
import { cx } from '../../lib/cx';
import css from './Button.module.css';

type Props = Omit<ButtonProps, 'className' | 'style' | 'children' | 'aria-label'> & {
  'aria-label': string;
  icone: ReactNode;
};

export function IconButton({ icone, ...resto }: Props) {
  return (
    <BotaoAria {...resto} className={cx(css.botao, css.icone)}>
      {icone}
    </BotaoAria>
  );
}
