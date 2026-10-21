import { randomBytes, randomInt } from 'node:crypto';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { mock } from 'node:test';
import bcrypt from 'bcrypt';
import type { Express } from 'express';
import { pool } from '../src/db';

const idsCriados: number[] = [];
const ipsUsados: string[] = [];

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

export async function vincular(psicologo: { id: number }, paciente: { id: number }) {
  await pool.query(
    `INSERT INTO vinculo (paciente_id, psicologo_id, codigo_unico, status)
     SELECT pa.id, ps.id, $3, 'ativo'
       FROM paciente pa, psicologo ps
      WHERE pa.user_id = $1 AND ps.user_id = $2`,
    [paciente.id, psicologo.id, randomBytes(8).toString('hex')],
  );
}

// Apaga o que os testes criaram (as FKs em cascata levam paciente/psicologo junto) e fecha o pool.
// A auditoria é imutável: o trigger só é desligado aqui, dentro de uma transação que o religa
// antes do COMMIT, então nenhuma outra sessão chega a vê-lo desligado.
export async function limpar() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('ALTER TABLE auditoria DISABLE TRIGGER trg_auditoria_imutavel');
    await client.query(
      `DELETE FROM auditoria
        WHERE ator_user_id = ANY($1)
           OR paciente_id IN (SELECT id FROM paciente WHERE user_id = ANY($1))
           OR ip = ANY($2::inet[])
           OR alvo_tipo = 'teste_imutavel'`,
      [idsCriados, ipsUsados],
    );
    await client.query('ALTER TABLE auditoria ENABLE TRIGGER trg_auditoria_imutavel');
    await client.query('DELETE FROM users WHERE id = ANY($1)', [idsCriados]);
    await client.query('COMMIT');
  } catch (erro) {
    await client.query('ROLLBACK');
    throw erro;
  } finally {
    client.release();
  }
  await pool.end();
}

export const ORIGEM_WEB = 'http://localhost:5173';

// O mailer escreve o código no console fora de produção; os testes leem de lá.
const codigosEnviados = new Map<string, number>();

export function capturarCodigos() {
  mock.method(console, 'log', (linha: unknown) => {
    const achado = /^\[código\] (\S+) · .*: (\d{6})$/.exec(String(linha));
    if (achado) codigosEnviados.set(achado[1], Number(achado[2]));
  });
}

export const ultimoCodigo = (email: string) => codigosEnviados.get(email)!;

// Cliente HTTP com jar de cookies. Cada cliente usa um IP próprio (X-Forwarded-For, o app de
// teste precisa de TRUST_PROXY=1), então os rate limits por IP não se acumulam entre testes.
export function criarCliente(url: string) {
  const ip = `10.${randomInt(256)}.${randomInt(256)}.${randomInt(1, 255)}`;
  const cookies = new Map<string, string>();
  ipsUsados.push(ip);

  async function requisitar(
    metodo: string,
    caminho: string,
    opcoes: { corpo?: unknown; origem?: string | null; cabecalhos?: Record<string, string> } = {},
  ) {
    const { corpo, origem = ORIGEM_WEB, cabecalhos = {} } = opcoes;
    const res = await fetch(url + caminho, {
      method: metodo,
      headers: {
        'x-forwarded-for': ip,
        ...(corpo !== undefined && { 'content-type': 'application/json' }),
        ...(origem && { origin: origem }),
        ...(cookies.size > 0 && {
          cookie: [...cookies].map(([chave, valor]) => `${chave}=${valor}`).join('; '),
        }),
        ...cabecalhos,
      },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
    for (const linha of res.headers.getSetCookie()) {
      const [chave, valor] = linha.split(';')[0].split('=');
      if (valor) cookies.set(chave, valor);
      else cookies.delete(chave);
    }
    return res;
  }

  return { ip, cookies, requisitar };
}

export type Cliente = ReturnType<typeof criarCliente>;

export async function login(cliente: Cliente, email: string, senha: string) {
  const res = await cliente.requisitar('POST', '/auth/psicologo/login', {
    corpo: { email, password: senha },
  });
  const corpo = (await res.json()) as {
    desafioId: string;
    emailMascarado: string;
    reenviarEm: string;
    codigo?: string;
  };
  return { res, corpo };
}

/** Login completo (senha + 2FA); o cliente volta com os cookies da sessão. */
export async function entrar(url: string, usuario: { email: string; senha: string }) {
  const cliente = criarCliente(url);
  const { desafioId } = (await login(cliente, usuario.email, usuario.senha)).corpo;
  const res = await cliente.requisitar('POST', '/auth/psicologo/2fa', {
    corpo: { desafioId, codigo: String(ultimoCodigo(usuario.email)) },
  });
  if (res.status !== 200) throw new Error(`2FA falhou no helper: ${res.status}`);
  return cliente;
}
