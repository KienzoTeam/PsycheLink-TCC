import { Construction } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import css from './Provisorias.module.css';

export function TelaProvisoria({ titulo }: { titulo: string }) {
  return (
    <section className={css.tela} aria-labelledby="titulo-tela">
      <h1 id="titulo-tela" className={css.titulo}>
        {titulo}
      </h1>
      <Card>
        <EmptyState
          icone={<Construction />}
          titulo="Esta área ainda não está disponível"
          descricao="Ela será liberada em uma próxima etapa. Nenhum dado é exibido por enquanto."
        />
      </Card>
    </section>
  );
}
