import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { after, afterEach, before, describe, it, mock } from 'node:test';
import bcrypt from 'bcrypt';
import { pool } from '../src/db';
import { carregarApp, criarCliente, criarPaciente, criarPsicologo, iniciar, limpar } from './ajuda';

// Com SMTP "ligado" tudo sai pelo sendMail, que aqui é falso e registra as mensagens.
const app = carregarApp({ TRUST_PROXY: '1', SMTP_HOST: 'smtp.psychelink.test' });
const { mailer } = require('../src/lib/mailer') as typeof import('../src/lib/mailer');

interface Mensagem {
  to: string;
  subject: string;
  text: string;
}
let enviadas: Mensagem[] = [];
const smtpOk = () =>
  mock.method(mailer, 'sendMail', async (m: Mensagem) => {
    enviadas.push(m);
    return {};
  });
const smtpForaDoAr = () => {
  mock.method(mailer, 'sendMail', async () => {
    throw new Error('SMTP fora do ar');
  });
  mock.method(console, 'error', () => {});
};

const emails: string[] = [];
let servidor: Awaited<ReturnType<typeof iniciar>>;
before(async () => {
  servidor = await iniciar(app);
});
afterEach(() => {
  mock.restoreAll();
  enviadas = [];
});
after(async () => {
  servidor.fechar();
  await pool.query('DELETE FROM users WHERE email = ANY($1)', [emails]);
  await limpar();
});

const novoEmail = () => {
  const email = `revelar-${randomBytes(6).toString('hex')}@psychelink.test`;
  emails.push(email);
  return email;
};

const chamar = async (caminho: string, corpo: object) => {
  const res = await criarCliente(servidor.url).requisitar('POST', caminho, { corpo });
  return { status: res.status, corpo: await res.json() };
};
const cadastrar = (email: string, password: string) =>
  chamar('/auth/registro', { nome: 'Teste', email, password, dataNascimento: '1990-01-01' });

// Tudo que o cadastro poderia alterar na conta e no código dela.
const estado = async (email: string) => ({
  usuario: (await pool.query('SELECT * FROM users WHERE email = $1', [email])).rows,
  codigo: (await pool.query('SELECT * FROM verificacoes_email WHERE email = $1', [email])).rows,
});

describe('POST /auth/registro não revela se o e-mail já tem conta', () => {
  it('conta verificada, psicólogo e pendente com outra senha respondem como cadastro novo', async () => {
    smtpOk();
    const novo = await cadastrar(novoEmail(), 'senha-qualquer-1');
    assert.equal(novo.status, 201);
    assert.equal(enviadas.length, 1);

    const paciente = await criarPaciente();
    const psicologo = await criarPsicologo();
    const pendente = novoEmail();
    await cadastrar(pendente, 'senha-do-dono');

    const casos = [
      { email: paciente.email, senhaOriginal: paciente.senha },
      { email: psicologo.email, senhaOriginal: psicologo.senha },
      { email: pendente, senhaOriginal: 'senha-do-dono' },
    ];
    for (const { email, senhaOriginal } of casos) {
      enviadas = [];
      const antes = await estado(email);

      assert.deepEqual(await cadastrar(email, 'senha-de-outro'), novo, email);

      // Nada muda: nem a conta, nem o código; a senha antiga continua valendo.
      const depois = await estado(email);
      assert.deepEqual(depois, antes, email);
      assert.equal(await bcrypt.compare(senhaOriginal, depois.usuario[0].password_hash), true, email);

      // O dono recebe só o aviso, sem código.
      assert.equal(enviadas.length, 1, email);
      assert.equal(enviadas[0].to, email);
      assert.doesNotMatch(enviadas[0].text, /\d{6}/);
      assert.match(enviadas[0].subject, /Tentativa de cadastro/);
    }
  });

  it('falha de SMTP responde igual para e-mail novo e e-mail existente', async () => {
    smtpForaDoAr();
    const paciente = await criarPaciente();

    const novo = await cadastrar(novoEmail(), 'senha-qualquer-1');
    assert.equal(novo.status, 400);
    assert.deepEqual(await cadastrar(paciente.email, 'senha-qualquer-1'), novo);
  });
});

describe('reenvio de código e esqueci a senha não revelam a conta', () => {
  it('reenviar-codigo responde igual sem conta, com pendente, com cooldown e com SMTP fora', async () => {
    smtpOk();
    const pendente = novoEmail();
    await cadastrar(pendente, 'senha-do-dono');
    const semConta = await chamar('/auth/reenviar-codigo', { email: novoEmail() });
    assert.equal(semConta.status, 200);

    // O cadastro acabou de gravar um código, então o cooldown está ativo e nada é enviado.
    enviadas = [];
    assert.deepEqual(await chamar('/auth/reenviar-codigo', { email: pendente }), semConta);
    assert.equal(enviadas.length, 0);

    const vencerCooldown = () =>
      pool.query(
        "UPDATE verificacoes_email SET criado_em = now() - interval '2 minutes' WHERE email = $1",
        [pendente],
      );
    await vencerCooldown();
    assert.deepEqual(await chamar('/auth/reenviar-codigo', { email: pendente }), semConta);
    assert.equal(enviadas.length, 1);

    await vencerCooldown();
    mock.restoreAll();
    smtpForaDoAr();
    assert.deepEqual(await chamar('/auth/reenviar-codigo', { email: pendente }), semConta);
  });

  it('esqueci-senha responde igual sem conta, com conta verificada e com pendente', async () => {
    smtpOk();
    const paciente = await criarPaciente();
    const pendente = novoEmail();
    await cadastrar(pendente, 'senha-do-dono');

    const semConta = await chamar('/auth/esqueci-senha', { email: novoEmail() });
    assert.equal(semConta.status, 200);
    assert.deepEqual(await chamar('/auth/esqueci-senha', { email: paciente.email }), semConta);
    assert.deepEqual(await chamar('/auth/esqueci-senha', { email: pendente }), semConta);
  });
});
