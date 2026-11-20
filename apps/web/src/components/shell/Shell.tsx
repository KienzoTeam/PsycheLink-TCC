import { useState, type ReactNode } from 'react';
import { Menu } from 'lucide-react';
import { useCompacto } from '../../lib/useCompacto';
import { Button } from '../ui/Button';
import { Gaveta, Sidebar } from './Sidebar';
import { SinoAvisos } from './SinoAvisos';
import css from './Shell.module.css';

type Props = { psicologo: { nome: string }; children: ReactNode };

export function Shell({ psicologo, children }: Props) {
  const compacto = useCompacto();
  const [colapsada, setColapsada] = useState(false);
  const [gavetaAberta, setGavetaAberta] = useState(false);

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
            <span className={css.fimTopo}>
              <SinoAvisos />
            </span>
          </header>
          <Gaveta isOpen={gavetaAberta} onOpenChange={setGavetaAberta} nome={psicologo.nome} />
        </>
      ) : (
        <Sidebar colapsada={colapsada} onAlternar={() => setColapsada((atual) => !atual)} nome={psicologo.nome} />
      )}
      <main id="conteudo" tabIndex={-1} className={css.conteudo}>
        {children}
      </main>
    </div>
  );
}
