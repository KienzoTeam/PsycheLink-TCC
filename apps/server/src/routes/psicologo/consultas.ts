import { Router } from 'express';
import { DatabaseError } from 'pg';
import { z } from 'zod';
import { registrarAuditoria } from '../../lib/auditoria';
import { lerSeguro } from '../../lib/checkins';
import { comContextoPsicologo } from '../../lib/contextoseguro';
import { criptografarOuNulo } from '../../lib/criptografia';
import { dia, diasEntre } from '../../lib/periodo';
import { idDe, lerOuNegar, limite, rota } from '../../lib/rota';
import { PACIENTE_NAO_ENCONTRADO, vinculoAtivoDe } from '../../lib/vinculo';

export const consultas = Router();

const MAX_DIAS_AGENDA = 92;
const CONSULTA_NAO_ENCONTRADA = 'Consulta não encontrada ou já encerrada.';
const CONFLITO_AGENDA = {
  codigo: 'CONFLITO_AGENDA',
  error: 'Já existe uma consulta neste horário.',
};

// Duração de 15 min a 4 h, a mesma regra do CHECK do banco, para responder 400 em vez de 500.
const DURACAO_MIN_MS = 15 * 60_000;
const DURACAO_MAX_MS = 4 * 60 * 60_000;

const instante = z.iso.datetime({ offset: true });
const duracaoValida = (c: { inicio: string; fim: string }) => {
  const duracao = Date.parse(c.fim) - Date.parse(c.inicio);
  return duracao >= DURACAO_MIN_MS && duracao <= DURACAO_MAX_MS;
};
const observacao = z.string().trim().max(2000);

const listaSchema = z
  .object({ de: dia, ate: dia })
  .refine((q) => diasEntre(q.de, q.ate) >= 1 && diasEntre(q.de, q.ate) <= MAX_DIAS_AGENDA);

const criarSchema = z
  .object({
    pacienteId: z.number().int().positive(),
    inicio: instante,
    fim: instante,
    observacao: observacao.optional(),
  })
  .refine(duracaoValida);

const alterarSchema = z
  .object({
    status: z.enum(['concluida', 'cancelada']).optional(),
    observacao: observacao.optional(),
  })
  .refine((c) => c.status !== undefined || c.observacao !== undefined);

const remarcarSchema = z.object({ inicio: instante, fim: instante }).refine(duracaoValida);

type LinhaConsulta = {
  id: number;
  pacienteId: number;
  pacienteNome: string;
  inicio: Date;
  fim: Date;
  status: string;
  remarcadaDe: number | null;
  observacao: string | null;
};

// Envolve uma consulta lida ou gravada (CTE `c`) com o nome do paciente.
const comPaciente = (consulta: string) => `
  WITH c AS (${consulta})
  SELECT c.id, c.paciente_id AS "pacienteId", u.nome AS "pacienteNome", c.inicio, c.fim, c.status,
         c.remarcada_de AS "remarcadaDe", c.observacao
    FROM c
    JOIN paciente p ON p.id = c.paciente_id
    JOIN users u ON u.id = p.user_id`;

const consultaJson = (l: LinhaConsulta) => ({ ...l, observacao: lerSeguro(l.observacao) });

const emConflito = (erro: unknown) => erro instanceof DatabaseError && erro.code === '23P01';

// Consultas que tocam os dias pedidos (calendário de São Paulo), inclusive a que vira a meia-noite;
// remarcadas e canceladas vêm com o status.
consultas.get(
  '/',
  limite(60),
  rota(async (req, res) => {
    const q = lerOuNegar(listaSchema, req.query, res);
    if (!q) return;

    const { rows } = await comContextoPsicologo(res.locals.psicologoId, (client) =>
      client.query<LinhaConsulta>(
        `${comPaciente(`SELECT * FROM consulta
                         WHERE psicologo_id = $1 AND ${vinculoAtivoDe('consulta')}
                           AND inicio < (($3::date + 1)::timestamp AT TIME ZONE 'America/Sao_Paulo')
                           AND fim > ($2::date::timestamp AT TIME ZONE 'America/Sao_Paulo')`)}
         ORDER BY c.inicio, c.id`,
        [res.locals.psicologoId, q.de, q.ate],
      ),
    );
    return res.json({ consultas: rows.map(consultaJson) });
  }),
);

consultas.post(
  '/',
  limite(60),
  rota(async (req, res) => {
    const corpo = lerOuNegar(criarSchema, req.body, res);
    if (!corpo) return;

    let criada: LinhaConsulta | undefined;
    try {
      criada = (
        await comContextoPsicologo(res.locals.psicologoId, (client) =>
          client.query<LinhaConsulta>(
            comPaciente(`INSERT INTO consulta (psicologo_id, paciente_id, inicio, fim, observacao)
                         SELECT $1::int, v.paciente_id, $3::timestamptz, $4::timestamptz, $5::text FROM vinculo v
                          WHERE v.psicologo_id = $1 AND v.paciente_id = $2 AND v.status = 'ativo'
                            FOR SHARE OF v
                      RETURNING *`),
            [
              res.locals.psicologoId,
              corpo.pacienteId,
              corpo.inicio,
              corpo.fim,
              criptografarOuNulo(corpo.observacao),
            ],
          ),
        )
      ).rows[0];
    } catch (erro) {
      if (emConflito(erro)) return res.status(409).json(CONFLITO_AGENDA);
      throw erro;
    }
    if (!criada) return res.status(404).json({ error: PACIENTE_NAO_ENCONTRADO });

    await registrarAuditoria(req, 'consulta_criada', {
      pacienteId: criada.pacienteId,
      alvoTipo: 'consulta',
      alvoId: criada.id,
    });
    return res.status(201).json({ consulta: consultaJson(criada) });
  }),
);

// Só consulta agendada muda de status; a observação se edita em qualquer status.
consultas.patch(
  '/:id',
  limite(60),
  rota<{ id: string }>(async (req, res) => {
    const id = idDe(req.params.id);
    const corpo = lerOuNegar(alterarSchema, req.body, res);
    if (!corpo) return;
    if (id === null) return res.status(404).json({ error: CONSULTA_NAO_ENCONTRADA });

    const { rows } = await comContextoPsicologo(res.locals.psicologoId, (client) =>
      client.query<LinhaConsulta>(
        comPaciente(`UPDATE consulta
                        SET status = COALESCE($3, status),
                            observacao = CASE WHEN $4::boolean THEN $5 ELSE observacao END,
                            atualizado_em = now()
                      WHERE id = $1 AND psicologo_id = $2 AND ${vinculoAtivoDe('consulta')}
                        AND ($3::text IS NULL OR status = 'agendada')
                  RETURNING *`),
        [
          id,
          res.locals.psicologoId,
          corpo.status ?? null,
          corpo.observacao !== undefined,
          criptografarOuNulo(corpo.observacao),
        ],
      ),
    );
    if (!rows[0]) return res.status(404).json({ error: CONSULTA_NAO_ENCONTRADA });

    await registrarAuditoria(req, 'consulta_alterada', {
      pacienteId: rows[0].pacienteId,
      alvoTipo: 'consulta',
      alvoId: id,
      metadados: {
        ...(corpo.status && { status: corpo.status }),
        ...(corpo.observacao !== undefined && { observacaoAlterada: true }),
      },
    });
    return res.json({ consulta: consultaJson(rows[0]) });
  }),
);

// A original sai de `agendada` antes da nova entrar, então a nova pode ocupar parte do horário antigo.
// Se a nova conflitar, a transação inteira volta e a original continua agendada.
consultas.post(
  '/:id/remarcar',
  limite(60),
  rota<{ id: string }>(async (req, res) => {
    const id = idDe(req.params.id);
    const corpo = lerOuNegar(remarcarSchema, req.body, res);
    if (!corpo) return;
    if (id === null) return res.status(404).json({ error: CONSULTA_NAO_ENCONTRADA });

    let nova: LinhaConsulta | null;
    try {
      nova = await comContextoPsicologo(res.locals.psicologoId, async (client) => {
        // Vínculo antes da consulta, na mesma ordem do encerramento (que trava o vínculo e depois
        // cancela as consultas): sem isso a nova escaparia do cancelamento ou as duas se travariam.
        const ativo = await client.query(
          `SELECT 1 FROM vinculo v JOIN consulta c USING (paciente_id, psicologo_id)
            WHERE c.id = $1 AND c.psicologo_id = $2 AND v.status = 'ativo'
              FOR SHARE OF v`,
          [id, res.locals.psicologoId],
        );
        if (!ativo.rowCount) return null;

        const original = await client.query<{ paciente_id: number }>(
          `UPDATE consulta SET status = 'remarcada', atualizado_em = now()
            WHERE id = $1 AND psicologo_id = $2 AND status = 'agendada' AND ${vinculoAtivoDe('consulta')}
        RETURNING paciente_id`,
          [id, res.locals.psicologoId],
        );
        if (!original.rows[0]) return null;

        const criada = await client.query<LinhaConsulta>(
          comPaciente(`INSERT INTO consulta (psicologo_id, paciente_id, inicio, fim, remarcada_de)
                       VALUES ($1, $2, $3, $4, $5) RETURNING *`),
          [res.locals.psicologoId, original.rows[0].paciente_id, corpo.inicio, corpo.fim, id],
        );
        return criada.rows[0];
      });
    } catch (erro) {
      if (emConflito(erro)) return res.status(409).json(CONFLITO_AGENDA);
      throw erro;
    }
    if (!nova) return res.status(404).json({ error: CONSULTA_NAO_ENCONTRADA });

    await registrarAuditoria(req, 'consulta_alterada', {
      pacienteId: nova.pacienteId,
      alvoTipo: 'consulta',
      alvoId: id,
      metadados: { status: 'remarcada' },
    });
    await registrarAuditoria(req, 'consulta_criada', {
      pacienteId: nova.pacienteId,
      alvoTipo: 'consulta',
      alvoId: nova.id,
      metadados: { remarcadaDe: id },
    });
    return res.status(201).json({ consulta: consultaJson(nova) });
  }),
);
