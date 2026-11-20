import { Router } from 'express';
import { registrarAuditoria } from '../../lib/auditoria';
import { comContextoPaciente } from '../../lib/contextoseguro';
import { obterPacienteId } from '../../lib/paciente';
import { idDe, limite, rota } from '../../lib/rota';
import { recomendacaoDe } from '../psicologo/recomendacoes';

// O paciente vê as recomendações não canceladas e marca como feitas.
export const recomendacoes = Router();

recomendacoes.get(
  '/',
  limite(60),
  rota(async (req, res) => {
    const pacienteId = await obterPacienteId(req.user!.id);
    if (pacienteId === null) return res.json({ recomendacoes: [] });
    const { rows } = await comContextoPaciente(pacienteId, (client) =>
      client.query(
        `SELECT r.id, r.exercicio_id, r.conteudo_cifrado, r.criado_em, r.feito_em, r.cancelado_em
           FROM recomendacao r
          WHERE r.paciente_id = $1 AND r.cancelado_em IS NULL
          ORDER BY (r.feito_em IS NOT NULL), r.criado_em DESC LIMIT 50`,
        [pacienteId],
      ),
    );
    return res.json({ recomendacoes: rows.map(recomendacaoDe) });
  }),
);

recomendacoes.post(
  '/:id/feito',
  limite(60),
  rota<{ id: string }>(async (req, res) => {
    const id = idDe(req.params.id);
    const pacienteId = await obterPacienteId(req.user!.id);
    if (id === null || pacienteId === null) return res.status(404).json({ error: 'Recomendação não encontrada.' });
    const { rowCount } = await comContextoPaciente(pacienteId, (client) =>
      client.query(
        `UPDATE recomendacao SET feito_em = COALESCE(feito_em, now())
          WHERE id = $1 AND paciente_id = $2 AND cancelado_em IS NULL`,
        [id, pacienteId],
      ),
    );
    if (!rowCount) return res.status(404).json({ error: 'Recomendação não encontrada.' });
    await registrarAuditoria(req, 'recomendacao_feita', {
      ator: { id: req.user!.id, papel: 'paciente' },
      pacienteId,
      alvoTipo: 'recomendacao',
      alvoId: id,
    });
    return res.json({ ok: true });
  }),
);
