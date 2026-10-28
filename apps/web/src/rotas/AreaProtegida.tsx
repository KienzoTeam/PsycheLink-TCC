import { Suspense } from 'react';
import { Navigate, Outlet } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { VisuallyHidden } from 'react-aria-components';
import { Shell } from '../components/shell/Shell';
import { EstadoErro } from '../components/ui/EstadoErro';
import { Skeleton } from '../components/ui/Skeleton';
import { semSessao } from '../lib/erros';
import { buscarMe } from '../lib/psicologoApi';
import css from './Provisorias.module.css';

// Fallback das telas que carregam sob demanda: a forma de um título e dois blocos.
function CarregandoTela() {
  return (
    <div role="status" className={css.tela}>
      <Skeleton forma="titulo" />
      <Skeleton forma="bloco" />
      <Skeleton forma="bloco" />
      <VisuallyHidden>Carregando a tela</VisuallyHidden>
    </div>
  );
}

// Só entra quem tem sessão válida e perfil de psicólogo confirmado pelo servidor.
export function AreaProtegida() {
  const me = useQuery({ queryKey: ['psicologo', 'me'], queryFn: buscarMe, retry: false });

  if (me.isError) {
    // Só 401/403 mandam para a entrada: servidor fora do ar ou 5xx não pode derrubar uma sessão válida.
    if (semSessao(me.error)) return <Navigate to="/" replace />;
    return (
      <div className={css.centro}>
        <EstadoErro erro={me.error} onTentar={() => void me.refetch()} titulo="Não foi possível abrir sua área" />
      </div>
    );
  }
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
      <Suspense fallback={<CarregandoTela />}>
        <Outlet />
      </Suspense>
    </Shell>
  );
}
