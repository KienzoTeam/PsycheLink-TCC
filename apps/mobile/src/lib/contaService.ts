import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { api } from './api';
import type { UsuarioAutenticado } from '../hooks/useAuth';

export type Conta = {
  nome: string;
  email: string;
  exclusaoAgendadaEm: string | null;
  excluirEm: string | null;
  dispositivosConfiaveis: number;
};

export const buscarConta = async () => (await api.get<Conta>('/paciente/conta')).data;
export const mudarNome = async (nome: string) => (await api.patch<{ nome: string }>('/paciente/conta', { nome })).data.nome;
export const trocarSenha = async (senhaAtual: string, novaSenha: string) =>
  (await api.post<{ token: string; usuario: UsuarioAutenticado }>('/paciente/conta/senha', { senhaAtual, novaSenha })).data;
export const esquecerCelulares = async () =>
  (await api.post<{ esquecidos: number }>('/paciente/conta/dispositivos/esquecer')).data.esquecidos;
export const agendarExclusao = async (senha: string) => void (await api.post('/paciente/conta/excluir', { senha }));
export const cancelarExclusao = async () => void (await api.post('/paciente/conta/excluir/cancelar'));

type Exportacao = {
  geradoEm: string;
  perfil: { nome: string; email: string; dataNascimento: string | null; criadoEm: string };
  checkins: Array<{
    data: string;
    horario: string | null;
    humor: number | null;
    ansiedade: number | null;
    sonoHoras: number | null;
    qualidadeSono: string | null;
    emocoes: string[] | null;
    gatilhos: string[] | null;
    habitos: Record<string, boolean> | null;
    notas: string | null;
  }>;
  diario: Array<{ texto: string | null; compartilhado: boolean; criadoEm: string }>;
  escalas: Array<{ sigla: string; nome: string; status: string; respondidoEm: string | null; scoreTotal: number | null }>;
};

const esc = (t: unknown) =>
  String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const dataBr = (iso: string) => new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString('pt-BR');
const quandoBr = (iso: string) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

// Tudo vem do próprio paciente, mas é texto livre: escapado antes de virar HTML.
function html(d: Exportacao) {
  const linhas = d.checkins
    .map(
      (c) => `<tr><td>${dataBr(c.data)} ${esc(c.horario)}</td><td>${esc(c.emocoes?.join(', '))}</td>
        <td>${esc(c.humor)}</td><td>${esc(c.ansiedade)}</td><td>${esc(c.sonoHoras)}</td><td>${esc(c.notas)}</td></tr>`,
    )
    .join('');
  const diario = d.diario
    .map((e) => `<p><b>${quandoBr(e.criadoEm)}</b>${e.compartilhado ? ' (compartilhado)' : ''}<br>${esc(e.texto)}</p>`)
    .join('');
  const escalas = d.escalas
    .map((e) => `<tr><td>${esc(e.sigla)}</td><td>${esc(e.status)}</td><td>${e.respondidoEm ? dataBr(e.respondidoEm) : ''}</td><td>${esc(e.scoreTotal)}</td></tr>`)
    .join('');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>
    body{font-family:sans-serif;color:#4c4f69;font-size:11px;margin:24px}h1{color:#8839ef;font-size:20px}h2{font-size:14px;margin-top:20px}
    table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccd0da;padding:4px;text-align:left;vertical-align:top}th{background:#efe5fd}
  </style></head><body>
    <h1>PsycheLink · Meus dados</h1>
    <p>${esc(d.perfil.nome)} · ${esc(d.perfil.email)} · gerado em ${quandoBr(d.geradoEm)}</p>
    <p>Valores brutos registrados por você, sem interpretação clínica.</p>
    <h2>Check-ins (${d.checkins.length})</h2>
    <table><tr><th>Data</th><th>Emoções</th><th>Humor</th><th>Ansiedade</th><th>Sono (h)</th><th>Notas</th></tr>${linhas}</table>
    <h2>Diário (${d.diario.length})</h2>${diario || '<p>Nenhuma entrada.</p>'}
    <h2>Escalas (${d.escalas.length})</h2>
    <table><tr><th>Escala</th><th>Situação</th><th>Respondida em</th><th>Pontuação</th></tr>${escalas}</table>
  </body></html>`;
}

/** Baixa os dados (LGPD) e abre o compartilhar do celular com o PDF ou o JSON. */
export async function exportarDados(formato: 'pdf' | 'json') {
  const { data } = await api.get<Exportacao>('/paciente/conta/exportar');
  if (formato === 'pdf') {
    const { uri } = await Print.printToFileAsync({ html: html(data) });
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Meus dados do PsycheLink' });
    return;
  }
  const arquivo = new File(Paths.cache, 'psychelink-meus-dados.json');
  arquivo.create({ overwrite: true });
  await arquivo.write(JSON.stringify(data, null, 2));
  await Sharing.shareAsync(arquivo.uri, { mimeType: 'application/json', dialogTitle: 'Meus dados do PsycheLink' });
}
