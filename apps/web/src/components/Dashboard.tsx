import type { CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Link } from 'react-router';
import { listarPacientes } from '../lib/psicologoApi';
import { diasDesde, formatarDataCurta, media, primeiroNome } from '../lib/formatar';
import { brand } from '../theme';

const card: CSSProperties = {
  background: brand.surface,
  border: `1px solid ${brand.outline}`,
  borderRadius: brand.radius.xl,
  padding: 16,
  minWidth: 0,
};

const linha: CSSProperties = {
  display: 'flex', gap: 8, alignItems: 'center', padding: '8px 0',
  borderBottom: `1px solid ${brand.outline}`, fontSize: 14,
};

export function Dashboard() {
  const consulta = useQuery({ queryKey: ['pacientes'], queryFn: listarPacientes });

  if (consulta.isPending) return <p>Carregando painel…</p>;
  if (consulta.isError) return <p role="alert">Não foi possível carregar o painel.</p>;

  const pacientes = consulta.data.pacientes;
  const checkinsSemana = pacientes.reduce((soma, p) => soma + p.checkinsUltimos7Dias, 0);
  const humorGeral = media(pacientes.map((p) => p.humorMedio7d));

  // Pacientes que compartilham humor e estão há 3+ dias sem check-in (ou nunca fizeram).
  const semCheckinRecente = pacientes.filter(
    (p) => p.compartilhaHumor && (!p.ultimoCheckin || diasDesde(p.ultimoCheckin.data) >= 3),
  );

  const recentes = pacientes
    .flatMap((p) => (p.ultimoCheckin ? [{ paciente: p, checkin: p.ultimoCheckin }] : []))
    .sort((a, b) => b.checkin.data.localeCompare(a.checkin.data))
    .slice(0, 6);

  const grafico = pacientes.map((p) => ({ nome: primeiroNome(p.nome), checkins: p.checkinsUltimos7Dias }));

  return (
    <>
      <h1 style={{ margin: 0 }}>Painel</h1>

      <div className="dash-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16 }}>
        <section style={card}>
          <span style={{ fontSize: 13 }}>Pacientes vinculados</span>
          <strong style={{ display: 'block', fontSize: 40, lineHeight: 1.2 }}>{pacientes.length}</strong>
        </section>
        <section style={card}>
          <span style={{ fontSize: 13 }}>Check-ins nos últimos 7 dias</span>
          <strong style={{ display: 'block', fontSize: 40, lineHeight: 1.2 }}>{checkinsSemana}</strong>
        </section>
        <section style={card}>
          <span style={{ fontSize: 13 }}>Humor médio (7 dias)</span>
          <strong style={{ display: 'block', fontSize: 40, lineHeight: 1.2 }}>
            {humorGeral !== null ? humorGeral.toFixed(1) : '—'}
          </strong>
        </section>
      </div>

      <div className="dash-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <section style={card}>
          <h2 style={{ margin: '0 0 8px', fontSize: 18 }}>Check-ins por paciente (7 dias)</h2>
          {pacientes.length === 0 ? (
            <p style={{ color: brand.subtext, fontSize: 14 }}>Nenhum paciente vinculado ainda.</p>
          ) : (
            <div style={{ height: 220 }}>
              <ResponsiveContainer>
                <BarChart data={grafico}>
                  <XAxis dataKey="nome" fontSize={12} />
                  <YAxis allowDecimals={false} fontSize={12} width={28} />
                  <Tooltip />
                  <Bar dataKey="checkins" fill={brand.primary} radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section style={card}>
          <h2 style={{ margin: '0 0 8px', fontSize: 18 }}>Atenção</h2>
          {semCheckinRecente.length === 0 ? (
            <p style={{ color: brand.subtext, fontSize: 14 }}>Nenhum paciente sem registro recente.</p>
          ) : (
            semCheckinRecente.map((p) => (
              <div key={p.id} style={linha}>
                <Link to={`/pacientes/${p.id}`} style={{ color: brand.text, fontWeight: 600 }}>{p.nome}</Link>
                <span style={{ color: brand.subtext, marginLeft: 'auto' }}>
                  {p.ultimoCheckin ? `último há ${diasDesde(p.ultimoCheckin.data)} dias` : 'sem check-ins'}
                </span>
              </div>
            ))
          )}
        </section>
      </div>

      <section style={card}>
        <h2 style={{ margin: '0 0 8px', fontSize: 18 }}>Últimos check-ins compartilhados</h2>
        {recentes.length === 0 ? (
          <p style={{ color: brand.subtext, fontSize: 14 }}>Nenhum check-in compartilhado.</p>
        ) : (
          recentes.map(({ paciente, checkin }) => (
            <div key={paciente.id} style={linha}>
              <Link to={`/pacientes/${paciente.id}`} style={{ color: brand.text, fontWeight: 600 }}>{paciente.nome}</Link>
              <span style={{ color: brand.subtext }}>{formatarDataCurta(checkin.data)}</span>
              <span style={{ marginLeft: 'auto' }}>{checkin.emocoes?.join(', ') ?? '—'}</span>
            </div>
          ))
        )}
      </section>
    </>
  );
}
