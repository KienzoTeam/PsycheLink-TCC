import type { CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { listarPacientes } from '../lib/psicologoApi';
import { diasDesde, formatarDataCurta } from '../lib/formatar';
import { brand } from '../theme';

const celula: CSSProperties = { padding: '10px 12px', borderBottom: `1px solid ${brand.outline}`, textAlign: 'left', fontSize: 14 };

function Selo({ ativo, rotulo }: { ativo: boolean; rotulo: string }) {
  return (
    <span
      style={{
        fontSize: 12, padding: '2px 8px', borderRadius: brand.radius.full,
        background: ativo ? '#d5f5d5' : '#e6e9ef', color: ativo ? '#2d6a2d' : brand.subtext,
      }}
    >
      {rotulo}
    </span>
  );
}

export function Pacientes() {
  const consulta = useQuery({ queryKey: ['pacientes'], queryFn: listarPacientes });

  if (consulta.isPending) return <p>Carregando pacientes…</p>;
  if (consulta.isError) return <p role="alert">Não foi possível carregar os pacientes.</p>;

  const { pacientes } = consulta.data;

  return (
    <>
      <h1 style={{ margin: 0 }}>Pacientes</h1>
      <p style={{ margin: 0, color: brand.subtext, fontSize: 14 }}>
        Você vê apenas os dados que cada paciente decidiu compartilhar.
      </p>

      <div style={{ background: brand.surface, border: `1px solid ${brand.outline}`, borderRadius: brand.radius.xl, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
          <thead>
            <tr>
              {['Paciente', 'Compartilha', 'Último check-in', 'Check-ins (7d)', 'Humor médio (7d)'].map((t) => (
                <th key={t} style={{ ...celula, color: brand.subtext, fontWeight: 600 }}>{t}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pacientes.length === 0 && (
              <tr><td colSpan={5} style={{ ...celula, color: brand.subtext }}>Nenhum paciente vinculado ainda.</td></tr>
            )}
            {pacientes.map((p) => (
              <tr key={p.id}>
                <td style={celula}>
                  <Link to={`/pacientes/${p.id}`} style={{ color: brand.primary, fontWeight: 600 }}>{p.nome}</Link>
                </td>
                <td style={celula}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <Selo ativo={p.compartilhaHumor} rotulo="Humor" />
                    <Selo ativo={p.compartilhaHabitos} rotulo="Sono/hábitos" />
                    <Selo ativo={p.compartilhaDiario} rotulo="Diário" />
                  </div>
                </td>
                <td style={celula}>
                  {p.ultimoCheckin
                    ? `${formatarDataCurta(p.ultimoCheckin.data)} (há ${diasDesde(p.ultimoCheckin.data)} d)`
                    : p.compartilhaHumor ? 'Nenhum' : '—'}
                </td>
                <td style={celula}>{p.compartilhaHumor ? p.checkinsUltimos7Dias : '—'}</td>
                <td style={celula}>{p.humorMedio7d ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
