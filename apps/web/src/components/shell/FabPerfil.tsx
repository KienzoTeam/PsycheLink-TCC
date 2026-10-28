import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button as BotaoAria } from 'react-aria-components';
import { LogOut, Palette, Settings, UserRound } from 'lucide-react';
import { iniciais } from '../../lib/formatar';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { Menu } from '../ui/Menu';
import { SeletorTema } from './SeletorTema';
import { useSair } from './useSair';
import css from './FabPerfil.module.css';

const ITENS_MENU = [
  { id: 'configuracoes', rotulo: 'Configurações', icone: <Settings /> },
  { id: 'perfil', rotulo: 'Meu perfil', icone: <UserRound /> },
  { id: 'tema', rotulo: 'Tema', icone: <Palette /> },
  { id: 'sair', rotulo: 'Sair', icone: <LogOut /> },
];

export function FabPerfil({ nome }: { nome: string }) {
  const navigate = useNavigate();
  const sair = useSair();
  const [temaAberto, setTemaAberto] = useState(false);

  function aoEscolher(id: string) {
    if (id === 'configuracoes') navigate('/minha-area?aba=preferencias');
    else if (id === 'perfil') navigate('/minha-area');
    else if (id === 'sair') void sair();
    else if (id === 'tema') setTemaAberto(true);
  }

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
      <Dialog
        titulo="Tema"
        isOpen={temaAberto}
        onOpenChange={setTemaAberto}
        acoes={
          <Button variante="text" onPress={() => setTemaAberto(false)}>
            Concluir
          </Button>
        }
      >
        <SeletorTema />
      </Dialog>
    </>
  );
}
