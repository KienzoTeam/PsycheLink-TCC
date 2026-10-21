import { useNavigate } from 'react-router';
import { Construction } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import css from './Provisorias.module.css';

export function AuthProvisoria() {
  const navigate = useNavigate();
  return (
    <main className={css.centro}>
      <Card className={css.cartaoAuth}>
        <EmptyState
          icone={<Construction />}
          titulo="PsycheLink"
          descricao="A tela de entrada ainda não está disponível. Com uma sessão ativa, você já pode abrir o painel."
          acao={<Button onPress={() => navigate('/inicio')}>Abrir o painel</Button>}
        />
      </Card>
    </main>
  );
}
