import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../db';
import { registrarAuditoria } from '../../lib/auditoria';
import {
  CHECKIN_EM,
  CHECKIN_HORARIO,
  emocoesDe,
  lerSeguro,
  QUALIDADE_SONO_REVERSO,
} from '../../lib/checkins';
import { comContextoPsicologo } from '../../lib/contextoseguro';
import { criptografar } from '../../lib/criptografia';
import { codificarCursor, cursorDe } from '../../lib/cursor';
import { arredondar, media, pearson } from '../../lib/estatistica';
import { dia, diasEntre, periodoValido } from '../../lib/periodo';
import { idDe, lerOuNegar, limite, rota } from '../../lib/rota';
import { consentimentosDe, PACIENTE_NAO_ENCONTRADO, vinculoOuNegar } from '../../lib/vinculo';
import { anotacaoSchema } from '../../schemas';

export const pacientes = Router();

const MIN_PARES_CORRELACAO = 10;
const MIN_REGISTROS_SEMANA = 3;

// Lista

const listaSchema = z.object({
  busca: z.string().trim().max(100).optional(),
  status: z.enum(['ativo', 'esparso', 'sem_registros']).optional(),
  cursor: cursorDe(z.tuple([z.string(), z.number().int()])).optional(),
  limite: z.coerce.number().int().min(1).max(100).default(20),
});

type LinhaLista = {
  id: number;
  nome: string;
  vinculado_em: Date;
  compartilha_humor: boolean;
  compartilha_habitos: boolean;
  compartilha_escalas: boolean;
  compartilha_diario: boolean;
  status: 'ativo' | 'esparso' | 'sem_registros' | null;
  n7: number | null;
  humor7: number | null;
  ansiedade7: number | null;
  ultimo_data: string | null;
  ultimo_emocao: string | null;
};

// Status vem só do volume de registros dos últimos 7 dias; sem consentimento de humor
// o volume não sai do servidor e o status é null.
pacientes.get(
  '/',
  limite(60),
  rota(async (req, res) => {
    const q = lerOuNegar(listaSchema, req.query, res);
    if (!q) return;

    // A barra invertida é o escape padrão do LIKE: busca por "%" ou "_" casa o caractere literal.
    const padrao = q.busca ? `%${q.busca.replace(/[\\%_]/g, '\\$&')}%` : null;

    const { rows } = await comContextoPsicologo(res.locals.psicologoId, (client) =>
      client.query<LinhaLista>(
        `SELECT v.paciente_id AS id,
                u.nome,
                v.criado_em AT TIME ZONE 'UTC' AS vinculado_em,
                COALESCE(co.compartilha_humor, false)   AS compartilha_humor,
                COALESCE(co.compartilha_habitos, false) AS compartilha_habitos,
                COALESCE(co.compartilha_escalas, false) AS compartilha_escalas,
                COALESCE(co.compartilha_diario, false)  AS compartilha_diario,
                s.status, s.n7, s.humor7, s.ansiedade7,
                ult.data AS ultimo_data, ult.emocao AS ultimo_emocao
           FROM vinculo v
           JOIN paciente p ON p.id = v.paciente_id
           JOIN users u ON u.id = p.user_id
           LEFT JOIN consentimento co ON co.paciente_id = v.paciente_id
           LEFT JOIN LATERAL (
                SELECT count(*)::int AS n7,
                       round(avg(intensidade_humor), 1)::float8 AS humor7,
                       round(avg(intensidade_ansiedade), 1)::float8 AS ansiedade7,
                       CASE WHEN count(*) >= ${MIN_REGISTROS_SEMANA} THEN 'ativo'
                            WHEN count(*) >= 1 THEN 'esparso'
                            ELSE 'sem_registros' END AS status
                  FROM checkin_diario
                 WHERE paciente_id = v.paciente_id AND data >= CURRENT_DATE - 6
           ) s ON COALESCE(co.compartilha_humor, false)
           LEFT JOIN LATERAL (
                SELECT to_char(data, 'YYYY-MM-DD') AS data, emocao_predominante AS emocao
                  FROM checkin_diario
                 WHERE paciente_id = v.paciente_id
                 ORDER BY data DESC
                 LIMIT 1
           ) ult ON COALESCE(co.compartilha_humor, false)
          WHERE v.psicologo_id = $1 AND v.status = 'ativo'
            AND ($2::text IS NULL OR u.nome ILIKE $2)
            AND ($3::text IS NULL OR s.status = $3)
            AND ($4::text IS NULL OR (u.nome, v.paciente_id) > ($4::text, $5::int))
          ORDER BY u.nome, v.paciente_id
          LIMIT $6`,
        [
          res.locals.psicologoId,
          padrao,
          q.status ?? null,
          q.cursor?.[0] ?? null,
          q.cursor?.[1] ?? null,
          q.limite + 1,
        ],
      ),
    );

    const pagina = rows.slice(0, q.limite);
    const ultima = pagina.at(-1);
    return res.json({
      pacientes: pagina.map((r) => ({
        id: r.id,
        nome: r.nome,
        compartilhaHumor: r.compartilha_humor,
        compartilhaHabitos: r.compartilha_habitos,
        compartilhaEscalas: r.compartilha_escalas,
        compartilhaDiario: r.compartilha_diario,
        ultimoCheckin: r.ultimo_data
          ? { data: r.ultimo_data, emocoes: emocoesDe(r.ultimo_emocao) }
          : null,
        checkinsUltimos7Dias: r.n7 ?? 0,
        humorMedio7d: r.humor7,
        ansiedadeMedia7d: r.ansiedade7,
        status: r.status,
        registros7d: r.n7,
        vinculadoEm: r.vinculado_em,
      })),
      proximoCursor:
        rows.length > q.limite && ultima ? codificarCursor([ultima.nome, ultima.id]) : null,
    });
  }),
);

// Resumo

const resumoSchema = z
  .object({
    // Clamp em vez de erro: é o comportamento antigo de ?dias=.
    dias: z.coerce
      .number()
      .transform((n) => Math.min(Math.max(Math.trunc(n) || 30, 1), 365))
      .catch(30),
    de: dia.optional(),
    ate: dia.optional(),
    compararDe: dia.optional(),
    compararAte: dia.optional(),
  })
  .refine((q) => periodoValido(q.de, q.ate) && periodoValido(q.compararDe, q.compararAte))
  .refine((q) => (q.compararDe === undefined) === (q.compararAte === undefined));

type LinhaDetalhe = {
  id: number;
  data: string;
  horario: string | null;
  intensidade_humor: number | null;
  intensidade_ansiedade: number | null;
  horas_sono: string | null; // numeric chega como string do pg
  qualidade_sono: number | null;
  emocao_predominante: string | null;
  contexto_gatilho: string | null;
  diario_livre: string | null;
  diario_compartilhado: boolean;
  exercicio: boolean | null; // null quando não há registro em `habito`
  meditacao: boolean | null;
  medicacao: boolean | null;
};

type LinhaPeriodo = Pick<LinhaDetalhe, 'intensidade_humor' | 'intensidade_ansiedade' | 'horas_sono'>;

const faixaDoDia = (horario: string) => {
  const hora = Number(horario.slice(0, 2));
  if (hora < 6) return 'madrugada';
  if (hora < 12) return 'manha';
  if (hora < 18) return 'tarde';
  return 'noite';
};

// Detalhe de um paciente: somente as categorias consentidas
pacientes.get(
  '/:pacienteId/resumo',
  limite(60),
  rota<{ pacienteId: string }>(async (req, res) => {
    const q = lerOuNegar(resumoSchema, req.query, res);
    if (!q) return;

    const dados = await comContextoPsicologo(res.locals.psicologoId, async (client) => {
      const vinculo = await vinculoOuNegar(client, req, res);
      if (!vinculo) return null;
      const consent = consentimentosDe(vinculo);

      const { rows } = await client.query<LinhaDetalhe>(
        `SELECT c.id,
                to_char(c.data, 'YYYY-MM-DD') AS data,
                ${CHECKIN_HORARIO} AS horario,
                c.intensidade_humor, c.intensidade_ansiedade,
                c.horas_sono, c.qualidade_sono,
                c.emocao_predominante, c.contexto_gatilho,
                c.diario_livre, c.diario_compartilhado,
                h.exercicio, h.meditacao, h.medicacao
           FROM checkin_diario c
           LEFT JOIN habito h ON h.checkin_id = c.id
          WHERE c.paciente_id = $1
            AND c.data BETWEEN COALESCE($2::date, COALESCE($3::date, CURRENT_DATE) - $4::int)
                           AND COALESCE($3::date, CURRENT_DATE)
          ORDER BY c.data ASC`,
        [vinculo.paciente_id, q.de ?? null, q.ate ?? null, q.dias],
      );

      const anterior =
        q.compararDe === undefined
          ? null
          : (
              await client.query<LinhaPeriodo>(
                `SELECT intensidade_humor, intensidade_ansiedade, horas_sono
                   FROM checkin_diario
                  WHERE paciente_id = $1 AND data BETWEEN $2::date AND $3::date`,
                [vinculo.paciente_id, q.compararDe, q.compararAte],
              )
            ).rows;

      const recentes = consent.humor
        ? (
            await client.query<{ n: number }>(
              `SELECT count(*)::int AS n FROM checkin_diario
                WHERE paciente_id = $1 AND data >= CURRENT_DATE - 6`,
              [vinculo.paciente_id],
            )
          ).rows[0].n
        : null;

      return { vinculo, consent, rows, anterior, recentes };
    });
    if (!dados) return;
    const { vinculo, consent, rows, anterior, recentes } = dados;

    // Humor/ansiedade/emoções/gatilhos/horário → consentimento "humor".
    // Sono e hábitos → consentimento "hábitos".
    const registros = rows.map((l) => ({
      id: l.id,
      data: l.data,
      horario: consent.humor ? l.horario : null,
      humor: consent.humor ? l.intensidade_humor : null,
      ansiedade: consent.humor ? l.intensidade_ansiedade : null,
      sonoHoras:
        consent.habitos && l.horas_sono !== null ? Number(l.horas_sono) : null,
      qualidadeSono:
        consent.habitos && l.qualidade_sono !== null
          ? (QUALIDADE_SONO_REVERSO[l.qualidade_sono] ?? null)
          : null,
      emocoes: consent.humor ? emocoesDe(l.emocao_predominante) : null,
      gatilhos: consent.humor ? emocoesDe(l.contexto_gatilho) : null,
    }));

    const contagem = new Map<string, number>();
    for (const registro of registros) {
      for (const emocao of registro.emocoes ?? []) {
        contagem.set(emocao, (contagem.get(emocao) ?? 0) + 1);
      }
    }
    const frequenciaEmocional = [...contagem.entries()]
      .map(([emocao, quantidade]) => ({ emocao, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 5);

    let habitos: null | {
      diasRegistrados: number;
      exercicio: number;
      meditacao: number;
      medicacao: number;
    } = null;
    if (consent.habitos) {
      const comHabito = rows.filter((l) => l.exercicio !== null);
      habitos = {
        diasRegistrados: comHabito.length,
        exercicio: comHabito.filter((l) => l.exercicio).length,
        meditacao: comHabito.filter((l) => l.meditacao).length,
        medicacao: comHabito.filter((l) => l.medicacao).length,
      };
    }

    // Diário livre exige as duas permissões: consentimento geral e marcação no check-in.
    const diario: Array<{ data: string; texto: string }> = [];
    if (consent.diario) {
      for (const l of rows) {
        if (!l.diario_compartilhado || !l.diario_livre) continue;
        const texto = lerSeguro(l.diario_livre);
        if (texto !== null) diario.push({ data: l.data, texto });
      }
    }

    const distribuicaoHorario = consent.humor
      ? { madrugada: 0, manha: 0, tarde: 0, noite: 0 }
      : null;
    if (distribuicaoHorario) {
      for (const { horario } of registros) {
        if (horario) distribuicaoHorario[faixaDoDia(horario)]++;
      }
    }

    const resumirPeriodo = (linhas: LinhaPeriodo[]) => ({
      registros: linhas.length,
      humorMedio: consent.humor ? arredondar(media(linhas.map((l) => l.intensidade_humor))) : null,
      ansiedadeMedia: consent.humor
        ? arredondar(media(linhas.map((l) => l.intensidade_ansiedade)))
        : null,
      sonoMedioHoras: consent.habitos
        ? arredondar(media(linhas.map((l) => (l.horas_sono === null ? null : Number(l.horas_sono)))))
        : null,
    });

    // Sem N suficiente a correlação é ruído: só devolve com pares completos de sono e humor.
    const pares = registros.flatMap((r): Array<[number, number]> =>
      r.sonoHoras !== null && r.humor !== null ? [[r.sonoHoras, r.humor]] : [],
    );
    const correlacao = pares.length >= MIN_PARES_CORRELACAO ? pearson(pares) : null;

    await registrarAuditoria(req, 'paciente_painel_visualizado', {
      pacienteId: vinculo.paciente_id,
    });

    return res.json({
      paciente: { id: vinculo.paciente_id, nome: vinculo.nome },
      consentimentos: consent,
      periodoDias: q.de && q.ate ? diasEntre(q.de, q.ate) : q.dias,
      registros,
      frequenciaEmocional,
      habitos,
      diario,
      distribuicaoHorario,
      comparacao: anterior ? { atual: resumirPeriodo(rows), anterior: resumirPeriodo(anterior) } : null,
      correlacaoSonoHumor:
        correlacao === null ? null : { r: Number(correlacao.toFixed(2)), n: pares.length },
      esparso: recentes === null ? null : recentes < MIN_REGISTROS_SEMANA,
    });
  }),
);

// Linha do tempo

const linhaDoTempoSchema = z
  .object({
    de: dia.optional(),
    ate: dia.optional(),
    cursor: cursorDe(z.tuple([z.iso.datetime(), z.string(), z.number().int()])).optional(),
    limite: z.coerce.number().int().min(1).max(100).default(30),
  })
  .refine((q) => periodoValido(q.de, q.ate));

type LinhaTempo = {
  tipo: 'checkin' | 'vinculo_criado' | 'vinculo_encerrado';
  id: number;
  em: Date;
  data: string | null;
  horario: string | null;
  intensidade_humor: number | null;
  intensidade_ansiedade: number | null;
  horas_sono: string | null;
  emocao_predominante: string | null;
};

// Por ora só check-ins e eventos de vínculo; escalas e consultas entram como novos `tipo`.
pacientes.get(
  '/:pacienteId/linha-do-tempo',
  limite(60),
  rota<{ pacienteId: string }>(async (req, res) => {
    const q = lerOuNegar(linhaDoTempoSchema, req.query, res);
    if (!q) return;

    const dados = await comContextoPsicologo(res.locals.psicologoId, async (client) => {
      const vinculo = await vinculoOuNegar(client, req, res);
      if (!vinculo) return null;

      // Milissegundos: é a precisão que o cursor em ISO consegue repetir sem perder linhas.
      const { rows } = await client.query<LinhaTempo>(
        `SELECT * FROM (
            SELECT 'checkin' AS tipo, c.id, date_trunc('milliseconds', ${CHECKIN_EM}) AS em,
                   to_char(c.data, 'YYYY-MM-DD') AS data, ${CHECKIN_HORARIO} AS horario,
                   c.intensidade_humor, c.intensidade_ansiedade, c.horas_sono, c.emocao_predominante,
                   c.data AS dia
              FROM checkin_diario c
             WHERE c.paciente_id = $1 AND $2::boolean
            UNION ALL
            SELECT 'vinculo_criado', v.id, date_trunc('milliseconds', v.criado_em AT TIME ZONE 'UTC'),
                   NULL, NULL, NULL, NULL, NULL, NULL,
                   ((v.criado_em AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo')::date
              FROM vinculo v
             WHERE v.paciente_id = $1 AND v.psicologo_id = $3
            UNION ALL
            SELECT 'vinculo_encerrado', v.id, date_trunc('milliseconds', v.encerrado_em),
                   NULL, NULL, NULL, NULL, NULL, NULL,
                   (v.encerrado_em AT TIME ZONE 'America/Sao_Paulo')::date
              FROM vinculo v
             WHERE v.paciente_id = $1 AND v.psicologo_id = $3 AND v.encerrado_em IS NOT NULL
         ) t
          WHERE ($4::date IS NULL OR t.dia >= $4::date)
            AND ($5::date IS NULL OR t.dia <= $5::date)
            AND ($6::timestamptz IS NULL OR (t.em, t.tipo, t.id) < ($6::timestamptz, $7::text, $8::int))
          ORDER BY t.em DESC, t.tipo DESC, t.id DESC
          LIMIT $9`,
        [
          vinculo.paciente_id,
          vinculo.compartilha_humor,
          res.locals.psicologoId,
          q.de ?? null,
          q.ate ?? null,
          q.cursor?.[0] ?? null,
          q.cursor?.[1] ?? null,
          q.cursor?.[2] ?? null,
          q.limite + 1,
        ],
      );
      return { vinculo, rows };
    });
    if (!dados) return;
    const { vinculo, rows } = dados;

    const pagina = rows.slice(0, q.limite);
    const ultima = pagina.at(-1);
    return res.json({
      consentimentos: consentimentosDe(vinculo),
      itens: pagina.map((l) =>
        l.tipo === 'checkin'
          ? {
              tipo: l.tipo,
              em: l.em,
              id: l.id,
              data: l.data,
              horario: l.horario,
              emocoes: emocoesDe(l.emocao_predominante),
              humor: l.intensidade_humor,
              ansiedade: l.intensidade_ansiedade,
              sonoHoras:
                vinculo.compartilha_habitos && l.horas_sono !== null ? Number(l.horas_sono) : null,
            }
          : { tipo: l.tipo, em: l.em },
      ),
      proximoCursor:
        rows.length > q.limite && ultima
          ? codificarCursor([ultima.em.toISOString(), ultima.tipo, ultima.id])
          : null,
    });
  }),
);

// Encerrar vínculo: o acesso cai na hora, porque toda leitura exige vínculo ativo.
pacientes.post(
  '/:pacienteId/encerrar-vinculo',
  limite(10),
  rota<{ pacienteId: string }>(async (req, res) => {
    const pacienteId = idDe(req.params.pacienteId);
    if (pacienteId === null) return res.status(404).json({ error: PACIENTE_NAO_ENCONTRADO });

    const { rows } = await pool.query<{ id: number }>(
      `UPDATE vinculo
          SET status = 'encerrado', encerrado_em = now(), encerrado_por = $3
        WHERE psicologo_id = $1 AND paciente_id = $2 AND status = 'ativo'
    RETURNING id`,
      [res.locals.psicologoId, pacienteId, req.user!.id],
    );
    if (!rows[0]) return res.status(404).json({ error: PACIENTE_NAO_ENCONTRADO });

    await registrarAuditoria(req, 'vinculo_encerrado', {
      pacienteId,
      alvoTipo: 'vinculo',
      alvoId: rows[0].id,
      metadados: { encerradoPor: 'psicologo' },
    });
    return res.json({ ok: true });
  }),
);

// Anotações clínicas do psicólogo sobre o paciente (sempre cifradas no banco)
pacientes.get(
  '/:pacienteId/anotacoes',
  limite(60),
  rota<{ pacienteId: string }>(async (req, res) => {
    const dados = await comContextoPsicologo(res.locals.psicologoId, async (client) => {
      const vinculo = await vinculoOuNegar(client, req, res);
      if (!vinculo) return null;

      const { rows } = await client.query<{ id: number; conteudo: string; criadoEm: string }>(
        `SELECT id,
                conteudo,
                to_char(criado_em, 'YYYY-MM-DD HH24:MI') AS "criadoEm"
           FROM anotacao_clinica
          WHERE psicologo_id = $1
            AND paciente_id = $2
            AND (expira_em IS NULL OR expira_em > now())
          ORDER BY criado_em DESC`,
        [res.locals.psicologoId, vinculo.paciente_id],
      );
      return { vinculo, rows };
    });
    if (!dados) return;

    const anotacoes = dados.rows
      .map((a) => ({ id: a.id, criadoEm: a.criadoEm, conteudo: lerSeguro(a.conteudo) }))
      .filter((a): a is { id: number; criadoEm: string; conteudo: string } => a.conteudo !== null);

    await registrarAuditoria(req, 'anotacoes_lidas', { pacienteId: dados.vinculo.paciente_id });
    return res.json({ anotacoes });
  }),
);

pacientes.post(
  '/:pacienteId/anotacoes',
  limite(60),
  rota<{ pacienteId: string }>(async (req, res) => {
    const parsed = anotacaoSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' });
    }

    const dados = await comContextoPsicologo(res.locals.psicologoId, async (client) => {
      const vinculo = await vinculoOuNegar(client, req, res);
      if (!vinculo) return null;

      const { rows } = await client.query<{ id: number; criado_em: string }>(
        `INSERT INTO anotacao_clinica (psicologo_id, paciente_id, conteudo, expira_em)
         VALUES ($1, $2, $3, now() + interval '5 years')
         RETURNING id, to_char(criado_em, 'YYYY-MM-DD HH24:MI') AS criado_em`,
        [res.locals.psicologoId, vinculo.paciente_id, criptografar(parsed.data.conteudo)],
      );
      return { vinculo, anotacao: rows[0] };
    });
    if (!dados) return;

    await registrarAuditoria(req, 'anotacao_criada', {
      pacienteId: dados.vinculo.paciente_id,
      alvoTipo: 'anotacao_clinica',
      alvoId: dados.anotacao.id,
    });

    return res.status(201).json({
      anotacao: {
        id: dados.anotacao.id,
        criadoEm: dados.anotacao.criado_em,
        conteudo: parsed.data.conteudo,
      },
    });
  }),
);
