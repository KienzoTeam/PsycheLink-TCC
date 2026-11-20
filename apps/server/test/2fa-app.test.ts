import assert from 'node:assert/strict';
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

type Paciente = Awaited<ReturnType<typeof criarPaciente>>;

const entrarNoApp = (paciente: Paciente, dispositivo?: string) =>
  criarCliente(servidor.url).requisitar('POST', '/auth/login', {
    corpo: { email: paciente.email, password: paciente.senha },
    origem: null,
    cabecalhos: dispositivo ? { 'x-dispositivo': dispositivo } : {},
  });

const confirmar = (desafioId: string, codigo: number, confiar?: boolean) =>
  criarCliente(servidor.url).requisitar('POST', '/auth/2fa', {
    corpo: { desafioId, codigo: String(codigo).padStart(6, '0'), confiar },
    origem: null,
  });

/** Login + código; devolve o corpo do /2fa (token, usuario, dispositivo?). */
async function entrarComCodigo(paciente: Paciente, confiar?: boolean) {
  const { desafioId } = await (await entrarNoApp(paciente)).json();
  const res = await confirmar(desafioId, ultimoCodigo(paciente.email), confiar);
  assert.equal(res.status, 200);
  return res.json() as Promise<{ token: string; usuario: Record<string, unknown>; dispositivo?: string }>;
}

describe('2FA no app do paciente', () => {
  it('código certo entrega o token e o mesmo perfil do GET /me; sem "confiar", nenhum dispositivo', async () => {
    const paciente = await criarPaciente('Paciente do 2FA');
    const { token, usuario, dispositivo } = await entrarComCodigo(paciente);
    assert.equal(dispositivo, undefined);

    const me = await criarCliente(servidor.url).requisitar('GET', '/auth/me', {
      cabecalhos: { authorization: `Bearer ${token}` },
      origem: null,
    });
    assert.equal(me.status, 200);
    assert.deepEqual(usuario, await me.json());
  });

  it('código errado: 400, e o desafio aceita no máximo 5 tentativas', async () => {
    const paciente = await criarPaciente();
    const { desafioId } = await (await entrarNoApp(paciente)).json();
    const certo = ultimoCodigo(paciente.email);
    const errado = (certo + 1) % 1_000_000;
    for (let i = 0; i < 5; i++) assert.equal((await confirmar(desafioId, errado)).status, 400);
    assert.equal((await confirmar(desafioId, certo)).status, 400);
  });

  it('"confiar": o próximo login com a senha e o cabeçalho entra direto; sem o cabeçalho, pede código', async () => {
    const paciente = await criarPaciente();
    const { dispositivo } = await entrarComCodigo(paciente, true);
    assert.equal(typeof dispositivo, 'string');

    const direto = await (await entrarNoApp(paciente, dispositivo)).json();
    assert.equal(typeof direto.token, 'string');
    assert.equal(direto.desafioId, undefined);

    const semCabecalho = await (await entrarNoApp(paciente)).json();
    assert.equal(typeof semCabecalho.desafioId, 'string');

    const senhaErrada = await criarCliente(servidor.url).requisitar('POST', '/auth/login', {
      corpo: { email: paciente.email, password: 'senha-errada' },
      origem: null,
      cabecalhos: { 'x-dispositivo': dispositivo! },
    });
    assert.equal(senhaErrada.status, 400);
  });

  it('desafio do app não abre sessão no painel, e o do painel não vira token do app', async () => {
    const paciente = await criarPaciente();
    const { desafioId: doApp } = await (await entrarNoApp(paciente)).json();
    const noPainel = await criarCliente(servidor.url).requisitar('POST', '/auth/psicologo/2fa', {
      corpo: { desafioId: doApp, codigo: String(ultimoCodigo(paciente.email)).padStart(6, '0') },
    });
    assert.equal(noPainel.status, 400);

    const psicologo = await criarPsicologo();
    const { desafioId: doPainel } = (await login(criarCliente(servidor.url), psicologo.email, psicologo.senha)).corpo;
    assert.equal((await confirmar(doPainel, ultimoCodigo(psicologo.email))).status, 400);
  });

  it('redefinir a senha revoga o celular confiável', async () => {
    const paciente = await criarPaciente();
    const { dispositivo } = await entrarComCodigo(paciente, true);
    const tokenReset = jwt.sign({ email: paciente.email, tipo: 'redefinicao' }, process.env.JWT_SECRET!, { expiresIn: '10m' });
    const reset = await criarCliente(servidor.url).requisitar('POST', '/auth/redefinir-senha', {
      corpo: { token: tokenReset, password: 'NovaSenha!12345' },
      origem: null,
    });
    assert.equal(reset.status, 200);
    const depois = await (await entrarNoApp({ ...paciente, senha: 'NovaSenha!12345' }, dispositivo)).json();
    assert.equal(typeof depois.desafioId, 'string');
  });

  it('reenviar: espera 60 s; depois manda outro código e o antigo deixa de valer', async () => {
    const paciente = await criarPaciente();
    const { desafioId } = await (await entrarNoApp(paciente)).json();
    const antigo = ultimoCodigo(paciente.email);
    const reenviar = () =>
      criarCliente(servidor.url).requisitar('POST', '/auth/2fa/reenviar', { corpo: { desafioId }, origem: null });

    assert.equal((await reenviar()).status, 429);
    await pool.query(`UPDATE desafio_2fa SET reenviado_em = now() - interval '2 minutes' WHERE id = $1`, [desafioId]);
    assert.equal((await reenviar()).status, 200);
    const novo = ultimoCodigo(paciente.email);
    if (novo !== antigo) assert.equal((await confirmar(desafioId, antigo)).status, 400);
    assert.equal((await confirmar(desafioId, novo)).status, 200);
  });
});
