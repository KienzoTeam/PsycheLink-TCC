import { Router } from 'express';
import { z } from 'zod';
import { registrarAuditoria } from '../../lib/auditoria';
import { comContextoPaciente } from '../../lib/contextoseguro';
import { obterOuCriarPacienteId, obterPacienteId } from '../../lib/paciente';
import { lerOuNegar, limite, rota } from '../../lib/rota';

export const consentimento = Router();

const CATEGORIAS = ['humor', 'habitos', 'escalas', 'diario'] as const;

const consentimentoSchema = z.object({
  humor: z.boolean(),
  habitos: z.boolean(),
  escalas: z.boolean(),
  diario: z.boolean(),
});

type Consentimento = z.infer<typeof consentimentoSchema> & { atualizadoEm: Date | null };

const COLUNAS = `COALESCE(compartilha_humor, false)   AS humor,
                 COALESCE(compartilha_habitos, false) AS habitos,
                 COALESCE(compartilha_escalas, false) AS escalas,
                 COALESCE(compartilha_diario, false)  AS diario,
                 atualizado_em AT TIME ZONE 'UTC'     AS "atualizadoEm"`;

// Sem registro nada é compartilhado.
const NADA_COMPARTILHADO: Consentimento = {
  humor: false,
  habitos: false,
  escalas: false,
  diario: false,
  atualizadoEm: null,
};

consentimento.get(
  '/',
  limite(60),
  rota(async (req, res) => {
    const pacienteId = await obterPacienteId(req.user!.id);
    if (pacienteId === null) return res.json(NADA_COMPARTILHADO);

    const { rows } = await comContextoPaciente(pacienteId, (client) =>
      client.query<Consentimento>(`SELECT ${COLUNAS} FROM consentimento WHERE paciente_id = $1`, [
        pacienteId,
      ]),
    );
    return res.json(rows[0] ?? NADA_COMPARTILHADO);
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
           (paciente_id, compartilha_humor, compartilha_habitos, compartilha_escalas, compartilha_diario, atualizado_em)
         VALUES ($1, $2, $3, $4, $5, now())
         ON CONFLICT (paciente_id) DO UPDATE SET
           compartilha_humor = EXCLUDED.compartilha_humor,
           compartilha_habitos = EXCLUDED.compartilha_habitos,
           compartilha_escalas = EXCLUDED.compartilha_escalas,
           compartilha_diario = EXCLUDED.compartilha_diario,
           atualizado_em = now()
         RETURNING ${COLUNAS}`,
        [pacienteId, novo.humor, novo.habitos, novo.escalas, novo.diario],
      );
      return { antes: anterior.rows[0] ?? NADA_COMPARTILHADO, atual: gravado.rows[0] };
    });

    // Os metadados guardam só as categorias que mudaram e o novo valor, nunca o estado inteiro.
    const alterados = CATEGORIAS.filter((c) => novo[c] !== antes[c]);
    if (alterados.length > 0) {
      await registrarAuditoria(req, 'consentimento_alterado', {
        ator: { id: req.user!.id, papel: 'paciente' },
        pacienteId,
        alvoTipo: 'consentimento',
        metadados: Object.fromEntries(alterados.map((c) => [c, novo[c]])),
      });
    }
    return res.json(atual);
  }),
);
