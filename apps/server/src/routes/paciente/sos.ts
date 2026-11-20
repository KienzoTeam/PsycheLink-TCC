import { Router } from 'express';
import { avisarPsicologoDoPaciente } from '../../lib/avisos';
import { comContextoPaciente } from '../../lib/contextoseguro';
import { obterPacienteId } from '../../lib/paciente';
import { limite, rota } from '../../lib/rota';

// Abrir o SOS (F9): só fica registrado com o consentimento "Uso do SOS" ligado e vínculo ativo.
// Uma linha a cada 10 minutos no máximo: trocar de aba várias vezes é um uso só.
export const sos = Router();

sos.post(
  '/',
  limite(60),
  rota(async (req, res) => {
    const pacienteId = await obterPacienteId(req.user!.id);
    if (pacienteId === null) return res.json({ registrado: false });
    const registrado = await comContextoPaciente(pacienteId, async (client) => {
      const { rowCount } = await client.query(
        `INSERT INTO sos_uso (paciente_id)
         SELECT $1
          WHERE EXISTS (SELECT 1 FROM consentimento WHERE paciente_id = $1 AND compartilha_sos)
            AND EXISTS (SELECT 1 FROM vinculo WHERE paciente_id = $1 AND status = 'ativo')
            AND NOT EXISTS (SELECT 1 FROM sos_uso WHERE paciente_id = $1 AND criado_em > now() - interval '10 minutes')`,
        [pacienteId],
      );
      return (rowCount ?? 0) > 0;
    });
    if (registrado) void avisarPsicologoDoPaciente(pacienteId, 'sos_usado');
    return res.json({ registrado });
  }),
);
