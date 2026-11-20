import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { after, before, describe, it } from 'node:test';
import jwt from 'jsonwebtoken';
import { pool } from '../src/db';
import {
  capturarCodigos,
  carregarApp,
  criarCliente,
  criarPsicologo,
  dono,
  entrar,
  iniciar,
  limpar,
  login,
  ultimoCodigo,
  type Cliente,
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

const REFRESH = '/auth/psicologo/refresh';
const sha256 = (valor: string) => createHash('sha256').update(valor).digest('hex');
const sidDe = (cliente: Cliente) => cliente.cookies.get('pl_rt')!.split('.')[0];
const comCookie = (nome: string, valor: string) => ({ cabecalhos: { cookie: `${nome}=${valor}` } });

const sessaoNoBanco = async (sid: string) =>
  (await pool.query('SELECT * FROM sessao WHERE id = $1', [sid])).rows[0];

const acoesDe = async (userId: number) =>
  (
    await pool.query('SELECT acao FROM auditoria WHERE ator_user_id = $1 ORDER BY id', [userId])
  ).rows.map((r) => r.acao);

describe('exigirSessaoWeb', () => {
  it('aceita o cookie pl_at', async () => {
    const psicologo = await criarPsicologo();
    const cliente = await entrar(servidor.url, psicologo);
    const res = await cliente.requisitar('GET', '/psicologo/me');
    assert.equal(res.status, 200);
    assert.equal(((await res.json()) as { email: string }).email, psicologo.email);
  });

  it('o Bearer do mobile não vale em /psicologo (401)', async () => {
    const psicologo = await criarPsicologo();
    const tokenMobile = jwt.sign({ id: psicologo.id, email: psicologo.email }, process.env.JWT_SECRET!, {
      expiresIn: '1d',
    });
    const res = await criarCliente(servidor.url).requisitar('GET', '/psicologo/me', {
      cabecalhos: { authorization: `Bearer ${tokenMobile}` },
    });
    assert.equal(res.status, 401);
  });

  it('rejeita pl_at com audience, tipo ou assinatura errados (401)', async () => {
    const psicologo = await criarPsicologo();
    const cliente = await entrar(servidor.url, psicologo);
    const sid = sidDe(cliente);
    const forjar = (claims: object, segredo: string, audience: string) =>
      jwt.sign(claims, segredo, { subject: String(psicologo.id), audience, expiresIn: 60 });
    const segredo = process.env.JWT_SECRET!;

    for (const token of [
      forjar({ sid, typ: 'access' }, segredo, 'outra-audiencia'),
      forjar({ sid, typ: 'refresh' }, segredo, 'web-psicologo'),
      forjar({ sid, typ: 'access' }, 'outro-segredo', 'web-psicologo'),
    ]) {
      const res = await criarCliente(servidor.url).requisitar('GET', '/psicologo/me', comCookie('pl_at', token));
      assert.equal(res.status, 401);
    }
  });

  it('sessão revogada no banco derruba o pl_at ainda válido (401)', async () => {
    const cliente = await entrar(servidor.url, await criarPsicologo());
    await pool.query('UPDATE sessao SET revogada_em = now() WHERE id = $1', [sidDe(cliente)]);
    assert.equal((await cliente.requisitar('GET', '/psicologo/me')).status, 401);
  });
});

describe('POST /auth/psicologo/refresh', () => {
  it('rotaciona o refresh e emite novos cookies', async () => {
    const cliente = await entrar(servidor.url, await criarPsicologo());
    const sid = sidDe(cliente);
    const [, segredoAntigo] = cliente.cookies.get('pl_rt')!.split('.');

    const res = await cliente.requisitar('POST', REFRESH);
    assert.equal(res.status, 200);
    assert.equal(res.headers.getSetCookie().length, 2);

    const [sidNovo, segredoNovo] = cliente.cookies.get('pl_rt')!.split('.');
    assert.equal(sidNovo, sid);
    assert.notEqual(segredoNovo, segredoAntigo);

    const sessao = await sessaoNoBanco(sid);
    assert.equal(sessao.refresh_hash, sha256(segredoNovo));
    assert.equal(sessao.refresh_anterior_hash, sha256(segredoAntigo));
    assert.ok(sessao.rotacionado_em);
    assert.equal((await cliente.requisitar('GET', '/psicologo/me')).status, 200);
    assert.equal((await cliente.requisitar('POST', REFRESH)).status, 200);
  });

  it('refresh concorrente (anterior, dentro de 10 s) → 409 sem revogar', async () => {
    const cliente = await entrar(servidor.url, await criarPsicologo());
    const sid = sidDe(cliente);
    const refreshAntigo = cliente.cookies.get('pl_rt')!;
    await cliente.requisitar('POST', REFRESH);

    const res = await cliente.requisitar('POST', REFRESH, comCookie('pl_rt', refreshAntigo));
    assert.equal(res.status, 409);
    assert.equal(((await res.json()) as { codigo: string }).codigo, 'REFRESH_CONCORRENTE');
    assert.equal(res.headers.getSetCookie().length, 0);
    assert.equal((await sessaoNoBanco(sid)).revogada_em, null);
    assert.equal((await cliente.requisitar('GET', '/psicologo/me')).status, 200);
    assert.equal((await cliente.requisitar('POST', REFRESH)).status, 200);
  });

  it('duas rotações simultâneas: uma vence, a outra recebe 409', async () => {
    const cliente = await entrar(servidor.url, await criarPsicologo());
    const refresh = cliente.cookies.get('pl_rt')!;
    const respostas = await Promise.all([
      criarCliente(servidor.url).requisitar('POST', REFRESH, comCookie('pl_rt', refresh)),
      criarCliente(servidor.url).requisitar('POST', REFRESH, comCookie('pl_rt', refresh)),
    ]);
    assert.deepEqual(respostas.map((r) => r.status).sort(), [200, 409]);
  });

  it('reuso do refresh antigo fora de 10 s revoga a sessão e derruba o pl_at', async () => {
    const psicologo = await criarPsicologo();
    const cliente = await entrar(servidor.url, psicologo);
    const sid = sidDe(cliente);
    const refreshAntigo = cliente.cookies.get('pl_rt')!;
    await cliente.requisitar('POST', REFRESH);
    const acessoVigente = cliente.cookies.get('pl_at')!;
    assert.equal((await cliente.requisitar('GET', '/psicologo/me')).status, 200);

    await pool.query("UPDATE sessao SET rotacionado_em = now() - interval '11 seconds' WHERE id = $1", [sid]);
    const res = await cliente.requisitar('POST', REFRESH, comCookie('pl_rt', refreshAntigo));
    assert.equal(res.status, 401);
    assert.equal(res.headers.getSetCookie().length, 2);

    assert.ok((await sessaoNoBanco(sid)).revogada_em);
    const comAcesso = await criarCliente(servidor.url).requisitar('GET', '/psicologo/me', comCookie('pl_at', acessoVigente));
    assert.equal(comAcesso.status, 401);
    assert.ok((await acoesDe(psicologo.id)).includes('sessao_reuso_detectado'));
  });

  it('segredo inventado para uma sessão real também revoga', async () => {
    const cliente = await entrar(servidor.url, await criarPsicologo());
    const sid = sidDe(cliente);
    const res = await cliente.requisitar('POST', REFRESH, comCookie('pl_rt', `${sid}.segredo-inventado`));
    assert.equal(res.status, 401);
    assert.ok((await sessaoNoBanco(sid)).revogada_em);
  });

  it('inatividade acima de 30 min → 401 e cookies limpos', async () => {
    const cliente = await entrar(servidor.url, await criarPsicologo());
    const acesso = cliente.cookies.get('pl_at')!;
    await pool.query("UPDATE sessao SET ultimo_uso_em = now() - interval '31 minutes' WHERE id = $1", [
      sidDe(cliente),
    ]);

    const res = await cliente.requisitar('POST', REFRESH);
    assert.equal(res.status, 401);
    assert.equal(cliente.cookies.size, 0);
    const comAcesso = await criarCliente(servidor.url).requisitar('GET', '/psicologo/me', comCookie('pl_at', acesso));
    assert.equal(comAcesso.status, 401);
  });

  it('limite absoluto de 12 h → 401', async () => {
    const cliente = await entrar(servidor.url, await criarPsicologo());
    await pool.query("UPDATE sessao SET expira_absoluto_em = now() - interval '1 second' WHERE id = $1", [
      sidDe(cliente),
    ]);
    assert.equal((await cliente.requisitar('POST', REFRESH)).status, 401);
  });

  it('sem cookie ou com cookie malformado → 401', async () => {
    const cliente = criarCliente(servidor.url);
    assert.equal((await cliente.requisitar('POST', REFRESH)).status, 401);
    assert.equal((await cliente.requisitar('POST', REFRESH, comCookie('pl_rt', 'nao-e-uuid.x'))).status, 401);
  });
});

describe('POST /auth/psicologo/logout', () => {
  it('revoga a sessão, limpa os cookies e audita', async () => {
    const psicologo = await criarPsicologo();
    const cliente = await entrar(servidor.url, psicologo);
    const sid = sidDe(cliente);
    const acesso = cliente.cookies.get('pl_at')!;
    const refresh = cliente.cookies.get('pl_rt')!;

    const res = await cliente.requisitar('POST', '/auth/psicologo/logout');
    assert.equal(res.status, 200);
    assert.equal(cliente.cookies.size, 0);
    assert.ok((await sessaoNoBanco(sid)).revogada_em);

    const outro = criarCliente(servidor.url);
    assert.equal((await outro.requisitar('GET', '/psicologo/me', comCookie('pl_at', acesso))).status, 401);
    assert.equal((await outro.requisitar('POST', REFRESH, comCookie('pl_rt', refresh))).status, 401);
    assert.deepEqual(await acoesDe(psicologo.id), ['login_ok', '2fa_ok', 'logout']);
  });

  it('sem sessão → 401', async () => {
    const res = await criarCliente(servidor.url).requisitar('POST', '/auth/psicologo/logout');
    assert.equal(res.status, 401);
  });
});

describe('Origin (CSRF)', () => {
  it('escrita sem Origin ou com Origin fora da lista → 403', async () => {
    const psicologo = await criarPsicologo();
    const cliente = await entrar(servidor.url, psicologo);
    const dados = { nome: 'Nome Novo', especialidade: 'TCC' };

    for (const origem of [null, 'https://invasor.exemplo', 'http://localhost:5173/']) {
      const comSessao = await cliente.requisitar('PATCH', '/psicologo/me', { corpo: dados, origem });
      assert.equal(comSessao.status, 403, String(origem));
      const login = await cliente.requisitar('POST', '/auth/psicologo/login', {
        corpo: { email: psicologo.email, password: psicologo.senha },
        origem,
      });
      assert.equal(login.status, 403, String(origem));
    }
    assert.equal((await cliente.requisitar('POST', '/auth/psicologo/logout', { origem: null })).status, 403);
    assert.equal((await sessaoNoBanco(sidDe(cliente))).revogada_em, null);
  });

  it('GET não exige Origin e as rotas do mobile ficam fora da regra', async () => {
    const cliente = await entrar(servidor.url, await criarPsicologo());
    assert.equal((await cliente.requisitar('GET', '/psicologo/me', { origem: null })).status, 200);
    const mobile = await criarCliente(servidor.url).requisitar('POST', '/auth/login', {
      corpo: {},
      origem: null,
    });
    assert.equal(mobile.status, 400);
  });
});

// Login só com a senha: devolve o cliente com o desafio 2FA ainda pendente e o código enviado.
async function desafioPendente(psicologo: { email: string; senha: string }) {
  const cliente = criarCliente(servidor.url);
  const { desafioId } = (await login(cliente, psicologo.email, psicologo.senha)).corpo;
  const codigo = String(ultimoCodigo(psicologo.email));
  return {
    cliente,
    concluir: () => cliente.requisitar('POST', '/auth/psicologo/2fa', { corpo: { desafioId, codigo } }),
  };
}

describe('redefinição de senha', () => {
  const redefinir = (email: string) => {
    const tokenReset = jwt.sign({ email, tipo: 'redefinicao' }, process.env.JWT_SECRET!, { expiresIn: '10m' });
    return criarCliente(servidor.url).requisitar('POST', '/auth/redefinir-senha', {
      corpo: { token: tokenReset, password: 'NovaSenha!12345' },
      origem: null,
    });
  };

  it('recusa senha fraca na redefinição', async () => {
    const psicologo = await criarPsicologo();
    const tokenReset = jwt.sign({ email: psicologo.email, tipo: 'redefinicao' }, process.env.JWT_SECRET!, { expiresIn: '10m' });
    const res = await criarCliente(servidor.url).requisitar('POST', '/auth/redefinir-senha', {
      corpo: { token: tokenReset, password: 'Senha@123' },
      origem: null,
    });
    assert.equal(res.status, 400);
    assert.match(JSON.stringify(await res.json()), /Senha fácil de adivinhar/);
  });

  it('revoga todas as sessões web da conta', async () => {
    const psicologo = await criarPsicologo();
    const [a, b] = [await entrar(servidor.url, psicologo), await entrar(servidor.url, psicologo)];

    const res = await redefinir(psicologo.email);
    assert.equal(res.status, 200);

    for (const cliente of [a, b]) {
      assert.equal((await cliente.requisitar('GET', '/psicologo/me')).status, 401);
      assert.equal((await cliente.requisitar('POST', REFRESH)).status, 401);
    }
    const { rows } = await pool.query('SELECT count(*) AS vivas FROM sessao WHERE user_id = $1 AND revogada_em IS NULL', [
      psicologo.id,
    ]);
    assert.equal(Number(rows[0].vivas), 0);
  });

  it('o desafio 2FA pedido antes da redefinição não abre sessão depois dela', async () => {
    const psicologo = await criarPsicologo();
    const pendente = await desafioPendente(psicologo);
    assert.equal((await redefinir(psicologo.email)).status, 200);
    assert.equal((await pendente.concluir()).status, 400);
    assert.equal(pendente.cliente.cookies.size, 0);
  });

  it('com a troca de senha ainda em andamento, o 2FA espera por ela e não abre sessão', async () => {
    const psicologo = await criarPsicologo();
    const pendente = await desafioPendente(psicologo);

    // A transação da troca, parada logo depois do UPDATE em users (que trava a linha).
    const troca = await dono.connect();
    try {
      await troca.query('BEGIN');
      await troca.query('UPDATE users SET sessao_invalidada_em = now() WHERE id = $1', [psicologo.id]);
      const pedido = pendente.concluir();
      // Sem a trava no 2FA, a sessão abriria aqui, antes de a troca revogar qualquer coisa.
      const terminouAntes = await Promise.race([
        pedido.then(() => true),
        new Promise<boolean>((resolver) => setTimeout(() => resolver(false), 1000)),
      ]);
      assert.equal(terminouAntes, false);
      await troca.query('UPDATE desafio_2fa SET usado_em = now() WHERE user_id = $1 AND usado_em IS NULL', [
        psicologo.id,
      ]);
      await troca.query('COMMIT');
      assert.equal((await pedido).status, 400);
      assert.equal(pendente.cliente.cookies.size, 0);
    } finally {
      // Descarta a conexão: se uma asserção falhou no meio, a transação morre com ela.
      troca.release(true);
    }
  });
});

describe('conta do psicólogo', () => {
  it('PATCH /me atualiza nome e especialidade e valida o corpo', async () => {
    const psicologo = await criarPsicologo();
    const cliente = await entrar(servidor.url, psicologo);

    const res = await cliente.requisitar('PATCH', '/psicologo/me', {
      corpo: { nome: '  Dra. Nova  ', especialidade: ' Terapia cognitiva ' },
    });
    assert.equal(res.status, 200);
    const perfil = (await res.json()) as { nome: string; especialidade: string; email: string };
    assert.equal(perfil.nome, 'Dra. Nova');
    assert.equal(perfil.especialidade, 'Terapia cognitiva');
    assert.equal(perfil.email, psicologo.email);

    const invalido = await cliente.requisitar('PATCH', '/psicologo/me', { corpo: { nome: 'A' } });
    assert.equal(invalido.status, 400);
  });

  it('POST /me/senha: erra a atual (400), troca, mantém só a sessão corrente e audita', async () => {
    const psicologo = await criarPsicologo();
    const atual = await entrar(servidor.url, psicologo);
    const outra = await entrar(servidor.url, psicologo);
    const troca = (senhaAtual: string, novaSenha: string) =>
      atual.requisitar('POST', '/psicologo/me/senha', { corpo: { senhaAtual, novaSenha } });

    assert.equal((await troca('senha-errada', 'NovaSenha!12345')).status, 400);
    assert.equal((await troca(psicologo.senha, 'curta')).status, 400);
    assert.equal((await troca(psicologo.senha, 'Senha@123')).status, 400);
    assert.equal((await outra.requisitar('GET', '/psicologo/me')).status, 200);

    const pendente = await desafioPendente(psicologo);
    assert.equal((await troca(psicologo.senha, 'NovaSenha!12345')).status, 200);
    assert.equal((await pendente.concluir()).status, 400);
    assert.equal((await atual.requisitar('GET', '/psicologo/me')).status, 200);
    assert.equal((await outra.requisitar('GET', '/psicologo/me')).status, 401);
    assert.ok((await acoesDe(psicologo.id)).includes('senha_alterada'));

    const novoLogin = await login(criarCliente(servidor.url), psicologo.email, 'NovaSenha!12345');
    assert.equal(novoLogin.res.status, 200);
  });

  it('GET /me/sessoes lista só as vivas, marca a atual e nunca expõe hash', async () => {
    const psicologo = await criarPsicologo();
    const atual = await entrar(servidor.url, psicologo);
    const outra = await entrar(servidor.url, psicologo);
    const encerrada = await entrar(servidor.url, psicologo);
    await encerrada.requisitar('POST', '/auth/psicologo/logout');

    const res = await atual.requisitar('GET', '/psicologo/me/sessoes');
    assert.equal(res.status, 200);
    const { sessoes } = (await res.json()) as { sessoes: Array<Record<string, unknown>> };
    assert.equal(sessoes.length, 2);
    for (const s of sessoes) {
      assert.deepEqual(Object.keys(s).sort(), ['atual', 'criadoEm', 'id', 'ip', 'ultimoUsoEm', 'userAgent']);
    }
    assert.deepEqual(
      sessoes.filter((s) => s.atual).map((s) => s.id),
      [sidDe(atual)],
    );
    assert.ok(sessoes.some((s) => s.id === sidDe(outra) && s.atual === false));
  });

  it('POST /me/sessoes/encerrar-outras revoga as outras, mantém a atual e audita', async () => {
    const psicologo = await criarPsicologo();
    const atual = await entrar(servidor.url, psicologo);
    const outra = await entrar(servidor.url, psicologo);

    const res = await atual.requisitar('POST', '/psicologo/me/sessoes/encerrar-outras');
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { encerradas: 1 });
    assert.equal((await atual.requisitar('GET', '/psicologo/me')).status, 200);
    assert.equal((await outra.requisitar('GET', '/psicologo/me')).status, 401);

    const { rows } = await pool.query(
      "SELECT metadados FROM auditoria WHERE ator_user_id = $1 AND acao = 'sessoes_encerradas'",
      [psicologo.id],
    );
    assert.deepEqual(rows[0].metadados, { quantidade: 1 });
  });
});
