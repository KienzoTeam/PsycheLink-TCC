import type { ReactElement, ReactNode } from 'react';
import { Menu as MenuAria, MenuItem, MenuTrigger, Popover, type Placement } from 'react-aria-components';
import css from './Menu.module.css';

type Props = {
  gatilho: ReactElement;
  'aria-label': string;
  itens: ReadonlyArray<{ id: string; rotulo: string; icone?: ReactNode }>;
  onAction: (id: string) => void;
  placement?: Placement;
  variante?: 'lista' | 'pilulas';
};

// `gatilho` precisa ser um botão do react-aria (Button, IconButton ou o FAB): ele recebe o estado aberto do menu.
export function Menu({ gatilho, itens, onAction, placement = 'bottom start', variante = 'lista', ...resto }: Props) {
  return (
    <MenuTrigger>
      {gatilho}
      <Popover placement={placement} className={css[variante]}>
        <MenuAria {...resto} className={css.menu} onAction={(chave) => onAction(String(chave))}>
          {itens.map((item) => (
            <MenuItem key={item.id} id={item.id} textValue={item.rotulo} className={css.item}>
              {item.icone}
              {item.rotulo}
            </MenuItem>
          ))}
        </MenuAria>
      </Popover>
    </MenuTrigger>
  );
}
