import assert from 'node:assert/strict';
import { randomBytes, randomInt } from 'node:crypto';
import { after, before, describe, it } from 'node:test';
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

const cadastrarPsicologo = (email: string, crp: string) =>
  criarCliente(servidor.url).requisitar('POST', '/auth/registro-psicologo', {
    corpo: { nome: 'Teste', email, password: 'senha-forte-1', dataNascimento: '1990-01-01', crp },
  });

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
