import { randomBytes, randomInt } from 'node:crypto';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import bcrypt from 'bcrypt';
import type { Express } from 'express';
import { pool } from '../src/db';

const idsCriados: number[] = [];

export async function iniciar(app: Express) {
  const servidor = app.listen(0, '127.0.0.1');
  await once(servidor, 'listening');
  const { port } = servidor.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    fechar: () => {
      servidor.closeAllConnections();
      servidor.close();
    },
  };
}

export function definirAmbiente(env: Record<string, string | undefined>) {
  for (const [chave, valor] of Object.entries(env)) {
    if (valor === undefined) delete process.env[chave];
    else process.env[chave] = valor;
  }
}

// app.ts lê o ambiente ao ser carregado; recarrega o módulo para testar outra configuração.
export function carregarApp(env: Record<string, string | undefined>): Express {
  const anterior = Object.fromEntries(Object.keys(env).map((chave) => [chave, process.env[chave]]));
  definirAmbiente(env);
  try {
    delete require.cache[require.resolve('../src/app')];
    return (require('../src/app') as typeof import('../src/app')).app;
  } finally {
    definirAmbiente(anterior);
  }
}

export async function criarUsuario() {
  const email = `teste-${randomBytes(6).toString('hex')}@psychelink.test`;
  const senha = `Sn!${randomBytes(8).toString('hex')}`;
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO users (nome, email, password_hash, data_nascimento, email_verificado)
     VALUES ('Teste', $1, $2, '1990-01-01', true)
     RETURNING id`,
    [email, await bcrypt.hash(senha, 4)],
  );
  idsCriados.push(rows[0].id);
  return { id: rows[0].id, email, senha };
}

export async function criarPsicologo() {
  const usuario = await criarUsuario();
  await pool.query('INSERT INTO psicologo (user_id, crp) VALUES ($1, $2)', [
    usuario.id,
    `00/${randomInt(100_000, 1_000_000)}`,
  ]);
  return usuario;
}

export async function criarPaciente() {
  const usuario = await criarUsuario();
  await pool.query('INSERT INTO paciente (user_id) VALUES ($1)', [usuario.id]);
  return usuario;
}

// Apaga o que os testes criaram (as FKs em cascata levam paciente/psicologo junto) e fecha o pool.
export async function limpar() {
  await pool.query('DELETE FROM users WHERE id = ANY($1)', [idsCriados]);
  await pool.end();
}
