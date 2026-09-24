import { PoolClient } from 'pg';
import { pool } from '../db';


export async function comContextoPaciente<T>(
  pacienteId: number,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query('SELECT set_config($1, $2, true)', ['app.paciente_id', String(pacienteId)]);

    const resultado = await fn(client);

    await client.query('COMMIT');
    return resultado;
  } catch (erro) {
    await client.query('ROLLBACK');
    throw erro;
  } finally {
    client.release();
  }
}
