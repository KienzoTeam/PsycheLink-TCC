import { Router } from 'express';
import { z } from 'zod';
import { lerSeguro } from '../../lib/checkins';
import { comContextoPaciente } from '../../lib/contextoseguro';
import { criptografar } from '../../lib/criptografia';
import { obterOuCriarPacienteId, obterPacienteId } from '../../lib/paciente';
import { idDe, lerOuNegar, limite, rota } from '../../lib/rota';

// Diário fora do check-in (F8): várias entradas por dia, cada uma compartilhada ou não.
export const diario = Router();

const NAO_ENCONTRADA = 'Entrada não encontrada.';
const novaSchema = z.object({ texto: z.string().trim().min(1).max(5000), compartilhado: z.boolean() });
const compartilharSchema = z.object({ compartilhado: z.boolean() });

type Linha = { id: string; texto: string; compartilhado: boolean; criado_em: Date };
const saida = (l: Linha) => ({ id: Number(l.id), texto: lerSeguro(l.texto), compartilhado: l.compartilhado, criadoEm: l.criado_em });

diario.get(
  '/',
  limite(60),
  rota(async (req, res) => {
    const pacienteId = await obterPacienteId(req.user!.id);
    if (pacienteId === null) return res.json({ entradas: [] });
    const { rows } = await comContextoPaciente(pacienteId, (client) =>
      client.query<Linha>(
        `SELECT id, texto, compartilhado, criado_em FROM diario_entrada
          WHERE paciente_id = $1 ORDER BY criado_em DESC LIMIT 200`,
        [pacienteId],
      ),
    );
    return res.json({ entradas: rows.map(saida) });
  }),
);

diario.post(
  '/',
  limite(30),
  rota(async (req, res) => {
    const corpo = lerOuNegar(novaSchema, req.body, res);
    if (!corpo) return;
    const pacienteId = await obterOuCriarPacienteId(req.user!.id);
    const { rows } = await comContextoPaciente(pacienteId, (client) =>
      client.query<Linha>(
        `INSERT INTO diario_entrada (paciente_id, texto, compartilhado) VALUES ($1, $2, $3)
         RETURNING id, texto, compartilhado, criado_em`,
        [pacienteId, criptografar(corpo.texto), corpo.compartilhado],
      ),
    );
    return res.status(201).json({ entrada: saida(rows[0]) });
  }),
);

diario.patch(
  '/:id',
  limite(60),
  rota<{ id: string }>(async (req, res) => {
    const id = idDe(req.params.id);
    const corpo = lerOuNegar(compartilharSchema, req.body, res);
    if (!corpo) return;
    const pacienteId = await obterPacienteId(req.user!.id);
    if (id === null || pacienteId === null) return res.status(404).json({ error: NAO_ENCONTRADA });
    const { rows } = await comContextoPaciente(pacienteId, (client) =>
      client.query<Linha>(
        `UPDATE diario_entrada SET compartilhado = $3 WHERE id = $1 AND paciente_id = $2
         RETURNING id, texto, compartilhado, criado_em`,
        [id, pacienteId, corpo.compartilhado],
      ),
    );
    if (!rows[0]) return res.status(404).json({ error: NAO_ENCONTRADA });
    return res.json({ entrada: saida(rows[0]) });
  }),
);

diario.delete(
  '/:id',
  limite(30),
  rota<{ id: string }>(async (req, res) => {
    const id = idDe(req.params.id);
    const pacienteId = await obterPacienteId(req.user!.id);
    if (id === null || pacienteId === null) return res.status(404).json({ error: NAO_ENCONTRADA });
    const { rowCount } = await comContextoPaciente(pacienteId, (client) =>
      client.query('DELETE FROM diario_entrada WHERE id = $1 AND paciente_id = $2', [id, pacienteId]),
    );
    if (!rowCount) return res.status(404).json({ error: NAO_ENCONTRADA });
    return res.status(204).end();
  }),
);
