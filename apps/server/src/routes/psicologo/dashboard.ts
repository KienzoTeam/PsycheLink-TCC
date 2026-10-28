import { Router } from 'express';
import { z } from 'zod';
import { CHECKIN_EM, emocoesDe } from '../../lib/checkins';
import { comContextoPsicologo } from '../../lib/contextoseguro';
import { lerOuNegar, limite, rota } from '../../lib/rota';
import { vinculoAtivoDe } from '../../lib/vinculo';

export const dashboard = Router();

const MIN_REGISTROS_SEMANA = 3;

const dashboardSchema = z.object({
  periodo: z.enum(['7', '30', '90']).default('30').transform(Number),
});

type LinhaPaciente = { pacienteId: number; nome: string; humor: boolean; registros7d: number };
type LinhaCheckin = { pacienteId: number; nome: string; em: Date; emocao_predominante: string | null };
type LinhaAtividade = { pacienteId: number; nome: string; acao: string; em: Date };
type LinhaMedias = { n: number; humor: number | null; ansiedade: number | null; sono: number | null };
type LinhaConsultaHoje = {
  id: number;
  pacienteId: number;
  nome: string;
  inicio: Date;
  fim: Date;
  status: string;
};
type LinhaEscalaRespondida = {
  aplicacaoId: number;
  pacienteId: number;
  nome: string;
  sigla: string;
  respondidoEm: Date;
  scoreTotal: number;
  item9DiferenteDeZero: boolean | null;
};

// Check-ins dos pacientes vinculados a este psicólogo ($1) que compartilham humor.
const CHECKINS_COM_HUMOR = `
  FROM checkin_diario c
  JOIN vinculo v ON v.paciente_id = c.paciente_id AND v.psicologo_id = $1 AND v.status = 'ativo'
  JOIN consentimento co ON co.paciente_id = c.paciente_id AND co.compartilha_humor
  JOIN paciente p ON p.id = c.paciente_id
  JOIN users u ON u.id = p.user_id`;

// Aplicações deste psicólogo ($1) cujo paciente compartilha escalas.
const ESCALAS_COMPARTILHADAS = `
  FROM aplicacao_escala a
  JOIN escala e ON e.id = a.escala_id
  JOIN consentimento co ON co.paciente_id = a.paciente_id AND co.compartilha_escalas
  JOIN paciente p ON p.id = a.paciente_id
  JOIN users u ON u.id = p.user_id
 WHERE a.psicologo_id = $1 AND ${vinculoAtivoDe('a')}`;

// O período vale para a série de vínculos e para as médias. Check-ins recentes, atividade e
// dados insuficientes olham sempre para os registros mais novos, qualquer que seja o período.
dashboard.get(
  '/',
  limite(60),
  rota(async (req, res) => {
    const q = lerOuNegar(dashboardSchema, req.query, res);
    if (!q) return;

    const dados = await comContextoPsicologo(res.locals.psicologoId, async (client) => {
      const id = res.locals.psicologoId;

      const pacientes = await client.query<LinhaPaciente>(
        `SELECT v.paciente_id AS "pacienteId", u.nome,
                COALESCE(co.compartilha_humor, false) AS humor,
                (SELECT count(*)::int FROM checkin_diario c
                  WHERE c.paciente_id = v.paciente_id AND c.data >= CURRENT_DATE - 6) AS "registros7d"
           FROM vinculo v
           JOIN paciente p ON p.id = v.paciente_id
           JOIN users u ON u.id = p.user_id
           LEFT JOIN consentimento co ON co.paciente_id = v.paciente_id
          WHERE v.psicologo_id = $1 AND v.status = 'ativo'
          ORDER BY u.nome`,
        [id],
      );

      // Vínculos ativos ao fim de cada dia (fuso de São Paulo), do mais antigo ao de hoje.
      const serie = await client.query<{ data: string; total: number }>(
        `SELECT to_char(d, 'YYYY-MM-DD') AS data,
                (SELECT count(*)::int FROM vinculo v
                  WHERE v.psicologo_id = $1
                    AND ((v.criado_em AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo')::date <= d
                    AND (v.encerrado_em IS NULL
                         OR (v.encerrado_em AT TIME ZONE 'America/Sao_Paulo')::date > d)) AS total
           FROM (SELECT (now() AT TIME ZONE 'America/Sao_Paulo')::date - n AS d
                   FROM generate_series(0, $2::int - 1) AS n) dias
          ORDER BY d`,
        [id, q.periodo],
      );

      const recentes = await client.query<LinhaCheckin>(
        `SELECT c.paciente_id AS "pacienteId", u.nome, ${CHECKIN_EM} AS em, c.emocao_predominante
           ${CHECKINS_COM_HUMOR}
          ORDER BY c.criado_em DESC, c.id DESC
          LIMIT 8`,
        [id],
      );

      // Eventos do paciente depois do início deste vínculo; os de vínculos anteriores ficam de fora.
      // Resposta de escala só aparece com o consentimento "escalas".
      const atividade = await client.query<LinhaAtividade>(
        `(SELECT a.paciente_id AS "pacienteId", u.nome, a.acao, a.criado_em AS em
            FROM auditoria a
            JOIN vinculo v ON v.paciente_id = a.paciente_id
                          AND v.psicologo_id = $1 AND v.status = 'ativo'
                          AND a.criado_em >= (v.criado_em AT TIME ZONE 'UTC')
            JOIN paciente p ON p.id = a.paciente_id
            JOIN users u ON u.id = p.user_id
            LEFT JOIN consentimento co ON co.paciente_id = a.paciente_id
           WHERE a.acao IN ('vinculo_criado', 'consentimento_alterado')
              OR (a.acao = 'escala_respondida' AND co.compartilha_escalas)
           ORDER BY a.criado_em DESC
           LIMIT 15)
         UNION ALL
         (SELECT c.paciente_id, u.nome, 'checkin_registrado', ${CHECKIN_EM}
            ${CHECKINS_COM_HUMOR}
           ORDER BY c.criado_em DESC
           LIMIT 15)
         ORDER BY em DESC
         LIMIT 15`,
        [id],
      );

      const medias = await client.query<LinhaMedias>(
        `SELECT count(*)::int AS n,
                round(avg(c.intensidade_humor), 1)::float8 AS humor,
                round(avg(c.intensidade_ansiedade), 1)::float8 AS ansiedade,
                round(avg(c.horas_sono) FILTER (WHERE co.compartilha_habitos), 1)::float8 AS sono
           ${CHECKINS_COM_HUMOR}
          WHERE c.data >= CURRENT_DATE - ($2::int - 1)`,
        [id, q.periodo],
      );

      // Dia de São Paulo; remarcadas e canceladas aparecem com o status para a agenda mostrar.
      const consultasHoje = await client.query<LinhaConsultaHoje>(
        `SELECT c.id, c.paciente_id AS "pacienteId", u.nome, c.inicio, c.fim, c.status
           FROM consulta c
           JOIN paciente p ON p.id = c.paciente_id
           JOIN users u ON u.id = p.user_id
          WHERE c.psicologo_id = $1 AND ${vinculoAtivoDe('c')}
            AND (c.inicio AT TIME ZONE 'America/Sao_Paulo')::date
                = (now() AT TIME ZONE 'America/Sao_Paulo')::date
          ORDER BY c.inicio, c.id`,
        [id],
      );

      // Abertas = pendentes mais em andamento: ainda sem resposta.
      const abertas = await client.query<{ n: number }>(
        `SELECT count(*)::int AS n ${ESCALAS_COMPARTILHADAS}
            AND a.status IN ('pendente', 'em_andamento')`,
        [id],
      );
      const respondidas = await client.query<LinhaEscalaRespondida>(
        `SELECT a.id AS "aplicacaoId", a.paciente_id AS "pacienteId", u.nome, e.sigla,
                a.respondido_em AS "respondidoEm", a.score_total AS "scoreTotal",
                a.item9_diferente_de_zero AS "item9DiferenteDeZero"
           ${ESCALAS_COMPARTILHADAS}
            AND a.status = 'concluida'
          ORDER BY a.respondido_em DESC, a.id DESC
          LIMIT 5`,
        [id],
      );

      return {
        pacientes: pacientes.rows,
        serie: serie.rows,
        recentes: recentes.rows,
        atividade: atividade.rows,
        medias: medias.rows[0],
        consultasHoje: consultasHoje.rows,
        escalas: { pendentes: abertas.rows[0].n, respondidasRecentes: respondidas.rows },
      };
    });

    return res.json({
      pacientesVinculados: dados.pacientes.length,
      serieVinculos: dados.serie,
      checkinsRecentes: dados.recentes.map((l) => ({
        pacienteId: l.pacienteId,
        nome: l.nome,
        em: l.em,
        emocoes: emocoesDe(l.emocao_predominante),
      })),
      atividadeRecente: dados.atividade,
      // Quem não compartilha humor não entra: não dá para contar registros que o servidor não mostra.
      dadosInsuficientes: dados.pacientes
        .filter((l) => l.humor && l.registros7d < MIN_REGISTROS_SEMANA)
        .map((l) => ({ pacienteId: l.pacienteId, nome: l.nome, registros7d: l.registros7d })),
      medias: dados.medias,
      consultasHoje: dados.consultasHoje,
      escalas: dados.escalas,
    });
  }),
);
