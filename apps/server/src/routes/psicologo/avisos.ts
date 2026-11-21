import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../db';
import { chavePublicaPush, preferenciasCom, TIPOS_AVISO, type TipoAviso } from '../../lib/avisos';
import { comContextoPsicologo } from '../../lib/contextoseguro';
import { lerOuNegar, limite, rota } from '../../lib/rota';

// Sino do painel, preferências por tipo e canal, e inscrição de push do navegador (FP12).
export const avisos = Router();

const TIPOS = Object.keys(TIPOS_AVISO) as [TipoAviso, ...TipoAviso[]];
const canaisSchema = z.object({ painel: z.boolean(), email: z.boolean(), push: z.boolean() });
const preferenciasSchema = z.partialRecord(z.enum(TIPOS), canaisSchema);
const lidasSchema = z.object({ ids: z.array(z.number().int().positive()).max(100).optional() });
const pushSchema = z.object({
  endpoint: z.string().url().max(1000).startsWith('https://'),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

async function preferenciasDe(psicologoId: number) {
  const { rows } = await pool.query<{ p: Record<string, object> }>('SELECT preferencias_avisos AS p FROM psicologo WHERE id = $1', [psicologoId]);
  return preferenciasCom(rows[0]?.p ?? {});
}

avisos.get(
  '/',
  limite(720), // cinco abas a cada 15 s, com margem para acessos extras
  rota(async (_req, res) => {
    const psicologoId: number = res.locals.psicologoId;
    const prefs = await preferenciasDe(psicologoId);
    const visiveis = TIPOS.filter((t) => prefs[t].painel);
    const dados = await comContextoPsicologo(psicologoId, async (client) => {
      const lista = await client.query(
        `SELECT n.id, n.tipo, n.paciente_id AS "pacienteId", u.nome, n.criado_em AS "criadoEm", n.lida_em IS NOT NULL AS lida
           FROM notificacao n
           LEFT JOIN paciente p ON p.id = n.paciente_id
           LEFT JOIN users u ON u.id = p.user_id
          WHERE n.psicologo_id = $1 AND n.tipo = ANY($2)
          ORDER BY n.criado_em DESC LIMIT 50`,
        [psicologoId, visiveis],
      );
      const naoLidas = await client.query<{ n: number }>(
        'SELECT count(*)::int AS n FROM notificacao WHERE psicologo_id = $1 AND tipo = ANY($2) AND lida_em IS NULL',
        [psicologoId, visiveis],
      );
      return { lista: lista.rows, naoLidas: naoLidas.rows[0].n };
    });
    return res.json({
      avisos: dados.lista.map((a) => ({ ...a, rotulo: TIPOS_AVISO[a.tipo as TipoAviso]?.rotulo ?? 'Aviso' })),
      naoLidas: dados.naoLidas,
    });
  }),
);

avisos.post(
  '/lidas',
  limite(120),
  rota(async (req, res) => {
    const corpo = lerOuNegar(lidasSchema, req.body ?? {}, res);
    if (!corpo) return;
    const psicologoId: number = res.locals.psicologoId;
    await comContextoPsicologo(psicologoId, (client) =>
      client.query(
        `UPDATE notificacao SET lida_em = now()
          WHERE psicologo_id = $1 AND lida_em IS NULL AND ($2::bigint[] IS NULL OR id = ANY($2))`,
        [psicologoId, corpo.ids ?? null],
      ),
    );
    return res.json({ ok: true });
  }),
);

avisos.get(
  '/preferencias',
  limite(60),
  rota(async (_req, res) => {
    const prefs = await preferenciasDe(res.locals.psicologoId);
    return res.json({
      tipos: TIPOS.map((tipo) => ({ tipo, rotulo: TIPOS_AVISO[tipo].rotulo, ...prefs[tipo] })),
      chavePush: chavePublicaPush(),
    });
  }),
);

avisos.put(
  '/preferencias',
  limite(30),
  rota(async (req, res) => {
    const corpo = lerOuNegar(preferenciasSchema, req.body, res);
    if (!corpo) return;
    await pool.query('UPDATE psicologo SET preferencias_avisos = preferencias_avisos || $2::jsonb WHERE id = $1', [
      res.locals.psicologoId,
      JSON.stringify(corpo),
    ]);
    const prefs = await preferenciasDe(res.locals.psicologoId);
    return res.json({ tipos: TIPOS.map((tipo) => ({ tipo, rotulo: TIPOS_AVISO[tipo].rotulo, ...prefs[tipo] })) });
  }),
);

avisos.post(
  '/push',
  limite(20),
  rota(async (req, res) => {
    const corpo = lerOuNegar(pushSchema, req.body, res);
    if (!corpo) return;
    await pool.query(
      `INSERT INTO push_navegador (endpoint, psicologo_id, p256dh, auth) VALUES ($1, $2, $3, $4)
       ON CONFLICT (endpoint) DO UPDATE SET psicologo_id = EXCLUDED.psicologo_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`,
      [corpo.endpoint, res.locals.psicologoId, corpo.keys.p256dh, corpo.keys.auth],
    );
    return res.status(201).json({ ok: true });
  }),
);

avisos.delete(
  '/push',
  limite(20),
  rota(async (req, res) => {
    const corpo = lerOuNegar(z.object({ endpoint: z.string().max(1000) }), req.body, res);
    if (!corpo) return;
    await pool.query('DELETE FROM push_navegador WHERE endpoint = $1 AND psicologo_id = $2', [corpo.endpoint, res.locals.psicologoId]);
    return res.json({ ok: true });
  }),
);
