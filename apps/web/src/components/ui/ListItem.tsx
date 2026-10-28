import type { ReactNode } from 'react';
import { Button, Link } from 'react-aria-components';
import css from './ListItem.module.css';

type Props = {
  titulo: string;
  apoio?: string;
  icone?: ReactNode;
  fim?: ReactNode;
  href?: string;
  onPress?: () => void;
};

// Item de <ul>: link com href, botão com onPress, texto estático sem nenhum dos dois.
export function ListItem({ titulo, apoio, icone, fim, href, onPress }: Props) {
  const conteudo = (
    <>
      {icone && <span className={css.icone}>{icone}</span>}
      <span className={css.texto}>
        <span className={css.titulo}>{titulo}</span>
        {apoio && <span className={css.apoio}>{apoio}</span>}
      </span>
      {fim && <span className={css.fim}>{fim}</span>}
    </>
  );

  return (
    <li className={css.item}>
      {href ? (
        <Link href={href} className={css.linha}>
          {conteudo}
        </Link>
      ) : onPress ? (
        <Button onPress={onPress} className={css.linha}>
          {conteudo}
        </Button>
      ) : (
        <div className={css.linha}>{conteudo}</div>
      )}
    </li>
  );
}
