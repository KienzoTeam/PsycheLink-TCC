import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { comContextoPaciente, comContextoPsicologo } from '../src/lib/contextoseguro';
import { descriptografar } from '../src/lib/criptografia';
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
type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const ler = async (res: Response): Promise<Json> => (await res.json()) as Json;

// Instantes fixos no futuro, no fuso de São Paulo. Cada teste usa o seu dia para não esbarrar nos outros.
const em = (dia: string, hora: string) => `2031-${dia}T${hora}:00-03:00`;
const OBSERVACAO = 'queixa de insônia reservada';

let usuarioA: Awaited<ReturnType<typeof criarPsicologo>>;
let usuarioB: Awaited<ReturnType<typeof criarPsicologo>>;
let A: Web;
let B: Web;
let psicologoIdA: number;
let psicologoIdB: number;
let ana: { usuario: Awaited<ReturnType<typeof criarPaciente>>; id: number };
let bia: typeof ana;
let eva: typeof ana;

async function novoPaciente(nome: string, psicologo: { id: number }) {
  const usuario = await criarPaciente(nome);
  await vincular(psicologo, usuario);
  return { usuario, id: await pacienteIdDe(usuario) };
}

before(async () => {
  usuarioA = await criarPsicologo();
  usuarioB = await criarPsicologo();
  [A, B] = [await entrar(servidor.url, usuarioA), await entrar(servidor.url, usuarioB)];
  [psicologoIdA, psicologoIdB] = [await psicologoIdDe(usuarioA), await psicologoIdDe(usuarioB)];
  ana = await novoPaciente('Ana Consulta', usuarioA);
  bia = await novoPaciente('Bia Consulta', usuarioA);
  eva = await novoPaciente('Eva Consulta', usuarioB);
});

const agendar = (web: Web, pacienteId: number, inicio: string, fim: string, observacao?: string) =>
  web.requisitar('POST', '/psicologo/consultas', { corpo: { pacienteId, inicio, fim, observacao } });

async function criada(web: Web, pacienteId: number, inicio: string, fim: string, observacao?: string) {
  const res = await agendar(web, pacienteId, inicio, fim, observacao);
  assert.equal(res.status, 201);
  return (await ler(res)).consulta;
}

const statusDe = async (id: number) =>
  (await dono.query('SELECT status FROM consulta WHERE id = $1', [id])).rows[0].status;

const auditoriaDe = async (acao: string, pacienteId: number) =>
  (await dono.query('SELECT alvo_id, metadados FROM auditoria WHERE acao = $1 AND paciente_id = $2 ORDER BY id', [acao, pacienteId])).rows;

const CONFLITO = { codigo: 'CONFLITO_AGENDA', error: 'Já existe uma consulta neste horário.' };

describe('criar consulta', () => {
  it('grava com a observação cifrada, devolve ISO com offset e audita sem texto', async () => {
    const res = await agendar(A, ana.id, em('03-10', '10:00'), em('03-10', '11:00'), OBSERVACAO);
    assert.equal(res.status, 201);
    const { consulta } = await ler(res);
    assert.deepEqual(
      [consulta.pacienteId, consulta.pacienteNome, consulta.status, consulta.remarcadaDe, consulta.observacao],
      [ana.id, 'Ana Consulta', 'agendada', null, OBSERVACAO],
    );
    assert.equal(Date.parse(consulta.inicio), Date.parse(em('03-10', '10:00')));
    assert.match(consulta.inicio, /Z$|[+-]\d{2}:\d{2}$/);

    const { rows } = await dono.query('SELECT observacao FROM consulta WHERE id = $1', [consulta.id]);
    assert.notEqual(rows[0].observacao, OBSERVACAO);
    assert.equal(descriptografar(rows[0].observacao), OBSERVACAO);

    const linhas = await auditoriaDe('consulta_criada', ana.id);
    assert.deepEqual(linhas, [{ alvo_id: String(consulta.id), metadados: {} }]);
  });

  it('horário, duração e corpo inválidos: 400', async () => {
    const invalidos: unknown[] = [
      { pacienteId: ana.id, inicio: em('03-11', '10:00'), fim: em('03-11', '10:00') },
      { pacienteId: ana.id, inicio: em('03-11', '10:00'), fim: em('03-11', '09:00') },
      { pacienteId: ana.id, inicio: em('03-11', '10:00'), fim: em('03-11', '10:10') },
      { pacienteId: ana.id, inicio: em('03-11', '10:00'), fim: em('03-11', '14:01') },
      { pacienteId: ana.id, inicio: '2031-03-11T10:00:00', fim: '2031-03-11T11:00:00' },
      { pacienteId: ana.id, inicio: em('03-11', '10:00') },
      { inicio: em('03-11', '10:00'), fim: em('03-11', '11:00') },
      { pacienteId: ana.id, inicio: em('03-11', '10:00'), fim: em('03-11', '11:00'), observacao: 'x'.repeat(2001) },
    ];
    for (const corpo of invalidos) {
      assert.equal((await A.requisitar('POST', '/psicologo/consultas', { corpo })).status, 400, JSON.stringify(corpo));
    }
    assert.equal((await criada(A, ana.id, em('03-11', '10:00'), em('03-11', '10:15'))).status, 'agendada');
    assert.equal((await criada(A, ana.id, em('03-11', '11:00'), em('03-11', '15:00'))).status, 'agendada');
  });

  it('paciente sem vínculo com o psicólogo ou inexistente: 404', async () => {
    assert.equal((await agendar(A, eva.id, em('03-12', '10:00'), em('03-12', '11:00'))).status, 404);
    assert.equal((await agendar(A, 2_147_000_000, em('03-12', '10:00'), em('03-12', '11:00'))).status, 404);
    const { rowCount } = await dono.query('SELECT 1 FROM consulta WHERE paciente_id = $1', [eva.id]);
    assert.equal(rowCount, 0);
  });
});

describe('conflito de agenda', () => {
  it('sobreposição, mesmo para outro paciente, dá 409 CONFLITO_AGENDA; encostar no fim não', async () => {
    await criada(A, ana.id, em('03-13', '10:00'), em('03-13', '11:00'));
    for (const [inicio, fim] of [
      [em('03-13', '10:00'), em('03-13', '11:00')],
      [em('03-13', '10:30'), em('03-13', '11:30')],
      [em('03-13', '09:30'), em('03-13', '10:15')],
      [em('03-13', '10:15'), em('03-13', '10:45')],
    ]) {
      const res = await agendar(A, bia.id, inicio, fim);
      assert.equal(res.status, 409, inicio);
      assert.deepEqual(await ler(res), CONFLITO);
    }
    assert.equal((await agendar(A, bia.id, em('03-13', '11:00'), em('03-13', '12:00'))).status, 201);
    assert.equal((await agendar(A, bia.id, em('03-13', '09:00'), em('03-13', '10:00'))).status, 201);
  });

  it('outro psicólogo pode usar o mesmo horário', async () => {
    await criada(A, ana.id, em('03-14', '10:00'), em('03-14', '11:00'));
    assert.equal((await agendar(B, eva.id, em('03-14', '10:00'), em('03-14', '11:00'))).status, 201);
  });

  it('cancelada não bloqueia o horário', async () => {
    const consulta = await criada(A, ana.id, em('03-15', '10:00'), em('03-15', '11:00'));
    assert.equal((await agendar(A, bia.id, em('03-15', '10:00'), em('03-15', '11:00'))).status, 409);
    const cancelar = await A.requisitar('PATCH', `/psicologo/consultas/${consulta.id}`, {
      corpo: { status: 'cancelada' },
    });
    assert.equal(cancelar.status, 200);
    assert.equal((await agendar(A, bia.id, em('03-15', '10:00'), em('03-15', '11:00'))).status, 201);
  });

  it('pedidos simultâneos no mesmo horário: um cria, o outro leva 409', async () => {
    const status = (
      await Promise.all([
        agendar(A, ana.id, em('03-16', '10:00'), em('03-16', '11:00')),
        agendar(A, bia.id, em('03-16', '10:30'), em('03-16', '11:30')),
      ])
    ).map((r) => r.status);
    assert.deepEqual(status.sort(), [201, 409]);
  });
});

describe('alterar consulta', () => {
  it('muda o status e a observação, e audita só o status novo', async () => {
    const consulta = await criada(A, ana.id, em('03-17', '10:00'), em('03-17', '11:00'));
    const concluir = await A.requisitar('PATCH', `/psicologo/consultas/${consulta.id}`, {
      corpo: { status: 'concluida', observacao: OBSERVACAO },
    });
    assert.equal(concluir.status, 200);
    const { consulta: atual } = await ler(concluir);
    assert.deepEqual([atual.status, atual.observacao], ['concluida', OBSERVACAO]);

    const soObservacao = await A.requisitar('PATCH', `/psicologo/consultas/${consulta.id}`, {
      corpo: { observacao: 'revisada' },
    });
    assert.equal((await ler(soObservacao)).consulta.observacao, 'revisada');
    const limpa = await A.requisitar('PATCH', `/psicologo/consultas/${consulta.id}`, { corpo: { observacao: '' } });
    assert.equal((await ler(limpa)).consulta.observacao, null);

    const linhas = await auditoriaDe('consulta_alterada', ana.id);
    assert.deepEqual(
      linhas.filter((l) => l.alvo_id === String(consulta.id)).map((l) => l.metadados),
      [{ status: 'concluida', observacaoAlterada: true }, { observacaoAlterada: true }, { observacaoAlterada: true }],
    );
    assert.ok(!JSON.stringify(linhas).includes('revisada'));
  });

  it('status só muda numa agendada; corpo vazio ou status inválido: 400', async () => {
    const consulta = await criada(A, ana.id, em('03-18', '10:00'), em('03-18', '11:00'));
    const patch = (corpo: unknown, id = consulta.id) => A.requisitar('PATCH', `/psicologo/consultas/${id}`, { corpo });
    assert.equal((await patch({})).status, 400);
    assert.equal((await patch({ status: 'agendada' })).status, 400);
    assert.equal((await patch({ status: 'remarcada' })).status, 400);
    assert.equal((await patch({ status: 'cancelada' })).status, 200);
    assert.equal((await patch({ status: 'concluida' })).status, 404);
    assert.equal(await statusDe(consulta.id), 'cancelada');
    assert.equal((await patch({ status: 'cancelada' }, 2_147_000_000)).status, 404);
  });

  it('o psicólogo B não altera, remarca nem lê a consulta do A', async () => {
    const consulta = await criada(A, ana.id, em('03-19', '10:00'), em('03-19', '11:00'), OBSERVACAO);
    assert.equal((await B.requisitar('PATCH', `/psicologo/consultas/${consulta.id}`, { corpo: { status: 'cancelada' } })).status, 404);
    const remarcar = await B.requisitar('POST', `/psicologo/consultas/${consulta.id}/remarcar`, {
      corpo: { inicio: em('03-19', '14:00'), fim: em('03-19', '15:00') },
    });
    assert.equal(remarcar.status, 404);
    const lista = await ler(await B.requisitar('GET', '/psicologo/consultas?de=2031-03-01&ate=2031-03-31'));
    assert.ok(!lista.consultas.some((c: Json) => c.id === consulta.id));
    assert.equal(await statusDe(consulta.id), 'agendada');
  });
});

describe('remarcar', () => {
  it('marca a original remarcada, cria a nova ligada a ela e libera o horário antigo', async () => {
    const original = await criada(A, ana.id, em('03-20', '10:00'), em('03-20', '11:00'));
    const res = await A.requisitar('POST', `/psicologo/consultas/${original.id}/remarcar`, {
      corpo: { inicio: em('03-20', '14:00'), fim: em('03-20', '15:00') },
    });
    assert.equal(res.status, 201);
    const { consulta: nova } = await ler(res);
    assert.deepEqual([nova.status, nova.remarcadaDe, nova.pacienteId], ['agendada', original.id, ana.id]);
    assert.equal(await statusDe(original.id), 'remarcada');

    assert.equal((await agendar(A, bia.id, em('03-20', '10:00'), em('03-20', '11:00'))).status, 201);
    assert.equal((await agendar(A, bia.id, em('03-20', '14:30'), em('03-20', '15:30'))).status, 409);

    assert.deepEqual(
      (await auditoriaDe('consulta_alterada', ana.id)).filter((l) => l.alvo_id === String(original.id)).map((l) => l.metadados),
      [{ status: 'remarcada' }],
    );
    assert.deepEqual(
      (await auditoriaDe('consulta_criada', ana.id)).filter((l) => l.alvo_id === String(nova.id)).map((l) => l.metadados),
      [{ remarcadaDe: original.id }],
    );
  });

  it('pode ocupar parte do horário da própria original', async () => {
    const original = await criada(A, ana.id, em('03-21', '10:00'), em('03-21', '11:00'));
    const res = await A.requisitar('POST', `/psicologo/consultas/${original.id}/remarcar`, {
      corpo: { inicio: em('03-21', '10:30'), fim: em('03-21', '11:30') },
    });
    assert.equal(res.status, 201);
  });

  it('conflito na nova: 409 e a original continua agendada', async () => {
    const original = await criada(A, ana.id, em('03-22', '10:00'), em('03-22', '11:00'));
    await criada(A, bia.id, em('03-22', '14:00'), em('03-22', '15:00'));
    const res = await A.requisitar('POST', `/psicologo/consultas/${original.id}/remarcar`, {
      corpo: { inicio: em('03-22', '14:30'), fim: em('03-22', '15:30') },
    });
    assert.equal(res.status, 409);
    assert.deepEqual(await ler(res), CONFLITO);
    assert.equal(await statusDe(original.id), 'agendada');
    const filhas = await dono.query('SELECT 1 FROM consulta WHERE remarcada_de = $1', [original.id]);
    assert.equal(filhas.rowCount, 0);
  });

  it('só remarca agendada, com horário válido', async () => {
    const consulta = await criada(A, ana.id, em('03-23', '10:00'), em('03-23', '11:00'));
    const remarcar = (corpo: unknown) => A.requisitar('POST', `/psicologo/consultas/${consulta.id}/remarcar`, { corpo });
    assert.equal((await remarcar({ inicio: em('03-23', '14:00'), fim: em('03-23', '14:05') })).status, 400);
    assert.equal((await remarcar({})).status, 400);
    await A.requisitar('PATCH', `/psicologo/consultas/${consulta.id}`, { corpo: { status: 'cancelada' } });
    assert.equal((await remarcar({ inicio: em('03-23', '14:00'), fim: em('03-23', '15:00') })).status, 404);
  });
});

describe('listar consultas', () => {
  it('filtra por dia de São Paulo (a que vira a meia-noite entra nos dois), ordena e limita a 92 dias', async () => {
    await criada(A, ana.id, em('04-02', '23:30'), em('04-03', '00:30'));
    await criada(A, bia.id, em('04-03', '10:00'), em('04-03', '11:00'), OBSERVACAO);
    const dia2 = await ler(await A.requisitar('GET', '/psicologo/consultas?de=2031-04-02&ate=2031-04-02'));
    assert.deepEqual(dia2.consultas.map((c: Json) => c.pacienteNome), ['Ana Consulta']);
    const dia3 = await ler(await A.requisitar('GET', '/psicologo/consultas?de=2031-04-03&ate=2031-04-03'));
    assert.deepEqual(dia3.consultas.map((c: Json) => c.pacienteNome), ['Ana Consulta', 'Bia Consulta']);
    const dia4 = await ler(await A.requisitar('GET', '/psicologo/consultas?de=2031-04-04&ate=2031-04-04'));
    assert.deepEqual(dia4.consultas, []);
    const dois = await ler(await A.requisitar('GET', '/psicologo/consultas?de=2031-04-02&ate=2031-04-03'));
    assert.deepEqual(dois.consultas.map((c: Json) => c.pacienteNome), ['Ana Consulta', 'Bia Consulta']);
    assert.equal(dois.consultas[1].observacao, OBSERVACAO);

    const limite = (de: string, ate: string) => A.requisitar('GET', `/psicologo/consultas?de=${de}&ate=${ate}`);
    assert.equal((await limite('2031-01-01', '2031-04-02')).status, 200);
    assert.equal((await limite('2031-01-01', '2031-04-03')).status, 400);
    assert.equal((await limite('2031-04-03', '2031-04-02')).status, 400);
    assert.equal((await A.requisitar('GET', '/psicologo/consultas')).status, 400);
    assert.equal((await A.requisitar('GET', '/psicologo/consultas?de=2031-04-01&ate=2031-04-30')).status, 200);
  });
});

describe('paciente vê as consultas', () => {
  it('próximas e as 10 últimas passadas, sem observação e sem a original remarcada', async () => {
    const paciente = await novoPaciente('Paciente Agenda', usuarioA);
    const outro = await novoPaciente('Paciente Outro', usuarioA);
    const mobile = (p: typeof paciente) => async () =>
      ler(
        await criarCliente(servidor.url).requisitar('GET', '/paciente/consultas', {
          cabecalhos: bearer(p.usuario),
          origem: null,
        }),
      );

    const futura = await criada(A, paciente.id, em('05-05', '10:00'), em('05-05', '11:00'), OBSERVACAO);
    const cancelada = await criada(A, paciente.id, em('05-06', '10:00'), em('05-06', '11:00'), OBSERVACAO);
    await A.requisitar('PATCH', `/psicologo/consultas/${cancelada.id}`, { corpo: { status: 'cancelada' } });
    const original = await criada(A, paciente.id, em('05-07', '10:00'), em('05-07', '11:00'));
    const remarcada = await ler(
      await A.requisitar('POST', `/psicologo/consultas/${original.id}/remarcar`, {
        corpo: { inicio: em('05-08', '10:00'), fim: em('05-08', '11:00') },
      }),
    );
    await criada(A, outro.id, em('05-09', '10:00'), em('05-09', '11:00'));
    await dono.query(
      `INSERT INTO consulta (psicologo_id, paciente_id, inicio, fim, status)
       SELECT $1, $2, now() - (n || ' days')::interval, now() - (n || ' days')::interval + interval '1 hour', 'concluida'
         FROM generate_series(2, 13) AS n`,
      [psicologoIdA, paciente.id],
    );

    const corpo = await mobile(paciente)();
    assert.deepEqual(
      corpo.proximas.map((c: Json) => c.id),
      [futura.id, cancelada.id, remarcada.consulta.id],
    );
    assert.deepEqual(corpo.proximas[1].status, 'cancelada');
    assert.equal(corpo.passadas.length, 10);
    const inicios = corpo.passadas.map((c: Json) => Date.parse(c.inicio));
    assert.deepEqual(inicios, [...inicios].sort((a: number, b: number) => b - a));
    assert.ok(corpo.proximas.every((c: Json) => typeof c.psicologo.nome === 'string' && !('observacao' in c)));
    assert.ok(corpo.passadas.every((c: Json) => !('observacao' in c)));
    assert.ok(!JSON.stringify(corpo).includes(OBSERVACAO));
    assert.ok(!corpo.proximas.some((c: Json) => c.id === original.id));

    const doOutro = await mobile(outro)();
    assert.equal(doOutro.proximas.length, 1);
    assert.deepEqual(doOutro.passadas, []);
    assert.equal(
      (await criarCliente(servidor.url).requisitar('GET', '/paciente/consultas', { origem: null })).status,
      401,
    );
  });
});

describe('dashboard e linha do tempo', () => {
  it('consultas de hoje no dia de São Paulo, com status, e a consulta na linha do tempo', async () => {
    const usuarioC = await criarPsicologo();
    const C = await entrar(servidor.url, usuarioC);
    const psicologoC = await psicologoIdDe(usuarioC);
    const paciente = await novoPaciente('Paciente Hoje', usuarioC);
    await definirConsentimento(paciente.id, { humor: true });
    await dono.query(
      `INSERT INTO consulta (psicologo_id, paciente_id, inicio, fim, status)
       VALUES ($1, $2, (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') + interval '9 hours') AT TIME ZONE 'America/Sao_Paulo',
                       (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') + interval '10 hours') AT TIME ZONE 'America/Sao_Paulo', 'concluida'),
              ($1, $2, (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') + interval '8 hours') AT TIME ZONE 'America/Sao_Paulo',
                       (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') + interval '8 hours 50 minutes') AT TIME ZONE 'America/Sao_Paulo', 'cancelada'),
              ($1, $2, now() + interval '2 days', now() + interval '2 days 1 hour', 'agendada')`,
      [psicologoC, paciente.id],
    );

    const painel = await ler(await C.requisitar('GET', '/psicologo/dashboard'));
    assert.deepEqual(
      painel.consultasHoje.map((c: Json) => [c.nome, c.status, c.pacienteId]),
      [['Paciente Hoje', 'cancelada', paciente.id], ['Paciente Hoje', 'concluida', paciente.id]],
    );
    assert.deepEqual(Object.keys(painel.consultasHoje[0]).sort(), ['fim', 'id', 'inicio', 'nome', 'pacienteId', 'status']);

    const tempo = await ler(await C.requisitar('GET', `/psicologo/pacientes/${paciente.id}/linha-do-tempo`));
    const itens = tempo.itens.filter((i: Json) => i.tipo === 'consulta');
    assert.deepEqual(itens.map((i: Json) => i.status), ['agendada', 'concluida', 'cancelada']);
    assert.ok(itens.every((i: Json) => Number.isInteger(i.id) && Date.parse(i.em)));
  });
});

describe('vínculo encerrado', () => {
  it('cancela as consultas futuras agendadas e libera o horário do psicólogo', async () => {
    const paciente = await novoPaciente('Paciente Saindo', usuarioA);
    const futura = await criada(A, paciente.id, em('06-10', '10:00'), em('06-10', '11:00'));
    const concluida = await criada(A, paciente.id, em('06-11', '10:00'), em('06-11', '11:00'));
    await A.requisitar('PATCH', `/psicologo/consultas/${concluida.id}`, { corpo: { status: 'concluida' } });
    await dono.query(
      `INSERT INTO consulta (psicologo_id, paciente_id, inicio, fim, status)
       VALUES ($1, $2, now() - interval '3 days', now() - interval '3 days' + interval '1 hour', 'agendada')`,
      [psicologoIdA, paciente.id],
    );

    assert.equal((await A.requisitar('POST', `/psicologo/pacientes/${paciente.id}/encerrar-vinculo`, { corpo: {} })).status, 200);
    assert.equal(await statusDe(futura.id), 'cancelada');
    assert.equal(await statusDe(concluida.id), 'concluida');
    const passada = await dono.query("SELECT status FROM consulta WHERE paciente_id = $1 AND inicio < now()", [paciente.id]);
    assert.equal(passada.rows[0].status, 'agendada');

    assert.equal((await agendar(A, ana.id, em('06-10', '10:00'), em('06-10', '11:00'))).status, 201);
  });
});

describe('RLS da consulta', () => {
  it('cada psicólogo só alcança as próprias, não apaga, e o paciente só lê', async () => {
    const consulta = await criada(A, ana.id, em('07-01', '10:00'), em('07-01', '11:00'));
    const contar = (c: { query: (sql: string, v?: unknown[]) => Promise<{ rowCount: number | null }> }) =>
      c.query('SELECT 1 FROM consulta WHERE id = $1', [consulta.id]).then((r) => r.rowCount);

    assert.equal(await comContextoPsicologo(psicologoIdA, contar), 1);
    assert.equal(await comContextoPsicologo(psicologoIdB, contar), 0);
    assert.equal(await comContextoPaciente(ana.id, contar), 1);
    assert.equal(await comContextoPaciente(bia.id, contar), 0);

    await assert.rejects(
      comContextoPsicologo(psicologoIdB, (c) =>
        c.query(
          "INSERT INTO consulta (psicologo_id, paciente_id, inicio, fim) VALUES ($1, $2, '2031-07-02T10:00:00-03:00', '2031-07-02T11:00:00-03:00')",
          [psicologoIdA, ana.id],
        ),
      ),
      /row-level security/,
    );
    await assert.rejects(
      comContextoPsicologo(psicologoIdB, (c) =>
        c.query(
          "INSERT INTO consulta (psicologo_id, paciente_id, inicio, fim) VALUES ($1, $2, '2031-07-02T10:00:00-03:00', '2031-07-02T11:00:00-03:00')",
          [psicologoIdB, ana.id],
        ),
      ),
      /row-level security/,
    );
    const apagadas = await comContextoPsicologo(psicologoIdA, (c) => c.query('DELETE FROM consulta WHERE id = $1', [consulta.id]));
    assert.equal(apagadas.rowCount, 0);
    const alteradasPorPaciente = await comContextoPaciente(ana.id, (c) =>
      c.query("UPDATE consulta SET status = 'cancelada' WHERE id = $1", [consulta.id]),
    );
    assert.equal(alteradasPorPaciente.rowCount, 0);
    assert.equal(await statusDe(consulta.id), 'agendada');
  });
});
