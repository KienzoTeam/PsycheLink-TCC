import type { ReactNode } from 'react';
import css from './EmptyState.module.css';

type Props = {
  icone?: ReactNode;
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
};

export function EmptyState({ icone, titulo, descricao, acao }: Props) {
  return (
    <div className={css.vazio}>
      {icone && <span className={css.icone}>{icone}</span>}
      <h2 className={css.titulo}>{titulo}</h2>
      {descricao && <p className={css.descricao}>{descricao}</p>}
      {acao && <div className={css.acao}>{acao}</div>}
    </div>
  );
}
