import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../db';
import { registrarAuditoria } from '../../lib/auditoria';
import { lerSeguro } from '../../lib/checkins';
import { comContextoPsicologo } from '../../lib/contextoseguro';
import { aplicacaoJson, aplicacoesDoPaciente } from '../../lib/escalas';
import { dia, periodoValido } from '../../lib/periodo';
import { checkinsDoPeriodo, resumirCheckins } from '../../lib/resumo';
import { lerOuNegar, limite, rota } from '../../lib/rota';
import { consentimentosDe, PACIENTE_NAO_ENCONTRADO, vinculoOuNegar } from '../../lib/vinculo';
import { perfilDe } from './conta';

export const relatorios = Router();

const periodo = { de: dia, ate: dia };
const periodoConfere = (q: { de: string; ate: string }) => periodoValido(q.de, q.ate);

const geralSchema = z.object(periodo).refine(periodoConfere);

const pacienteSchema = z
  .object({
    ...periodo,
    incluirAnotacoes: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
  })
  .refine(periodoConfere);

const exportacaoSchema = z
  .discriminatedUnion('tipo', [
    z.object({ tipo: z.literal('geral'), ...periodo }),
    z.object({
      tipo: z.literal('paciente'),
      pacienteId: z.number().int().positive(),
      incluirAnotacoes: z.boolean().default(false),
      ...periodo,
    }),
  ])
  .refine(periodoConfere);

// Quem imprime precisa de nome e CRP do psicólogo e do instante de geração no cabeçalho.
async function cabecalhoDe(psicologoId: number, de: string, ate: string) {
  const perfil = await perfilDe(psicologoId);
  return {
    psicologo: { nome: perfil.nome, crp: perfil.crp },
    periodo: { de, ate },
    geradoEm: new Date().toISOString(),
  };
}

type LinhaGeral = {
  pacienteId: number;
  nome: string;
  humor: boolean;
  habitos: boolean;
  escalas: boolean;
  registros: number;
  humorMedio: number | null;
  ansiedadeMedia: number | null;
  sonoMedio: number | null;
  escalasConcluidas: number;
  agendada: number;
  concluida: number;
  cancelada: number;
  remarcada: number;
};

// Cada paciente entra com o que consentiu: sem humor não saem registros nem médias de humor e
// ansiedade, sem hábitos não sai o sono, sem escalas não sai a contagem de escalas.
// As consultas são agenda do psicólogo e vêm sempre.
relatorios.get(
  '/geral',
  limite(60),
  rota(async (req, res) => {
    const q = lerOuNegar(geralSchema, req.query, res);
    if (!q) return;

    const { rows } = await comContextoPsicologo(res.locals.psicologoId, (client) =>
      client.query<LinhaGeral>(
        `SELECT v.paciente_id AS "pacienteId", u.nome,
                COALESCE(co.compartilha_humor, false)   AS humor,
                COALESCE(co.compartilha_habitos, false) AS habitos,
                COALESCE(co.compartilha_escalas, false) AS escalas,
                ck.registros,
                round(ck.humor, 1)::float8     AS "humorMedio",
                round(ck.ansiedade, 1)::float8 AS "ansiedadeMedia",
                round(ck.sono, 1)::float8      AS "sonoMedio",
                ae.n AS "escalasConcluidas",
                cs.agendada, cs.concluida, cs.cancelada, cs.remarcada
           FROM vinculo v
           JOIN paciente p ON p.id = v.paciente_id
           JOIN users u ON u.id = p.user_id
           LEFT JOIN consentimento co ON co.paciente_id = v.paciente_id
           CROSS JOIN LATERAL (
                SELECT count(*)::int AS registros,
                       avg(intensidade_humor) AS humor,
                       avg(intensidade_ansiedade) AS ansiedade,
                       avg(horas_sono) AS sono
                  FROM checkin_diario
                 WHERE paciente_id = v.paciente_id AND data BETWEEN $2::date AND $3::date) ck
           CROSS JOIN LATERAL (
                SELECT count(*)::int AS n
                  FROM aplicacao_escala a
                 WHERE a.paciente_id = v.paciente_id AND a.psicologo_id = v.psicologo_id
                   AND a.status = 'concluida'
                   AND (a.respondido_em AT TIME ZONE 'America/Sao_Paulo')::date
                       BETWEEN $2::date AND $3::date) ae
           CROSS JOIN LATERAL (
                SELECT count(*) FILTER (WHERE status = 'agendada')::int AS agendada,
                       count(*) FILTER (WHERE status = 'concluida')::int AS concluida,
                       count(*) FILTER (WHERE status = 'cancelada')::int AS cancelada,
                       count(*) FILTER (WHERE status = 'remarcada')::int AS remarcada
                  FROM consulta c
                 WHERE c.paciente_id = v.paciente_id AND c.psicologo_id = v.psicologo_id
                   AND (c.inicio AT TIME ZONE 'America/Sao_Paulo')::date
                       BETWEEN $2::date AND $3::date) cs
          WHERE v.psicologo_id = $1 AND v.status = 'ativo'
          ORDER BY u.nome, v.paciente_id`,
        [res.locals.psicologoId, q.de, q.ate],
      ),
    );

    return res.json({
      cabecalho: await cabecalhoDe(res.locals.psicologoId, q.de, q.ate),
      pacientes: rows.map((l) => ({
        pacienteId: l.pacienteId,
        nome: l.nome,
        consentimentos: { humor: l.humor, habitos: l.habitos, escalas: l.escalas },
        registros: l.humor ? l.registros : null,
        humorMedio: l.humor ? l.humorMedio : null,
        ansiedadeMedia: l.humor ? l.ansiedadeMedia : null,
        sonoMedioHoras: l.habitos ? l.sonoMedio : null,
        escalasConcluidas: l.escalas ? l.escalasConcluidas : null,
        consultas: {
          agendada: l.agendada,
          concluida: l.concluida,
          cancelada: l.cancelada,
          remarcada: l.remarcada,
        },
      })),
    });
  }),
);

relatorios.get(
  '/pacientes/:pacienteId',
  limite(60),
  rota<{ pacienteId: string }>(async (req, res) => {
    const q = lerOuNegar(pacienteSchema, req.query, res);
    if (!q) return;

    const dados = await comContextoPsicologo(res.locals.psicologoId, async (client) => {
      const vinculo = await vinculoOuNegar(client, req, res);
      if (!vinculo) return null;
      const consentimentos = consentimentosDe(vinculo);

      const checkins = await checkinsDoPeriodo(client, vinculo.paciente_id, q.de, q.ate);
      const aplicacoes = consentimentos.escalas
        ? await aplicacoesDoPaciente(client, res.locals.psicologoId, vinculo.paciente_id, q)
        : [];
      const consultas = await client.query(
        `SELECT id, inicio, fim, status
           FROM consulta
          WHERE psicologo_id = $1 AND paciente_id = $2
            AND (inicio AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN $3::date AND $4::date
          ORDER BY inicio`,
        [res.locals.psicologoId, vinculo.paciente_id, q.de, q.ate],
      );
      const anotacoes = q.incluirAnotacoes
        ? await client.query<{ id: number; conteudo: string; criadoEm: Date }>(
            `SELECT id, conteudo, criado_em AT TIME ZONE 'UTC' AS "criadoEm"
               FROM anotacao_clinica
              WHERE psicologo_id = $1 AND paciente_id = $2
                AND (expira_em IS NULL OR expira_em > now())
                AND ((criado_em AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo')::date
                    BETWEEN $3::date AND $4::date
              ORDER BY criado_em, id`,
            [res.locals.psicologoId, vinculo.paciente_id, q.de, q.ate],
          )
        : null;
      return {
        vinculo,
        consentimentos,
        checkins,
        aplicacoes,
        consultas: consultas.rows,
        anotacoes: anotacoes?.rows,
      };
    });
    if (!dados) return;
    const { vinculo, consentimentos } = dados;

    if (dados.anotacoes) {
      await registrarAuditoria(req, 'anotacoes_lidas', {
        pacienteId: vinculo.paciente_id,
        metadados: { origem: 'relatorio' },
      });
    }

    const { registros, frequenciaEmocional, habitos, distribuicaoHorario } = resumirCheckins(
      dados.checkins,
      consentimentos,
    );
    return res.json({
      cabecalho: {
        paciente: { id: vinculo.paciente_id, nome: vinculo.nome },
        ...(await cabecalhoDe(res.locals.psicologoId, q.de, q.ate)),
      },
      consentimentos,
      serieDiaria: registros,
      frequenciaEmocional,
      habitos,
      distribuicaoHorario,
      escalas: dados.aplicacoes.map(aplicacaoJson),
      consultas: dados.consultas,
      anotacoes: dados.anotacoes
        ? dados.anotacoes.flatMap((a) => {
            const conteudo = lerSeguro(a.conteudo);
            return conteudo === null ? [] : [{ id: a.id, criadoEm: a.criadoEm, conteudo }];
          })
        : null,
    });
  }),
);

// O front chama antes de abrir a impressão: o id do registro de auditoria é o número do relatório.
relatorios.post(
  '/exportacoes',
  limite(30),
  rota(async (req, res) => {
    const corpo = lerOuNegar(exportacaoSchema, req.body, res);
    if (!corpo) return;

    if (corpo.tipo === 'paciente') {
      const { rowCount } = await pool.query(
        "SELECT 1 FROM vinculo WHERE psicologo_id = $1 AND paciente_id = $2 AND status = 'ativo'",
        [res.locals.psicologoId, corpo.pacienteId],
      );
      if (!rowCount) return res.status(404).json({ error: PACIENTE_NAO_ENCONTRADO });
    }

    const numero = await registrarAuditoria(req, 'relatorio_exportado', {
      ...(corpo.tipo === 'paciente' && { pacienteId: corpo.pacienteId }),
      alvoTipo: 'relatorio',
      metadados: {
        tipo: corpo.tipo,
        de: corpo.de,
        ate: corpo.ate,
        ...(corpo.tipo === 'paciente' && { incluirAnotacoes: corpo.incluirAnotacoes }),
      },
    });
    return res.status(201).json({ numero });
  }),
);
