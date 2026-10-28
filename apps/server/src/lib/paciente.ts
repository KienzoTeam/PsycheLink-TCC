import { pool } from '../db';

export async function obterPacienteId(userId: number): Promise<number | null> {
  const resultado = await pool.query('SELECT id FROM paciente WHERE user_id = $1', [userId]);
  const row = resultado.rows[0] as { id: number } | undefined;
  return row?.id ?? null;
}

export async function obterOuCriarPacienteId(userId: number): Promise<number> {
  const existente = await obterPacienteId(userId);
  if (existente !== null) return existente;

  const criado = await pool.query(
    'INSERT INTO paciente (user_id) VALUES ($1) RETURNING id',
    [userId],
  );
  return (criado.rows[0] as { id: number }).id;
}
