import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { pool } from '../src/db';
import {
  capturarCodigos,
  carregarApp,
  criarCliente,
  criarPaciente,
  criarPsicologo,
  criarUsuario,
  entrar,
  iniciar,
  limpar,
  login,
  ultimoCodigo,
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

const linhasDe = async (userId: number) =>
  (await pool.query('SELECT * FROM auditoria WHERE ator_user_id = $1 ORDER BY id', [userId])).rows;

describe('auditoria do acesso', () => {
  it('grava login, 2FA e logout com ator, IP e user-agent, sem e-mail nos metadados', async () => {
    const psicologo = await criarPsicologo();
    const cliente = criarCliente(servidor.url);
    const cabecalhos = { 'user-agent': 'Teste/1.0' };

    await cliente.requisitar('POST', '/auth/psicologo/login', {
      corpo: { email: psicologo.email, password: 'senha-errada-123' },
      cabecalhos,
    });
    const { desafioId } = (await login(cliente, psicologo.email, psicologo.senha)).corpo;
    const errado = ultimoCodigo(psicologo.email) === 111111 ? '222222' : '111111';
    await cliente.requisitar('POST', '/auth/psicologo/2fa', { corpo: { desafioId, codigo: errado } });
    await cliente.requisitar('POST', '/auth/psicologo/2fa', {
      corpo: { desafioId, codigo: String(ultimoCodigo(psicologo.email)) },
      cabecalhos,
    });
    await cliente.requisitar('POST', '/auth/psicologo/logout', { cabecalhos });

    const linhas = await linhasDe(psicologo.id);
    assert.deepEqual(
      linhas.map((l) => l.acao),
      ['login_falha', 'login_ok', '2fa_falha', '2fa_ok', 'logout'],
    );
    for (const linha of linhas) {
      assert.equal(linha.ator_papel, 'psicologo');
      assert.match(linha.ip, /^10\./);
      assert.ok(!JSON.stringify(linha).includes(psicologo.email));
    }
    assert.equal(linhas[4].user_agent, 'Teste/1.0');
    assert.equal(linhas[4].alvo_tipo, 'sessao');
  });

  it('login de e-mail inexistente é auditado sem ator', async () => {
    const cliente = criarCliente(servidor.url);
    await login(cliente, 'ninguem@psychelink.test', 'senha-errada-123');
    const { rows } = await pool.query(
      'SELECT ator_user_id, ator_papel, acao, metadados FROM auditoria WHERE ip = $1',
      [cliente.ip],
    );
    assert.deepEqual(rows, [
      { ator_user_id: null, ator_papel: null, acao: 'login_falha', metadados: { motivo: 'credenciais' } },
    ]);
  });

  it('paciente tentando entrar na web fica registrado como paciente', async () => {
    const paciente = await criarPaciente();
    await login(criarCliente(servidor.url), paciente.email, paciente.senha);
    const [linha] = await linhasDe(paciente.id);
    assert.equal(linha.acao, 'login_falha');
    assert.equal(linha.ator_papel, 'paciente');
    assert.deepEqual(linha.metadados, { motivo: 'perfil' });
  });
});

describe('auditoria dos dados do paciente', () => {
  it('registra anotação criada, anotações lidas e painel visualizado, sem conteúdo', async () => {
    const psicologo = await criarPsicologo();
    const paciente = await criarPaciente();
    await vincular(psicologo, paciente);
    const { rows } = await pool.query('SELECT id FROM paciente WHERE user_id = $1', [paciente.id]);
    const pacienteId: number = rows[0].id;
    const cliente = await entrar(servidor.url, psicologo);
    const texto = 'conteudo-sigiloso-da-anotacao';

    const criada = await cliente.requisitar('POST', `/psicologo/pacientes/${pacienteId}/anotacoes`, {
      corpo: { conteudo: texto },
    });
    assert.equal(criada.status, 201);
    const { anotacao } = (await criada.json()) as { anotacao: { id: number } };
    assert.equal((await cliente.requisitar('GET', `/psicologo/pacientes/${pacienteId}/anotacoes`)).status, 200);
    assert.equal((await cliente.requisitar('GET', `/psicologo/pacientes/${pacienteId}/resumo`)).status, 200);

    const linhas = (await linhasDe(psicologo.id)).filter((l) => l.paciente_id !== null);
    assert.deepEqual(
      linhas.map((l) => l.acao),
      ['anotacao_criada', 'anotacoes_lidas', 'paciente_painel_visualizado'],
    );
    assert.ok(linhas.every((l) => l.paciente_id === pacienteId));
    assert.equal(linhas[0].alvo_tipo, 'anotacao_clinica');
    assert.equal(linhas[0].alvo_id, String(anotacao.id));
    assert.ok(!JSON.stringify(linhas).includes(texto));

    const guardada = await pool.query(
      "SELECT expira_em > now() + interval '4 years 364 days' AS cinco_anos FROM anotacao_clinica WHERE id = $1",
      [anotacao.id],
    );
    assert.equal(guardada.rows[0].cinco_anos, true);
  });

  it('paciente sem vínculo: 404 e nada é auditado como leitura', async () => {
    const psicologo = await criarPsicologo();
    const paciente = await criarPaciente();
    const { rows } = await pool.query('SELECT id FROM paciente WHERE user_id = $1', [paciente.id]);
    const cliente = await entrar(servidor.url, psicologo);

    const res = await cliente.requisitar('GET', `/psicologo/pacientes/${rows[0].id}/resumo`);
    assert.equal(res.status, 404);
    assert.ok(!(await linhasDe(psicologo.id)).some((l) => l.acao === 'paciente_painel_visualizado'));
  });
});

describe('imutabilidade da auditoria', () => {
  async function novaLinha(atorId: number, pacienteId: number | null = null) {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO auditoria (ator_user_id, ator_papel, acao, paciente_id, alvo_tipo, metadados)
       VALUES ($1, 'psicologo', 'teste_imutavel', $2, 'teste_imutavel', '{"k": 1}') RETURNING id`,
      [atorId, pacienteId],
    );
    return rows[0].id;
  }

  it('rejeita UPDATE e DELETE diretos', async () => {
    const ator = await criarUsuario();
    const outro = await criarUsuario();
    const id = await novaLinha(ator.id);

    for (const sql of [
      "UPDATE auditoria SET acao = 'adulterada' WHERE id = $1",
      "UPDATE auditoria SET metadados = '{}' WHERE id = $1",
      'UPDATE auditoria SET criado_em = now() - interval \'1 day\' WHERE id = $1',
      `UPDATE auditoria SET ator_user_id = ${outro.id} WHERE id = $1`,
      'DELETE FROM auditoria WHERE id = $1',
    ]) {
      await assert.rejects(pool.query(sql, [id]), /imutável/, sql);
    }
    const { rows } = await pool.query('SELECT acao, ator_user_id FROM auditoria WHERE id = $1', [id]);
    assert.deepEqual(rows[0], { acao: 'teste_imutavel', ator_user_id: ator.id });
  });

  it('apagar o usuário anula só o ator (ON DELETE SET NULL) e preserva a linha', async () => {
    const ator = await criarUsuario();
    const id = await novaLinha(ator.id);

    await pool.query('DELETE FROM users WHERE id = $1', [ator.id]);
    const { rows } = await pool.query('SELECT acao, ator_user_id, ator_papel, metadados FROM auditoria WHERE id = $1', [id]);
    assert.deepEqual(rows[0], {
      acao: 'teste_imutavel',
      ator_user_id: null,
      ator_papel: 'psicologo',
      metadados: { k: 1 },
    });
  });

  it('apagar o paciente anula só paciente_id', async () => {
    const ator = await criarUsuario();
    const paciente = await criarPaciente();
    const { rows: pac } = await pool.query('SELECT id FROM paciente WHERE user_id = $1', [paciente.id]);
    const id = await novaLinha(ator.id, pac[0].id);

    await pool.query('DELETE FROM users WHERE id = $1', [paciente.id]);
    const { rows } = await pool.query('SELECT ator_user_id, paciente_id FROM auditoria WHERE id = $1', [id]);
    assert.deepEqual(rows[0], { ator_user_id: ator.id, paciente_id: null });
  });
});
