import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useHref, useNavigate } from 'react-router';
import { I18nProvider, RouterProvider } from 'react-aria-components';
import { RegiaoToast } from './components/ui/Toast';
import { AreaProtegida } from './rotas/AreaProtegida';
import { Auth } from './rotas/Auth';
import { TelaProvisoria } from './rotas/TelaProvisoria';

// Só existe em dev: em produção o ramo é removido e a tela de componentes sai do bundle.
const Componentes = import.meta.env.DEV ? lazy(() => import('./rotas/Componentes')) : null;

const TELAS = [
  { caminho: 'inicio', titulo: 'Início' },
  { caminho: 'pacientes', titulo: 'Pacientes' },
  { caminho: 'pacientes/:id', titulo: 'Paciente' },
  { caminho: 'checkins', titulo: 'Check-ins' },
  { caminho: 'relatorios', titulo: 'Relatórios' },
  { caminho: 'escalas', titulo: 'Escalas' },
  { caminho: 'calendario', titulo: 'Calendário' },
  { caminho: 'vinculo', titulo: 'Vínculo' },
  { caminho: 'auditoria', titulo: 'Auditoria' },
  { caminho: 'minha-area', titulo: 'Minha área' },
];

export default function App() {
  const navigate = useNavigate();

  return (
    <I18nProvider locale="pt-BR">
      <RouterProvider navigate={navigate} useHref={useHref}>
        <Routes>
          <Route index element={<Auth />} />
          <Route element={<AreaProtegida />}>
            {TELAS.map(({ caminho, titulo }) => (
              <Route key={caminho} path={caminho} element={<TelaProvisoria titulo={titulo} />} />
            ))}
          </Route>
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
        <RegiaoToast />
      </RouterProvider>
    </I18nProvider>
  );
}
