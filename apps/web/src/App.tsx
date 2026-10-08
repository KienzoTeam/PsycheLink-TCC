import { Route, Routes } from 'react-router';
import { brand } from './theme';

const NAV = [
  'Início',
  'Pacientes',
  'Check-ins',
  'Chats',
  'Relatórios',
  'Escalas',
  'Calendário',
  'Vínculo',
  'Auditoria',
] as const;

function Shell({ titulo, children }: { titulo: string; children?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: brand.background, color: brand.text }}>
      <aside
        style={{
          width: 220,
          borderRight: `1px solid ${brand.outline}`,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <strong style={{ marginBottom: 12 }}>PsycheLink</strong>
        {NAV.map((item) => (
          <span
            key={item}
            style={{
              padding: '8px 12px',
              borderRadius: brand.radius.md,
              background: item === titulo ? brand.primary : 'transparent',
              color: item === titulo ? '#fff' : brand.text,
            }}
          >
            {item}
          </span>
        ))}
      </aside>
      <main style={{ flex: 1, padding: 24 }}>
        <h1>{titulo}</h1>
        {children}
      </main>
    </div>
  );
}

function Dashboard() {
  return (
    <Shell titulo="Início">
      <p>Esqueleto do dashboard — Cards, Resumo de Check-ins e Atividades Recentes entram aqui.</p>
    </Shell>
  );
}

export default function App() {
  return (
    <Routes>
      <Route index element={<Dashboard />} />
      <Route path="*" element={<Shell titulo="Início">Página não encontrada.</Shell>} />
    </Routes>
  );
}
