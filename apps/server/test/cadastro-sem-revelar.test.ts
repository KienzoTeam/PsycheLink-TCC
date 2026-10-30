import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { after, afterEach, before, describe, it, mock } from 'node:test';
import { setTimeout as esperaMs } from 'node:timers/promises';
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
  return mock.method(console, 'error', () => {});
};

// Reenvio e esqueci-senha enviam depois de responder: os testes esperam esse envio terminar.
const esperar = async (pronto: () => Promise<boolean>) => {
  for (let i = 0; i < 300; i++) {
    if (await pronto()) return;
    await esperaMs(10);
  }
  assert.fail('o envio em segundo plano não terminou');
};
const cooldownAtivo = async (email: string) =>
  (
    await pool.query(
      "SELECT 1 FROM verificacoes_email WHERE email = $1 AND criado_em > now() - interval '1 minute'",
      [email],
    )
  ).rowCount === 1;
const vencerCooldown = (email: string) =>
  pool.query(
    "UPDATE verificacoes_email SET criado_em = now() - interval '2 minutes' WHERE email = $1",
    [email],
  );

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
    await esperaMs(50);
    assert.equal(enviadas.length, 0);

    // O envio sai depois da resposta; espera ele e a gravação do código terminarem.
    await vencerCooldown(pendente);
    assert.deepEqual(await chamar('/auth/reenviar-codigo', { email: pendente }), semConta);
    await esperar(async () => enviadas.length === 1 && (await cooldownAtivo(pendente)));

    await vencerCooldown(pendente);
    mock.restoreAll();
    const erro = smtpForaDoAr();
    assert.deepEqual(await chamar('/auth/reenviar-codigo', { email: pendente }), semConta);
    await esperar(async () => erro.mock.callCount() > 0);
  });

  it('responde antes de o e-mail ser enviado, com e sem conta', async () => {
    smtpOk();
    const pendente = novoEmail();
    await cadastrar(pendente, 'senha-do-dono');
    await vencerCooldown(pendente);
    mock.restoreAll();
    enviadas = [];

    let liberar!: () => void;
    const travado = new Promise<void>((r) => (liberar = r));
    mock.method(mailer, 'sendMail', async (m: Mensagem) => {
      enviadas.push(m);
      await travado;
      return {};
    });

    // Com o SMTP travado, as duas respostas saem mesmo assim: a espera não revela a conta.
    const semConta = await chamar('/auth/reenviar-codigo', { email: novoEmail() });
    const comConta = await chamar('/auth/reenviar-codigo', { email: pendente });
    assert.deepEqual(comConta, semConta);
    await esperar(async () => enviadas.length === 1);

    liberar();
    await esperar(() => cooldownAtivo(pendente));
  });

  it('esqueci-senha responde igual sem conta, com conta verificada e com pendente', async () => {
    smtpOk();
    const paciente = await criarPaciente();
    const pendente = novoEmail();
    await cadastrar(pendente, 'senha-do-dono');
    enviadas = [];

    const semConta = await chamar('/auth/esqueci-senha', { email: novoEmail() });
    assert.equal(semConta.status, 200);
    assert.deepEqual(await chamar('/auth/esqueci-senha', { email: paciente.email }), semConta);
    await esperar(async () => enviadas.length === 1 && (await cooldownAtivo(paciente.email)));
    assert.equal(enviadas[0].to, paciente.email);

    // Pendente não recebe código de redefinição.
    assert.deepEqual(await chamar('/auth/esqueci-senha', { email: pendente }), semConta);
    await esperaMs(50);
    assert.equal(enviadas.length, 1);
  });
});
