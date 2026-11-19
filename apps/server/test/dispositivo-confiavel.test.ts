import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { pool } from '../src/db';
import {
  capturarCodigos,
  carregarApp,
  criarCliente,
  criarPsicologo,
  entrar,
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

type Psicologo = Awaited<ReturnType<typeof criarPsicologo>>;

/** Senha + código com "confiar"; devolve o Set-Cookie do pl_dc e o token. */
async function entrarConfiando(psicologo: Psicologo) {
  const cliente = criarCliente(servidor.url);
  const { desafioId } = (await login(cliente, psicologo.email, psicologo.senha)).corpo;
  const res = await cliente.requisitar('POST', '/auth/psicologo/2fa', {
    corpo: { desafioId, codigo: String(ultimoCodigo(psicologo.email)), confiar: true },
  });
  assert.equal(res.status, 200);
  const linha = res.headers.getSetCookie().find((c) => c.startsWith('pl_dc='));
  return { cliente, linha, token: cliente.cookies.get('pl_dc')! };
}

/** Navegador novo que só guarda o pl_dc (como depois de sair da conta). */
function navegadorCom(token: string) {
  const cliente = criarCliente(servidor.url);
  cliente.cookies.set('pl_dc', token);
  return cliente;
}

const pedeCodigo = async (cliente: ReturnType<typeof criarCliente>, psicologo: Psicologo) =>
  'desafioId' in (await login(cliente, psicologo.email, psicologo.senha)).corpo;

describe('confiar neste navegador (2FA)', () => {
  it('sem marcar, nada é guardado e o próximo login pede código', async () => {
    const psicologo = await criarPsicologo();
    const cliente = await entrar(servidor.url, psicologo);
    assert.equal(cliente.cookies.has('pl_dc'), false);
    assert.equal(await pedeCodigo(cliente, psicologo), true);
  });

  it('marcado: cookie restrito ao login, e o login seguinte com a senha certa entra sem código', async () => {
    const psicologo = await criarPsicologo();
    const { linha, token } = await entrarConfiando(psicologo);
    assert.match(linha!, /Path=\/api\/auth\/psicologo\/login/);
    assert.match(linha!, /HttpOnly/);
    assert.match(linha!, /Secure/);
    assert.match(linha!, /SameSite=Strict/);
    assert.match(linha!, /Max-Age=2592000/);

    const navegador = navegadorCom(token);
    const { res, corpo } = await login(navegador, psicologo.email, psicologo.senha);
    assert.equal(res.status, 200);
    assert.equal('desafioId' in corpo, false);
    assert.equal((await navegador.requisitar('GET', '/psicologo/me')).status, 200);

    const { rows } = await pool.query(
      `SELECT metadados FROM auditoria WHERE ator_user_id = $1 AND acao = '2fa_ok' ORDER BY criado_em DESC LIMIT 1`,
      [psicologo.id],
    );
    assert.deepEqual(rows[0].metadados, { dispositivoConfiavel: true });
  });

  it('o token não dispensa a senha nem vale para outra conta', async () => {
    const psicologo = await criarPsicologo();
    const outro = await criarPsicologo();
    const { token } = await entrarConfiando(psicologo);

    const errada = await login(navegadorCom(token), psicologo.email, 'senha-errada');
    assert.equal(errada.res.status, 400);
    assert.equal(await pedeCodigo(navegadorCom(token), outro), true);
  });

  it('vencido, deixa de valer', async () => {
    const psicologo = await criarPsicologo();
    const { token } = await entrarConfiando(psicologo);
    await pool.query(`UPDATE dispositivo_confiavel SET expira_em = now() - interval '1 second' WHERE user_id = $1`, [
      psicologo.id,
    ]);
    assert.equal(await pedeCodigo(navegadorCom(token), psicologo), true);
  });

  it('trocar a senha revoga todos os navegadores confiáveis', async () => {
    const psicologo = await criarPsicologo();
    const { cliente, token } = await entrarConfiando(psicologo);
    const troca = await cliente.requisitar('POST', '/psicologo/me/senha', {
      corpo: { senhaAtual: psicologo.senha, novaSenha: 'NovaSenha!12345' },
    });
    assert.equal(troca.status, 200);
    assert.equal(await pedeCodigo(navegadorCom(token), { ...psicologo, senha: 'NovaSenha!12345' }), true);
  });

  it('"esquecer navegadores" revoga todos, limpa o cookie e zera a contagem', async () => {
    const psicologo = await criarPsicologo();
    const { cliente, token } = await entrarConfiando(psicologo);
    await entrarConfiando(psicologo);

    const antes = (await (await cliente.requisitar('GET', '/psicologo/me/sessoes')).json()) as {
      dispositivosConfiaveis: number;
    };
    assert.equal(antes.dispositivosConfiaveis, 2);

    const res = await cliente.requisitar('POST', '/psicologo/me/dispositivos/esquecer');
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { esquecidos: 2 });
    assert.equal(cliente.cookies.has('pl_dc'), false);

    const depois = (await (await cliente.requisitar('GET', '/psicologo/me/sessoes')).json()) as {
      dispositivosConfiaveis: number;
    };
    assert.equal(depois.dispositivosConfiaveis, 0);
    assert.equal(await pedeCodigo(navegadorCom(token), psicologo), true);
  });
});
