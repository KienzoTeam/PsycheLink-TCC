import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useHref, useNavigate } from 'react-router';
import { I18nProvider, RouterProvider } from 'react-aria-components';
import { LimiteErro } from './components/ui/LimiteErro';
import { RegiaoToast } from './components/ui/Toast';
import { AreaProtegida } from './rotas/AreaProtegida';
import { Auth } from './rotas/Auth';

const Inicio = lazy(() => import('./rotas/inicio/Inicio'));
const Pacientes = lazy(() => import('./rotas/pacientes/Pacientes'));
const Perfil = lazy(() => import('./rotas/pacientes/Perfil'));
const Arquivadas = lazy(() => import('./rotas/pacientes/Arquivadas'));
const Checkins = lazy(() => import('./rotas/checkins/Checkins'));
const Vinculo = lazy(() => import('./rotas/vinculo/Vinculo'));
const Escalas = lazy(() => import('./rotas/escalas/Escalas'));
const Calendario = lazy(() => import('./rotas/calendario/Calendario'));
const Relatorios = lazy(() => import('./rotas/relatorios/Relatorios'));
const Imprimir = lazy(() => import('./rotas/relatorios/Imprimir'));
const Auditoria = lazy(() => import('./rotas/auditoria/Auditoria'));
const MinhaArea = lazy(() => import('./rotas/minha-area/MinhaArea'));

// Só existe em dev: em produção o ramo é removido e a tela de componentes sai do bundle.
const Componentes = import.meta.env.DEV ? lazy(() => import('./rotas/Componentes')) : null;

export default function App() {
  const navigate = useNavigate();

  return (
    <I18nProvider locale="pt-BR">
      <RouterProvider navigate={navigate} useHref={useHref}>
        <LimiteErro>
          <Routes>
            <Route index element={<Auth />} />
            <Route element={<AreaProtegida />}>
              <Route path="inicio" element={<Inicio />} />
              <Route path="pacientes" element={<Pacientes />} />
              <Route path="pacientes/arquivadas" element={<Arquivadas />} />
              <Route path="pacientes/:id" element={<Perfil />} />
              <Route path="checkins" element={<Checkins />} />
              <Route path="vinculo" element={<Vinculo />} />
              <Route path="escalas" element={<Escalas />} />
              <Route path="calendario" element={<Calendario />} />
              <Route path="relatorios" element={<Relatorios />} />
              <Route path="auditoria" element={<Auditoria />} />
              <Route path="minha-area" element={<MinhaArea />} />
            </Route>
            {/* Fora da área com barra lateral: é a folha que o navegador imprime. A sessão é conferida pelas próprias chamadas. */}
            <Route
              path="relatorios/imprimir"
              element={
                <Suspense fallback={null}>
                  <Imprimir />
                </Suspense>
              }
            />
            {Componentes && (
              <Route
                path="_componentes"
                element={
                  <Suspense fallback={null}>
                    <Componentes />
                  </Suspense>
                }
              />
            )}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </LimiteErro>
        <RegiaoToast />
      </RouterProvider>
    </I18nProvider>
  );
}
