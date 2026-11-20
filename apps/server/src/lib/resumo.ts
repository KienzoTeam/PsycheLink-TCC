import type { PoolClient } from 'pg';
import { CHECKIN_HORARIO, emocoesDe, QUALIDADE_SONO_REVERSO } from './checkins';
import { type Habitos, HABITOS, HABITOS_JSON } from './habitos';
import type { Consentimentos } from './vinculo';

export type LinhaDetalhe = {
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
  habitos: Habitos | null; // null quando não há registro em `habito`
};

export const faixaDoDia = (horario: string) => {
  const hora = Number(horario.slice(0, 2));
  if (hora < 6) return 'madrugada';
  if (hora < 12) return 'manha';
  if (hora < 18) return 'tarde';
  return 'noite';
};

/** Check-ins do período, em ordem de data. Sem `de`, vale `dias` para trás a partir de `ate` (ou de hoje). */
export async function checkinsDoPeriodo(
  client: PoolClient,
  pacienteId: number,
  de: string | null,
  ate: string | null,
  dias = 30,
): Promise<LinhaDetalhe[]> {
  const { rows } = await client.query<LinhaDetalhe>(
    `SELECT c.id,
            to_char(c.data, 'YYYY-MM-DD') AS data,
            ${CHECKIN_HORARIO} AS horario,
            c.intensidade_humor, c.intensidade_ansiedade,
            c.horas_sono, c.qualidade_sono,
            c.emocao_predominante, c.contexto_gatilho,
            c.diario_livre, c.diario_compartilhado,
            ${HABITOS_JSON} AS habitos
       FROM checkin_diario c
       LEFT JOIN habito h ON h.checkin_id = c.id
      WHERE c.paciente_id = $1
        AND c.data BETWEEN COALESCE($2::date, COALESCE($3::date, CURRENT_DATE) - $4::int)
                       AND COALESCE($3::date, CURRENT_DATE)
      ORDER BY c.data ASC`,
    [pacienteId, de, ate, dias],
  );
  return rows;
}

/** Quantos registros citam cada emoção; empate desempata pelo nome para a ordem ser sempre a mesma. */
export function contarEmocoes(listas: Array<string[] | null>, limite = 5) {
  const contagem = new Map<string, number>();
  for (const emocoes of listas) {
    for (const emocao of emocoes ?? []) contagem.set(emocao, (contagem.get(emocao) ?? 0) + 1);
  }
  return [...contagem.entries()]
    .map(([emocao, quantidade]) => ({ emocao, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade || a.emocao.localeCompare(b.emocao))
    .slice(0, limite);
}

/**
 * Média dos últimos 7 dias do humor para cada dia do período (o dia e os 6 anteriores, mesmo antes
 * do início do período). Dia sem nenhum registro na janela fica null. Mesmos limites de checkinsDoPeriodo.
 */
export async function mediaMovelHumor(
  client: PoolClient,
  pacienteId: number,
  de: string | null,
  ate: string | null,
  dias = 30,
): Promise<Array<{ data: string; valor: number | null }>> {
  const { rows } = await client.query<{ data: string; valor: number | null }>(
    `WITH p AS (SELECT COALESCE($2::date, COALESCE($3::date, CURRENT_DATE) - $4::int) AS de,
                       COALESCE($3::date, CURRENT_DATE) AS ate)
     SELECT to_char(p.de + n, 'YYYY-MM-DD') AS data,
            round(avg(c.intensidade_humor), 1)::float8 AS valor
       FROM p
      CROSS JOIN generate_series(0, p.ate - p.de) AS n
       LEFT JOIN checkin_diario c
              ON c.paciente_id = $1 AND c.data BETWEEN p.de + n - 6 AND p.de + n
      GROUP BY p.de, n
      ORDER BY n`,
    [pacienteId, de, ate, dias],
  );
  return rows;
}

/**
 * Humor/ansiedade/emoções/gatilhos/horário seguem o consentimento "humor".
 * Sono e hábitos seguem "hábitos". Sem nenhum dos dois, nem a data nem a quantidade de
 * check-ins sai: o volume de registros também é dado do paciente.
 */
export function resumirCheckins(rows: LinhaDetalhe[], consent: Consentimentos) {
  const visiveis = consent.humor || consent.habitos ? rows : [];
  const registros = visiveis.map((l) => ({
    id: l.id,
    data: l.data,
    horario: consent.humor ? l.horario : null,
    humor: consent.humor ? l.intensidade_humor : null,
    ansiedade: consent.humor ? l.intensidade_ansiedade : null,
    sonoHoras: consent.habitos && l.horas_sono !== null ? Number(l.horas_sono) : null,
    qualidadeSono:
      consent.habitos && l.qualidade_sono !== null
        ? (QUALIDADE_SONO_REVERSO[l.qualidade_sono] ?? null)
        : null,
    emocoes: consent.humor ? emocoesDe(l.emocao_predominante) : null,
    gatilhos: consent.humor ? emocoesDe(l.contexto_gatilho) : null,
  }));

  const frequenciaEmocional = contarEmocoes(registros.map((r) => r.emocoes));

  let habitos: null | ({ diasRegistrados: number } & Record<keyof Habitos, number>) = null;
  if (consent.habitos) {
    const comHabito = rows.flatMap((l) => (l.habitos ? [l.habitos] : []));
    habitos = {
      diasRegistrados: comHabito.length,
      ...(Object.fromEntries(
        HABITOS.map(({ chave }) => [chave, comHabito.filter((h) => h[chave]).length]),
      ) as Record<keyof Habitos, number>),
    };
  }

  const distribuicaoHorario = consent.humor ? { madrugada: 0, manha: 0, tarde: 0, noite: 0 } : null;
  if (distribuicaoHorario) {
    for (const { horario } of registros) {
      if (horario) distribuicaoHorario[faixaDoDia(horario)]++;
    }
  }

  return { registros, frequenciaEmocional, habitos, distribuicaoHorario };
}
