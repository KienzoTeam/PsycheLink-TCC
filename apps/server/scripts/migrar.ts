import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';

const pasta = join(__dirname, '..', 'migrations');
const BASELINE = '0001_baseline.sql';

async function migrar() {
  const db = new Client({
    connectionString: process.env.DATABASE_URL_DIRETA ?? process.env.DATABASE_URL,
  });
  await db.connect();
  try {
    await db.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
         nome text PRIMARY KEY,
         aplicado_em timestamptz NOT NULL DEFAULT now()
       )`,
    );
    const aplicadas = new Set(
      (await db.query<{ nome: string }>('SELECT nome FROM schema_migrations')).rows.map((r) => r.nome),
    );
    // Banco que já tem o schema (anterior ao runner) só registra o baseline, sem executá-lo.
    const { rows } = await db.query<{ existe: boolean }>(
      "SELECT to_regclass('public.users') IS NOT NULL AS existe",
    );
    const bancoExistente = rows[0].existe;
    let nova = false;

    for (const nome of readdirSync(pasta).filter((f) => f.endsWith('.sql')).sort()) {
      if (aplicadas.has(nome)) continue;
      const pular = nome === BASELINE && bancoExistente;
      await db.query('BEGIN');
      try {
        if (!pular) await db.query(readFileSync(join(pasta, nome), 'utf8'));
        await db.query('INSERT INTO schema_migrations (nome) VALUES ($1)', [nome]);
        await db.query('COMMIT');
      } catch (erro) {
        await db.query('ROLLBACK');
        throw erro;
      }
      nova = true;
      console.log(pular ? `${nome}: registrada (banco existente)` : `${nome}: aplicada`);
    }
    if (!nova) console.log('Nada a aplicar.');
  } finally {
    await db.end();
  }
}

migrar().catch((erro) => {
  console.error(erro instanceof Error ? erro.message : erro);
  process.exitCode = 1;
});
