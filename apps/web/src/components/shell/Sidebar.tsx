import { NavLink } from 'react-router';
import { Dialog, Modal, ModalOverlay } from 'react-aria-components';
import { PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { cx } from '../../lib/cx';
import { IconButton } from '../ui/IconButton';
import { ITENS_NAV, type ItemNav } from './itensNav';
import css from './Sidebar.module.css';

function ListaNav({ itens, recolhida, aoNavegar }: { itens: readonly ItemNav[]; recolhida: boolean; aoNavegar?: () => void }) {
  return (
    <ul className={cx(css.lista, recolhida && css.trilho)}>
      {itens.map(({ id, rotulo, icone: Icone }) => (
        <li key={id}>
          <NavLink to={`/${id}`} onClick={aoNavegar} className={css.item}>
            <Icone aria-hidden />
            {rotulo}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

type PropsSidebar = { colapsada: boolean; onAlternar: () => void; fixados: readonly string[] };

export function Sidebar({ colapsada, onAlternar, fixados }: PropsSidebar) {
  const itens = colapsada ? ITENS_NAV.filter((item) => fixados.includes(item.id)) : ITENS_NAV;
  return (
    <nav aria-label="Principal" className={cx(css.barra, colapsada && css.recolhida)}>
      <div className={css.topo}>
        {!colapsada && <span className={css.marca}>PsycheLink</span>}
        <IconButton
          aria-label={colapsada ? 'Expandir menu lateral' : 'Recolher menu lateral'}
          icone={colapsada ? <PanelLeftOpen /> : <PanelLeftClose />}
          onPress={onAlternar}
        />
      </div>
      <ListaNav itens={itens} recolhida={colapsada} />
    </nav>
  );
}

type PropsGaveta = { isOpen: boolean; onOpenChange: (aberta: boolean) => void };

export function Gaveta({ isOpen, onOpenChange }: PropsGaveta) {
  return (
    <ModalOverlay isDismissable isOpen={isOpen} onOpenChange={onOpenChange} className={css.fundo}>
      <Modal className={css.gaveta}>
        <Dialog aria-label="Menu de navegação" className={css.dialogo}>
          <div className={css.topo}>
            <span className={css.marca}>PsycheLink</span>
            <IconButton aria-label="Fechar menu" icone={<X />} onPress={() => onOpenChange(false)} />
          </div>
          <nav aria-label="Principal">
            <ListaNav itens={ITENS_NAV} recolhida={false} aoNavegar={() => onOpenChange(false)} />
          </nav>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
