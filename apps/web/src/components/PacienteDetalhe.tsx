import { useState, type CSSProperties, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { buscarPaciente, criarAnotacao, listarAnotacoes } from '../lib/psicologoApi';
import { formatarDataCurta } from '../lib/formatar';
import { mensagemDeErro } from '../lib/erros';
import { brand } from '../theme';

const card: CSSProperties = {
  background: brand.surface,
  border: `1px solid ${brand.outline}`,
  borderRadius: brand.radius.xl,
  padding: 16,
  minWidth: 0,
};

const PERIODOS = [7, 14, 30, 90] as const;

function SemPermissao({ texto }: { texto: string }) {
  return <p style={{ margin: 0, color: brand.subtext, fontSize: 14 }}>{texto}</p>;
}

export function PacienteDetalhe() {
  const { id } = useParams();
  const pacienteId = Number(id);
  const valido = Number.isInteger(pacienteId) && pacienteId > 0;
  const [dias, setDias] = useState<number>(30);
  const queryClient = useQueryClient();

  const detalhe = useQuery({
    queryKey: ['paciente', pacienteId, dias],
    queryFn: () => buscarPaciente(pacienteId, dias),
    enabled: valido,
    retry: false,
  });

  const anotacoes = useQuery({
    queryKey: ['anotacoes', pacienteId],
    queryFn: () => listarAnotacoes(pacienteId),
    enabled: valido && detalhe.isSuccess,
    retry: false,
  });

  const [texto, setTexto] = useState('');
  const salvarAnotacao = useMutation({
    mutationFn: (conteudo: string) => criarAnotacao(pacienteId, conteudo),
    onSuccess: () => {
      setTexto('');
      queryClient.invalidateQueries({ queryKey: ['anotacoes', pacienteId] });
    },
  });

  function enviarAnotacao(evento: FormEvent) {
    evento.preventDefault();
    if (texto.trim()) salvarAnotacao.mutate(texto.trim());
  }

  if (!valido) return <p role="alert">Paciente não encontrado.</p>;
  if (detalhe.isPending) return <p>Carregando paciente…</p>;
  if (detalhe.isError) {
    return (
      <>
        <Link to="/pacientes" style={{ color: brand.primary }}>← Voltar para pacientes</Link>
        <p role="alert">{mensagemDeErro(detalhe.error, 'Paciente não encontrado.')}</p>
      </>
    );
  }

  const dados = detalhe.data;
  const { consentimentos, registros } = dados;

  const serieHumor = registros.map((r) => ({
    data: formatarDataCurta(r.data),
    humor: r.humor,
    ansiedade: r.ansiedade,
  }));
  const serieSono = registros.map((r) => ({ data: formatarDataCurta(r.data), sono: r.sonoHoras }));

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Link to="/pacientes" style={{ color: brand.primary }}>← Pacientes</Link>
        <h1 style={{ margin: 0 }}>{dados.paciente.nome}</h1>
        <label style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
          Período
          <select
            value={dias}
            onChange={(e) => setDias(Number(e.target.value))}
            style={{ padding: '6px 10px', borderRadius: brand.radius.md, border: `1px solid ${brand.outline}` }}
          >
            {PERIODOS.map((p) => <option key={p} value={p}>{p} dias</option>)}
          </select>
        </label>
      </div>

      <section style={card}>
        <h2 style={{ margin: '0 0 12px', fontSize: 18 }}>Humor e ansiedade</h2>
        {!consentimentos.humor ? (
          <SemPermissao texto="Este paciente não compartilha dados de humor e ansiedade." />
        ) : registros.length === 0 ? (
          <SemPermissao texto="Nenhum check-in no período selecionado." />
        ) : (
          <div style={{ height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={serieHumor}>
                <CartesianGrid stroke={brand.outline} strokeDasharray="3 3" />
                <XAxis dataKey="data" fontSize={12} />
                <YAxis domain={[1, 10]} allowDecimals={false} fontSize={12} width={28} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="humor" name="Humor" stroke={brand.primary} strokeWidth={2} connectNulls />
                <Line type="monotone" dataKey="ansiedade" name="Ansiedade" stroke="#fe640b" strokeWidth={2} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <div className="dash-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <section style={card}>
          <h2 style={{ margin: '0 0 12px', fontSize: 18 }}>Sono</h2>
          {!consentimentos.habitos ? (
            <SemPermissao texto="Não compartilhado pelo paciente." />
          ) : (
            <div style={{ height: 200 }}>
              <ResponsiveContainer>
                <LineChart data={serieSono}>
                  <CartesianGrid stroke={brand.outline} strokeDasharray="3 3" />
                  <XAxis dataKey="data" fontSize={12} />
                  <YAxis fontSize={12} width={28} />
                  <Tooltip />
                  <Line type="monotone" dataKey="sono" name="Horas de sono" stroke={brand.primary} strokeWidth={2} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section style={card}>
          <h2 style={{ margin: '0 0 12px', fontSize: 18 }}>Emoções mais registradas</h2>
          {!consentimentos.humor ? (
            <SemPermissao texto="Não compartilhado pelo paciente." />
          ) : dados.frequenciaEmocional.length === 0 ? (
            <SemPermissao texto="Sem registros de emoção no período." />
          ) : (
            dados.frequenciaEmocional.map((f) => (
              <div key={f.emocao} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '6px 0', borderBottom: `1px solid ${brand.outline}` }}>
                <span>{f.emocao}</span>
                <strong>{f.quantidade}×</strong>
              </div>
            ))
          )}
        </section>
      </div>

      <section style={card}>
        <h2 style={{ margin: '0 0 12px', fontSize: 18 }}>Hábitos</h2>
        {!dados.habitos ? (
          <SemPermissao texto="Não compartilhado pelo paciente." />
        ) : dados.habitos.diasRegistrados === 0 ? (
          <SemPermissao texto="Sem registros de hábitos no período." />
        ) : (
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 14 }}>
            <span>Dias registrados: <strong>{dados.habitos.diasRegistrados}</strong></span>
            <span>Exercício: <strong>{dados.habitos.exercicio}</strong></span>
            <span>Meditação: <strong>{dados.habitos.meditacao}</strong></span>
            <span>Medicação: <strong>{dados.habitos.medicacao}</strong></span>
          </div>
        )}
      </section>

      <section style={card}>
        <h2 style={{ margin: '0 0 12px', fontSize: 18 }}>Registros do período</h2>
        {registros.length === 0 ? (
          <SemPermissao texto="Nenhum check-in no período selecionado." />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 560 }}>
              <thead>
                <tr>
                  {['Data', 'Humor', 'Ansiedade', 'Sono (h)', 'Qualidade', 'Emoções', 'Gatilhos'].map((t) => (
                    <th key={t} style={{ textAlign: 'left', padding: '8px', color: brand.subtext, borderBottom: `1px solid ${brand.outline}` }}>{t}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...registros].reverse().map((r) => (
                  <tr key={r.data}>
                    <td style={{ padding: 8, borderBottom: `1px solid ${brand.outline}` }}>{formatarDataCurta(r.data)}</td>
                    <td style={{ padding: 8, borderBottom: `1px solid ${brand.outline}` }}>{r.humor ?? '—'}</td>
                    <td style={{ padding: 8, borderBottom: `1px solid ${brand.outline}` }}>{r.ansiedade ?? '—'}</td>
                    <td style={{ padding: 8, borderBottom: `1px solid ${brand.outline}` }}>{r.sonoHoras ?? '—'}</td>
                    <td style={{ padding: 8, borderBottom: `1px solid ${brand.outline}` }}>{r.qualidadeSono ?? '—'}</td>
                    <td style={{ padding: 8, borderBottom: `1px solid ${brand.outline}` }}>{r.emocoes?.join(', ') ?? '—'}</td>
                    <td style={{ padding: 8, borderBottom: `1px solid ${brand.outline}` }}>{r.gatilhos?.join(', ') ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={card}>
        <h2 style={{ margin: '0 0 12px', fontSize: 18 }}>Diário compartilhado</h2>
        {!consentimentos.diario ? (
          <SemPermissao texto="Não compartilhado pelo paciente." />
        ) : dados.diario.length === 0 ? (
          <SemPermissao texto="Nenhuma entrada de diário compartilhada no período." />
        ) : (
          dados.diario.map((d) => (
            <div key={d.data} style={{ padding: '8px 0', borderBottom: `1px solid ${brand.outline}`, fontSize: 14 }}>
              <strong>{formatarDataCurta(d.data)}</strong>
              <p style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{d.texto}</p>
            </div>
          ))
        )}
      </section>

      <section style={card}>
        <h2 style={{ margin: '0 0 4px', fontSize: 18 }}>Anotações clínicas</h2>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: brand.subtext }}>
          Visíveis somente para você. Armazenadas de forma cifrada.
        </p>

        <form onSubmit={enviarAnotacao} style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            maxLength={5000}
            rows={3}
            placeholder="Escreva uma nova anotação…"
            style={{ padding: 12, fontSize: 14, borderRadius: brand.radius.md, border: `1px solid ${brand.outline}`, resize: 'vertical', fontFamily: 'inherit' }}
          />
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              type="submit"
              disabled={!texto.trim() || salvarAnotacao.isPending}
              style={{ padding: '10px 18px', borderRadius: brand.radius.md, border: 0, background: brand.primary, color: '#fff', opacity: !texto.trim() ? 0.5 : 1 }}
            >
              Salvar anotação
            </button>
            {salvarAnotacao.isError && (
              <span role="alert" style={{ color: '#d20f39', fontSize: 13 }}>
                {mensagemDeErro(salvarAnotacao.error, 'Não foi possível salvar.')}
              </span>
            )}
          </div>
        </form>

        {anotacoes.isPending ? (
          <SemPermissao texto="Carregando anotações…" />
        ) : anotacoes.isError ? (
          <SemPermissao texto="Não foi possível carregar as anotações." />
        ) : anotacoes.data.length === 0 ? (
          <SemPermissao texto="Nenhuma anotação ainda." />
        ) : (
          anotacoes.data.map((a) => (
            <div key={a.id} style={{ padding: '10px 0', borderBottom: `1px solid ${brand.outline}`, fontSize: 14 }}>
              <span style={{ fontSize: 12, color: brand.subtext }}>{a.criadoEm}</span>
              <p style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{a.conteudo}</p>
            </div>
          ))
        )}
      </section>
    </>
  );
}
