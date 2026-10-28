import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { PoolClient } from 'pg';
import { comContextoPsicologo } from '../src/lib/contextoseguro';
import { descriptografar } from '../src/lib/criptografia';
import { pontuar, type Subescalas } from '../src/lib/escalas';
import {
  bearer,
  capturarCodigos,
  carregarApp,
  criarCliente,
  criarPaciente,
  criarPsicologo,
  definirConsentimento,
  dono,
  entrar,
  iniciar,
  limpar,
  pacienteIdDe,
  psicologoIdDe,
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

type Web = Awaited<ReturnType<typeof entrar>>;
type Usuario = Awaited<ReturnType<typeof criarPaciente>>;
type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

// Todo corpo de resposta das rotas de escala passa por aqui, para o teste final de linguagem.
const corposVistos: string[] = [];
async function ler(res: Response): Promise<Json> {
  const texto = await res.text();
  corposVistos.push(texto);
  return JSON.parse(texto) as Json;
}

const DASS: Subescalas = {
  depressao: { rotulo: 'Depressão', itens: [3, 5, 10, 13, 16, 17, 21] },
  ansiedade: { rotulo: 'Ansiedade', itens: [2, 4, 7, 9, 15, 19, 20] },
  estresse: { rotulo: 'Estresse', itens: [1, 6, 8, 11, 12, 14, 18] },
};
// Respostas do item 1 ao 21. Depressão (3,5,10,13,16,17,21) soma 8, ansiedade (2,4,7,9,15,19,20) 13
// e estresse (1,6,8,11,12,14,18) 8; vezes 2: 16, 26 e 16; total 58.
const DASS_RESPOSTAS = [1, 0, 2, 3, 1, 2, 0, 1, 3, 2, 1, 0, 2, 1, 3, 0, 1, 2, 3, 1, 0];

describe('pontuação', () => {
  it('PHQ-9, GAD-7 e PHQ-2 somam os itens', () => {
    assert.deepEqual(pontuar([0, 1, 2, 3, 0, 1, 2, 3, 0], null), { scoreTotal: 12, subscores: null });
    assert.equal(pontuar(Array(9).fill(3), null).scoreTotal, 27);
    assert.equal(pontuar(Array(9).fill(0), null).scoreTotal, 0);
    assert.equal(pontuar([1, 2, 0, 1, 2, 0, 1], null).scoreTotal, 7);
    assert.equal(pontuar(Array(7).fill(3), null).scoreTotal, 21);
    assert.equal(pontuar([3, 2], null).scoreTotal, 5);
    assert.equal(pontuar([3, 3], null).scoreTotal, 6);
  });

  it('DASS-21 multiplica cada subescala por 2 e o total soma as três', () => {
    assert.deepEqual(pontuar(DASS_RESPOSTAS, DASS), {
      scoreTotal: 58,
      subscores: { depressao: 16, ansiedade: 26, estresse: 16 },
    });
    assert.deepEqual(pontuar(Array(21).fill(3), DASS), {
      scoreTotal: 126,
      subscores: { depressao: 42, ansiedade: 42, estresse: 42 },
    });
    assert.equal(pontuar(Array(21).fill(0), DASS).scoreTotal, 0);
  });
});

// Fixtures: A tem pacientes que compartilham escalas ou não; B é outro psicólogo.
let A: Web;
let B: Web;
let usuarioA: { id: number; email: string; senha: string };
let psicologoIdB: number;
let usuarioB: { id: number; email: string; senha: string };
let psicologoIdA: number;
const escalaId: Record<string, number> = {};

before(async () => {
  usuarioA = await criarPsicologo();
  usuarioB = await criarPsicologo();
  [A, B] = [await entrar(servidor.url, usuarioA), await entrar(servidor.url, usuarioB)];
  psicologoIdA = await psicologoIdDe(usuarioA);
  psicologoIdB = await psicologoIdDe(usuarioB);
  const catalogo = await ler(await A.requisitar('GET', '/psicologo/escalas'));
  for (const e of catalogo.escalas) escalaId[e.sigla] = e.id;
});

async function novoPaciente(
  nome: string,
  psicologo = () => usuarioA,
  consentimento: Parameters<typeof definirConsentimento>[1] = { escalas: true },
) {
  const usuario = await criarPaciente(nome);
  await vincular(psicologo(), usuario);
  const id = await pacienteIdDe(usuario);
  await definirConsentimento(id, consentimento);
  const cliente = criarCliente(servidor.url);
  const mobile = (metodo: string, caminho: string, corpo?: unknown) =>
    cliente.requisitar(metodo, caminho, { corpo, cabecalhos: bearer(usuario), origem: null });
  return { usuario, id, mobile };
}
type Paciente = Awaited<ReturnType<typeof novoPaciente>>;

const solicitar = (web: Web, paciente: Paciente, sigla: string) =>
  web.requisitar('POST', `/psicologo/pacientes/${paciente.id}/escalas`, {
    corpo: { escalaId: escalaId[sigla] },
  });

async function solicitada(web: Web, paciente: Paciente, sigla: string): Promise<number> {
  const res = await solicitar(web, paciente, sigla);
  assert.equal(res.status, 201);
  return (await ler(res)).aplicacao.id;
}

const auditoriaDe = async (acao: string, pacienteId: number) =>
  (
    await dono.query(
      'SELECT ator_papel, ator_user_id, alvo_tipo, alvo_id, metadados FROM auditoria WHERE acao = $1 AND paciente_id = $2 ORDER BY id',
      [acao, pacienteId],
    )
  ).rows;

describe('catálogo', () => {
  it('lista as 4 escalas ativas sem itens, com a DASS-21 e suas subescalas', async () => {
    const corpo = await ler(await A.requisitar('GET', '/psicologo/escalas'));
    assert.deepEqual(
      corpo.escalas.map((e: Json) => e.sigla),
      ['PHQ-9', 'GAD-7', 'PHQ-2', 'DASS-21'],
    );
    for (const e of corpo.escalas) {
      assert.deepEqual(Object.keys(e).sort(), [
        'id', 'nome', 'pontuacaoMaxima', 'sigla', 'subescalas', 'totalQuestoes', 'validacaoRef',
      ]);
    }
    const por = Object.fromEntries(corpo.escalas.map((e: Json) => [e.sigla, e]));
    assert.deepEqual(
      [por['PHQ-9'].pontuacaoMaxima, por['GAD-7'].pontuacaoMaxima, por['PHQ-2'].pontuacaoMaxima, por['DASS-21'].pontuacaoMaxima],
      [27, 21, 6, 126],
    );
    assert.equal(por['DASS-21'].validacaoRef, 'Vignola e Tucci (2014)');
    assert.deepEqual(por['DASS-21'].subescalas, DASS);
    assert.equal(por['PHQ-9'].subescalas, null);
  });

  it('cada escala tem um item por questão e as opções de 0 a 3', async () => {
    const { rows } = await dono.query(
      "SELECT sigla, total_questoes, jsonb_array_length(itens) AS n, opcoes FROM escala WHERE sigla IS NOT NULL",
    );
    assert.equal(rows.length, 4);
    for (const r of rows) {
      assert.equal(r.n, r.total_questoes, r.sigla);
      assert.deepEqual(r.opcoes.map((o: Json) => o.valor), [0, 1, 2, 3], r.sigla);
    }
  });

  it('sem sessão: 401', async () => {
    assert.equal((await criarCliente(servidor.url).requisitar('GET', '/psicologo/escalas')).status, 401);
  });
});

describe('solicitar escala', () => {
  it('sem consentimento de escalas: 403 e nada é criado', async () => {
    const paciente = await novoPaciente('Sem Consentimento', () => usuarioA, { humor: true });
    const res = await solicitar(A, paciente, 'PHQ-9');
    assert.equal(res.status, 403);
    assert.deepEqual(await ler(res), { error: 'O paciente não compartilha escalas.' });
    const { rowCount } = await dono.query('SELECT 1 FROM aplicacao_escala WHERE paciente_id = $1', [paciente.id]);
    assert.equal(rowCount, 0);
  });

  it('cria pendente, audita e barra a segunda aberta da mesma escala (409)', async () => {
    const paciente = await novoPaciente('Paciente Aberta');
    const res = await solicitar(A, paciente, 'PHQ-9');
    assert.equal(res.status, 201);
    const { aplicacao } = await ler(res);
    assert.deepEqual(
      [aplicacao.status, aplicacao.escala.sigla, aplicacao.respondidoEm, aplicacao.scoreTotal, aplicacao.subscores],
      ['pendente', 'PHQ-9', null, null, null],
    );
    assert.ok(!Number.isNaN(Date.parse(aplicacao.solicitadoEm)));
    assert.deepEqual((await auditoriaDe('escala_solicitada', paciente.id)).map((l) => [l.ator_user_id, l.alvo_id, l.metadados]), [
      [usuarioA.id, String(aplicacao.id), { sigla: 'PHQ-9' }],
    ]);

    const repetida = await solicitar(A, paciente, 'PHQ-9');
    assert.equal(repetida.status, 409);
    assert.equal((await solicitar(A, paciente, 'GAD-7')).status, 201);
  });

  it('pedidos simultâneos da mesma escala: um cria, o outro leva 409', async () => {
    const paciente = await novoPaciente('Paciente Corrida');
    const status = (await Promise.all([solicitar(A, paciente, 'GAD-7'), solicitar(A, paciente, 'GAD-7')])).map(
      (r) => r.status,
    );
    assert.deepEqual(status.sort(), [201, 409]);
  });

  it('corpo inválido: 400; escala inexistente: 404; paciente de outro psicólogo: 404', async () => {
    const paciente = await novoPaciente('Paciente Erros');
    const semCorpo = await A.requisitar('POST', `/psicologo/pacientes/${paciente.id}/escalas`, { corpo: {} });
    assert.equal(semCorpo.status, 400);
    const inexistente = await A.requisitar('POST', `/psicologo/pacientes/${paciente.id}/escalas`, {
      corpo: { escalaId: 2_147_000_000 },
    });
    assert.equal(inexistente.status, 404);
    assert.equal((await solicitar(B, paciente, 'PHQ-9')).status, 404);
    const { rowCount } = await dono.query('SELECT 1 FROM aplicacao_escala WHERE paciente_id = $1', [paciente.id]);
    assert.equal(rowCount, 0);
  });
});

describe('paciente responde', () => {
  it('lista as pendentes com o psicólogo e abre a aplicação marcando em andamento uma só vez', async () => {
    const paciente = await novoPaciente('Paciente Mobile');
    const id = await solicitada(A, paciente, 'PHQ-9');

    const pendentes = await ler(await paciente.mobile('GET', '/paciente/escalas/pendentes'));
    assert.equal(pendentes.length, 1);
    assert.equal(pendentes[0].aplicacaoId, id);
    assert.equal(pendentes[0].sigla, 'PHQ-9');
    assert.equal(typeof pendentes[0].psicologo.nome, 'string');
    assert.ok(Date.parse(pendentes[0].solicitadoEm));

    const aberta = await ler(await paciente.mobile('GET', `/paciente/aplicacoes/${id}`));
    assert.equal(aberta.itens.length, 9);
    assert.equal(aberta.opcoes.length, 4);
    assert.match(aberta.instrucao, /últimas 2 semanas/);
    const depois = await dono.query('SELECT status, iniciado_em FROM aplicacao_escala WHERE id = $1', [id]);
    assert.equal(depois.rows[0].status, 'em_andamento');
    assert.ok(depois.rows[0].iniciado_em);

    await paciente.mobile('GET', `/paciente/aplicacoes/${id}`);
    const segunda = await dono.query('SELECT iniciado_em FROM aplicacao_escala WHERE id = $1', [id]);
    assert.deepEqual(segunda.rows[0].iniciado_em, depois.rows[0].iniciado_em);
    assert.equal((await ler(await paciente.mobile('GET', '/paciente/escalas/pendentes'))).length, 1);
  });

  it('quantidade ou valor inválido: 400 e a aplicação continua aberta', async () => {
    const paciente = await novoPaciente('Paciente Invalido');
    const id = await solicitada(A, paciente, 'PHQ-9');
    const enviar = (respostas: unknown) =>
      paciente.mobile('POST', `/paciente/aplicacoes/${id}/respostas`, { respostas });

    for (const invalido of [[1, 1, 1], Array(10).fill(1), [0, 0, 0, 0, 0, 0, 0, 0, 4], [0, 0, 0, 0, 0, 0, 0, 0, -1], [0, 0, 0, 0, 0, 0, 0, 0, 1.5], Array(9).fill('1'), 'x']) {
      assert.equal((await enviar(invalido)).status, 400, JSON.stringify(invalido));
    }
    assert.equal((await paciente.mobile('POST', `/paciente/aplicacoes/${id}/respostas`, {})).status, 400);
    const { rows } = await dono.query('SELECT status, score_total, respostas_cifradas FROM aplicacao_escala WHERE id = $1', [id]);
    assert.deepEqual(rows[0], { status: 'pendente', score_total: null, respostas_cifradas: null });
  });

  it('PHQ-9 válido: calcula, cifra as respostas por item, audita sem respostas e fecha a aplicação', async () => {
    const paciente = await novoPaciente('Paciente Responde');
    const id = await solicitada(A, paciente, 'PHQ-9');
    const respostas = [0, 1, 2, 3, 0, 1, 2, 3, 0];

    const res = await paciente.mobile('POST', `/paciente/aplicacoes/${id}/respostas`, { respostas });
    assert.equal(res.status, 200);
    assert.deepEqual(await ler(res), { scoreTotal: 12, subscores: null });

    const { rows } = await dono.query(
      'SELECT status, score_total, subscores, respondido_em, respostas_cifradas FROM aplicacao_escala WHERE id = $1',
      [id],
    );
    assert.deepEqual([rows[0].status, rows[0].score_total, rows[0].subscores], ['concluida', 12, null]);
    assert.ok(rows[0].respondido_em);
    assert.doesNotMatch(rows[0].respostas_cifradas, /\[/);
    assert.deepEqual(JSON.parse(descriptografar(rows[0].respostas_cifradas)), respostas);
    const marcador = await dono.query('SELECT item9_diferente_de_zero FROM aplicacao_escala WHERE id = $1', [id]);
    assert.equal(marcador.rows[0].item9_diferente_de_zero, false);
    const legado = await dono.query('SELECT 1 FROM resposta_escala WHERE aplicacao_id = $1', [id]);
    assert.equal(legado.rowCount, 0);

    const [evento] = await auditoriaDe('escala_respondida', paciente.id);
    assert.equal(evento.ator_papel, 'paciente');
    assert.equal(evento.ator_user_id, paciente.usuario.id);
    assert.deepEqual(evento.metadados, { sigla: 'PHQ-9' });

    // Repetir o mesmo envio (resposta perdida no caminho) devolve o mesmo sucesso sem auditar de novo.
    const repetido = await paciente.mobile('POST', `/paciente/aplicacoes/${id}/respostas`, { respostas });
    assert.equal(repetido.status, 200);
    assert.deepEqual(await ler(repetido), { scoreTotal: 12, subscores: null });
    assert.equal((await auditoriaDe('escala_respondida', paciente.id)).length, 1);
    const outras = [3, 3, 3, 3, 3, 3, 3, 3, 3];
    assert.equal((await paciente.mobile('POST', `/paciente/aplicacoes/${id}/respostas`, { respostas: outras })).status, 404);
    assert.equal((await paciente.mobile('GET', `/paciente/aplicacoes/${id}`)).status, 404);
    assert.deepEqual(await ler(await paciente.mobile('GET', '/paciente/escalas/pendentes')), []);
  });

  it('DASS-21: subescalas vezes 2 e total pelo caminho completo', async () => {
    const paciente = await novoPaciente('Paciente Dass');
    const id = await solicitada(A, paciente, 'DASS-21');
    const res = await paciente.mobile('POST', `/paciente/aplicacoes/${id}/respostas`, { respostas: DASS_RESPOSTAS });
    assert.deepEqual(await ler(res), {
      scoreTotal: 58,
      subscores: { depressao: 16, ansiedade: 26, estresse: 16 },
    });
    const { rows } = await dono.query('SELECT subscores FROM aplicacao_escala WHERE id = $1', [id]);
    assert.deepEqual(rows[0].subscores, { depressao: 16, ansiedade: 26, estresse: 16 });
  });

  it('PHQ-2 e GAD-7 aceitam só a quantidade de itens da própria escala', async () => {
    const paciente = await novoPaciente('Paciente Curtas');
    const phq2 = await solicitada(A, paciente, 'PHQ-2');
    const gad7 = await solicitada(A, paciente, 'GAD-7');
    assert.equal((await paciente.mobile('POST', `/paciente/aplicacoes/${phq2}/respostas`, { respostas: [1, 1, 1] })).status, 400);
    assert.deepEqual(await ler(await paciente.mobile('POST', `/paciente/aplicacoes/${phq2}/respostas`, { respostas: [3, 2] })), {
      scoreTotal: 5,
      subscores: null,
    });
    assert.equal((await ler(await paciente.mobile('POST', `/paciente/aplicacoes/${gad7}/respostas`, { respostas: Array(7).fill(1) }))).scoreTotal, 7);
  });

  it('a aplicação de outro paciente dá 404 em abrir e em responder, sem alterar nada', async () => {
    const dono1 = await novoPaciente('Paciente Dono');
    const intruso = await novoPaciente('Paciente Intruso');
    const id = await solicitada(A, dono1, 'PHQ-9');

    assert.equal((await intruso.mobile('GET', `/paciente/aplicacoes/${id}`)).status, 404);
    const res = await intruso.mobile('POST', `/paciente/aplicacoes/${id}/respostas`, { respostas: Array(9).fill(1) });
    assert.equal(res.status, 404);
    assert.deepEqual(await ler(await intruso.mobile('GET', '/paciente/escalas/pendentes')), []);
    const { rows } = await dono.query('SELECT status, iniciado_em FROM aplicacao_escala WHERE id = $1', [id]);
    assert.deepEqual(rows[0], { status: 'pendente', iniciado_em: null });
    assert.equal((await criarCliente(servidor.url).requisitar('GET', '/paciente/escalas/pendentes', { origem: null })).status, 401);
  });
});

describe('psicólogo acompanha', () => {
  let paciente: Paciente;
  let aplicacaoConcluida: number;
  let aplicacaoAberta: number;

  before(async () => {
    paciente = await novoPaciente('Paciente Acompanhado');
    aplicacaoConcluida = await solicitada(A, paciente, 'PHQ-9');
    await paciente.mobile('POST', `/paciente/aplicacoes/${aplicacaoConcluida}/respostas`, {
      respostas: [0, 1, 2, 3, 0, 1, 2, 3, 0],
    });
    aplicacaoAberta = await solicitada(A, paciente, 'GAD-7');
  });

  it('o histórico traz as duas aplicações com o score e os consentimentos', async () => {
    const corpo = await ler(await A.requisitar('GET', `/psicologo/pacientes/${paciente.id}/escalas`));
    assert.equal(corpo.consentimentos.escalas, true);
    assert.deepEqual(
      corpo.aplicacoes.map((a: Json) => [a.id, a.escala.sigla, a.status, a.scoreTotal]),
      [
        [aplicacaoAberta, 'GAD-7', 'pendente', null],
        [aplicacaoConcluida, 'PHQ-9', 'concluida', 12],
      ],
    );
    assert.deepEqual(corpo.aplicacoes[1].escala, { sigla: 'PHQ-9', nome: corpo.aplicacoes[1].escala.nome, pontuacaoMaxima: 27 });
    assert.ok(Date.parse(corpo.aplicacoes[1].respondidoEm));
  });

  it('o detalhe de uma concluída traz item a item e audita; a aberta não mostra respostas', async () => {
    const corpo = await ler(await A.requisitar('GET', `/psicologo/aplicacoes/${aplicacaoConcluida}`));
    const { aplicacao } = corpo;
    assert.equal(aplicacao.pacienteNome, 'Paciente Acompanhado');
    assert.equal(aplicacao.itens.length, 9);
    assert.deepEqual(aplicacao.itens.map((i: Json) => i.resposta), [0, 1, 2, 3, 0, 1, 2, 3, 0]);
    assert.deepEqual(
      [aplicacao.itens[2].numero, aplicacao.itens[2].rotuloResposta, aplicacao.itens[3].rotuloResposta],
      [3, 'Mais da metade dos dias', 'Quase todos os dias'],
    );
    assert.equal(aplicacao.scoreTotal, 12);

    const aberta = (await ler(await A.requisitar('GET', `/psicologo/aplicacoes/${aplicacaoAberta}`))).aplicacao;
    assert.equal(aberta.itens.length, 7);
    assert.ok(aberta.itens.every((i: Json) => i.resposta === null && i.rotuloResposta === null));
    assert.equal(aberta.scoreTotal, null);

    const visualizacoes = await auditoriaDe('escala_visualizada', paciente.id);
    assert.deepEqual(visualizacoes.map((l) => l.alvo_id), [String(aplicacaoConcluida), String(aplicacaoAberta)]);
  });

  it('a lista de aplicações do psicólogo traz o nome, filtra por status e pagina', async () => {
    const todas = await ler(await A.requisitar('GET', '/psicologo/aplicacoes?limite=100'));
    const dela = todas.aplicacoes.filter((a: Json) => a.pacienteId === paciente.id);
    assert.equal(dela.length, 2);
    assert.equal(dela[0].pacienteNome, 'Paciente Acompanhado');

    const concluidas = await ler(await A.requisitar('GET', '/psicologo/aplicacoes?status=concluida&limite=100'));
    assert.ok(concluidas.aplicacoes.every((a: Json) => a.status === 'concluida'));
    assert.equal((await A.requisitar('GET', '/psicologo/aplicacoes?status=outra')).status, 400);

    const ids: number[] = [];
    let cursor: string | null = null;
    do {
      const pagina: Json = await ler(await A.requisitar('GET', `/psicologo/aplicacoes?limite=2${cursor ? `&cursor=${cursor}` : ''}`));
      ids.push(...pagina.aplicacoes.map((a: Json) => a.id));
      cursor = pagina.proximoCursor;
    } while (cursor);
    assert.deepEqual(ids, todas.aplicacoes.map((a: Json) => a.id));
  });

  it('o psicólogo B não vê, não abre e não cancela a aplicação do A', async () => {
    assert.equal((await B.requisitar('GET', `/psicologo/aplicacoes/${aplicacaoConcluida}`)).status, 404);
    assert.equal((await B.requisitar('POST', `/psicologo/aplicacoes/${aplicacaoAberta}/cancelar`, { corpo: {} })).status, 404);
    assert.equal((await B.requisitar('GET', `/psicologo/pacientes/${paciente.id}/escalas`)).status, 404);
    const listaB = await ler(await B.requisitar('GET', '/psicologo/aplicacoes?limite=100'));
    assert.ok(!listaB.aplicacoes.some((a: Json) => a.pacienteId === paciente.id));
    const { rows } = await dono.query('SELECT status FROM aplicacao_escala WHERE id = $1', [aplicacaoAberta]);
    assert.equal(rows[0].status, 'pendente');
  });

  it('cancelar só vale para aberta e própria, audita e libera pedir a mesma escala de novo', async () => {
    const cancelar = (id: number) => A.requisitar('POST', `/psicologo/aplicacoes/${id}/cancelar`, { corpo: {} });
    assert.equal((await cancelar(aplicacaoConcluida)).status, 404);

    assert.equal((await cancelar(aplicacaoAberta)).status, 200);
    const { rows } = await dono.query('SELECT status, cancelado_em FROM aplicacao_escala WHERE id = $1', [aplicacaoAberta]);
    assert.equal(rows[0].status, 'cancelada');
    assert.ok(rows[0].cancelado_em);
    assert.equal((await cancelar(aplicacaoAberta)).status, 404);
    assert.deepEqual((await auditoriaDe('escala_cancelada', paciente.id)).map((l) => l.alvo_id), [String(aplicacaoAberta)]);

    assert.deepEqual(await ler(await paciente.mobile('GET', '/paciente/escalas/pendentes')), []);
    assert.equal((await paciente.mobile('GET', `/paciente/aplicacoes/${aplicacaoAberta}`)).status, 404);
    assert.equal((await solicitar(A, paciente, 'GAD-7')).status, 201);
  });

  it('sem consentimento de escalas: histórico vazio com o aviso, detalhe 403, lista e dashboard sem a escala', async () => {
    await definirConsentimento(paciente.id, { escalas: false });
    const historico = await ler(await A.requisitar('GET', `/psicologo/pacientes/${paciente.id}/escalas`));
    assert.deepEqual(historico.aplicacoes, []);
    assert.equal(historico.consentimentos.escalas, false);

    const detalhe = await A.requisitar('GET', `/psicologo/aplicacoes/${aplicacaoConcluida}`);
    assert.equal(detalhe.status, 403);
    assert.deepEqual(await ler(detalhe), { error: 'O paciente não compartilha escalas.' });

    const lista = await ler(await A.requisitar('GET', '/psicologo/aplicacoes?limite=100'));
    assert.ok(!lista.aplicacoes.some((a: Json) => a.pacienteId === paciente.id));
    assert.equal((await solicitar(A, paciente, 'PHQ-2')).status, 403);
    await definirConsentimento(paciente.id, { escalas: true });
  });
});

describe('dashboard e linha do tempo', () => {
  it('conta as abertas, lista as 5 últimas respondidas e esconde quem não compartilha', async () => {
    const usuarioC = await criarPsicologo();
    const C = await entrar(servidor.url, usuarioC);
    const comConsentimento = await novoPaciente('Paciente Dash', () => usuarioC);
    const semConsentimento = await novoPaciente('Paciente Dash Privado', () => usuarioC, { humor: true });
    const psicologoC = await psicologoIdDe(usuarioC);
    await dono.query('INSERT INTO aplicacao_escala (paciente_id, psicologo_id, escala_id) VALUES ($1, $2, $3)', [
      semConsentimento.id,
      psicologoC,
      escalaId['PHQ-9'],
    ]);

    const id = await solicitada(C, comConsentimento, 'PHQ-9');
    let painel = await ler(await C.requisitar('GET', '/psicologo/dashboard'));
    assert.deepEqual(painel.escalas, { pendentes: 1, respondidasRecentes: [] });
    assert.deepEqual(painel.consultasHoje, []);

    await comConsentimento.mobile('POST', `/paciente/aplicacoes/${id}/respostas`, { respostas: Array(9).fill(2) });
    painel = await ler(await C.requisitar('GET', '/psicologo/dashboard'));
    assert.equal(painel.escalas.pendentes, 0);
    assert.equal(painel.escalas.respondidasRecentes.length, 1);
    const recente = painel.escalas.respondidasRecentes[0];
    assert.deepEqual(
      [recente.aplicacaoId, recente.pacienteId, recente.nome, recente.sigla, recente.scoreTotal],
      [id, comConsentimento.id, 'Paciente Dash', 'PHQ-9', 18],
    );
    assert.ok(Date.parse(recente.respondidoEm));
    assert.ok(painel.atividadeRecente.some((a: Json) => a.acao === 'escala_respondida' && a.nome === 'Paciente Dash'));

    const tempo = await ler(await C.requisitar('GET', `/psicologo/pacientes/${comConsentimento.id}/linha-do-tempo`));
    const escalas = tempo.itens.filter((i: Json) => i.tipo.startsWith('escala_'));
    assert.deepEqual(
      escalas.map((i: Json) => [i.tipo, i.sigla, i.scoreTotal]),
      [
        ['escala_respondida', 'PHQ-9', 18],
        ['escala_solicitada', 'PHQ-9', undefined],
      ],
    );

    await definirConsentimento(comConsentimento.id, { escalas: false });
    painel = await ler(await C.requisitar('GET', '/psicologo/dashboard'));
    assert.deepEqual(painel.escalas, { pendentes: 0, respondidasRecentes: [] });
    assert.ok(!painel.atividadeRecente.some((a: Json) => a.acao === 'escala_respondida'));
    const semEscalas = await ler(await C.requisitar('GET', `/psicologo/pacientes/${comConsentimento.id}/linha-do-tempo`));
    assert.ok(!semEscalas.itens.some((i: Json) => i.tipo.startsWith('escala_')));
  });
});

describe('vínculo encerrado', () => {
  it('cancela as aplicações abertas, e o psicólogo seguinte não vê as do anterior', async () => {
    const paciente = await novoPaciente('Paciente Troca');
    const aberta = await solicitada(A, paciente, 'PHQ-9');
    const respondida = await solicitada(A, paciente, 'GAD-7');
    await paciente.mobile('POST', `/paciente/aplicacoes/${respondida}/respostas`, { respostas: Array(7).fill(0) });

    assert.equal((await A.requisitar('POST', `/psicologo/pacientes/${paciente.id}/encerrar-vinculo`, { corpo: {} })).status, 200);
    const { rows } = await dono.query('SELECT id, status FROM aplicacao_escala WHERE paciente_id = $1 ORDER BY id', [paciente.id]);
    assert.deepEqual(rows, [
      { id: aberta, status: 'cancelada' },
      { id: respondida, status: 'concluida' },
    ]);
    assert.deepEqual(await ler(await paciente.mobile('GET', '/paciente/escalas/pendentes')), []);

    await vincular(usuarioB, paciente.usuario);
    await definirConsentimento(paciente.id, { escalas: true });
    const historicoB = await ler(await B.requisitar('GET', `/psicologo/pacientes/${paciente.id}/escalas`));
    assert.deepEqual(historicoB.aplicacoes, []);
    assert.equal((await B.requisitar('GET', `/psicologo/aplicacoes/${respondida}`)).status, 404);
    const direto = await comContextoPsicologo(psicologoIdB, (c) =>
      c.query('SELECT 1 FROM aplicacao_escala WHERE paciente_id = $1', [paciente.id]),
    );
    assert.equal(direto.rowCount, 0);
    assert.equal((await solicitar(B, paciente, 'PHQ-9')).status, 201);
  });
});

describe('RLS da aplicação', () => {
  it('o psicólogo só solicita com vínculo e só consegue cancelar', async () => {
    const paciente = await novoPaciente('Paciente Rls');
    const fora = await novoPaciente('Paciente Rls Fora', () => usuarioB);
    const id = await solicitada(A, paciente, 'PHQ-9');
    const inserir = (psicologo: number, alvo: number, status = 'pendente') => (c: PoolClient) =>
      c.query('INSERT INTO aplicacao_escala (paciente_id, psicologo_id, escala_id, status) VALUES ($1, $2, $3, $4)', [
        alvo,
        psicologo,
        escalaId['GAD-7'],
        status,
      ]);

    await assert.rejects(comContextoPsicologo(psicologoIdB, inserir(psicologoIdB, paciente.id)), /row-level security/);
    await assert.rejects(comContextoPsicologo(psicologoIdB, inserir(psicologoIdA, fora.id)), /row-level security/);
    await assert.rejects(comContextoPsicologo(psicologoIdA, inserir(psicologoIdA, fora.id)), /row-level security/);
    await assert.rejects(comContextoPsicologo(psicologoIdA, inserir(psicologoIdA, paciente.id, 'concluida')), /row-level security/);

    await assert.rejects(
      comContextoPsicologo(psicologoIdA, (c) => c.query('UPDATE aplicacao_escala SET score_total = 99 WHERE id = $1', [id])),
      /row-level security/,
    );
    const apagadas = await comContextoPsicologo(psicologoIdA, (c) => c.query('DELETE FROM aplicacao_escala WHERE id = $1', [id]));
    assert.equal(apagadas.rowCount, 0);
    const canceladas = await comContextoPsicologo(psicologoIdA, (c) =>
      c.query("UPDATE aplicacao_escala SET status = 'cancelada' WHERE id = $1", [id]),
    );
    assert.equal(canceladas.rowCount, 1);
    const alheia = await comContextoPsicologo(psicologoIdB, (c) =>
      c.query("UPDATE aplicacao_escala SET status = 'cancelada' WHERE id = $1", [id]),
    );
    assert.equal(alheia.rowCount, 0);
  });
});

describe('linguagem', () => {
  it('nenhuma resposta de escala traz rótulo de severidade', () => {
    assert.ok(corposVistos.length > 30);
    const palavras = /leve|moderad|grave|severo|mínimo/i;
    for (const corpo of corposVistos) assert.doesNotMatch(corpo, palavras);
  });
});
