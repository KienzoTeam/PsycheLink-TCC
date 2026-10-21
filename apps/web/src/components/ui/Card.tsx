import type { ComponentProps } from 'react';
import { cx } from '../../lib/cx';
import css from './Card.module.css';

export function Card({ className, ...resto }: ComponentProps<'div'>) {
  return <div {...resto} className={cx(css.cartao, className)} />;
}
