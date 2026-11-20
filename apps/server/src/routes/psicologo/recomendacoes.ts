import { Router } from 'express';
import { z } from 'zod';
import { registrarAuditoria } from '../../lib/auditoria';
import { lerSeguro } from '../../lib/checkins';
import { comContextoPsicologo } from '../../lib/contextoseguro';
import { criptografar } from '../../lib/criptografia';
import { EXERCICIOS, tituloDoExercicio } from '../../lib/exercicios';
import { idDe, lerOuNegar, limite, rota } from '../../lib/rota';
import { vinculoOuNegar } from '../../lib/vinculo';

// Recomendações de exercício (F15), montadas em /psicologo/pacientes/:pacienteId/recomendacoes.
export const recomendacoes = Router({ mergeParams: true });
export const exercicios = Router();

const IDS = EXERCICIOS.map((e) => e.id) as [string, ...string[]];
const novaSchema = z
  .object({
    exercicioId: z.enum(IDS).optional(),
    titulo: z.string().trim().min(2).max(120).optional(),
    descricao: z.string().trim().max(2000).optional(),
    nota: z.string().trim().max(1000).optional(),
  })
  .refine((r) => r.exercicioId !== undefined || r.titulo !== undefined, 'Escolha um exercício ou escreva um título.');

type Conteudo = { titulo: string; descricao: string | null; nota: string | null };
type Linha = { id: string; exercicio_id: string | null; conteudo_cifrado: string; criado_em: Date; feito_em: Date | null; cancelado_em: Date | null };

/** Linha do banco para o JSON da API (paciente e psicólogo veem o mesmo formato). */
export function recomendacaoDe(l: Linha) {
  const texto = lerSeguro(l.conteudo_cifrado);
  const c: Conteudo = texto ? JSON.parse(texto) : { titulo: tituloDoExercicio(l.exercicio_id ?? '') ?? 'Recomendação', descricao: null, nota: null };
  return {
    id: Number(l.id),
    exercicioId: l.exercicio_id,
    ...c,
    criadoEm: l.criado_em,
    feitoEm: l.feito_em,
    canceladoEm: l.cancelado_em,
  };
}

exercicios.get(
  '/',
  limite(60),
  rota(async (_req, res) => res.json({ exercicios: EXERCICIOS })),
);

recomendacoes.get(
  '/',
  limite(60),
  rota<{ pacienteId: string }>(async (req, res) => {
    const linhas = await comContextoPsicologo(res.locals.psicologoId, async (client) => {
      const vinculo = await vinculoOuNegar(client, req, res);
      if (!vinculo) return null;
      return (
        await client.query<Linha>(
          `SELECT id, exercicio_id, conteudo_cifrado, criado_em, feito_em, cancelado_em FROM recomendacao
            WHERE paciente_id = $1 AND psicologo_id = $2 ORDER BY criado_em DESC LIMIT 100`,
          [vinculo.paciente_id, res.locals.psicologoId],
        )
      ).rows;
    });
    if (!linhas) return;
    return res.json({ recomendacoes: linhas.map(recomendacaoDe) });
  }),
);

recomendacoes.post(
  '/',
  limite(30),
  rota<{ pacienteId: string }>(async (req, res) => {
    const corpo = lerOuNegar(novaSchema, req.body, res);
    if (!corpo) return;
    const conteudo: Conteudo = {
      titulo: corpo.titulo ?? tituloDoExercicio(corpo.exercicioId!)!,
      descricao: corpo.descricao || null,
      nota: corpo.nota || null,
    };
    const criada = await comContextoPsicologo(res.locals.psicologoId, async (client) => {
      const vinculo = await vinculoOuNegar(client, req, res);
      if (!vinculo) return null;
      const { rows } = await client.query<Linha & { paciente_id: number }>(
        `INSERT INTO recomendacao (paciente_id, psicologo_id, exercicio_id, conteudo_cifrado)
         VALUES ($1, $2, $3, $4)
         RETURNING id, paciente_id, exercicio_id, conteudo_cifrado, criado_em, feito_em, cancelado_em`,
        [vinculo.paciente_id, res.locals.psicologoId, corpo.exercicioId ?? null, criptografar(JSON.stringify(conteudo))],
      );
      return rows[0];
    });
    if (!criada) return;
    await registrarAuditoria(req, 'recomendacao_criada', {
      pacienteId: criada.paciente_id,
      alvoTipo: 'recomendacao',
      alvoId: criada.id,
      metadados: { catalogo: criada.exercicio_id !== null },
    });
    return res.status(201).json({ recomendacao: recomendacaoDe(criada) });
  }),
);

recomendacoes.delete(
  '/:id',
  limite(30),
  rota<{ pacienteId: string; id: string }>(async (req, res) => {
    const id = idDe(req.params.id);
    const cancelada = await comContextoPsicologo(res.locals.psicologoId, async (client) => {
      const vinculo = await vinculoOuNegar(client, req, res);
      if (!vinculo) return null;
      const { rows } = await client.query<{ id: string }>(
        `UPDATE recomendacao SET cancelado_em = now()
          WHERE id = $1 AND paciente_id = $2 AND psicologo_id = $3 AND cancelado_em IS NULL AND feito_em IS NULL
      RETURNING id`,
        [id, vinculo.paciente_id, res.locals.psicologoId],
      );
      return { vinculo, ok: rows.length > 0 };
    });
    if (!cancelada) return;
    if (!cancelada.ok) return res.status(404).json({ error: 'Recomendação não encontrada ou já concluída.' });
    await registrarAuditoria(req, 'recomendacao_cancelada', {
      pacienteId: cancelada.vinculo.paciente_id,
      alvoTipo: 'recomendacao',
      alvoId: id!,
    });
    return res.json({ ok: true });
  }),
);
