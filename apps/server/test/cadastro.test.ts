import assert from 'node:assert/strict';
import { randomBytes, randomInt } from 'node:crypto';
import { after, before, describe, it } from 'node:test';
import bcrypt from 'bcrypt';
import { pool } from '../src/db';
import { capturarCodigos, carregarApp, criarCliente, iniciar, limpar, ultimoCodigo } from './ajuda';

capturarCodigos();
const app = carregarApp({ TRUST_PROXY: '1' });

// Contas criadas pela API não passam por criarUsuario; a limpeza é por e-mail.
const emails: string[] = [];
let servidor: Awaited<ReturnType<typeof iniciar>>;
before(async () => {
  servidor = await iniciar(app);
});
after(async () => {
  servidor.fechar();
  await pool.query('DELETE FROM users WHERE email = ANY($1)', [emails]);
  await limpar();
});

const novoEmail = () => {
  const email = `cadastro-${randomBytes(6).toString('hex')}@psychelink.test`;
  emails.push(email);
  return email;
};
// Região 99 não colide com os CRPs 00/… de criarPsicologo.
const novoCrp = () => `99/${randomInt(100_000, 1_000_000)}`;

const cadastrarPsicologo = (email: string, crp: string, password = 'senha-forte-1') =>
  criarCliente(servidor.url).requisitar('POST', '/auth/registro-psicologo', {
    corpo: { nome: 'Teste', email, password, dataNascimento: '1990-01-01', crp },
  });

const cadastrarPaciente = (email: string, password: string) =>
  criarCliente(servidor.url).requisitar('POST', '/auth/registro', {
    corpo: { nome: 'Teste', email, password, dataNascimento: '1990-01-01' },
  });

const senhaGravada = async (email: string, senha: string) =>
  bcrypt.compare(
    senha,
    (await pool.query('SELECT password_hash FROM users WHERE email = $1', [email])).rows[0]
      .password_hash,
  );

const confirmar = (email: string) =>
  criarCliente(servidor.url).requisitar('POST', '/auth/verificar-email', {
    corpo: { email, codigo: ultimoCodigo(email) },
  });

describe('CRP no cadastro do psicólogo', () => {
  it('cadastro pendente não ocupa o CRP; fica com ele quem confirmar o e-mail primeiro', async () => {
    const crp = novoCrp();
    const [primeiro, segundo, terceiro] = [novoEmail(), novoEmail(), novoEmail()];
    assert.equal((await cadastrarPsicologo(primeiro, crp)).status, 201);
    assert.equal((await cadastrarPsicologo(segundo, crp)).status, 201);

    assert.equal((await confirmar(segundo)).status, 200);
    assert.equal((await confirmar(primeiro)).status, 409);
    const { rows } = await pool.query('SELECT email_verificado FROM users WHERE email = $1', [
      primeiro,
    ]);
    assert.equal(rows[0].email_verificado, false);

    assert.equal((await cadastrarPsicologo(terceiro, crp)).status, 409);
  });
});

describe('cadastro pendente refeito por outra pessoa', () => {
  it('com o código ainda válido, só a mesma senha refaz o cadastro', async () => {
    const email = novoEmail();
    assert.equal((await cadastrarPaciente(email, 'senha-do-dono')).status, 201);
    const codigo = ultimoCodigo(email);

    // Responde 201 como um cadastro novo (não revela a conta), mas não troca a senha nem o código.
    assert.equal((await cadastrarPaciente(email, 'senha-de-outro')).status, 201);
    assert.equal(await senhaGravada(email, 'senha-do-dono'), true);
    assert.equal(ultimoCodigo(email), codigo);

    // Quem não recebeu o código pode repetir o cadastro com a mesma senha.
    assert.equal((await cadastrarPaciente(email, 'senha-do-dono')).status, 201);
    assert.equal((await confirmar(email)).status, 200);
  });

  it('com o código expirado, o cadastro abandonado pode ser refeito com outra senha', async () => {
    const email = novoEmail();
    assert.equal((await cadastrarPaciente(email, 'senha-antiga-1')).status, 201);
    await pool.query(
      "UPDATE verificacoes_email SET expira_em = now() - interval '1 second' WHERE email = $1",
      [email],
    );
    assert.equal((await cadastrarPaciente(email, 'senha-nova-123')).status, 201);
    assert.equal(await senhaGravada(email, 'senha-nova-123'), true);
  });

  it('psicólogo pendente por engano: com a mesma senha, vira cadastro de paciente', async () => {
    const email = novoEmail();
    assert.equal((await cadastrarPsicologo(email, novoCrp())).status, 201);
    assert.equal((await cadastrarPaciente(email, 'senha-forte-1')).status, 201);

    const { rows } = await pool.query(
      'SELECT 1 FROM psicologo p JOIN users u ON u.id = p.user_id WHERE u.email = $1',
      [email],
    );
    assert.equal(rows.length, 0);
    assert.equal((await confirmar(email)).status, 200);
    const login = await criarCliente(servidor.url).requisitar('POST', '/auth/login', {
      corpo: { email, password: 'senha-forte-1' },
    });
    assert.equal(login.status, 200);
  });

  it('psicólogo pendente com código válido e outra senha continua psicólogo', async () => {
    const email = novoEmail();
    assert.equal((await cadastrarPsicologo(email, novoCrp())).status, 201);
    assert.equal((await cadastrarPaciente(email, 'senha-de-outro')).status, 201);

    const { rows } = await pool.query(
      'SELECT 1 FROM psicologo p JOIN users u ON u.id = p.user_id WHERE u.email = $1',
      [email],
    );
    assert.equal(rows.length, 1);
    assert.equal(await senhaGravada(email, 'senha-forte-1'), true);
  });

  it('psicólogo pendente com o código vencido libera o e-mail para o paciente', async () => {
    const email = novoEmail();
    assert.equal((await cadastrarPsicologo(email, novoCrp())).status, 201);
    await pool.query(
      "UPDATE verificacoes_email SET expira_em = now() - interval '1 second' WHERE email = $1",
      [email],
    );
    assert.equal((await cadastrarPaciente(email, 'senha-nova-123')).status, 201);

    const { rows } = await pool.query(
      'SELECT 1 FROM psicologo p JOIN users u ON u.id = p.user_id WHERE u.email = $1',
      [email],
    );
    assert.equal(rows.length, 0);
    assert.equal(await senhaGravada(email, 'senha-nova-123'), true);
  });

  it('vale também para o cadastro do psicólogo', async () => {
    const email = novoEmail();
    assert.equal((await cadastrarPsicologo(email, novoCrp())).status, 201);
    assert.equal((await cadastrarPsicologo(email, novoCrp(), 'senha-de-outro')).status, 409);
    assert.equal(await senhaGravada(email, 'senha-forte-1'), true);
  });
});

describe('senha fraca', () => {
  it('cadastro de paciente e de psicólogo recusa senha comum com o motivo, sem criar conta', async () => {
    for (const cadastrar of [
      (email: string) => cadastrarPaciente(email, 'Senha@123'),
      (email: string) => cadastrarPsicologo(email, novoCrp(), '12345678'),
    ]) {
      const email = novoEmail();
      const res = await cadastrar(email);
      assert.equal(res.status, 400);
      assert.match(JSON.stringify(await res.json()), /Senha fácil de adivinhar/);
      assert.equal((await pool.query('SELECT 1 FROM users WHERE email = $1', [email])).rowCount, 0);
    }
  });
});
