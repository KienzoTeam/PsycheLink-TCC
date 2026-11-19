import { NavLink } from 'react-router';
import { Dialog, Modal, ModalOverlay } from 'react-aria-components';
import { PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { cx } from '../../lib/cx';
import { IconButton } from '../ui/IconButton';
import { ScrollFade } from '../ui/ScrollFade';
import { ITENS_NAV, type ItemNav } from './itensNav';
import { MenuConta } from './MenuConta';
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

type PropsSidebar = { colapsada: boolean; onAlternar: () => void; nome: string };

export function Sidebar({ colapsada, onAlternar, nome }: PropsSidebar) {
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
      {/* Em tela baixa a lista rola sozinha, com véu e seta enquanto houver destinos abaixo; a conta fica fixa. */}
      <ScrollFade aria-label="Destinos" className={css.rolagem}>
        <ListaNav itens={ITENS_NAV} recolhida={colapsada} />
      </ScrollFade>
      <MenuConta nome={nome} recolhida={colapsada} />
    </nav>
  );
}

type PropsGaveta = { isOpen: boolean; onOpenChange: (aberta: boolean) => void; nome: string };

export function Gaveta({ isOpen, onOpenChange, nome }: PropsGaveta) {
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
          <MenuConta nome={nome} />
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
