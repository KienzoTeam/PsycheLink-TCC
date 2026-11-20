import assert from 'node:assert/strict';
import { randomBytes, randomInt } from 'node:crypto';
import { after, before, describe, it } from 'node:test';
import { pool } from '../src/db';
import { capturarCodigos, carregarApp, criarCliente, criarPaciente, iniciar, limpar } from './ajuda';

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
  const email = `aceite-${randomBytes(6).toString('hex')}@psychelink.test`;
  emails.push(email);
  return email;
};

const dados = (email: string) => ({
  nome: 'Teste',
  email,
  password: 'senha-forte-1',
  dataNascimento: '1990-01-01',
});

const cadastrarPaciente = (corpo: object) =>
  criarCliente(servidor.url).requisitar('POST', '/auth/registro', { corpo });

const cadastrarPsicologo = (corpo: object) =>
  criarCliente(servidor.url).requisitar('POST', '/auth/registro-psicologo', {
    // Região 99 não colide com os CRPs 00/… de criarPsicologo.
    corpo: { ...corpo, crp: `99/${randomInt(100_000, 1_000_000)}` },
  });

const aceitesDe = async (email: string) =>
  (
    await pool.query(
      `SELECT a.ator_papel, a.metadados, a.criado_em > now() - interval '1 minute' AS recente
         FROM auditoria a JOIN users u ON u.id = a.ator_user_id
        WHERE u.email = $1 AND a.acao = 'documentos_aceitos'`,
      [email],
    )
  ).rows;

describe('aceite dos documentos no cadastro', () => {
  it('paciente: grava a versão aceita, com data e hora', async () => {
    const email = novoEmail();
    const res = await cadastrarPaciente({ ...dados(email), aceites: { versao: '2026-11-20' } });
    assert.equal(res.status, 201);
    assert.deepEqual(await aceitesDe(email), [
      { ator_papel: 'paciente', metadados: { versao: '2026-11-20' }, recente: true },
    ]);
  });

  it('psicólogo: grava a versão aceita, com data e hora', async () => {
    const email = novoEmail();
    const res = await cadastrarPsicologo({ ...dados(email), aceites: { versao: '2026-11-20' } });
    assert.equal(res.status, 201);
    assert.deepEqual(await aceitesDe(email), [
      { ator_papel: 'psicologo', metadados: { versao: '2026-11-20' }, recente: true },
    ]);
  });

  it('sem o campo (app antigo) o cadastro continua funcionando e nada é gravado', async () => {
    const [deAntes, deDepois] = [novoEmail(), novoEmail()];
    assert.equal((await cadastrarPaciente(dados(deAntes))).status, 201);
    assert.equal((await cadastrarPsicologo(dados(deDepois))).status, 201);
    assert.deepEqual(await aceitesDe(deAntes), []);
    assert.deepEqual(await aceitesDe(deDepois), []);
  });

  it('versão inválida é recusada e a conta não é criada', async () => {
    for (const versao of ['', '   ', 'x'.repeat(21), 20261120]) {
      const email = novoEmail();
      const res = await cadastrarPaciente({ ...dados(email), aceites: { versao } });
      assert.equal(res.status, 400);
      const { rows } = await pool.query('SELECT 1 FROM users WHERE email = $1', [email]);
      assert.equal(rows.length, 0);
    }
    const semVersao = await cadastrarPsicologo({ ...dados(novoEmail()), aceites: {} });
    assert.equal(semVersao.status, 400);
  });

  it('quem já tem conta confirmada não ganha registro de aceite por um cadastro alheio', async () => {
    const dona = await criarPaciente();
    const res = await cadastrarPaciente({
      ...dados(dona.email),
      aceites: { versao: '2026-11-20' },
    });
    // Mesma resposta de um cadastro novo: o cadastro não revela a conta.
    assert.equal(res.status, 201);
    assert.deepEqual(await aceitesDe(dona.email), []);
  });
});
