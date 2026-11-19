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
import { cx } from '../../lib/cx';
import css from './MenuConta.module.css';

const ITENS_MENU = [
  { id: 'configuracoes', rotulo: 'Configurações', icone: <Settings /> },
  { id: 'perfil', rotulo: 'Meu perfil', icone: <UserRound /> },
  { id: 'tema', rotulo: 'Tema', icone: <Palette /> },
  { id: 'sair', rotulo: 'Sair', icone: <LogOut /> },
];

// Rodapé do menu lateral: a conta fica junto da navegação, sem botão flutuante cobrindo o conteúdo.
export function MenuConta({ nome, recolhida = false }: { nome: string; recolhida?: boolean }) {
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
        placement="top start"
        itens={ITENS_MENU}
        onAction={aoEscolher}
        gatilho={
          <BotaoAria aria-label={`Menu da conta de ${nome}`} className={cx(css.conta, recolhida && css.recolhida)}>
            <span className={css.avatar} aria-hidden>
              {iniciais(nome)}
            </span>
            {!recolhida && <span className={css.nome}>{nome}</span>}
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
