import { pool } from '../db';
import { registrarAuditoria } from './auditoria';
import { avisarDadosEsparsos } from './avisos';

export const DIAS_PARA_EXCLUIR = 30;

/** Apaga as contas de paciente com exclusão agendada há 30 dias ou mais. Devolve quantas. */
export async function excluirContasVencidas(): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `DELETE FROM users u
      WHERE u.exclusao_agendada_em <= now() - make_interval(days => $1)
        AND EXISTS (SELECT 1 FROM paciente p WHERE p.user_id = u.id)
  RETURNING u.id`,
    [DIAS_PARA_EXCLUIR],
  );
  for (const { id } of rows) {
    // Sem ator: o usuário acabou de ser apagado e a FK não aceitaria o id.
    await registrarAuditoria(null, 'conta_excluida', { ator: null, metadados: { userId: id, papel: 'paciente' } });
  }
  return rows.length;
}

/** Roda ao subir e a cada 6 h; o Render gratuito dorme, então também vale ao acordar. */
export function agendarExclusoes() {
  const rodar = () => {
    excluirContasVencidas().catch((erro) => console.error('Erro ao excluir contas vencidas:', erro));
    avisarDadosEsparsos().catch((erro) => console.error('Erro ao avisar dados esparsos:', erro));
  };
  void rodar();
  setInterval(rodar, 6 * 60 * 60_000).unref();
}
