import { useEffect, useState } from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { brand } from '../theme';
import { Sidebar, type NavId } from './Sidebar';
import { Fab } from './Fab';

// honey: mocks até os endpoints do psicólogo existirem no backend.
const SPARK = [12, 18, 15, 22, 28, 24, 32, 40].map((v, i) => ({ i, v }));
const CHECKINS = [
  { nome: 'Ana', data: '08/10 09:12', emocao: 'Ansiosa' },
  { nome: 'Bruno', data: '08/10 08:40', emocao: 'Calmo' },
  { nome: 'Carla', data: '07/10 18:05', emocao: 'Triste' },
];
const ATIVIDADES = [
  { nome: 'Ana', acao: 'respondeu PHQ-9', data: '08/10 09:30' },
  { nome: 'Bruno', acao: 'novo check-in', data: '08/10 08:40' },
  { nome: 'Carla', acao: 'mensagem no chat', data: '07/10 18:10' },
  { nome: 'Ana', acao: 'check-in', data: '07/10 09:02' },
];

const card: React.CSSProperties = {
  background: brand.surface,
  border: `1px solid ${brand.outline}`,
  borderRadius: brand.radius.xl,
  padding: 16,
};

const linha: React.CSSProperties = {
  display: 'flex', gap: 8, padding: '8px 0', borderBottom: `1px solid ${brand.outline}`, fontSize: 14,
};

export function Dashboard() {
  const [colapsada, setColapsada] = useState(false);
  const [ativo, setAtivo] = useState<NavId>('inicio');
  const [periodo, setPeriodo] = useState('7 dias');

  useEffect(() => {
    if (window.matchMedia('(max-width: 820px)').matches) setColapsada(true);
  }, []);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: brand.background, color: brand.text }}>
      <Sidebar ativo={ativo} colapsada={colapsada} onToggle={() => setColapsada((v) => !v)} onNavegar={setAtivo} />
      <main style={{ flex: 1, padding: 20, display: 'grid', gap: 16, alignContent: 'start', maxWidth: 1100 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0 }}>Dashboard pós-login</h1>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
            Filtrar
            <select value={periodo} onChange={(e) => setPeriodo(e.target.value)} style={{ padding: '6px 10px', borderRadius: brand.radius.md, border: `1px solid ${brand.outline}` }}>
              <option>7 dias</option>
              <option>14 dias</option>
              <option>30 dias</option>
            </select>
          </label>
        </div>

        <div className="dash-grid" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16 }}>
          <section style={card}>
            <span style={{ fontSize: 13 }}>Pacientes vinculados</span>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
              <strong style={{ fontSize: 40, lineHeight: 1 }}>92</strong>
              <div style={{ flex: 1, height: 56 }}>
                <ResponsiveContainer>
                  <LineChart data={SPARK}>
                    <Line type="monotone" dataKey="v" stroke={brand.primary} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section style={card}>
            <h2 style={{ margin: '0 0 8px' }}>Resumo de Check-ins</h2>
            {CHECKINS.map((c) => (
              <div key={`${c.nome}-${c.data}`} style={linha}>
                <span>{c.nome}</span>
                <span style={{ color: brand.subtext }}>| {c.data} |</span>
                <span>{c.emocao}</span>
              </div>
            ))}
          </section>
        </div>

        <section style={card}>
          <h2 style={{ margin: '0 0 8px' }}>Atividades Recentes</h2>
          <div
            style={{
              maxHeight: 160,
              overflowY: 'auto',
              maskImage: 'linear-gradient(to bottom, #000 70%, transparent)',
              WebkitMaskImage: 'linear-gradient(to bottom, #000 70%, transparent)',
            }}
          >
            {ATIVIDADES.map((a, i) => (
              <div key={i} style={linha}>
                <span>{a.nome}</span>
                <span style={{ color: brand.subtext }}>| {a.acao} |</span>
                <span>{a.data}</span>
              </div>
            ))}
          </div>
        </section>
        <span style={{ fontSize: 12, color: brand.subtext }}>Período: {periodo} · dados de exemplo até ligar o backend</span>
      </main>
      <Fab />
    </div>
  );
}
