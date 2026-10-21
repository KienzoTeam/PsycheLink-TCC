import { Router } from 'express';
import { z } from 'zod';
import { registrarAuditoria } from '../../lib/auditoria';
import {
  CHECKIN_HORARIO,
  emocoesDe,
  lerSeguro,
  QUALIDADE_SONO_REVERSO,
} from '../../lib/checkins';
import { comContextoPsicologo } from '../../lib/contextoseguro';
import { codificarCursor, cursorDe } from '../../lib/cursor';
import { dia, periodoValido } from '../../lib/periodo';
import { idDe, lerOuNegar, limite, rota } from '../../lib/rota';

export const checkins = Router();

// O filtro de emoção roda depois de decifrar, então a busca varre lotes. Para no limite pedido
// ou ao varrer MAX_VARREDURA linhas; nesse caso devolve proximoCursor para continuar de onde parou.
const LOTE = 100;
const MAX_VARREDURA = 1000;
const REGISTRO_NAO_ENCONTRADO = 'Registro não encontrado.';

const listaSchema = z
  .object({
    pacienteId: z.coerce.number().int().positive().optional(),
    de: dia.optional(),
    ate: dia.optional(),
    emocao: z.string().trim().min(1).max(50).optional(),
    cursor: cursorDe(z.tuple([dia, z.number().int()])).optional(),
    limite: z.coerce.number().int().min(1).max(100).default(30),
  })
  .refine((q) => periodoValido(q.de, q.ate));

type ItemCheckin = {
  id: number;
  pacienteId: number;
  nome: string;
  data: string;
  horario: string | null;
  emocoes: string[] | null;
  humor: number | null;
  ansiedade: number | null;
  sonoHoras: number | null;
};

type LinhaLista = {
  id: number;
  paciente_id: number;
  nome: string;
  data: string;
  horario: string | null;
  intensidade_humor: number | null;
  intensidade_ansiedade: number | null;
  horas_sono: string | null;
  emocao_predominante: string | null;
};

// Só pacientes vinculados que compartilham humor; o sono depende do consentimento de hábitos.
checkins.get(
  '/',
  limite(60),
  rota(async (req, res) => {
    const q = lerOuNegar(listaSchema, req.query, res);
    if (!q) return;
    const emocaoBuscada = q.emocao?.toLowerCase();

    const resultado = await comContextoPsicologo(res.locals.psicologoId, async (client) => {
      const itens: ItemCheckin[] = [];
      const lote = emocaoBuscada ? LOTE : q.limite + 1;
      let cursor = q.cursor;
      let varridos = 0;
      let esgotado = false;

      while (itens.length <= q.limite && varridos < MAX_VARREDURA && !esgotado) {
        const { rows } = await client.query<LinhaLista>(
          `SELECT c.id, c.paciente_id, u.nome,
                  to_char(c.data, 'YYYY-MM-DD') AS data,
                  ${CHECKIN_HORARIO} AS horario,
                  c.intensidade_humor, c.intensidade_ansiedade, c.emocao_predominante,
                  CASE WHEN co.compartilha_habitos THEN c.horas_sono END AS horas_sono
             FROM checkin_diario c
             JOIN vinculo v ON v.paciente_id = c.paciente_id
                           AND v.psicologo_id = $1 AND v.status = 'ativo'
             JOIN consentimento co ON co.paciente_id = c.paciente_id AND co.compartilha_humor
             JOIN paciente p ON p.id = c.paciente_id
             JOIN users u ON u.id = p.user_id
            WHERE ($2::int IS NULL OR c.paciente_id = $2)
              AND ($3::date IS NULL OR c.data >= $3::date)
              AND ($4::date IS NULL OR c.data <= $4::date)
              AND ($5::date IS NULL OR (c.data, c.id) < ($5::date, $6::int))
            ORDER BY c.data DESC, c.id DESC
            LIMIT $7`,
          [
            res.locals.psicologoId,
            q.pacienteId ?? null,
            q.de ?? null,
            q.ate ?? null,
            cursor?.[0] ?? null,
            cursor?.[1] ?? null,
            lote,
          ],
        );
        esgotado = rows.length < lote;

        for (const l of rows) {
          varridos++;
          const emocoes = emocoesDe(l.emocao_predominante);
          if (emocaoBuscada && !emocoes?.some((e) => e.toLowerCase() === emocaoBuscada)) continue;
          itens.push({
            id: l.id,
            pacienteId: l.paciente_id,
            nome: l.nome,
            data: l.data,
            horario: l.horario,
            emocoes,
            humor: l.intensidade_humor,
            ansiedade: l.intensidade_ansiedade,
            sonoHoras: l.horas_sono === null ? null : Number(l.horas_sono),
          });
          if (itens.length > q.limite) break;
        }
        const ultima = rows.at(-1);
        if (ultima) cursor = [ultima.data, ultima.id];
      }

      const pagina = itens.slice(0, q.limite);
      const ultima = pagina.at(-1);
      let proximoCursor: string | null = null;
      if (itens.length > q.limite && ultima) proximoCursor = codificarCursor([ultima.data, ultima.id]);
      else if (!esgotado && cursor) proximoCursor = codificarCursor(cursor);
      return { itens: pagina, proximoCursor };
    });

    return res.json(resultado);
  }),
);

type LinhaDetalhe = LinhaLista & {
  qualidade_sono: number | null;
  contexto_gatilho: string | null;
  diario_livre: string | null;
  diario_compartilhado: boolean;
  compartilha_habitos: boolean;
  compartilha_escalas: boolean;
  compartilha_diario: boolean;
  exercicio: boolean | null;
  meditacao: boolean | null;
  medicacao: boolean | null;
};

// Registro completo, conforme o consentimento. O diário exige consentimento de diário
// e a marcação de compartilhamento no próprio check-in.
checkins.get(
  '/:id',
  limite(60),
  rota<{ id: string }>(async (req, res) => {
    const id = idDe(req.params.id);
    if (id === null) return res.status(404).json({ error: REGISTRO_NAO_ENCONTRADO });

    const { rows } = await comContextoPsicologo(res.locals.psicologoId, (client) =>
      client.query<LinhaDetalhe>(
        `SELECT c.id, c.paciente_id, u.nome,
                to_char(c.data, 'YYYY-MM-DD') AS data,
                ${CHECKIN_HORARIO} AS horario,
                c.intensidade_humor, c.intensidade_ansiedade,
                c.horas_sono, c.qualidade_sono,
                c.emocao_predominante, c.contexto_gatilho,
                c.diario_livre, c.diario_compartilhado,
                co.compartilha_habitos, co.compartilha_escalas, co.compartilha_diario,
                h.exercicio, h.meditacao, h.medicacao
           FROM checkin_diario c
           JOIN vinculo v ON v.paciente_id = c.paciente_id
                         AND v.psicologo_id = $1 AND v.status = 'ativo'
           JOIN consentimento co ON co.paciente_id = c.paciente_id AND co.compartilha_humor
           JOIN paciente p ON p.id = c.paciente_id
           JOIN users u ON u.id = p.user_id
           LEFT JOIN habito h ON h.checkin_id = c.id
          WHERE c.id = $2`,
        [res.locals.psicologoId, id],
      ),
    );
    const l = rows[0];
    if (!l) return res.status(404).json({ error: REGISTRO_NAO_ENCONTRADO });

    await registrarAuditoria(req, 'checkin_visualizado', {
      pacienteId: l.paciente_id,
      alvoTipo: 'checkin_diario',
      alvoId: l.id,
    });

    return res.json({
      checkin: {
        id: l.id,
        pacienteId: l.paciente_id,
        nome: l.nome,
        data: l.data,
        horario: l.horario,
        humor: l.intensidade_humor,
        ansiedade: l.intensidade_ansiedade,
        emocoes: emocoesDe(l.emocao_predominante),
        gatilhos: emocoesDe(l.contexto_gatilho),
        sonoHoras: l.compartilha_habitos && l.horas_sono !== null ? Number(l.horas_sono) : null,
        qualidadeSono:
          l.compartilha_habitos && l.qualidade_sono !== null
            ? (QUALIDADE_SONO_REVERSO[l.qualidade_sono] ?? null)
            : null,
        habitos:
          l.compartilha_habitos && l.exercicio !== null
            ? { exercicio: l.exercicio, meditacao: l.meditacao, medicacao: l.medicacao }
            : null,
        diario:
          l.compartilha_diario && l.diario_compartilhado ? lerSeguro(l.diario_livre) : null,
      },
      consentimentos: {
        humor: true,
        habitos: l.compartilha_habitos,
        escalas: l.compartilha_escalas,
        diario: l.compartilha_diario,
      },
    });
  }),
);
