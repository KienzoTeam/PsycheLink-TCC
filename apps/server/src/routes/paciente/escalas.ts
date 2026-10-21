import { Router } from 'express';
import { z } from 'zod';
import { registrarAuditoria } from '../../lib/auditoria';
import { comContextoPaciente } from '../../lib/contextoseguro';
import { criptografar } from '../../lib/criptografia';
import { type Opcao, pontuar, type Subescalas } from '../../lib/escalas';
import { obterPacienteId } from '../../lib/paciente';
import { idDe, lerOuNegar, limite, rota } from '../../lib/rota';

export const escalas = Router();

const MSG_NAO_ENCONTRADA = 'Escala não encontrada ou já encerrada.';

const respostasSchema = z.object({ respostas: z.array(z.number().int()).max(50) });

escalas.get(
  '/escalas/pendentes',
  limite(60),
  rota(async (req, res) => {
    const pacienteId = await obterPacienteId(req.user!.id);
    if (pacienteId === null) return res.json([]);

    const { rows } = await comContextoPaciente(pacienteId, (client) =>
      client.query(
        `SELECT a.id AS "aplicacaoId", e.sigla, e.nome, a.solicitado_em AS "solicitadoEm",
                json_build_object('nome', u.nome) AS psicologo
           FROM aplicacao_escala a
           JOIN escala e ON e.id = a.escala_id
           JOIN psicologo ps ON ps.id = a.psicologo_id
           JOIN users u ON u.id = ps.user_id
          WHERE a.paciente_id = $1 AND a.status IN ('pendente', 'em_andamento')
          ORDER BY a.id`,
        [pacienteId],
      ),
    );
    return res.json(rows);
  }),
);

// A primeira abertura marca a aplicação como em andamento; as seguintes só repetem o conteúdo.
escalas.get(
  '/aplicacoes/:id',
  limite(60),
  rota<{ id: string }>(async (req, res) => {
    const id = idDe(req.params.id);
    const pacienteId = await obterPacienteId(req.user!.id);
    if (id === null || pacienteId === null)
      return res.status(404).json({ error: MSG_NAO_ENCONTRADA });

    const { rows } = await comContextoPaciente(pacienteId, (client) =>
      client.query(
        `WITH a AS (
           UPDATE aplicacao_escala
              SET status = 'em_andamento', iniciado_em = COALESCE(iniciado_em, now())
            WHERE id = $1 AND paciente_id = $2 AND status IN ('pendente', 'em_andamento')
        RETURNING id, escala_id)
         SELECT a.id AS "aplicacaoId", e.sigla, e.nome, e.instrucao, e.itens, e.opcoes
           FROM a JOIN escala e ON e.id = a.escala_id`,
        [id, pacienteId],
      ),
    );
    if (!rows[0]) return res.status(404).json({ error: MSG_NAO_ENCONTRADA });
    return res.json(rows[0]);
  }),
);

type EscalaDaAplicacao = {
  sigla: string;
  itens: string[];
  opcoes: Opcao[];
  subescalas: Subescalas | null;
};

// O score sai em claro (precisa para séries); as respostas por item vão cifradas num único JSON.
// A resposta devolve só números, sem rótulo de severidade.
escalas.post(
  '/aplicacoes/:id/respostas',
  limite(30),
  rota<{ id: string }>(async (req, res) => {
    const corpo = lerOuNegar(respostasSchema, req.body, res);
    if (!corpo) return;
    const id = idDe(req.params.id);
    const pacienteId = await obterPacienteId(req.user!.id);
    if (id === null || pacienteId === null)
      return res.status(404).json({ error: MSG_NAO_ENCONTRADA });

    const resultado = await comContextoPaciente(pacienteId, async (client) => {
      const { rows } = await client.query<EscalaDaAplicacao>(
        `SELECT e.sigla, e.itens, e.opcoes, e.subescalas
           FROM aplicacao_escala a
           JOIN escala e ON e.id = a.escala_id
          WHERE a.id = $1 AND a.paciente_id = $2 AND a.status IN ('pendente', 'em_andamento')
            FOR UPDATE OF a`,
        [id, pacienteId],
      );
      const escala = rows[0];
      if (!escala) {
        res.status(404).json({ error: MSG_NAO_ENCONTRADA });
        return null;
      }

      const valores = new Set(escala.opcoes.map((o) => o.valor));
      if (
        corpo.respostas.length !== escala.itens.length ||
        !corpo.respostas.every((v) => valores.has(v))
      ) {
        res.status(400).json({ error: 'Respostas inválidas.' });
        return null;
      }

      const pontos = pontuar(corpo.respostas, escala.subescalas);
      await client.query(
        `UPDATE aplicacao_escala
            SET status = 'concluida', respondido_em = now(), iniciado_em = COALESCE(iniciado_em, now()),
                score_total = $2, subscores = $3, respostas_cifradas = $4, item9_diferente_de_zero = $5
          WHERE id = $1`,
        [
          id,
          pontos.scoreTotal,
          pontos.subscores,
          criptografar(JSON.stringify(corpo.respostas)),
          escala.sigla === 'PHQ-9' ? corpo.respostas[8] !== 0 : null,
        ],
      );
      return { sigla: escala.sigla, ...pontos };
    });
    if (!resultado) return;

    await registrarAuditoria(req, 'escala_respondida', {
      ator: { id: req.user!.id, papel: 'paciente' },
      pacienteId,
      alvoTipo: 'aplicacao_escala',
      alvoId: id,
      metadados: { sigla: resultado.sigla },
    });
    return res.json({ scoreTotal: resultado.scoreTotal, subscores: resultado.subscores });
  }),
);
