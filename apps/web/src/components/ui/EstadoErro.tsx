import { CircleAlert, RefreshCw } from 'lucide-react';
import { mensagemDeErro } from '../../lib/erros';
import { Button } from './Button';
import { EmptyState } from './EmptyState';

type Props = { erro: unknown; onTentar: () => void; titulo?: string };

export function EstadoErro({ erro, onTentar, titulo = 'Não foi possível carregar' }: Props) {
  return (
    <div role="alert">
      <EmptyState
        icone={<CircleAlert />}
        titulo={titulo}
        descricao={mensagemDeErro(erro)}
        acao={
          <Button variante="tonal" icone={<RefreshCw />} onPress={onTentar}>
            Tentar de novo
          </Button>
        }
      />
    </div>
  );
}
