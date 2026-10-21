import { Navigate, Outlet } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { VisuallyHidden } from 'react-aria-components';
import { Shell } from '../components/shell/Shell';
import { Skeleton } from '../components/ui/Skeleton';
import { buscarMe } from '../lib/psicologoApi';
import css from './Provisorias.module.css';

// Só entra quem tem sessão válida e perfil de psicólogo confirmado pelo servidor.
export function AreaProtegida() {
  const me = useQuery({ queryKey: ['psicologo', 'me'], queryFn: buscarMe, retry: false });

  if (me.isError) return <Navigate to="/" replace />;
  if (me.isPending) {
    return (
      <div role="status" className={css.centro}>
        <Skeleton forma="bloco" />
        <VisuallyHidden>Carregando sua área</VisuallyHidden>
      </div>
    );
  }
  return (
    <Shell psicologo={me.data}>
      <Outlet />
    </Shell>
  );
}
