import { PoolClient } from 'pg';
import { pool } from '../db';

/** Roda `fn` numa transação de um cliente só; desfaz tudo se ela lançar. */
export async function emTransacao<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
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

// As policies de RLS leem app.paciente_id / app.psicologo_id (ver migrations/0003).
// set_config(..., true) vale só na transação, o que funciona com o pooler do Neon.
const comContexto = <T>(variavel: string, id: number, fn: (client: PoolClient) => Promise<T>) =>
  emTransacao(async (client) => {
    await client.query('SELECT set_config($1, $2, true)', [variavel, String(id)]);
    return fn(client);
  });

export const comContextoPaciente = <T>(pacienteId: number, fn: (client: PoolClient) => Promise<T>) =>
  comContexto('app.paciente_id', pacienteId, fn);

/** Contexto de leitura do psicólogo: as policies só liberam pacientes com vínculo ativo. */
export const comContextoPsicologo = <T>(psicologoId: number, fn: (client: PoolClient) => Promise<T>) =>
  comContexto('app.psicologo_id', psicologoId, fn);
