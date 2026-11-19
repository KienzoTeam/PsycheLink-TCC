import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { pool } from '../src/db';
import {
  capturarCodigos,
  carregarApp,
  criarPaciente,
  criarPsicologo,
  dono,
  entrar,
  iniciar,
  limpar,
  vincular,
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

const EXCLUIR = '/psicologo/me/excluir';
const existe = async (userId: number) =>
  (await pool.query('SELECT 1 FROM users WHERE id = $1', [userId])).rows.length === 1;

describe('POST /psicologo/me/excluir', () => {
  it('sem nunca ter tido vínculo, com a senha certa: apaga a conta, encerra a sessão e audita', async () => {
    const psicologo = await criarPsicologo();
    const cliente = await entrar(servidor.url, psicologo);

    const res = await cliente.requisitar('POST', EXCLUIR, { corpo: { senha: psicologo.senha } });
    assert.equal(res.status, 200);
    assert.equal(await existe(psicologo.id), false);
    assert.equal((await cliente.requisitar('GET', '/psicologo/me')).status, 401);

    const { rows } = await dono.query(
      "SELECT ator_user_id FROM auditoria WHERE acao = 'conta_excluida' AND metadados->>'userId' = $1",
      [String(psicologo.id)],
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].ator_user_id, null);
  });

  it('senha errada: 400 e nada muda', async () => {
    const psicologo = await criarPsicologo();
    const cliente = await entrar(servidor.url, psicologo);

    const res = await cliente.requisitar('POST', EXCLUIR, { corpo: { senha: 'senha-errada-1' } });
    assert.equal(res.status, 400);
    assert.equal(await existe(psicologo.id), true);
  });

  it('quem já teve vínculo (mesmo encerrado) não exclui: os registros clínicos ficam', async () => {
    const psicologo = await criarPsicologo();
    const paciente = await criarPaciente();
    await vincular(psicologo, paciente);
    await dono.query(
      "UPDATE vinculo SET status = 'encerrado', encerrado_em = now() WHERE psicologo_id = (SELECT id FROM psicologo WHERE user_id = $1)",
      [psicologo.id],
    );
    const cliente = await entrar(servidor.url, psicologo);

    const res = await cliente.requisitar('POST', EXCLUIR, { corpo: { senha: psicologo.senha } });
    assert.equal(res.status, 409);
    assert.equal((await res.json()).codigo, 'CONTA_COM_VINCULO');
    assert.equal(await existe(psicologo.id), true);
  });
});
