import { Router } from 'express';
import { DatabaseError } from 'pg';
import { z } from 'zod';
import { pool } from '../../db';
import { registrarAuditoria } from '../../lib/auditoria';
import { hmacCodigoVinculo } from '../../lib/codigo';
import { comContextoPaciente } from '../../lib/contextoseguro';
import { obterOuCriarPacienteId } from '../../lib/paciente';
import { limite, rota } from '../../lib/rota';

export const vinculo = Router();

const MSG_CODIGO_INVALIDO = 'Código inválido ou expirado.';
const MSG_JA_VINCULADO = 'Você já tem um psicólogo vinculado.';

const codigoSchema = z.object({ codigo: z.string().regex(/^\d{6}$/) });

async function vinculoAtivoDe(userId: number) {
  const { rows } = await pool.query<{ nome: string; crp: string; desde: Date }>(
    `SELECT u.nome, ps.crp, v.criado_em AT TIME ZONE 'UTC' AS desde
       FROM vinculo v
       JOIN paciente pa ON pa.id = v.paciente_id
       JOIN psicologo ps ON ps.id = v.psicologo_id
       JOIN users u ON u.id = ps.user_id
      WHERE pa.user_id = $1 AND v.status = 'ativo'`,
    [userId],
  );
  const l = rows[0];
  return l ? { psicologo: { nome: l.nome, crp: l.crp }, desde: l.desde } : null;
}

vinculo.get(
  '/',
  limite(60),
  rota(async (req, res) => res.json({ vinculo: await vinculoAtivoDe(req.user!.id) })),
);

// Mensagem igual para código inexistente, usado, expirado ou revogado: o paciente não
// descobre qual é qual. O limite é por usuário, não por IP, porque o celular troca de rede.
vinculo.post(
  '/',
  limite(5, (req) => String(req.user!.id)),
  rota(async (req, res) => {
    const parsed = codigoSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: MSG_CODIGO_INVALIDO });

    const userId = req.user!.id;
    const pacienteId = await obterOuCriarPacienteId(userId);

    let criado: { vinculoId: number; psicologoId: number } | null;
    try {
      criado = await comContextoPaciente(pacienteId, async (client) => {
        const ativo = await client.query(
          "SELECT 1 FROM vinculo WHERE paciente_id = $1 AND status = 'ativo'",
          [pacienteId],
        );
        if (ativo.rowCount) {
          res.status(409).json({ error: MSG_JA_VINCULADO });
          return null;
        }

        // Psicólogo não resgata o próprio código (conta com os dois perfis).
        const codigo = await client.query<{ id: number; psicologo_id: number }>(
          `SELECT c.id, c.psicologo_id
             FROM codigo_vinculo c
             JOIN psicologo ps ON ps.id = c.psicologo_id
            WHERE c.codigo_hmac = $1 AND c.usado_em IS NULL AND c.revogado_em IS NULL
              AND c.expira_em > now() AND ps.user_id <> $2
              FOR UPDATE OF c`,
          [hmacCodigoVinculo(parsed.data.codigo), userId],
        );
        if (!codigo.rows[0]) {
          res.status(400).json({ error: MSG_CODIGO_INVALIDO });
          return null;
        }
        const { id: codigoId, psicologo_id: psicologoId } = codigo.rows[0];

        const novo = await client.query<{ id: number }>(
          `INSERT INTO vinculo (paciente_id, psicologo_id, status) VALUES ($1, $2, 'ativo') RETURNING id`,
          [pacienteId, psicologoId],
        );
        // Quem já escolheu o que compartilhar mantém a escolha; o padrão só vale para quem nunca escolheu.
        await client.query(
          `INSERT INTO consentimento
             (paciente_id, compartilha_humor, compartilha_habitos, compartilha_escalas, compartilha_diario)
           VALUES ($1, true, true, true, false)
           ON CONFLICT (paciente_id) DO NOTHING`,
          [pacienteId],
        );
        await client.query(
          'UPDATE codigo_vinculo SET usado_em = now(), usado_por_paciente_id = $2 WHERE id = $1',
          [codigoId, pacienteId],
        );
        return { vinculoId: novo.rows[0].id, psicologoId };
      });
    } catch (erro) {
      // Dois resgates simultâneos do mesmo paciente: o índice único dos ativos barra o segundo.
      if (erro instanceof DatabaseError && erro.code === '23505') {
        return res.status(409).json({ error: MSG_JA_VINCULADO });
      }
      throw erro;
    }
    if (!criado) return;

    await registrarAuditoria(req, 'vinculo_criado', {
      ator: { id: userId, papel: 'paciente' },
      pacienteId,
      alvoTipo: 'vinculo',
      alvoId: criado.vinculoId,
      metadados: { psicologoId: criado.psicologoId },
    });
    return res.status(201).json({ vinculo: await vinculoAtivoDe(userId) });
  }),
);

vinculo.post(
  '/encerrar',
  limite(10),
  rota(async (req, res) => {
    const { rows } = await pool.query<{ id: number; paciente_id: number; psicologo_id: number }>(
      `UPDATE vinculo v
          SET status = 'encerrado', encerrado_em = now(), encerrado_por = $1
         FROM paciente pa
        WHERE pa.id = v.paciente_id AND pa.user_id = $1 AND v.status = 'ativo'
    RETURNING v.id, v.paciente_id, v.psicologo_id`,
      [req.user!.id],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Você não tem vínculo ativo.' });

    await registrarAuditoria(req, 'vinculo_encerrado', {
      ator: { id: req.user!.id, papel: 'paciente' },
      pacienteId: rows[0].paciente_id,
      alvoTipo: 'vinculo',
      alvoId: rows[0].id,
      metadados: { encerradoPor: 'paciente' },
    });
    return res.json({ ok: true });
  }),
);
