import { randomBytes, randomInt } from 'node:crypto';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { mock } from 'node:test';
import bcrypt from 'bcrypt';
import type { Express } from 'express';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';
import { pool } from '../src/db';
import { criptografar } from '../src/lib/criptografia';

// A app roda como psychelink_app, que as policies de RLS limitam. Fixtures em tabelas com RLS
// e a limpeza usam o dono (neondb_owner, com BYPASSRLS) para não depender do contexto.
export const dono = new Pool({ connectionString: process.env.DATABASE_URL_DIRETA });

// Os arquivos de teste rodam em paralelo; o alvo por processo evita que a limpeza de um apague
// linhas de auditoria que outro ainda está testando.
export const ALVO_TESTE = `teste_imutavel_${process.pid}`;

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

export async function criarUsuario(nome = 'Teste') {
  const email = `teste-${randomBytes(6).toString('hex')}@psychelink.test`;
  const senha = `Sn!${randomBytes(8).toString('hex')}`;
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO users (nome, email, password_hash, data_nascimento, email_verificado)
     VALUES ($3, $1, $2, '1990-01-01', true)
     RETURNING id`,
    [email, await bcrypt.hash(senha, 4), nome],
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

export async function criarPaciente(nome?: string) {
  const usuario = await criarUsuario(nome);
  await pool.query('INSERT INTO paciente (user_id) VALUES ($1)', [usuario.id]);
  return usuario;
}

export async function vincular(psicologo: { id: number }, paciente: { id: number }) {
  await pool.query(
    `INSERT INTO vinculo (paciente_id, psicologo_id, status)
     SELECT pa.id, ps.id, 'ativo'
       FROM paciente pa, psicologo ps
      WHERE pa.user_id = $1 AND ps.user_id = $2`,
    [paciente.id, psicologo.id],
  );
}

export const pacienteIdDe = async (paciente: { id: number }) =>
  (await pool.query<{ id: number }>('SELECT id FROM paciente WHERE user_id = $1', [paciente.id]))
    .rows[0].id;

export const psicologoIdDe = async (psicologo: { id: number }) =>
  (await pool.query<{ id: number }>('SELECT id FROM psicologo WHERE user_id = $1', [psicologo.id]))
    .rows[0].id;

export async function definirConsentimento(
  pacienteId: number,
  c: { humor?: boolean; habitos?: boolean; escalas?: boolean; diario?: boolean },
) {
  await dono.query(
    `INSERT INTO consentimento
       (paciente_id, compartilha_humor, compartilha_habitos, compartilha_escalas, compartilha_diario)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (paciente_id) DO UPDATE SET
       compartilha_humor = $2, compartilha_habitos = $3, compartilha_escalas = $4, compartilha_diario = $5`,
    [pacienteId, c.humor ?? false, c.habitos ?? false, c.escalas ?? false, c.diario ?? false],
  );
}

interface OpcoesCheckin {
  diasAtras?: number;
  // Hora UTC de criado_em (São Paulo é UTC-3).
  horaUtc?: string;
  humor?: number;
  ansiedade?: number;
  horasSono?: number | null;
  emocoes?: string[];
  gatilhos?: string[];
  diario?: string;
  diarioCompartilhado?: boolean;
  exercicio?: boolean;
}

export async function criarCheckin(pacienteId: number, o: OpcoesCheckin = {}): Promise<number> {
  const { rows } = await dono.query<{ id: number }>(
    `INSERT INTO checkin_diario
       (paciente_id, data, criado_em, emocao_predominante, intensidade_humor, intensidade_ansiedade,
        horas_sono, qualidade_sono, contexto_gatilho, diario_livre, diario_compartilhado)
     VALUES ($1, CURRENT_DATE - $2::int, (CURRENT_DATE - $2::int) + $3::time, $4, $5, $6, $7, 2, $8, $9, $10)
     RETURNING id`,
    [
      pacienteId,
      o.diasAtras ?? 0,
      o.horaUtc ?? '15:00',
      criptografar((o.emocoes ?? ['Calmo']).join(', ')),
      o.humor ?? 6,
      o.ansiedade ?? 4,
      o.horasSono === undefined ? 7 : o.horasSono,
      o.gatilhos ? criptografar(o.gatilhos.join(', ')) : null,
      o.diario ? criptografar(o.diario) : null,
      o.diarioCompartilhado ?? false,
    ],
  );
  if (o.exercicio !== undefined) {
    await dono.query('INSERT INTO habito (checkin_id, exercicio) VALUES ($1, $2)', [
      rows[0].id,
      o.exercicio,
    ]);
  }
  return rows[0].id;
}

/** Cabeçalho Bearer do app mobile. */
export const bearer = (usuario: { id: number }) => ({
  authorization: `Bearer ${jwt.sign({ id: usuario.id }, process.env.JWT_SECRET!)}`,
});

// Apaga o que os testes criaram (as FKs em cascata levam paciente/psicologo junto) e fecha o pool.
// A auditoria é imutável: o trigger só é desligado aqui, dentro de uma transação que o religa
// antes do COMMIT, então nenhuma outra sessão chega a vê-lo desligado.
export async function limpar() {
  const client = await dono.connect();
  try {
    await client.query('BEGIN');
    await client.query('ALTER TABLE auditoria DISABLE TRIGGER trg_auditoria_imutavel');
    await client.query(
      `DELETE FROM auditoria
        WHERE ator_user_id = ANY($1)
           OR paciente_id IN (SELECT id FROM paciente WHERE user_id = ANY($1))
           OR ip = ANY($2::inet[])
           OR alvo_tipo = $3`,
      [idsCriados, ipsUsados, ALVO_TESTE],
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
  await Promise.all([pool.end(), dono.end()]);
}

export const ORIGEM_WEB = 'http://localhost:5173';

// Sem SMTP e fora de produção o mailer escreve o código no console; os testes leem de lá.
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
