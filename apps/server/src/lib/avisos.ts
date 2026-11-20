import webpush from 'web-push';
import { pool } from '../db';
import { comContextoPsicologo } from './contextoseguro';
import { enviarAviso } from './mailer';

// Avisos do psicólogo (FP12). Cada tipo tem um rótulo e o padrão de cada canal; o psicólogo muda
// em Minha área. Nenhum canal leva conteúdo clínico: o e-mail e o push nem trazem o nome.
export const TIPOS_AVISO = {
  vinculo_novo: { rotulo: 'Novo paciente vinculado', email: true },
  vinculo_encerrado: { rotulo: 'Um paciente encerrou o vínculo', email: true },
  conta_excluida: { rotulo: 'Um paciente pediu a exclusão da conta', email: true },
  escala_respondida: { rotulo: 'Escala respondida', email: false },
  sos_usado: { rotulo: 'Um paciente abriu o SOS', email: true },
  dados_esparsos: { rotulo: 'Paciente com poucos registros na semana', email: false },
  recomendacao_feita: { rotulo: 'Recomendação concluída', email: false },
} as const;

export type TipoAviso = keyof typeof TIPOS_AVISO;
export type Canais = { painel: boolean; email: boolean; push: boolean };
export type Preferencias = Record<TipoAviso, Canais>;

export function preferenciasCom(salvas: Partial<Record<string, Partial<Canais>>>): Preferencias {
  return Object.fromEntries(
    Object.entries(TIPOS_AVISO).map(([tipo, { email }]) => [tipo, { painel: true, email, push: true, ...salvas[tipo] }]),
  ) as Preferencias;
}

const vapid = () => {
  const { VAPID_PUBLIC_KEY: publica, VAPID_PRIVATE_KEY: privada, VAPID_SUBJECT: assunto } = process.env;
  return publica && privada && assunto ? { publica, privada, assunto } : null;
};
export const chavePublicaPush = () => vapid()?.publica ?? null;

async function enviarPush(psicologoId: number, rotulo: string) {
  const chaves = vapid();
  if (!chaves) return;
  const { rows } = await pool.query<{ endpoint: string; p256dh: string; auth: string }>(
    'SELECT endpoint, p256dh, auth FROM push_navegador WHERE psicologo_id = $1',
    [psicologoId],
  );
  const corpo = JSON.stringify({ titulo: rotulo, corpo: 'Abra o painel para ver.', url: '/inicio' });
  for (const { endpoint, p256dh, auth } of rows) {
    await webpush
      .sendNotification({ endpoint, keys: { p256dh, auth } }, corpo, {
        vapidDetails: { subject: chaves.assunto, publicKey: chaves.publica, privateKey: chaves.privada },
        TTL: 24 * 60 * 60,
      })
      .catch(async (erro: { statusCode?: number }) => {
        // 404/410: o navegador cancelou a inscrição; não adianta tentar de novo.
        if (erro.statusCode === 404 || erro.statusCode === 410) {
          await pool.query('DELETE FROM push_navegador WHERE endpoint = $1', [endpoint]);
        } else console.warn('Push do navegador falhou:', erro.statusCode ?? 'sem status');
      });
  }
}

/** Avisa o psicólogo pelos canais ligados. Nunca lança: o fluxo do paciente não pode quebrar por isso. */
export async function avisar(psicologoId: number, tipo: TipoAviso, pacienteId: number | null) {
  try {
    const { rows } = await pool.query<{ email: string; preferencias: Record<string, Partial<Canais>> }>(
      `SELECT u.email, p.preferencias_avisos AS preferencias
         FROM psicologo p JOIN users u ON u.id = p.user_id WHERE p.id = $1`,
      [psicologoId],
    );
    if (!rows[0]) return;
    const canais = preferenciasCom(rows[0].preferencias)[tipo];
    const { rotulo } = TIPOS_AVISO[tipo];
    // Sempre grava (serve para não repetir avisos); "painel" só decide se aparece na lista.
    await comContextoPsicologo(psicologoId, (client) =>
      client.query('INSERT INTO notificacao (psicologo_id, paciente_id, tipo) VALUES ($1, $2, $3)', [psicologoId, pacienteId, tipo]),
    );
    if (canais.email) await enviarAviso(rows[0].email, rotulo).catch((e) => console.warn('E-mail de aviso falhou:', e?.code ?? e?.name));
    if (canais.push) await enviarPush(psicologoId, rotulo);
  } catch (erro) {
    console.error('Erro ao avisar o psicólogo:', erro);
  }
}

/** Avisa o psicólogo do vínculo ativo do paciente, se houver. */
export async function avisarPsicologoDoPaciente(pacienteId: number, tipo: TipoAviso) {
  const { rows } = await pool
    .query<{ psicologo_id: number }>("SELECT psicologo_id FROM vinculo WHERE paciente_id = $1 AND status = 'ativo'", [pacienteId])
    .catch(() => ({ rows: [] as { psicologo_id: number }[] }));
  if (rows[0]) await avisar(rows[0].psicologo_id, tipo, pacienteId);
}

/**
 * Dados esparsos: paciente com vínculo ativo, consentimento de humor e menos de 3 check-ins nos
 * últimos 7 dias, sem aviso igual na última semana. Roda com as outras tarefas periódicas.
 */
export async function avisarDadosEsparsos(): Promise<number> {
  const { rows: vinculos } = await pool.query<{ psicologo_id: number; paciente_id: number }>(
    `SELECT psicologo_id, paciente_id FROM vinculo
      WHERE status = 'ativo' AND criado_em < now() - interval '7 days'`,
  );
  let avisados = 0;
  for (const { psicologo_id, paciente_id } of vinculos) {
    // Consentimento, check-ins e avisos têm RLS: a conta roda no contexto do psicólogo.
    const esparso = await comContextoPsicologo(psicologo_id, async (client) => {
      const { rows } = await client.query<{ esparso: boolean }>(
        `SELECT (SELECT count(*) FROM checkin_diario WHERE paciente_id = $2 AND data >= CURRENT_DATE - 6) < 3
                AND NOT EXISTS (SELECT 1 FROM notificacao WHERE psicologo_id = $1 AND paciente_id = $2
                                  AND tipo = 'dados_esparsos' AND criado_em > now() - interval '7 days') AS esparso
           FROM consentimento WHERE paciente_id = $2 AND compartilha_humor`,
        [psicologo_id, paciente_id],
      );
      return rows[0]?.esparso ?? false;
    });
    if (!esparso) continue;
    await avisar(psicologo_id, 'dados_esparsos', paciente_id);
    avisados++;
  }
  return avisados;
}
