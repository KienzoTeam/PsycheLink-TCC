import type { PoolClient } from 'pg';
import { z } from 'zod';
import { pool } from '../db';

// Perfil profissional (FP10 reduzido): o psicólogo escreve, o paciente vinculado lê.
export const perfilSchema = z.object({
  especialidade: z.string().trim().max(255).nullable(),
  abordagem: z.string().trim().max(255).nullable(),
  sobre: z.string().trim().max(1000).nullable(),
  modalidades: z.array(z.enum(['presencial', 'online'])).max(2),
  atendeEm: z.string().trim().max(120).nullable(),
  contato: z.string().trim().max(160).nullable(),
});

export type Perfil = z.infer<typeof perfilSchema>;

const COLUNAS = `especialidade, abordagem, sobre, modalidades, atende_em AS "atendeEm", contato`;
const vazioVira = (v: string | null) => (v ? v : null);

export async function perfilProfissional(psicologoId: number, client: Pick<PoolClient, 'query'> = pool): Promise<Perfil> {
  const { rows } = await client.query<Perfil>(`SELECT ${COLUNAS} FROM psicologo WHERE id = $1`, [psicologoId]);
  return rows[0];
}

export async function salvarPerfil(psicologoId: number, p: Perfil): Promise<Perfil> {
  const { rows } = await pool.query<Perfil>(
    `UPDATE psicologo SET especialidade = $2, abordagem = $3, sobre = $4, modalidades = $5, atende_em = $6, contato = $7
      WHERE id = $1 RETURNING ${COLUNAS}`,
    [psicologoId, vazioVira(p.especialidade), vazioVira(p.abordagem), vazioVira(p.sobre), [...new Set(p.modalidades)], vazioVira(p.atendeEm), vazioVira(p.contato)],
  );
  return rows[0];
}
