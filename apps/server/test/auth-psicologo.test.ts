import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { after, before, describe, it } from 'node:test';
import jwt from 'jsonwebtoken';
import { pool } from '../src/db';
import {
  capturarCodigos,
  carregarApp,
  criarCliente,
  criarPaciente,
  criarPsicologo,
  iniciar,
  limpar,
  login,
  ultimoCodigo,
} from './ajuda';

capturarCodigos();
const app = carregarApp({ TRUST_PROXY: '1' });

let servidor: Awaited<ReturnType<typeof iniciar>>;
before(async () => {
  servidor = await iniciar(app);
});
after(async () => {
  servidor.fechar();
  await limpar();
});

const desafiosDe = async (userId: number) =>
  Number(
    (await pool.query('SELECT count(*) AS n FROM desafio_2fa WHERE user_id = $1', [userId])).rows[0]
      .n,
  );

describe('POST /auth/psicologo/login', () => {
  it('a rota antiga /auth/login-psicologo não existe mais', async () => {
    const psicologo = await criarPsicologo();
    const res = await criarCliente(servidor.url).requisitar('POST', '/auth/login-psicologo', {
      corpo: { email: psicologo.email, password: psicologo.senha },
    });
    assert.equal(res.status, 404);
  });

  it('nega paciente com credenciais válidas e nunca cria desafio (403)', async () => {
    const paciente = await criarPaciente();
    const { res } = await login(criarCliente(servidor.url), paciente.email, paciente.senha);
    assert.equal(res.status, 403);
    assert.equal(await desafiosDe(paciente.id), 0);
    assert.equal(ultimoCodigo(paciente.email), undefined);
  });

  it('senha errada e e-mail inexistente recebem a mesma resposta (400)', async () => {
    const psicologo = await criarPsicologo();
    const cliente = criarCliente(servidor.url);
    const senhaErrada = await login(cliente, psicologo.email, 'senha-errada-123');
    const semConta = await login(cliente, 'ninguem@psychelink.test', 'senha-errada-123');
    assert.equal(senhaErrada.res.status, 400);
    assert.equal(semConta.res.status, 400);
    assert.deepEqual(senhaErrada.corpo, semConta.corpo);
  });

  it('exige e-mail verificado (403 EMAIL_NAO_VERIFICADO)', async () => {
    const psicologo = await criarPsicologo();
    await pool.query('UPDATE users SET email_verificado = false WHERE id = $1', [psicologo.id]);
    const { res, corpo } = await login(criarCliente(servidor.url), psicologo.email, psicologo.senha);
    assert.equal(res.status, 403);
    assert.equal(corpo.codigo, 'EMAIL_NAO_VERIFICADO');
    assert.equal(await desafiosDe(psicologo.id), 0);
  });

  it('com credenciais válidas envia o código e devolve só o desafio, sem token nem cookie', async () => {
    const psicologo = await criarPsicologo();
    const { res, corpo } = await login(criarCliente(servidor.url), psicologo.email, psicologo.senha);
    assert.equal(res.status, 200);
    assert.deepEqual(Object.keys(corpo).sort(), ['desafioId', 'emailMascarado', 'reenviarEm']);
    assert.equal(res.headers.getSetCookie().length, 0);
    assert.match(corpo.desafioId, /^[\w-]{43}$/);
    assert.equal(corpo.emailMascarado, `${psicologo.email[0]}•••@psychelink.test`);

    const codigo = ultimoCodigo(psicologo.email);
    assert.match(String(codigo), /^\d{6}$/);
    const { rows } = await pool.query(
      `SELECT codigo_hash, tentativas, expira_em > now() + interval '9 minutes' AS dez_min,
              reenviado_em + interval '60 seconds' AS reenviar_em
         FROM desafio_2fa WHERE id = $1`,
      [corpo.desafioId],
    );
    assert.notEqual(rows[0].codigo_hash, String(codigo));
    assert.equal(rows[0].tentativas, 0);
    assert.equal(rows[0].dez_min, true);
    assert.equal(corpo.reenviarEm, rows[0].reenviar_em.toISOString());
  });

  it('só o login não dá acesso: /psicologo/me continua em 401', async () => {
    const psicologo = await criarPsicologo();
    const cliente = criarCliente(servidor.url);
    await login(cliente, psicologo.email, psicologo.senha);
    assert.equal((await cliente.requisitar('GET', '/psicologo/me')).status, 401);
  });

  it('um novo login invalida o desafio anterior', async () => {
    const psicologo = await criarPsicologo();
    const cliente = criarCliente(servidor.url);
    const primeiro = (await login(cliente, psicologo.email, psicologo.senha)).corpo.desafioId;
    const codigoPrimeiro = ultimoCodigo(psicologo.email);
    await login(cliente, psicologo.email, psicologo.senha);

    const res = await cliente.requisitar('POST', '/auth/psicologo/2fa', {
      corpo: { desafioId: primeiro, codigo: String(codigoPrimeiro) },
    });
    assert.equal(res.status, 400);
  });
});

describe('POST /auth/psicologo/2fa', () => {
  const enviar = (cliente: ReturnType<typeof criarCliente>, desafioId: string, codigo: string) =>
    cliente.requisitar('POST', '/auth/psicologo/2fa', { corpo: { desafioId, codigo } });

  async function novoDesafio() {
    const psicologo = await criarPsicologo();
    const cliente = criarCliente(servidor.url);
    const { desafioId } = (await login(cliente, psicologo.email, psicologo.senha)).corpo;
    const codigo = String(ultimoCodigo(psicologo.email));
    const errado = codigo === '111111' ? '222222' : '111111';
    return { psicologo, cliente, desafioId, codigo, errado };
  }

  it('código errado incrementa as tentativas e a 6ª falha até com o código certo', async () => {
    const { cliente, desafioId, codigo, errado } = await novoDesafio();

    for (let i = 1; i <= 5; i++) {
      const res = await enviar(cliente, desafioId, errado);
      assert.equal(res.status, 400);
      const { rows } = await pool.query('SELECT tentativas FROM desafio_2fa WHERE id = $1', [desafioId]);
      assert.equal(rows[0].tentativas, i);
    }

    const sexta = await enviar(cliente, desafioId, codigo);
    assert.equal(sexta.status, 400);
    assert.equal(sexta.headers.getSetCookie().length, 0);
    assert.equal(cliente.cookies.size, 0);
  });

  it('código expirado falha', async () => {
    const { cliente, desafioId, codigo } = await novoDesafio();
    await pool.query("UPDATE desafio_2fa SET expira_em = now() - interval '1 second' WHERE id = $1", [
      desafioId,
    ]);
    assert.equal((await enviar(cliente, desafioId, codigo)).status, 400);
    assert.equal(cliente.cookies.size, 0);
  });

  it('desafio criado antes de uma troca de senha não abre sessão', async () => {
    const { psicologo, cliente, desafioId, codigo } = await novoDesafio();
    await pool.query('UPDATE users SET sessao_invalidada_em = now() WHERE id = $1', [psicologo.id]);
    assert.equal((await enviar(cliente, desafioId, codigo)).status, 400);
    assert.equal(cliente.cookies.size, 0);
  });

  it('desafio já usado não serve de novo', async () => {
    const { cliente, desafioId, codigo } = await novoDesafio();
    assert.equal((await enviar(cliente, desafioId, codigo)).status, 200);
    const segundo = criarCliente(servidor.url);
    assert.equal((await enviar(segundo, desafioId, codigo)).status, 400);
    assert.equal(segundo.cookies.size, 0);
  });

  it('desafio inexistente e formato inválido falham (400)', async () => {
    const cliente = criarCliente(servidor.url);
    assert.equal((await enviar(cliente, 'inexistente', '123456')).status, 400);
    const { desafioId } = await novoDesafio();
    assert.equal((await enviar(cliente, desafioId, '12345')).status, 400);
    const comoNumero = await cliente.requisitar('POST', '/auth/psicologo/2fa', {
      corpo: { desafioId, codigo: 123456 },
    });
    assert.equal(comoNumero.status, 400);
  });

  it('sucesso abre a sessão com cookies HttpOnly, Secure, SameSite=Strict e Path', async () => {
    const { psicologo, cliente, desafioId, codigo } = await novoDesafio();
    const res = await cliente.requisitar('POST', '/auth/psicologo/2fa', {
      corpo: { desafioId, codigo },
      cabecalhos: { 'user-agent': 'x'.repeat(300) },
    });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true });

    const cookies = res.headers.getSetCookie();
    const acesso = cookies.find((c) => c.startsWith('pl_at='))!;
    const refresh = cookies.find((c) => c.startsWith('pl_rt='))!;
    assert.equal(cookies.length, 2);
    for (const c of [acesso, refresh]) {
      assert.match(c, /; HttpOnly/);
      assert.match(c, /; Secure/);
      assert.match(c, /; SameSite=Strict/);
    }
    assert.match(acesso, /; Path=\/api(;|$)/);
    assert.match(refresh, /; Path=\/api\/auth\/psicologo\/refresh(;|$)/);

    const payload = jwt.verify(cliente.cookies.get('pl_at')!, process.env.JWT_SECRET!) as jwt.JwtPayload;
    assert.equal(payload.sub, String(psicologo.id));
    assert.equal(payload.typ, 'access');
    assert.equal(payload.aud, 'web-psicologo');
    assert.equal(payload.exp! - payload.iat!, 15 * 60);

    const [sid, segredo] = cliente.cookies.get('pl_rt')!.split('.');
    assert.equal(payload.sid, sid);
    const { rows } = await pool.query(
      `SELECT refresh_hash, host(ip) AS ip, length(user_agent) AS ua,
              expira_absoluto_em - criado_em = interval '12 hours' AS doze_h
         FROM sessao WHERE id = $1`,
      [sid],
    );
    assert.equal(rows[0].refresh_hash, createHash('sha256').update(segredo).digest('hex'));
    assert.match(rows[0].ip, /^10\./);
    assert.equal(rows[0].ua, 200);
    assert.equal(rows[0].doze_h, true);

    assert.equal((await cliente.requisitar('GET', '/psicologo/me')).status, 200);
  });
});

describe('POST /auth/psicologo/2fa/reenviar', () => {
  it('respeita o intervalo de 60 s e, depois dele, troca o código e zera as tentativas', async () => {
    const psicologo = await criarPsicologo();
    const cliente = criarCliente(servidor.url);
    const { desafioId } = (await login(cliente, psicologo.email, psicologo.senha)).corpo;
    const codigoAntigo = ultimoCodigo(psicologo.email);
    const errado = codigoAntigo === 111111 ? '222222' : '111111';
    const enviar = (codigo: string) =>
      cliente.requisitar('POST', '/auth/psicologo/2fa', { corpo: { desafioId, codigo } });
    const reenviar = () =>
      cliente.requisitar('POST', '/auth/psicologo/2fa/reenviar', { corpo: { desafioId } });

    await enviar(errado);
    const cedo = await reenviar();
    assert.equal(cedo.status, 429);
    assert.ok(((await cedo.json()) as { reenviarEm: string }).reenviarEm);

    await pool.query(
      `UPDATE desafio_2fa SET reenviado_em = now() - interval '61 seconds',
                              expira_em = now() + interval '1 minute' WHERE id = $1`,
      [desafioId],
    );
    const hashAntes = (await pool.query('SELECT codigo_hash FROM desafio_2fa WHERE id = $1', [desafioId]))
      .rows[0].codigo_hash;
    const res = await reenviar();
    assert.equal(res.status, 200);
    assert.ok(((await res.json()) as { reenviarEm: string }).reenviarEm);

    const { rows } = await pool.query(
      "SELECT codigo_hash, tentativas, expira_em > now() + interval '9 minutes' AS estendido FROM desafio_2fa WHERE id = $1",
      [desafioId],
    );
    assert.notEqual(rows[0].codigo_hash, hashAntes);
    assert.equal(rows[0].tentativas, 0);
    assert.equal(rows[0].estendido, true);

    const codigoNovo = ultimoCodigo(psicologo.email);
    assert.equal((await enviar(String(codigoAntigo))).status, 400);
    assert.equal((await enviar(String(codigoNovo))).status, 200);
  });

  it('não ressuscita desafio expirado nem estende além de 30 min do login', async () => {
    const psicologo = await criarPsicologo();
    const cliente = criarCliente(servidor.url);
    const { desafioId } = (await login(cliente, psicologo.email, psicologo.senha)).corpo;
    const reenviar = () =>
      cliente.requisitar('POST', '/auth/psicologo/2fa/reenviar', { corpo: { desafioId } });

    await pool.query(
      `UPDATE desafio_2fa SET reenviado_em = now() - interval '61 seconds', tentativas = 5,
                              expira_em = now() - interval '1 second' WHERE id = $1`,
      [desafioId],
    );
    assert.equal((await reenviar()).status, 400);
    const expirado = await pool.query(
      'SELECT tentativas, expira_em < now() AS vencido FROM desafio_2fa WHERE id = $1',
      [desafioId],
    );
    assert.equal(expirado.rows[0].tentativas, 5);
    assert.equal(expirado.rows[0].vencido, true);

    await pool.query(
      `UPDATE desafio_2fa SET criado_em = now() - interval '25 minutes',
                              expira_em = now() + interval '1 minute' WHERE id = $1`,
      [desafioId],
    );
    assert.equal((await reenviar()).status, 200);
    const { rows } = await pool.query(
      `SELECT expira_em = criado_em + interval '30 minutes' AS no_teto FROM desafio_2fa WHERE id = $1`,
      [desafioId],
    );
    assert.equal(rows[0].no_teto, true);
  });

  it('desafio inexistente ou já usado → 400', async () => {
    const cliente = criarCliente(servidor.url);
    const res = await cliente.requisitar('POST', '/auth/psicologo/2fa/reenviar', {
      corpo: { desafioId: 'inexistente' },
    });
    assert.equal(res.status, 400);
  });
});
