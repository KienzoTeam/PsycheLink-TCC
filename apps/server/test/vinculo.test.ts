import assert from 'node:assert/strict';
import crypto, { randomBytes } from 'node:crypto';
import { after, before, describe, it, mock } from 'node:test';
import { pool } from '../src/db';
import { hmacCodigoVinculo } from '../src/lib/codigo';
import {
  bearer,
  capturarCodigos,
  carregarApp,
  criarCheckin,
  criarCliente,
  criarPaciente,
  criarPsicologo,
  dono,
  entrar,
  iniciar,
  limpar,
  pacienteIdDe,
  psicologoIdDe,
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

type Usuario = Awaited<ReturnType<typeof criarPaciente>>;
type ClienteWeb = Awaited<ReturnType<typeof entrar>>;

const INVALIDO = { error: 'Código inválido ou expirado.' };

async function novoPsicologo() {
  const usuario = await criarPsicologo();
  return { usuario, web: await entrar(servidor.url, usuario), id: await psicologoIdDe(usuario) };
}

async function gerar(web: ClienteWeb) {
  const res = await web.requisitar('POST', '/psicologo/vinculo/codigos');
  return { res, corpo: (await res.json()) as { id: number; codigo: string; expiraEm: string } };
}

const chamar = (paciente: Usuario, metodo: string, caminho: string, corpo?: unknown) =>
  criarCliente(servidor.url).requisitar(metodo, caminho, {
    corpo,
    cabecalhos: bearer(paciente),
    origem: null,
  });

const resgatar = (paciente: Usuario, codigo: unknown) =>
  chamar(paciente, 'POST', '/paciente/vinculo', { codigo });

const auditoriaDe = async (userId: number) =>
  (
    await pool.query(
      'SELECT acao, ator_papel, paciente_id, metadados FROM auditoria WHERE ator_user_id = $1 ORDER BY id',
      [userId],
    )
  ).rows;

describe('códigos de vínculo (psicólogo)', () => {
  it('gera um código de 6 dígitos, mostrado uma vez, com o HMAC no banco e auditoria sem o código', async () => {
    const { usuario, web } = await novoPsicologo();
    const { res, corpo } = await gerar(web);
    assert.equal(res.status, 201);
    assert.match(corpo.codigo, /^\d{6}$/);
    const horas = (new Date(corpo.expiraEm).getTime() - Date.now()) / 3_600_000;
    assert.ok(horas > 23.9 && horas <= 24.01, `expira em ${horas} h`);

    const { rows } = await pool.query('SELECT codigo_hmac FROM codigo_vinculo WHERE id = $1', [corpo.id]);
    assert.equal(rows[0].codigo_hmac, hmacCodigoVinculo(corpo.codigo));
    assert.notEqual(rows[0].codigo_hmac, corpo.codigo);

    const linhas = await auditoriaDe(usuario.id);
    assert.deepEqual(
      linhas.filter((l) => l.acao === 'codigo_vinculo_gerado').map((l) => l.ator_papel),
      ['psicologo'],
    );
    assert.ok(!JSON.stringify(linhas).includes(corpo.codigo));
  });

  it('lista com status e datas, sem nunca devolver o código', async () => {
    const { web } = await novoPsicologo();
    const { corpo: criado } = await gerar(web);
    const { corpo: revogado } = await gerar(web);
    await web.requisitar('DELETE', `/psicologo/vinculo/codigos/${revogado.id}`);

    const res = await web.requisitar('GET', '/psicologo/vinculo/codigos');
    const { codigos } = (await res.json()) as { codigos: Array<{ id: number; status: string; usadoEm: null }> };
    assert.equal(codigos.find((c) => c.id === criado.id)?.status, 'ativo');
    assert.equal(codigos.find((c) => c.id === revogado.id)?.status, 'revogado');
    assert.ok(!JSON.stringify(codigos).includes(criado.codigo));
    assert.ok(codigos.every((c) => !('codigo' in c)));
  });

  it('revoga o próprio código uma vez; outro psicólogo recebe 404', async () => {
    const dono1 = await novoPsicologo();
    const outro = await novoPsicologo();
    const { corpo } = await gerar(dono1.web);

    assert.equal((await outro.web.requisitar('DELETE', `/psicologo/vinculo/codigos/${corpo.id}`)).status, 404);
    assert.equal((await dono1.web.requisitar('DELETE', `/psicologo/vinculo/codigos/${corpo.id}`)).status, 200);
    assert.equal((await dono1.web.requisitar('DELETE', `/psicologo/vinculo/codigos/${corpo.id}`)).status, 404);
    assert.equal((await dono1.web.requisitar('DELETE', '/psicologo/vinculo/codigos/abc')).status, 404);
    assert.ok((await auditoriaDe(dono1.usuario.id)).some((l) => l.acao === 'codigo_vinculo_revogado'));
  });

  it('limita a 10 códigos ativos; revogar um libera outro', async () => {
    const { web, id } = await novoPsicologo();
    for (let i = 0; i < 10; i++) {
      await dono.query(
        "INSERT INTO codigo_vinculo (psicologo_id, codigo_hmac, expira_em) VALUES ($1, $2, now() + interval '1 hour')",
        [id, randomBytes(32).toString('hex')],
      );
    }
    assert.equal((await gerar(web)).res.status, 409);

    await dono.query(
      "UPDATE codigo_vinculo SET revogado_em = now() WHERE id = (SELECT min(id) FROM codigo_vinculo WHERE psicologo_id = $1)",
      [id],
    );
    assert.equal((await gerar(web)).res.status, 201);
  });

  it('colisão no índice dos códigos abertos sorteia outro código', async () => {
    const p1 = await novoPsicologo();
    const p2 = await novoPsicologo();
    const sorteios = [123456, 123456, 654321];
    const sorteio = mock.method(crypto, 'randomInt', () => sorteios.shift());
    let primeiro: Awaited<ReturnType<typeof gerar>>;
    let segundo: Awaited<ReturnType<typeof gerar>>;
    try {
      primeiro = await gerar(p1.web);
      segundo = await gerar(p2.web);
    } finally {
      sorteio.mock.restore();
    }
    assert.equal(primeiro.corpo.codigo, '123456');
    assert.equal(segundo.res.status, 201);
    assert.equal(segundo.corpo.codigo, '654321');
    await p1.web.requisitar('DELETE', `/psicologo/vinculo/codigos/${primeiro.corpo.id}`);
  });
});

describe('resgate do código (paciente)', () => {
  it('cria o vínculo ativo com o consentimento padrão, usa o código e audita como paciente', async () => {
    const { web, id: psicologoId } = await novoPsicologo();
    const paciente = await criarPaciente();
    const { corpo } = await gerar(web);

    const res = await resgatar(paciente, corpo.codigo);
    assert.equal(res.status, 201);
    const { vinculo } = (await res.json()) as { vinculo: { psicologo: { nome: string; crp: string }; desde: string } };
    const crp = (await pool.query('SELECT crp FROM psicologo WHERE id = $1', [psicologoId])).rows[0].crp;
    assert.deepEqual(vinculo.psicologo, { nome: 'Teste', crp });
    assert.ok(Date.now() - new Date(vinculo.desde).getTime() < 60_000);

    const pacienteId = await pacienteIdDe(paciente);
    const ativos = await pool.query("SELECT psicologo_id FROM vinculo WHERE paciente_id = $1 AND status = 'ativo'", [pacienteId]);
    assert.deepEqual(ativos.rows, [{ psicologo_id: psicologoId }]);

    const consentimento = await dono.query(
      'SELECT compartilha_humor, compartilha_habitos, compartilha_escalas, compartilha_diario FROM consentimento WHERE paciente_id = $1',
      [pacienteId],
    );
    assert.deepEqual(consentimento.rows[0], {
      compartilha_humor: true,
      compartilha_habitos: true,
      compartilha_escalas: true,
      compartilha_diario: false,
    });

    const usado = await pool.query('SELECT usado_em, usado_por_paciente_id FROM codigo_vinculo WHERE id = $1', [corpo.id]);
    assert.ok(usado.rows[0].usado_em);
    assert.equal(usado.rows[0].usado_por_paciente_id, pacienteId);

    const linha = (await auditoriaDe(paciente.id)).find((l) => l.acao === 'vinculo_criado');
    assert.equal(linha.ator_papel, 'paciente');
    assert.equal(linha.paciente_id, pacienteId);
    assert.deepEqual(linha.metadados, { psicologoId });

    const lido = await chamar(paciente, 'GET', '/paciente/vinculo');
    assert.deepEqual(await lido.json(), { vinculo });

    const historico = await web.requisitar('GET', '/psicologo/vinculo/historico');
    const { vinculos } = (await historico.json()) as { vinculos: Array<Record<string, unknown>> };
    assert.deepEqual(vinculos.map((v) => [v.pacienteId, v.status, v.encerradoEm]), [[pacienteId, 'ativo', null]]);
    const codigos = (await (await web.requisitar('GET', '/psicologo/vinculo/codigos')).json()) as {
      codigos: Array<{ id: number; status: string }>;
    };
    assert.equal(codigos.codigos.find((c) => c.id === corpo.id)?.status, 'usado');
  });

  it('código usado, expirado, revogado ou inexistente falham com a mesma resposta', async () => {
    const { web } = await novoPsicologo();
    const usado = (await gerar(web)).corpo;
    const expirado = (await gerar(web)).corpo;
    const revogado = (await gerar(web)).corpo;
    assert.equal((await resgatar(await criarPaciente(), usado.codigo)).status, 201);
    await dono.query("UPDATE codigo_vinculo SET expira_em = now() - interval '1 second' WHERE id = $1", [expirado.id]);
    await web.requisitar('DELETE', `/psicologo/vinculo/codigos/${revogado.id}`);

    for (const codigo of [usado.codigo, expirado.codigo, revogado.codigo, '000000']) {
      const res = await resgatar(await criarPaciente(), codigo);
      assert.equal(res.status, 400, codigo);
      assert.deepEqual(await res.json(), INVALIDO, codigo);
    }
  });

  it('corpo fora do formato: 400, e sem Bearer: 401', async () => {
    const paciente = await criarPaciente();
    for (const codigo of ['12345', '1234567', 'abcdef', 123456, undefined]) {
      assert.equal((await resgatar(paciente, codigo)).status, 400, String(codigo));
    }
    const res = await criarCliente(servidor.url).requisitar('POST', '/paciente/vinculo', {
      corpo: { codigo: '123456' },
      origem: null,
    });
    assert.equal(res.status, 401);
  });

  it('quem já tem vínculo ativo não vincula de novo (409) e o código fica intacto', async () => {
    const { web: web1 } = await novoPsicologo();
    const { web: web2 } = await novoPsicologo();
    const paciente = await criarPaciente();
    assert.equal((await resgatar(paciente, (await gerar(web1)).corpo.codigo)).status, 201);

    const segundo = (await gerar(web2)).corpo;
    assert.equal((await resgatar(paciente, segundo.codigo)).status, 409);
    const { rows } = await pool.query('SELECT usado_em FROM codigo_vinculo WHERE id = $1', [segundo.id]);
    assert.equal(rows[0].usado_em, null);
    const ativos = await pool.query(
      "SELECT count(*)::int AS n FROM vinculo WHERE paciente_id = $1 AND status = 'ativo'",
      [await pacienteIdDe(paciente)],
    );
    assert.equal(ativos.rows[0].n, 1);
  });

  it('limita a 5 tentativas por usuário em 15 min (429)', async () => {
    const paciente = await criarPaciente();
    for (let i = 0; i < 5; i++) assert.equal((await resgatar(paciente, '000000')).status, 400);
    const res = await resgatar(paciente, '000000');
    assert.equal(res.status, 429);
    // Outro usuário, mesmo IP lógico de teste, não é afetado.
    assert.equal((await resgatar(await criarPaciente(), '000000')).status, 400);
  });
});

describe('encerrar o vínculo', () => {
  async function vinculados() {
    const prof = await novoPsicologo();
    const paciente = await criarPaciente();
    assert.equal((await resgatar(paciente, (await gerar(prof.web)).corpo.codigo)).status, 201);
    const pacienteId = await pacienteIdDe(paciente);
    assert.equal((await prof.web.requisitar('GET', `/psicologo/pacientes/${pacienteId}/resumo`)).status, 200);
    return { prof, paciente, pacienteId };
  }

  it('pelo paciente: o psicólogo perde o acesso na hora e o histórico guarda quem encerrou', async () => {
    const { prof, paciente, pacienteId } = await vinculados();

    assert.equal((await chamar(paciente, 'POST', '/paciente/vinculo/encerrar')).status, 200);
    assert.equal((await prof.web.requisitar('GET', `/psicologo/pacientes/${pacienteId}/resumo`)).status, 404);
    const lista = (await (await prof.web.requisitar('GET', '/psicologo/pacientes')).json()) as { pacientes: unknown[] };
    assert.equal(lista.pacientes.length, 0);
    assert.deepEqual(await (await chamar(paciente, 'GET', '/paciente/vinculo')).json(), { vinculo: null });
    assert.equal((await chamar(paciente, 'POST', '/paciente/vinculo/encerrar')).status, 404);

    const { vinculos } = (await (await prof.web.requisitar('GET', '/psicologo/vinculo/historico')).json()) as {
      vinculos: Array<Record<string, unknown>>;
    };
    assert.equal(vinculos[0].status, 'encerrado');
    assert.equal(vinculos[0].encerradoPor, 'paciente');
    assert.ok(vinculos[0].encerradoEm);
    const linha = (await auditoriaDe(paciente.id)).find((l) => l.acao === 'vinculo_encerrado');
    assert.equal(linha.ator_papel, 'paciente');
  });

  it('pelo psicólogo: acesso cai na hora e o paciente pode vincular de novo ao mesmo psicólogo', async () => {
    const { prof, paciente, pacienteId } = await vinculados();

    assert.equal((await prof.web.requisitar('POST', `/psicologo/pacientes/${pacienteId}/encerrar-vinculo`)).status, 200);
    assert.equal((await prof.web.requisitar('GET', `/psicologo/pacientes/${pacienteId}/resumo`)).status, 404);
    assert.equal((await prof.web.requisitar('POST', `/psicologo/pacientes/${pacienteId}/encerrar-vinculo`)).status, 404);
    assert.ok((await auditoriaDe(prof.usuario.id)).some((l) => l.acao === 'vinculo_encerrado'));

    assert.equal((await resgatar(paciente, (await gerar(prof.web)).corpo.codigo)).status, 201);
    const { vinculos } = (await (await prof.web.requisitar('GET', '/psicologo/vinculo/historico')).json()) as {
      vinculos: Array<Record<string, unknown>>;
    };
    assert.deepEqual(vinculos.map((v) => [v.status, v.encerradoPor]), [['ativo', null], ['encerrado', 'psicologo']]);
  });
});

describe('consentimento (paciente)', () => {
  it('sem registro, nada é compartilhado', async () => {
    const paciente = await criarPaciente();
    const res = await chamar(paciente, 'GET', '/paciente/consentimento');
    assert.deepEqual(await res.json(), {
      humor: false,
      habitos: false,
      escalas: false,
      diario: false,
      atualizadoEm: null,
      diarioCompartilhados: 0,
    });
  });

  it('parar de compartilhar o diário desmarca todos os textos liberados e audita a quantidade', async () => {
    const paciente = await criarPaciente();
    const pacienteId = await pacienteIdDe(paciente);
    await criarCheckin(pacienteId, { diasAtras: 1, diario: 'liberado 1', diarioCompartilhado: true });
    await criarCheckin(pacienteId, { diasAtras: 2, diario: 'liberado 2', diarioCompartilhado: true });
    await criarCheckin(pacienteId, { diasAtras: 3, diario: 'só meu', diarioCompartilhado: false });

    const antes = (await (await chamar(paciente, 'GET', '/paciente/consentimento')).json()) as {
      diarioCompartilhados: number;
    };
    assert.equal(antes.diarioCompartilhados, 2);

    const res = await chamar(paciente, 'POST', '/paciente/consentimento/diario/parar');
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { revogados: 2 });

    const { rows } = await dono.query<{ n: number }>(
      'SELECT count(*)::int AS n FROM checkin_diario WHERE paciente_id = $1 AND diario_compartilhado',
      [pacienteId],
    );
    assert.equal(rows[0].n, 0);
    const auditoria = await dono.query(
      "SELECT metadados FROM auditoria WHERE acao = 'diario_compartilhamento_revogado' AND paciente_id = $1",
      [pacienteId],
    );
    assert.deepEqual(auditoria.rows.map((r) => r.metadados), [{ quantidade: 2 }]);

    // Nada mais a revogar: não audita de novo.
    assert.deepEqual(await (await chamar(paciente, 'POST', '/paciente/consentimento/diario/parar')).json(), {
      revogados: 0,
    });
  });

  it('PUT grava, devolve o estado e audita só o que mudou', async () => {
    const paciente = await criarPaciente();
    const salvar = (corpo: unknown) => chamar(paciente, 'PUT', '/paciente/consentimento', corpo);
    const todos = { humor: false, habitos: false, escalas: false, diario: false };

    const primeiro = await salvar({ ...todos, humor: true });
    assert.equal(primeiro.status, 200);
    const gravado = (await primeiro.json()) as Record<string, unknown>;
    assert.equal(gravado.humor, true);
    assert.ok(gravado.atualizadoEm);

    await salvar({ ...todos, humor: true, habitos: true, diario: true });
    await salvar({ ...todos, humor: true, habitos: true, diario: true });
    await salvar({ ...todos, humor: false, habitos: true, diario: true });

    const alteracoes = (await auditoriaDe(paciente.id)).filter((l) => l.acao === 'consentimento_alterado');
    assert.deepEqual(
      alteracoes.map((l) => l.metadados),
      [{ humor: true }, { habitos: true, diario: true }, { humor: false }],
    );
    assert.ok(alteracoes.every((l) => l.ator_papel === 'paciente' && l.paciente_id !== null));

    const lido = (await (await chamar(paciente, 'GET', '/paciente/consentimento')).json()) as Record<string, unknown>;
    assert.deepEqual([lido.humor, lido.habitos, lido.escalas, lido.diario], [false, true, false, true]);
  });

  it('corpo sem os quatro booleanos: 400 e nada gravado', async () => {
    const paciente = await criarPaciente();
    for (const corpo of [{}, { humor: true }, { humor: 'sim', habitos: true, escalas: true, diario: true }]) {
      assert.equal((await chamar(paciente, 'PUT', '/paciente/consentimento', corpo)).status, 400);
    }
    assert.equal((await auditoriaDe(paciente.id)).length, 0);
  });
});
