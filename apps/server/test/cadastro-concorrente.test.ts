import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { after, before, it, mock } from 'node:test';
import bcrypt from 'bcrypt';
import { pool } from '../src/db';
import { carregarApp, criarCliente, iniciar, limpar } from './ajuda';

// Com SMTP "ligado" o código só sai pelo sendMail, que aqui é falso e pode segurar a entrega.
const app = carregarApp({ TRUST_PROXY: '1', SMTP_HOST: 'smtp.psychelink.test' });
const { mailer } = require('../src/lib/mailer') as typeof import('../src/lib/mailer');

const email = `concorrente-${randomBytes(6).toString('hex')}@psychelink.test`;
let servidor: Awaited<ReturnType<typeof iniciar>>;
before(async () => {
  servidor = await iniciar(app);
});
after(async () => {
  servidor.fechar();
  await pool.query('DELETE FROM users WHERE email = $1', [email]);
  await limpar();
});

const cadastrar = (password: string) =>
  criarCliente(servidor.url).requisitar('POST', '/auth/registro', {
    corpo: { nome: 'Teste', email, password, dataNascimento: '1990-01-01' },
  });

it('cadastro paralelo durante o envio do e-mail do dono não troca a senha', async () => {
  let entregaChegou!: () => void;
  let liberarEntrega!: () => void;
  const chegou = new Promise<void>((r) => (entregaChegou = r));
  const liberada = new Promise<void>((r) => (liberarEntrega = r));
  const codigos: string[] = [];
  let avisos = 0;
  mock.method(mailer, 'sendMail', async (mensagem: { text: string }) => {
    const codigo = /\d{6}/.exec(mensagem.text);
    if (!codigo) {
      avisos += 1; // aviso ao dono, sem código
      return {};
    }
    const primeira = codigos.push(codigo[0]) === 1;
    if (primeira) {
      entregaChegou();
      await liberada;
    }
    return {};
  });

  // O dono cadastra e o e-mail dele demora; nesse meio-tempo outra pessoa cadastra o mesmo e-mail.
  const dono = cadastrar('senha-do-dono');
  await chegou;
  const outro = await cadastrar('senha-de-outro');
  liberarEntrega();
  assert.equal((await dono).status, 201);
  // O outro cadastro responde como sucesso, mas só o dono recebe código; a senha não muda.
  assert.equal(outro.status, 201);
  assert.equal(codigos.length, 1);
  assert.equal(avisos, 1);

  const confirmado = await criarCliente(servidor.url).requisitar('POST', '/auth/verificar-email', {
    corpo: { email, codigo: Number(codigos[0]) },
  });
  assert.equal(confirmado.status, 200);
  const { rows } = await pool.query('SELECT password_hash FROM users WHERE email = $1', [email]);
  assert.equal(await bcrypt.compare('senha-do-dono', rows[0].password_hash), true);
});
