import type { PoolClient } from 'pg';

export type Subescalas = Record<string, { rotulo: string; itens: number[] }>;
export type Opcao = { valor: number; rotulo: string };

// A DASS-21 é a forma reduzida da DASS-42: cada subescala vale 2x a soma dos seus itens.
const FATOR_SUBESCALA = 2;

const somar = (valores: number[]) => valores.reduce((total, v) => total + v, 0);

/** Sem subescalas o total é a soma dos itens; com elas, a soma das subescalas já multiplicadas. */
export function pontuar(respostas: number[], subescalas: Subescalas | null) {
  if (!subescalas) return { scoreTotal: somar(respostas), subscores: null };

  const subscores = Object.fromEntries(
    Object.entries(subescalas).map(([chave, { itens }]) => [
      chave,
      FATOR_SUBESCALA * somar(itens.map((numero) => respostas[numero - 1])),
    ]),
  );
  return { scoreTotal: somar(Object.values(subscores)), subscores };
}

export type LinhaAplicacao = {
  id: number;
  sigla: string;
  nome: string;
  pontuacao_maxima: number;
  status: string;
  solicitado_em: Date;
  respondido_em: Date | null;
  score_total: number | null;
  subscores: Record<string, number> | null;
  item9_diferente_de_zero: boolean | null;
};

export const COLUNAS_APLICACAO = `a.id, e.sigla, e.nome, e.pontuacao_maxima, a.status,
  a.solicitado_em, a.respondido_em, a.score_total, a.subscores, a.item9_diferente_de_zero`;

export const aplicacaoJson = (l: LinhaAplicacao) => ({
  id: l.id,
  escala: { sigla: l.sigla, nome: l.nome, pontuacaoMaxima: l.pontuacao_maxima },
  status: l.status,
  solicitadoEm: l.solicitado_em,
  respondidoEm: l.respondido_em,
  scoreTotal: l.score_total,
  subscores: l.subscores,
  item9DiferenteDeZero: l.item9_diferente_de_zero,
});

/**
 * Aplicações que este psicólogo fez ao paciente, da mais nova à mais antiga. As de um psicólogo
 * anterior não aparecem. O período (dias em São Paulo) olha para a resposta ou, sem ela, o pedido.
 */
export async function aplicacoesDoPaciente(
  client: PoolClient,
  psicologoId: number,
  pacienteId: number,
  periodo?: { de: string; ate: string },
): Promise<LinhaAplicacao[]> {
  const { rows } = await client.query<LinhaAplicacao>(
    `SELECT ${COLUNAS_APLICACAO}
       FROM aplicacao_escala a
       JOIN escala e ON e.id = a.escala_id
      WHERE a.psicologo_id = $1 AND a.paciente_id = $2
        AND ($3::date IS NULL
             OR (COALESCE(a.respondido_em, a.solicitado_em) AT TIME ZONE 'America/Sao_Paulo')::date
                BETWEEN $3::date AND $4::date)
      ORDER BY a.id DESC`,
    [psicologoId, pacienteId, periodo?.de ?? null, periodo?.ate ?? null],
  );
  return rows;
}
