import { Router } from 'express';
import type { PoolClient } from 'pg';
import { z } from 'zod';
import { registrarAuditoria } from '../../lib/auditoria';
import { comContextoPaciente } from '../../lib/contextoseguro';
import { obterOuCriarPacienteId, obterPacienteId } from '../../lib/paciente';
import { lerOuNegar, limite, rota } from '../../lib/rota';

export const consentimento = Router();

const CATEGORIAS = ['humor', 'habitos', 'escalas', 'diario', 'sos'] as const;

const consentimentoSchema = z.object({
  humor: z.boolean(),
  habitos: z.boolean(),
  escalas: z.boolean(),
  diario: z.boolean(),
  // Opcional: versões antigas do app não mandam; sem o campo, fica como estava.
  sos: z.boolean().optional(),
});

// `diario` é o valor inicial do interruptor "Compartilhar este texto" no check-in; quem libera
// cada texto é a marcação daquele check-in. `diarioCompartilhados` conta os textos liberados.
type Consentimento = Omit<z.infer<typeof consentimentoSchema>, 'sos'> & { sos: boolean; atualizadoEm: Date | null };

const contarCompartilhados = async (client: PoolClient, pacienteId: number) =>
  (
    await client.query<{ n: number }>(
      `SELECT (SELECT count(*)::int FROM checkin_diario
                WHERE paciente_id = $1 AND diario_compartilhado AND diario_livre IS NOT NULL)
            + (SELECT count(*)::int FROM diario_entrada WHERE paciente_id = $1 AND compartilhado) AS n`,
      [pacienteId],
    )
  ).rows[0].n;

const COLUNAS = `COALESCE(compartilha_humor, false)   AS humor,
                 COALESCE(compartilha_habitos, false) AS habitos,
                 COALESCE(compartilha_escalas, false) AS escalas,
                 COALESCE(compartilha_diario, false)  AS diario,
                 compartilha_sos                      AS sos,
                 atualizado_em AT TIME ZONE 'UTC'     AS "atualizadoEm"`;

// Sem registro nada é compartilhado.
const NADA_COMPARTILHADO: Consentimento = {
  humor: false,
  habitos: false,
  escalas: false,
  diario: false,
  sos: false,
  atualizadoEm: null,
};

consentimento.get(
  '/',
  limite(60),
  rota(async (req, res) => {
    const pacienteId = await obterPacienteId(req.user!.id);
    if (pacienteId === null) return res.json({ ...NADA_COMPARTILHADO, diarioCompartilhados: 0 });

    const resposta = await comContextoPaciente(pacienteId, async (client) => {
      const { rows } = await client.query<Consentimento>(
        `SELECT ${COLUNAS} FROM consentimento WHERE paciente_id = $1`,
        [pacienteId],
      );
      return {
        ...(rows[0] ?? NADA_COMPARTILHADO),
        diarioCompartilhados: await contarCompartilhados(client, pacienteId),
      };
    });
    return res.json(resposta);
  }),
);

consentimento.put(
  '/',
  limite(30),
  rota(async (req, res) => {
    const novo = lerOuNegar(consentimentoSchema, req.body, res);
    if (!novo) return;

    const pacienteId = await obterOuCriarPacienteId(req.user!.id);
    const { antes, atual } = await comContextoPaciente(pacienteId, async (client) => {
      const anterior = await client.query<Consentimento>(
        `SELECT ${COLUNAS} FROM consentimento WHERE paciente_id = $1 FOR UPDATE`,
        [pacienteId],
      );
      const gravado = await client.query<Consentimento>(
        `INSERT INTO consentimento
           (paciente_id, compartilha_humor, compartilha_habitos, compartilha_escalas, compartilha_diario,
            compartilha_sos, atualizado_em)
         VALUES ($1, $2, $3, $4, $5, COALESCE($6, false), now())
         ON CONFLICT (paciente_id) DO UPDATE SET
           compartilha_humor = EXCLUDED.compartilha_humor,
           compartilha_habitos = EXCLUDED.compartilha_habitos,
           compartilha_escalas = EXCLUDED.compartilha_escalas,
           compartilha_diario = EXCLUDED.compartilha_diario,
           compartilha_sos = COALESCE($6, consentimento.compartilha_sos),
           atualizado_em = now()
         RETURNING ${COLUNAS}`,
        [pacienteId, novo.humor, novo.habitos, novo.escalas, novo.diario, novo.sos ?? null],
      );
      return {
        antes: anterior.rows[0] ?? NADA_COMPARTILHADO,
        atual: { ...gravado.rows[0], diarioCompartilhados: await contarCompartilhados(client, pacienteId) },
      };
    });

    // Os metadados guardam só as categorias que mudaram e o novo valor, nunca o estado inteiro.
    const alterados = CATEGORIAS.filter((c) => atual[c] !== antes[c]);
    if (alterados.length > 0) {
      await registrarAuditoria(req, 'consentimento_alterado', {
        ator: { id: req.user!.id, papel: 'paciente' },
        pacienteId,
        alvoTipo: 'consentimento',
        metadados: Object.fromEntries(alterados.map((c) => [c, atual[c]])),
      });
    }
    return res.json(atual);
  }),
);

// Revogação imediata do diário: desmarca todos os textos que o paciente liberou.
consentimento.post(
  '/diario/parar',
  limite(30),
  rota(async (req, res) => {
    const pacienteId = await obterPacienteId(req.user!.id);
    if (pacienteId === null) return res.json({ revogados: 0 });

    const revogados = await comContextoPaciente(pacienteId, async (client) => {
      const checkins = await client.query(
        `UPDATE checkin_diario SET diario_compartilhado = false
          WHERE paciente_id = $1 AND diario_compartilhado`,
        [pacienteId],
      );
      const entradas = await client.query(
        'UPDATE diario_entrada SET compartilhado = false WHERE paciente_id = $1 AND compartilhado',
        [pacienteId],
      );
      return (checkins.rowCount ?? 0) + (entradas.rowCount ?? 0);
    });

    if (revogados > 0) {
      await registrarAuditoria(req, 'diario_compartilhamento_revogado', {
        ator: { id: req.user!.id, papel: 'paciente' },
        pacienteId,
        alvoTipo: 'checkin_diario',
        metadados: { quantidade: revogados },
      });
    }
    return res.json({ revogados });
  }),
);
