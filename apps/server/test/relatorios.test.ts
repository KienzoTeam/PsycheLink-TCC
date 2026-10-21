import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { criptografar } from '../src/lib/criptografia';
import {
  bearer,
  capturarCodigos,
  carregarApp,
  criarCheckin,
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
const obter = async (web: Web, caminho: string) => ler(await web.requisitar('GET', caminho));

const OBSERVACAO = 'observação reservada da consulta';
const NOTA = 'nota privada de sessão';

async function dia(atras: number) {
  const { rows } = await dono.query<{ d: string }>(
    "SELECT to_char(CURRENT_DATE - $1::int, 'YYYY-MM-DD') AS d",
    [atras],
  );
  return rows[0].d;
}

let usuarioA: Awaited<ReturnType<typeof criarPsicologo>>;
let A: Web;
let B: Web;
let ana: { usuario: Awaited<ReturnType<typeof criarPaciente>>; id: number };
let davi: typeof ana;
let eva: typeof ana;
let de: string;
let ate: string;
let periodo: string;

async function novoPaciente(nome: string, psicologo: { id: number }, consentimento: Parameters<typeof definirConsentimento>[1]) {
  const usuario = await criarPaciente(nome);
  await vincular(psicologo, usuario);
  const id = await pacienteIdDe(usuario);
  await definirConsentimento(id, consentimento);
  return { usuario, id };
}

before(async () => {
  usuarioA = await criarPsicologo();
  const usuarioB = await criarPsicologo();
  [A, B] = [await entrar(servidor.url, usuarioA), await entrar(servidor.url, usuarioB)];
  const psicologoIdA = await psicologoIdDe(usuarioA);
  [de, ate] = [await dia(30), await dia(0)];
  periodo = `de=${de}&ate=${ate}`;

  ana = await novoPaciente('Ana Relatório', usuarioA, { humor: true, habitos: true, escalas: true, diario: true });
  davi = await novoPaciente('Davi Relatório', usuarioA, { humor: false, habitos: true, escalas: false });
  eva = await novoPaciente('Eva Relatório', usuarioB, { humor: true, habitos: true, escalas: true });

  await criarCheckin(ana.id, { diasAtras: 0, humor: 8, ansiedade: 2, horasSono: 8, emocoes: ['Feliz'], exercicio: true, horaUtc: '12:00' });
  await criarCheckin(ana.id, { diasAtras: 1, humor: 6, ansiedade: 4, horasSono: 6, emocoes: ['Ansioso', 'Triste'], horaUtc: '23:00' });
  await criarCheckin(ana.id, { diasAtras: 2, humor: 4, ansiedade: 6, horasSono: 7, emocoes: ['Ansioso'] });
  await criarCheckin(davi.id, { diasAtras: 0, humor: 9, ansiedade: 1, horasSono: 5, emocoes: ['Calmo'] });
  await criarCheckin(davi.id, { diasAtras: 1, humor: 3, ansiedade: 9, horasSono: 7, emocoes: ['Triste'] });
  await criarCheckin(eva.id, { diasAtras: 0 });

  const aplicacao = await ler(
    await A.requisitar('POST', `/psicologo/pacientes/${ana.id}/escalas`, {
      corpo: { escalaId: (await dono.query("SELECT id FROM escala WHERE sigla = 'PHQ-9'")).rows[0].id },
    }),
  );
  const respondida = await criarCliente(servidor.url).requisitar(
    'POST',
    `/paciente/aplicacoes/${aplicacao.aplicacao.id}/respostas`,
    { corpo: { respostas: [1, 1, 1, 1, 1, 1, 1, 1, 1] }, cabecalhos: bearer(ana.usuario), origem: null },
  );
  assert.equal(respondida.status, 200);

  await dono.query(
    `INSERT INTO consulta (psicologo_id, paciente_id, inicio, fim, status, observacao)
     VALUES ($1, $2, now() - interval '1 day', now() - interval '1 day' + interval '1 hour', 'agendada', $3),
            ($1, $2, now() - interval '2 days', now() - interval '2 days' + interval '1 hour', 'concluida', $3),
            ($1, $2, now() - interval '3 days', now() - interval '3 days' + interval '1 hour', 'cancelada', $3)`,
    [psicologoIdA, ana.id, criptografar(OBSERVACAO)],
  );
  const nota = await A.requisitar('POST', `/psicologo/pacientes/${ana.id}/anotacoes`, { corpo: { conteudo: NOTA } });
  assert.equal(nota.status, 201);
});

const auditoriaDe = async (acao: string, pacienteId: number) =>
  (await dono.query('SELECT id, metadados FROM auditoria WHERE acao = $1 AND paciente_id = $2 ORDER BY id', [acao, pacienteId])).rows;

describe('relatório geral', () => {
  it('traz o cabeçalho e as contagens de cada paciente, respeitando o consentimento', async () => {
    const corpo = await obter(A, `/psicologo/relatorios/geral?${periodo}`);
    const perfil = await obter(A, '/psicologo/me');
    assert.deepEqual(corpo.cabecalho.psicologo, { nome: perfil.nome, crp: perfil.crp });
    assert.deepEqual(corpo.cabecalho.periodo, { de, ate });
    assert.ok(Math.abs(Date.now() - Date.parse(corpo.cabecalho.geradoEm)) < 60_000);

    assert.deepEqual(corpo.pacientes.map((p: Json) => p.nome), ['Ana Relatório', 'Davi Relatório']);
    const [a, d] = corpo.pacientes;
    assert.deepEqual(a, {
      pacienteId: ana.id,
      nome: 'Ana Relatório',
      consentimentos: { humor: true, habitos: true, escalas: true },
      registros: 3,
      humorMedio: 6,
      ansiedadeMedia: 4,
      sonoMedioHoras: 7,
      escalasConcluidas: 1,
      consultas: { agendada: 1, concluida: 1, cancelada: 1, remarcada: 0 },
    });
    assert.deepEqual(d, {
      pacienteId: davi.id,
      nome: 'Davi Relatório',
      consentimentos: { humor: false, habitos: true, escalas: false },
      registros: null,
      humorMedio: null,
      ansiedadeMedia: null,
      sonoMedioHoras: 6,
      escalasConcluidas: null,
      consultas: { agendada: 0, concluida: 0, cancelada: 0, remarcada: 0 },
    });
  });

  it('o período recorta as contagens e o do outro psicólogo não aparece', async () => {
    const hoje = await obter(A, `/psicologo/relatorios/geral?de=${ate}&ate=${ate}`);
    assert.equal(hoje.pacientes[0].registros, 1);
    assert.equal(hoje.pacientes[0].consultas.agendada, 0);
    const doB = await obter(B, `/psicologo/relatorios/geral?${periodo}`);
    assert.deepEqual(doB.pacientes.map((p: Json) => p.nome), ['Eva Relatório']);
  });

  it('período ausente, invertido ou acima de 366 dias: 400', async () => {
    for (const consulta of ['', `de=${de}`, `de=${ate}&ate=${de}`, 'de=2020-01-01&ate=2021-01-02', 'de=ontem&ate=hoje']) {
      assert.equal((await A.requisitar('GET', `/psicologo/relatorios/geral?${consulta}`)).status, 400, consulta);
    }
  });
});

describe('relatório individual', () => {
  it('traz cabeçalho, série diária, frequência, hábitos, horários, escalas e consultas', async () => {
    const corpo = await obter(A, `/psicologo/relatorios/pacientes/${ana.id}?${periodo}`);
    assert.deepEqual(corpo.cabecalho.paciente, { id: ana.id, nome: 'Ana Relatório' });
    assert.deepEqual(corpo.cabecalho.periodo, { de, ate });
    assert.equal(typeof corpo.cabecalho.psicologo.crp, 'string');
    assert.ok(Date.parse(corpo.cabecalho.geradoEm));
    assert.deepEqual(corpo.consentimentos, { humor: true, habitos: true, escalas: true, diario: true });

    assert.deepEqual(corpo.serieDiaria.map((r: Json) => r.humor), [4, 6, 8]);
    assert.deepEqual(corpo.frequenciaEmocional[0], { emocao: 'Ansioso', quantidade: 2 });
    assert.equal(corpo.habitos.exercicio, 1);
    assert.deepEqual(corpo.distribuicaoHorario, { madrugada: 0, manha: 1, tarde: 1, noite: 1 });

    assert.equal(corpo.escalas.length, 1);
    assert.deepEqual([corpo.escalas[0].escala.sigla, corpo.escalas[0].status, corpo.escalas[0].scoreTotal], ['PHQ-9', 'concluida', 9]);
    assert.deepEqual(corpo.consultas.map((c: Json) => c.status), ['cancelada', 'concluida', 'agendada']);
    assert.ok(corpo.consultas.every((c: Json) => !('observacao' in c)));
    assert.equal(corpo.anotacoes, null);
    assert.ok(!JSON.stringify(corpo).includes(NOTA));
    assert.ok(!JSON.stringify(corpo).includes(OBSERVACAO));
  });

  it('usa a mesma série do resumo do paciente', async () => {
    const resumo = await obter(A, `/psicologo/pacientes/${ana.id}/resumo?${periodo}`);
    const corpo = await obter(A, `/psicologo/relatorios/pacientes/${ana.id}?${periodo}`);
    assert.deepEqual(corpo.serieDiaria, resumo.registros);
    assert.deepEqual(corpo.frequenciaEmocional, resumo.frequenciaEmocional);
    assert.deepEqual(corpo.habitos, resumo.habitos);
    assert.deepEqual(corpo.distribuicaoHorario, resumo.distribuicaoHorario);
  });

  it('sem consentimento de humor oculta a série; sem escalas, a lista vem vazia com o aviso', async () => {
    const corpo = await obter(A, `/psicologo/relatorios/pacientes/${davi.id}?${periodo}`);
    assert.equal(corpo.serieDiaria.length, 2);
    for (const r of corpo.serieDiaria) {
      assert.deepEqual([r.humor, r.ansiedade, r.emocoes, r.gatilhos, r.horario], [null, null, null, null, null]);
    }
    assert.deepEqual(corpo.serieDiaria.map((r: Json) => r.sonoHoras).sort(), [5, 7]);
    assert.equal(corpo.distribuicaoHorario, null);
    assert.deepEqual(corpo.frequenciaEmocional, []);
    assert.deepEqual(corpo.escalas, []);
    assert.deepEqual(corpo.consentimentos, { humor: false, habitos: true, escalas: false, diario: false });
  });

  it('as anotações só entram com incluirAnotacoes=true, e a leitura é auditada', async () => {
    const sem = await obter(A, `/psicologo/relatorios/pacientes/${ana.id}?${periodo}&incluirAnotacoes=false`);
    assert.equal(sem.anotacoes, null);
    assert.equal((await auditoriaDe('anotacoes_lidas', ana.id)).length, 0);

    const com = await obter(A, `/psicologo/relatorios/pacientes/${ana.id}?${periodo}&incluirAnotacoes=true`);
    assert.deepEqual(com.anotacoes.map((a: Json) => a.conteudo), [NOTA]);
    assert.ok(Date.parse(com.anotacoes[0].criadoEm));
    assert.deepEqual((await auditoriaDe('anotacoes_lidas', ana.id)).map((l) => l.metadados), [{ origem: 'relatorio' }]);

    assert.equal((await A.requisitar('GET', `/psicologo/relatorios/pacientes/${ana.id}?${periodo}&incluirAnotacoes=talvez`)).status, 400);
  });

  it('paciente de outro psicólogo ou período inválido: 404 e 400', async () => {
    assert.equal((await B.requisitar('GET', `/psicologo/relatorios/pacientes/${ana.id}?${periodo}`)).status, 404);
    assert.equal((await A.requisitar('GET', `/psicologo/relatorios/pacientes/${eva.id}?${periodo}`)).status, 404);
    assert.equal((await A.requisitar('GET', `/psicologo/relatorios/pacientes/${ana.id}`)).status, 400);
    assert.equal((await A.requisitar('GET', `/psicologo/relatorios/pacientes/abc?${periodo}`)).status, 404);
  });
});

describe('exportação', () => {
  it('grava a auditoria e devolve o número do relatório', async () => {
    const geral = await A.requisitar('POST', '/psicologo/relatorios/exportacoes', {
      corpo: { tipo: 'geral', de, ate, incluirAnotacoes: false },
    });
    assert.equal(geral.status, 201);
    const { numero } = await ler(geral);
    assert.equal(typeof numero, 'number');
    const { rows } = await dono.query(
      'SELECT ator_user_id, ator_papel, paciente_id, alvo_tipo, metadados FROM auditoria WHERE id = $1 AND acao = $2',
      [numero, 'relatorio_exportado'],
    );
    assert.deepEqual(rows, [
      { ator_user_id: usuarioA.id, ator_papel: 'psicologo', paciente_id: null, alvo_tipo: 'relatorio', metadados: { tipo: 'geral', de, ate } },
    ]);

    const individual = await A.requisitar('POST', '/psicologo/relatorios/exportacoes', {
      corpo: { tipo: 'paciente', pacienteId: ana.id, de, ate, incluirAnotacoes: true },
    });
    assert.equal(individual.status, 201);
    const segundo = (await ler(individual)).numero;
    assert.ok(segundo > numero);
    const [linha] = await auditoriaDe('relatorio_exportado', ana.id);
    assert.equal(Number(linha.id), segundo);
    assert.deepEqual(linha.metadados, { tipo: 'paciente', de, ate, incluirAnotacoes: true });
  });

  it('paciente de outro psicólogo: 404 sem auditoria; corpo ou período inválido: 400', async () => {
    const antes = (await auditoriaDe('relatorio_exportado', eva.id)).length;
    const outro = await A.requisitar('POST', '/psicologo/relatorios/exportacoes', {
      corpo: { tipo: 'paciente', pacienteId: eva.id, de, ate, incluirAnotacoes: false },
    });
    assert.equal(outro.status, 404);
    assert.equal((await auditoriaDe('relatorio_exportado', eva.id)).length, antes);

    for (const corpo of [
      { tipo: 'paciente', de, ate },
      { tipo: 'outro', de, ate },
      { tipo: 'geral', de },
      { tipo: 'geral', de: ate, ate: de },
      { tipo: 'geral', de: '2020-01-01', ate: '2021-01-02' },
    ]) {
      assert.equal((await A.requisitar('POST', '/psicologo/relatorios/exportacoes', { corpo })).status, 400, JSON.stringify(corpo));
    }
    assert.equal((await criarCliente(servidor.url).requisitar('POST', '/psicologo/relatorios/exportacoes', { corpo: { tipo: 'geral', de, ate } })).status, 401);
  });
});
