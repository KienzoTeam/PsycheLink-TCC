import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { pool } from '../src/db';
import { comContextoPaciente, comContextoPsicologo } from '../src/lib/contextoseguro';
import { criptografar } from '../src/lib/criptografia';
import {
  criarCheckin,
  criarPaciente,
  criarPsicologo,
  definirConsentimento,
  dono,
  limpar,
  pacienteIdDe,
  psicologoIdDe,
  vincular,
} from './ajuda';

const TABELAS = ['checkin_diario', 'habito', 'consentimento', 'anotacao_clinica', 'aplicacao_escala', 'resposta_escala'];

let pacienteA: number;
let pacienteOutro: number;
let psicologoA: number;
let psicologoB: number;
let escalaId: number;

const contar = (client: { query: (sql: string) => Promise<{ rows: Array<{ n: string }> }> }, tabela: string) =>
  client.query(`SELECT count(*) AS n FROM ${tabela}`).then((r) => Number(r.rows[0].n));

before(async () => {
  const [usuarioA, usuarioOutro, profA, profB] = [
    await criarPaciente(),
    await criarPaciente(),
    await criarPsicologo(),
    await criarPsicologo(),
  ];
  pacienteA = await pacienteIdDe(usuarioA);
  pacienteOutro = await pacienteIdDe(usuarioOutro);
  psicologoA = await psicologoIdDe(profA);
  psicologoB = await psicologoIdDe(profB);
  await vincular(profA, usuarioA);

  await definirConsentimento(pacienteA, { humor: true });
  await definirConsentimento(pacienteOutro, { humor: true });
  await criarCheckin(pacienteA, { exercicio: true });
  await criarCheckin(pacienteOutro, { exercicio: true });
  await dono.query(
    'INSERT INTO anotacao_clinica (psicologo_id, paciente_id, conteudo) VALUES ($1, $2, $3)',
    [psicologoA, pacienteA, criptografar('nota')],
  );
  escalaId = (
    await dono.query<{ id: number }>(
      "INSERT INTO escala (nome, total_questoes) VALUES ('Escala de teste', 1) RETURNING id",
    )
  ).rows[0].id;
  for (const paciente of [pacienteA, pacienteOutro]) {
    const { rows } = await dono.query<{ id: number }>(
      'INSERT INTO aplicacao_escala (paciente_id, psicologo_id, escala_id) VALUES ($1, $2, $3) RETURNING id',
      [paciente, psicologoA, escalaId],
    );
    await dono.query(
      'INSERT INTO resposta_escala (aplicacao_id, numero_questao, valor_resposta) VALUES ($1, 1, 2)',
      [rows[0].id],
    );
  }
});

after(async () => {
  await dono.query('DELETE FROM escala WHERE id = $1', [escalaId]);
  await limpar();
});

describe('papel da aplicação', () => {
  it('não ignora RLS nem é superusuário', async () => {
    const { rows } = await pool.query(
      'SELECT rolbypassrls, rolsuper FROM pg_roles WHERE rolname = current_user',
    );
    assert.deepEqual(rows[0], { rolbypassrls: false, rolsuper: false });
  });

  it('não lê o controle de migrações', async () => {
    await assert.rejects(pool.query('SELECT 1 FROM schema_migrations'), /permission denied/);
  });
});

describe('sem contexto nenhuma linha passa', () => {
  for (const tabela of TABELAS) {
    it(tabela, async () => {
      assert.equal(await contar(pool, tabela), 0);
      assert.ok((await contar(dono, tabela)) > 0, 'o dono enxerga as linhas de teste');
    });
  }
});

describe('contexto do psicólogo', () => {
  it('B, sem vínculo, não vê nada do paciente de A mesmo com SQL direto', async () => {
    await comContextoPsicologo(psicologoB, async (client) => {
      for (const tabela of TABELAS) {
        assert.equal(await contar(client, tabela), 0, tabela);
      }
      const { rows } = await client.query('SELECT 1 FROM checkin_diario WHERE paciente_id = $1', [pacienteA]);
      assert.equal(rows.length, 0);
    });
  });

  it('A vê só o paciente vinculado, nunca o outro', async () => {
    await comContextoPsicologo(psicologoA, async (client) => {
      for (const tabela of ['checkin_diario', 'habito', 'consentimento', 'aplicacao_escala', 'resposta_escala']) {
        assert.equal(await contar(client, tabela), 1, tabela);
      }
      const { rows } = await client.query('SELECT paciente_id FROM checkin_diario');
      assert.deepEqual(rows, [{ paciente_id: pacienteA }]);
    });
  });

  it('só as próprias anotações: A vê a sua, B não', async () => {
    assert.equal(await comContextoPsicologo(psicologoA, (c) => contar(c, 'anotacao_clinica')), 1);
    assert.equal(await comContextoPsicologo(psicologoB, (c) => contar(c, 'anotacao_clinica')), 0);
  });

  it('é só leitura nas tabelas do paciente', async () => {
    await assert.rejects(
      comContextoPsicologo(psicologoA, (c) =>
        c.query('INSERT INTO checkin_diario (paciente_id, data) VALUES ($1, CURRENT_DATE - 100)', [pacienteA]),
      ),
      /row-level security/,
    );
    const alterados = await comContextoPsicologo(psicologoA, (c) =>
      c.query('UPDATE consentimento SET compartilha_diario = true WHERE paciente_id = $1', [pacienteA]),
    );
    assert.equal(alterados.rowCount, 0);
  });

  it('encerrar o vínculo tira o acesso na hora', async () => {
    const profC = await criarPsicologo();
    const usuarioC = await criarPaciente();
    const psicologoC = await psicologoIdDe(profC);
    const pacienteC = await pacienteIdDe(usuarioC);
    await vincular(profC, usuarioC);
    await criarCheckin(pacienteC);
    assert.equal(await comContextoPsicologo(psicologoC, (c) => contar(c, 'checkin_diario')), 1);

    await pool.query("UPDATE vinculo SET status = 'encerrado' WHERE paciente_id = $1", [pacienteC]);
    assert.equal(await comContextoPsicologo(psicologoC, (c) => contar(c, 'checkin_diario')), 0);
  });
});

describe('contexto do paciente', () => {
  it('vê só as próprias linhas', async () => {
    await comContextoPaciente(pacienteA, async (client) => {
      for (const tabela of ['checkin_diario', 'habito', 'consentimento', 'aplicacao_escala', 'resposta_escala']) {
        assert.equal(await contar(client, tabela), 1, tabela);
      }
    });
  });

  it('nunca lê anotações clínicas, nem as que falam dele', async () => {
    assert.equal(await comContextoPaciente(pacienteA, (c) => contar(c, 'anotacao_clinica')), 0);
  });
});
