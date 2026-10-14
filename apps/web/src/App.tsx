import { useEffect, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { AuthScreen } from './components/AuthScreen';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Pacientes } from './components/Pacientes';
import { PacienteDetalhe } from './components/PacienteDetalhe';
import { EmBreve } from './components/EmBreve';
import { buscarMe } from './lib/psicologoApi';
import { encerrarSessao, obterToken } from './lib/sessao';

/**
 * Só entra na área interna quem tem token E cujo perfil foi confirmado pelo backend
 * (GET /psicologo/me só responde para usuários com registro em `psicologo`).
 */
function RequireAuth({ children }: { children: ReactNode }) {
  const token = obterToken();
  const me = useQuery({
    queryKey: ['psicologo', 'me'],
    queryFn: buscarMe,
    enabled: token !== null,
    retry: false,
  });

  useEffect(() => {
    if (me.isError) encerrarSessao();
  }, [me.isError]);

  if (!token || me.isError) return <Navigate to="/" replace />;
  if (me.isPending) return <p style={{ padding: 24 }}>Carregando…</p>;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route index element={<AuthScreen />} />

      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="inicio" element={<Dashboard />} />
        <Route path="pacientes" element={<Pacientes />} />
        <Route path="pacientes/:id" element={<PacienteDetalhe />} />
        <Route path="checkins" element={<EmBreve titulo="Check-ins" />} />
        <Route path="chats" element={<EmBreve titulo="Chats" />} />
        <Route path="relatorios" element={<EmBreve titulo="Relatórios" />} />
        <Route path="escalas" element={<EmBreve titulo="Escalas" />} />
        <Route path="calendario" element={<EmBreve titulo="Calendário" />} />
        <Route path="vinculo" element={<EmBreve titulo="Vínculo" />} />
        <Route path="auditoria" element={<EmBreve titulo="Auditoria" />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
