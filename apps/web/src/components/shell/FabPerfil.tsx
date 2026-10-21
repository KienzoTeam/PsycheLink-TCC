import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button as BotaoAria } from 'react-aria-components';
import { useQueryClient } from '@tanstack/react-query';
import { LogOut, Palette, Settings, UserRound } from 'lucide-react';
import { api } from '../../lib/api';
import { iniciais } from '../../lib/formatar';
import { definirTema, useTema, type Tema } from '../../lib/tema';
import { Button } from '../ui/Button';
import { ChipFiltro } from '../ui/Chip';
import { Dialog } from '../ui/Dialog';
import { Menu } from '../ui/Menu';
import { SegmentedControl } from '../ui/SegmentedControl';
import { ITENS_NAV } from './itensNav';
import css from './FabPerfil.module.css';

const ITENS_MENU = [
  { id: 'configuracoes', rotulo: 'Configurações', icone: <Settings /> },
  { id: 'perfil', rotulo: 'Meu perfil', icone: <UserRound /> },
  { id: 'tema', rotulo: 'Tema', icone: <Palette /> },
  { id: 'sair', rotulo: 'Sair', icone: <LogOut /> },
];

const OPCOES_TEMA = [
  { id: 'system', rotulo: 'Sistema' },
  { id: 'light', rotulo: 'Claro' },
  { id: 'dark', rotulo: 'Escuro' },
];

type Props = { nome: string; fixados: readonly string[]; onAlternarFixado: (id: string) => void };

export function FabPerfil({ nome, fixados, onAlternarFixado }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const tema = useTema();
  const [dialogo, setDialogo] = useState<'configuracoes' | 'tema' | null>(null);
  const fechar = () => setDialogo(null);

  async function sair() {
    try {
      await api.post('/auth/psicologo/logout');
    } catch {
      // A sessão pode já ter expirado: o resultado local é o mesmo.
    }
    queryClient.clear();
    navigate('/', { replace: true });
  }

  function aoEscolher(id: string) {
    if (id === 'perfil') navigate('/minha-area');
    else if (id === 'sair') void sair();
    else if (id === 'configuracoes' || id === 'tema') setDialogo(id);
  }

  const concluir = (
    <Button variante="text" onPress={fechar}>
      Concluir
    </Button>
  );

  return (
    <>
      <Menu
        aria-label="Menu da conta"
        variante="pilulas"
        placement="top end"
        itens={ITENS_MENU}
        onAction={aoEscolher}
        gatilho={
          <BotaoAria aria-label={`Menu da conta de ${nome}`} className={css.fab}>
            {iniciais(nome)}
          </BotaoAria>
        }
      />
      <Dialog titulo="Configurações" isOpen={dialogo === 'configuracoes'} onOpenChange={fechar} acoes={concluir}>
        <p className={css.texto}>A barra lateral recolhida mostra só os itens fixados. Ao menos um item fica fixado.</p>
        <div role="group" aria-label="Itens fixados na barra lateral" className={css.pins}>
          {ITENS_NAV.filter((item) => !item.emBreve).map((item) => (
            <ChipFiltro
              key={item.id}
              isSelected={fixados.includes(item.id)}
              isDisabled={fixados.length === 1 && fixados.includes(item.id)}
              onChange={() => onAlternarFixado(item.id)}
            >
              {item.rotulo}
            </ChipFiltro>
          ))}
        </div>
      </Dialog>
      <Dialog titulo="Tema" isOpen={dialogo === 'tema'} onOpenChange={fechar} acoes={concluir}>
        <SegmentedControl
          aria-label="Tema da interface"
          opcoes={OPCOES_TEMA}
          valor={tema}
          onChange={(id) => definirTema(id as Tema)}
        />
      </Dialog>
    </>
  );
}
