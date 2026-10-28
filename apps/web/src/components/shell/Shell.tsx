import { useState, type ReactNode } from 'react';
import { Menu } from 'lucide-react';
import { useCompacto } from '../../lib/useCompacto';
import { Button } from '../ui/Button';
import { FabPerfil } from './FabPerfil';
import { Gaveta, Sidebar } from './Sidebar';
import { usePins } from './usePins';
import css from './Shell.module.css';

type Props = { psicologo: { nome: string }; children: ReactNode };

export function Shell({ psicologo, children }: Props) {
  const compacto = useCompacto();
  const [colapsada, setColapsada] = useState(false);
  const [gavetaAberta, setGavetaAberta] = useState(false);
  const { fixados } = usePins();

  return (
    <div className={css.shell} data-compacto={compacto}>
      <a href="#conteudo" className={css.pular}>
        Ir para o conteúdo
      </a>
      {compacto ? (
        <>
          <header className={css.topo}>
            <Button variante="text" icone={<Menu />} onPress={() => setGavetaAberta(true)}>
              Menu
            </Button>
            <span className={css.marca}>PsycheLink</span>
          </header>
          <Gaveta isOpen={gavetaAberta} onOpenChange={setGavetaAberta} />
        </>
      ) : (
        <Sidebar colapsada={colapsada} onAlternar={() => setColapsada((atual) => !atual)} fixados={fixados} />
      )}
      <main id="conteudo" tabIndex={-1} className={css.conteudo}>
        {children}
      </main>
      <FabPerfil nome={psicologo.nome} />
    </div>
  );
}
