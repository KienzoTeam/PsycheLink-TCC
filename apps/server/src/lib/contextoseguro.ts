import { PoolClient } from 'pg';
import { pool } from '../db';

// As policies de RLS leem app.paciente_id / app.psicologo_id (ver migrations/0003).
// set_config(..., true) vale só na transação, o que funciona com o pooler do Neon.
async function comContexto<T>(
  variavel: string,
  id: number,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query('SELECT set_config($1, $2, true)', [variavel, String(id)]);

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

export const comContextoPaciente = <T>(pacienteId: number, fn: (client: PoolClient) => Promise<T>) =>
  comContexto('app.paciente_id', pacienteId, fn);

/** Contexto de leitura do psicólogo: as policies só liberam pacientes com vínculo ativo. */
export const comContextoPsicologo = <T>(psicologoId: number, fn: (client: PoolClient) => Promise<T>) =>
  comContexto('app.psicologo_id', psicologoId, fn);
