import { Router } from 'express';
import { DatabaseError } from 'pg';
import { z } from 'zod';
import { pool } from '../../db';
import { registrarAuditoria } from '../../lib/auditoria';
import { lerSeguro } from '../../lib/checkins';
import { comContextoPsicologo } from '../../lib/contextoseguro';
import { codificarCursor, cursorDe } from '../../lib/cursor';
import {
  aplicacaoJson,
  aplicacoesDoPaciente,
  COLUNAS_APLICACAO,
  type LinhaAplicacao,
  type Opcao,
  type Subescalas,
} from '../../lib/escalas';
import { avisarPaciente } from '../../lib/pushPaciente';
import { idDe, lerOuNegar, limite, rota } from '../../lib/rota';
import { consentimentosDe, vinculoAtivoDe, vinculoOuNegar } from '../../lib/vinculo';

export const escalas = Router();

const MSG_SEM_CONSENTIMENTO = 'O paciente não compartilha escalas.';
const MSG_NAO_ENCONTRADA = 'Aplicação não encontrada.';

const solicitarSchema = z.object({ escalaId: z.number().int().positive() });

const listaSchema = z.object({
  status: z.enum(['pendente', 'em_andamento', 'concluida', 'cancelada']).optional(),
  cursor: cursorDe(z.tuple([z.number().int()])).optional(),
  limite: z.coerce.number().int().min(1).max(100).default(30),
});

// Catálogo: sem os itens, que só saem na aplicação.
escalas.get(
  '/escalas',
  limite(60),
  rota(async (_req, res) => {
    const { rows } = await pool.query(
      `SELECT id, sigla, nome,
              total_questoes AS "totalQuestoes",
              pontuacao_maxima AS "pontuacaoMaxima",
              subescalas,
              validacao_ref AS "validacaoRef"
         FROM escala
        WHERE ativa
        ORDER BY id`,
    );
    return res.json({ escalas: rows });
  }),
);

// Uma aberta por escala e paciente: o índice único barra a segunda, mesmo em pedidos simultâneos.
escalas.post(
  '/pacientes/:pacienteId/escalas',
  limite(30),
  rota<{ pacienteId: string }>(async (req, res) => {
    const corpo = lerOuNegar(solicitarSchema, req.body, res);
    if (!corpo) return;

    let criada: LinhaAplicacao | null;
    try {
      criada = await comContextoPsicologo(res.locals.psicologoId, async (client) => {
        const vinculo = await vinculoOuNegar(client, req, res, true);
        if (!vinculo) return null;
        if (!vinculo.compartilha_escalas) {
          res.status(403).json({ error: MSG_SEM_CONSENTIMENTO });
          return null;
        }

        const { rows } = await client.query<LinhaAplicacao>(
          `WITH a AS (
             INSERT INTO aplicacao_escala (paciente_id, psicologo_id, escala_id)
             SELECT $1, $2, e.id FROM escala e WHERE e.id = $3 AND e.ativa
             RETURNING *)
           SELECT ${COLUNAS_APLICACAO} FROM a JOIN escala e ON e.id = a.escala_id`,
          [vinculo.paciente_id, res.locals.psicologoId, corpo.escalaId],
        );
        if (!rows[0]) {
          res.status(404).json({ error: 'Escala não encontrada.' });
          return null;
        }
        return rows[0];
      });
    } catch (erro) {
      if (erro instanceof DatabaseError && erro.code === '23505') {
        return res
          .status(409)
          .json({ error: 'Já existe uma aplicação desta escala em aberto para o paciente.' });
      }
      throw erro;
    }
    if (!criada) return;

    await registrarAuditoria(req, 'escala_solicitada', {
      pacienteId: Number(req.params.pacienteId),
      alvoTipo: 'aplicacao_escala',
      alvoId: criada.id,
      metadados: { sigla: criada.sigla },
    });
    void avisarPaciente(Number(req.params.pacienteId), 'escala');
    return res.status(201).json({ aplicacao: aplicacaoJson(criada) });
  }),
);

escalas.post(
  '/aplicacoes/:id/cancelar',
  limite(30),
  rota<{ id: string }>(async (req, res) => {
    const id = idDe(req.params.id);
    if (id === null) return res.status(404).json({ error: MSG_NAO_ENCONTRADA });

    const { rows } = await comContextoPsicologo(res.locals.psicologoId, (client) =>
      client.query<{ paciente_id: number; sigla: string }>(
        `WITH a AS (
           UPDATE aplicacao_escala SET status = 'cancelada', cancelado_em = now()
            WHERE id = $1 AND psicologo_id = $2 AND status IN ('pendente', 'em_andamento')
              AND ${vinculoAtivoDe('aplicacao_escala')}
        RETURNING paciente_id, escala_id)
         SELECT a.paciente_id, e.sigla FROM a JOIN escala e ON e.id = a.escala_id`,
        [id, res.locals.psicologoId],
      ),
    );
    if (!rows[0])
      return res.status(404).json({ error: 'Aplicação não encontrada ou já encerrada.' });

    await registrarAuditoria(req, 'escala_cancelada', {
      pacienteId: rows[0].paciente_id,
      alvoTipo: 'aplicacao_escala',
      alvoId: id,
      metadados: { sigla: rows[0].sigla },
    });
    return res.json({ ok: true });
  }),
);

// Sem consentimento de escalas a lista vem vazia e `consentimentos.escalas` diz o motivo.
escalas.get(
  '/pacientes/:pacienteId/escalas',
  limite(60),
  rota<{ pacienteId: string }>(async (req, res) => {
    const dados = await comContextoPsicologo(res.locals.psicologoId, async (client) => {
      const vinculo = await vinculoOuNegar(client, req, res);
      if (!vinculo) return null;
      const consentimentos = consentimentosDe(vinculo);
      const linhas = consentimentos.escalas
        ? await aplicacoesDoPaciente(client, res.locals.psicologoId, vinculo.paciente_id)
        : [];
      return { consentimentos, linhas };
    });
    if (!dados) return;

    return res.json({
      aplicacoes: dados.linhas.map(aplicacaoJson),
      consentimentos: dados.consentimentos,
    });
  }),
);

type LinhaDaLista = LinhaAplicacao & { paciente_id: number; paciente_nome: string };

// Só pacientes vinculados que compartilham escalas.
escalas.get(
  '/aplicacoes',
  limite(60),
  rota(async (req, res) => {
    const q = lerOuNegar(listaSchema, req.query, res);
    if (!q) return;

    const { rows } = await comContextoPsicologo(res.locals.psicologoId, (client) =>
      client.query<LinhaDaLista>(
        `SELECT ${COLUNAS_APLICACAO}, a.paciente_id, u.nome AS paciente_nome
           FROM aplicacao_escala a
           JOIN escala e ON e.id = a.escala_id
           JOIN consentimento co ON co.paciente_id = a.paciente_id AND co.compartilha_escalas
           JOIN paciente p ON p.id = a.paciente_id
           JOIN users u ON u.id = p.user_id
          WHERE a.psicologo_id = $1 AND ${vinculoAtivoDe('a')}
            AND ($2::text IS NULL OR a.status = $2)
            AND ($3::int IS NULL OR a.id < $3)
          ORDER BY a.id DESC
          LIMIT $4`,
        [res.locals.psicologoId, q.status ?? null, q.cursor?.[0] ?? null, q.limite + 1],
      ),
    );

    const pagina = rows.slice(0, q.limite);
    const ultima = pagina.at(-1);
    return res.json({
      aplicacoes: pagina.map((l) => ({
        ...aplicacaoJson(l),
        pacienteId: l.paciente_id,
        pacienteNome: l.paciente_nome,
      })),
      proximoCursor: rows.length > q.limite && ultima ? codificarCursor([ultima.id]) : null,
    });
  }),
);

type LinhaDetalhe = LinhaDaLista & {
  iniciado_em: Date | null;
  respostas_cifradas: string | null;
  instrucao: string;
  itens: string[];
  opcoes: Opcao[];
  subescalas: Subescalas | null;
  compartilha_escalas: boolean | null;
};

// As respostas por item só saem depois de concluída.
escalas.get(
  '/aplicacoes/:id',
  limite(60),
  rota<{ id: string }>(async (req, res) => {
    const id = idDe(req.params.id);
    if (id === null) return res.status(404).json({ error: MSG_NAO_ENCONTRADA });

    const { rows } = await comContextoPsicologo(res.locals.psicologoId, (client) =>
      client.query<LinhaDetalhe>(
        `SELECT ${COLUNAS_APLICACAO}, a.paciente_id, u.nome AS paciente_nome, a.iniciado_em,
                a.respostas_cifradas, e.instrucao, e.itens, e.opcoes, e.subescalas,
                co.compartilha_escalas
           FROM aplicacao_escala a
           JOIN escala e ON e.id = a.escala_id
           JOIN paciente p ON p.id = a.paciente_id
           JOIN users u ON u.id = p.user_id
           LEFT JOIN consentimento co ON co.paciente_id = a.paciente_id
          WHERE a.id = $1 AND a.psicologo_id = $2 AND ${vinculoAtivoDe('a')}`,
        [id, res.locals.psicologoId],
      ),
    );
    const l = rows[0];
    if (!l) return res.status(404).json({ error: MSG_NAO_ENCONTRADA });
    if (!l.compartilha_escalas) return res.status(403).json({ error: MSG_SEM_CONSENTIMENTO });

    const texto = l.status === 'concluida' ? lerSeguro(l.respostas_cifradas) : null;
    const respostas = texto === null ? null : (JSON.parse(texto) as number[]);

    await registrarAuditoria(req, 'escala_visualizada', {
      pacienteId: l.paciente_id,
      alvoTipo: 'aplicacao_escala',
      alvoId: l.id,
      metadados: { sigla: l.sigla },
    });
    return res.json({
      aplicacao: {
        ...aplicacaoJson(l),
        pacienteId: l.paciente_id,
        pacienteNome: l.paciente_nome,
        iniciadoEm: l.iniciado_em,
        instrucao: l.instrucao,
        subescalas: l.subescalas,
        opcoes: l.opcoes,
        itens: l.itens.map((enunciado, i) => {
          const valor = respostas?.[i] ?? null;
          return {
            numero: i + 1,
            enunciado,
            resposta: valor,
            rotuloResposta: l.opcoes.find((o) => o.valor === valor)?.rotulo ?? null,
          };
        }),
      },
    });
  }),
);
