import { Router } from 'express';
import { comContextoPaciente } from '../../lib/contextoseguro';
import { obterPacienteId } from '../../lib/paciente';
import { limite, rota } from '../../lib/rota';

export const consultas = Router();

// Sem `observacao`: é texto do psicólogo e nunca sai para o paciente. A original de uma
// remarcação fica de fora; vale a nova.
const CONSULTAS = `
  SELECT c.id, c.inicio, c.fim, c.status, json_build_object('nome', u.nome) AS psicologo
    FROM consulta c
    JOIN psicologo ps ON ps.id = c.psicologo_id
    JOIN users u ON u.id = ps.user_id
   WHERE c.paciente_id = $1 AND c.status <> 'remarcada'`;

consultas.get(
  '/',
  limite(60),
  rota(async (req, res) => {
    const pacienteId = await obterPacienteId(req.user!.id);
    if (pacienteId === null) return res.json({ proximas: [], passadas: [] });

    const dados = await comContextoPaciente(pacienteId, async (client) => ({
      proximas: (
        await client.query(`${CONSULTAS} AND c.fim > now() ORDER BY c.inicio LIMIT 50`, [
          pacienteId,
        ])
      ).rows,
      passadas: (
        await client.query(`${CONSULTAS} AND c.fim <= now() ORDER BY c.inicio DESC LIMIT 10`, [
          pacienteId,
        ])
      ).rows,
    }));
    return res.json(dados);
  }),
);
