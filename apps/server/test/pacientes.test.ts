import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { pool } from '../src/db';
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

type Cliente = Awaited<ReturnType<typeof entrar>>;
type Usuario = Awaited<ReturnType<typeof criarPaciente>>;
type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const ler = async (res: Response): Promise<Json> => (await res.json()) as Json;
const obter = async (cliente: Cliente, caminho: string) => ler(await cliente.requisitar('GET', caminho));

async function dia(atras: number) {
  const { rows } = await dono.query<{ d: string }>(
    "SELECT to_char(CURRENT_DATE - $1::int, 'YYYY-MM-DD') AS d",
    [atras],
  );
  return rows[0].d;
}

async function paciente(
  psicologo: { id: number },
  nome: string,
  consentimento: Parameters<typeof definirConsentimento>[1],
) {
  const usuario = await criarPaciente(nome);
  await vincular(psicologo, usuario);
  const id = await pacienteIdDe(usuario);
  await definirConsentimento(id, consentimento);
  return { usuario, id };
}

async function todasAsPaginas(cliente: Cliente, caminho: string, chave: string, tamanho: number) {
  const todos: Json[] = [];
  let cursor: string | null = null;
  do {
    const sep = caminho.includes('?') ? '&' : '?';
    const corpo = await obter(cliente, `${caminho}${sep}limite=${tamanho}${cursor ? `&cursor=${cursor}` : ''}`);
    todos.push(...corpo[chave]);
    cursor = corpo.proximoCursor;
  } while (cursor);
  return todos;
}

// Fixtures compartilhadas: o psicólogo A com pacientes em situações diferentes e o B sem vínculo com eles.
let A: Cliente;
let B: Cliente;
let usuarioA: { id: number; email: string; senha: string };
let ana: Awaited<ReturnType<typeof paciente>>; // ativo, compartilha humor, hábitos e diário
let bruno: Awaited<ReturnType<typeof paciente>>; // esparso, só humor
let carla: Awaited<ReturnType<typeof paciente>>; // sem registros
let davi: Awaited<ReturnType<typeof paciente>>; // não compartilha humor
let eva: Awaited<ReturnType<typeof paciente>>; // paciente do B
let checkinAna: number;
let checkinAnaSemDiario: number;
let checkinBruno: number;
let checkinDavi: number;
let checkinEva: number;

before(async () => {
  usuarioA = await criarPsicologo();
  const usuarioB = await criarPsicologo();
  [A, B] = [await entrar(servidor.url, usuarioA), await entrar(servidor.url, usuarioB)];

  ana = await paciente(usuarioA, 'Ana Ativa', { humor: true, habitos: true, diario: true });
  bruno = await paciente(usuarioA, 'Bruno Esparso', { humor: true, diario: false });
  carla = await paciente(usuarioA, 'Carla Sem', { humor: true });
  davi = await paciente(usuarioA, 'Davi Privado', { humor: false, habitos: true, diario: true });
  eva = await paciente(usuarioB, 'Eva Outra', { humor: true, habitos: true });

  checkinAna = await criarCheckin(ana.id, {
    diasAtras: 0,
    humor: 8,
    emocoes: ['Feliz'],
    diario: 'texto do diário da Ana',
    diarioCompartilhado: true,
    exercicio: true,
  });
  checkinAnaSemDiario = await criarCheckin(ana.id, {
    diasAtras: 1,
    humor: 6,
    emocoes: ['Ansioso', 'Triste'],
    diario: 'texto reservado',
    diarioCompartilhado: false,
  });
  await criarCheckin(ana.id, { diasAtras: 2, humor: 5, emocoes: ['Calmo'] });
  await criarCheckin(ana.id, { diasAtras: 3, humor: 7, emocoes: ['Ansioso'] });
  checkinBruno = await criarCheckin(bruno.id, {
    diasAtras: 0,
    diario: 'diário do Bruno',
    diarioCompartilhado: true,
  });
  for (const diasAtras of [0, 1, 2]) await criarCheckin(davi.id, { diasAtras, diario: 'reservado' });
  checkinDavi = (await dono.query<{ id: number }>('SELECT min(id) AS id FROM checkin_diario WHERE paciente_id = $1', [davi.id])).rows[0].id;
  checkinEva = await criarCheckin(eva.id, { diasAtras: 0 });
});

describe('acesso cruzado: o psicólogo B não alcança o paciente do A', () => {
  it('resumo, linha do tempo, anotações e encerrar vínculo dão 404', async () => {
    const caminhos = [
      ['GET', `/psicologo/pacientes/${ana.id}/resumo`],
      ['GET', `/psicologo/pacientes/${ana.id}/linha-do-tempo`],
      ['GET', `/psicologo/pacientes/${ana.id}/anotacoes`],
      ['POST', `/psicologo/pacientes/${ana.id}/anotacoes`],
      ['POST', `/psicologo/pacientes/${ana.id}/encerrar-vinculo`],
    ];
    for (const [metodo, caminho] of caminhos) {
      const res = await B.requisitar(metodo, caminho, metodo === 'POST' ? { corpo: { conteudo: 'x' } } : {});
      assert.equal(res.status, 404, `${metodo} ${caminho}`);
    }
    const aindaAtivo = await pool.query("SELECT 1 FROM vinculo WHERE paciente_id = $1 AND status = 'ativo'", [ana.id]);
    assert.equal(aindaAtivo.rowCount, 1);
  });

  it('o detalhe do check-in alheio dá 404, igual a um id que não existe, e nada é auditado', async () => {
    const alheio = await B.requisitar('GET', `/psicologo/checkins/${checkinAna}`);
    const inexistente = await B.requisitar('GET', '/psicologo/checkins/2147483000');
    assert.equal(alheio.status, 404);
    assert.deepEqual(await alheio.json(), await inexistente.json());
    const { rows } = await pool.query("SELECT 1 FROM auditoria WHERE acao = 'checkin_visualizado' AND paciente_id = $1", [ana.id]);
    assert.equal(rows.length, 0);
  });

  it('as listas do B não mostram nada do A, e vice-versa', async () => {
    const listaB = await obter(B, '/psicologo/pacientes');
    assert.deepEqual(listaB.pacientes.map((p: Json) => p.id), [eva.id]);
    const checkinsB = await obter(B, '/psicologo/checkins');
    assert.deepEqual(checkinsB.itens.map((c: Json) => c.id), [checkinEva]);
    const filtrando = await obter(B, `/psicologo/checkins?pacienteId=${ana.id}`);
    assert.deepEqual(filtrando.itens, []);
    const listaA = await obter(A, '/psicologo/pacientes');
    assert.ok(!listaA.pacientes.some((p: Json) => p.id === eva.id));
    assert.equal((await A.requisitar('GET', `/psicologo/checkins/${checkinEva}`)).status, 404);
  });
});

describe('consentimento de humor desligado', () => {
  it('o resumo devolve campos nulos e nenhum dado de humor', async () => {
    const corpo = await obter(A, `/psicologo/pacientes/${davi.id}/resumo`);
    assert.equal(corpo.consentimentos.humor, false);
    assert.equal(corpo.registros.length, 3);
    for (const r of corpo.registros) {
      assert.deepEqual([r.humor, r.ansiedade, r.emocoes, r.gatilhos, r.horario], [null, null, null, null, null]);
    }
    assert.equal(corpo.distribuicaoHorario, null);
    assert.equal(corpo.esparso, null);
    assert.deepEqual(corpo.frequenciaEmocional, []);
  });

  it('a lista traz status nulo e o check-in some das listagens e do detalhe', async () => {
    const lista = await obter(A, '/psicologo/pacientes?limite=100');
    const linha = lista.pacientes.find((p: Json) => p.id === davi.id);
    assert.deepEqual(
      [linha.status, linha.registros7d, linha.checkinsUltimos7Dias, linha.ultimoCheckin, linha.humorMedio7d],
      [null, null, 0, null, null],
    );
    const checkins = await obter(A, '/psicologo/checkins?limite=100');
    assert.ok(!checkins.itens.some((c: Json) => c.pacienteId === davi.id));
    assert.equal((await A.requisitar('GET', `/psicologo/checkins/${checkinDavi}`)).status, 404);
    const tempo = await obter(A, `/psicologo/pacientes/${davi.id}/linha-do-tempo`);
    assert.deepEqual(tempo.itens.map((i: Json) => i.tipo), ['vinculo_criado']);
  });

  it('o dashboard ignora o paciente', async () => {
    const corpo = await obter(A, '/psicologo/dashboard');
    assert.ok(!corpo.checkinsRecentes.some((c: Json) => c.pacienteId === davi.id));
    assert.ok(!corpo.dadosInsuficientes.some((c: Json) => c.pacienteId === davi.id));
    assert.ok(!corpo.atividadeRecente.some((c: Json) => c.pacienteId === davi.id && c.acao === 'checkin_registrado'));
  });
});

describe('GET /psicologo/pacientes', () => {
  it('status vem só do volume dos últimos 7 dias e mantém os campos atuais', async () => {
    const { pacientes } = await obter(A, '/psicologo/pacientes?limite=100');
    const por = (p: { id: number }) => pacientes.find((x: Json) => x.id === p.id);

    assert.deepEqual([por(ana).status, por(ana).registros7d], ['ativo', 4]);
    assert.deepEqual([por(bruno).status, por(bruno).registros7d], ['esparso', 1]);
    assert.deepEqual([por(carla).status, por(carla).registros7d], ['sem_registros', 0]);

    const linha = por(ana);
    assert.equal(linha.nome, 'Ana Ativa');
    assert.deepEqual(
      [linha.compartilhaHumor, linha.compartilhaHabitos, linha.compartilhaEscalas, linha.compartilhaDiario],
      [true, true, false, true],
    );
    assert.equal(linha.checkinsUltimos7Dias, 4);
    assert.equal(linha.humorMedio7d, 6.5);
    assert.equal(linha.ansiedadeMedia7d, 4);
    assert.deepEqual(linha.ultimoCheckin, { data: await dia(0), emocoes: ['Feliz'] });
    assert.ok(Date.now() - new Date(linha.vinculadoEm).getTime() < 3_600_000);
    assert.deepEqual(por(carla).ultimoCheckin, null);
  });

  it('filtra por status', async () => {
    const { pacientes } = await obter(A, '/psicologo/pacientes?status=esparso');
    assert.deepEqual(pacientes.map((p: Json) => p.id), [bruno.id]);
    assert.equal((await A.requisitar('GET', '/psicologo/pacientes?status=grave')).status, 400);
  });
});

describe('busca e paginação da lista', () => {
  let E: Cliente;
  before(async () => {
    const usuarioE = await criarPsicologo();
    E = await entrar(servidor.url, usuarioE);
    for (const nome of ['Ana', 'Bia', 'Caio', 'Dani 100%', 'Eli_X']) {
      await paciente(usuarioE, nome, { humor: true });
    }
  });

  const nomes = async (caminho: string) => (await obter(E, caminho)).pacientes.map((p: Json) => p.nome);

  it('% e _ valem como caracteres, não como curinga', async () => {
    assert.deepEqual(await nomes('/psicologo/pacientes?busca=%25'), ['Dani 100%']);
    assert.deepEqual(await nomes('/psicologo/pacientes?busca=_'), ['Eli_X']);
    assert.deepEqual(await nomes('/psicologo/pacientes?busca=%5C'), []);
  });

  it('busca por trecho do nome, sem diferenciar maiúsculas', async () => {
    assert.deepEqual(await nomes('/psicologo/pacientes?busca=AN'), ['Ana', 'Dani 100%']);
  });

  it('pagina por cursor em ordem de nome, sem repetir nem perder', async () => {
    const primeira = await obter(E, '/psicologo/pacientes?limite=2');
    assert.deepEqual(primeira.pacientes.map((p: Json) => p.nome), ['Ana', 'Bia']);
    assert.ok(primeira.proximoCursor);

    const todos = await todasAsPaginas(E, '/psicologo/pacientes', 'pacientes', 2);
    assert.deepEqual(todos.map((p) => p.nome), ['Ana', 'Bia', 'Caio', 'Dani 100%', 'Eli_X']);
    assert.equal((await obter(E, '/psicologo/pacientes?limite=5')).proximoCursor, null);
  });

  it('cursor adulterado ou limite fora da faixa: 400', async () => {
    assert.equal((await E.requisitar('GET', '/psicologo/pacientes?cursor=%25%25')).status, 400);
    assert.equal((await E.requisitar('GET', `/psicologo/pacientes?cursor=${Buffer.from('[1]').toString('base64url')}`)).status, 400);
    assert.equal((await E.requisitar('GET', '/psicologo/pacientes?limite=0')).status, 400);
    assert.equal((await E.requisitar('GET', '/psicologo/pacientes?limite=101')).status, 400);
  });
});

describe('GET /psicologo/pacientes/:id/resumo', () => {
  let gabi: Awaited<ReturnType<typeof paciente>>;
  before(async () => {
    gabi = await paciente(usuarioA, 'Gabi Horários', { humor: true, habitos: true });
    // Horas em UTC; São Paulo é UTC-3.
    const dados: Array<[number, string, number]> = [
      [0, '15:00', 8],
      [1, '05:00', 6],
      [2, '12:00', 4],
      [3, '23:00', 2],
      [4, '02:00', 4],
    ];
    for (const [diasAtras, horaUtc, humor] of dados) await criarCheckin(gabi.id, { diasAtras, horaUtc, humor });
  });

  it('traz o horário em São Paulo e a distribuição por faixa', async () => {
    const corpo = await obter(A, `/psicologo/pacientes/${gabi.id}/resumo`);
    assert.deepEqual(corpo.registros.map((r: Json) => r.horario), ['23:00', '20:00', '09:00', '02:00', '12:00']);
    assert.deepEqual(corpo.distribuicaoHorario, { madrugada: 1, manha: 1, tarde: 1, noite: 2 });
    assert.equal(corpo.esparso, false);
    assert.equal(corpo.periodoDias, 30);
    assert.equal(typeof corpo.registros[0].id, 'number');
    assert.equal(corpo.comparacao, null);
  });

  it('?dias= continua valendo e ?de&ate escolhe o período', async () => {
    assert.equal((await obter(A, `/psicologo/pacientes/${gabi.id}/resumo?dias=2`)).registros.length, 3);
    assert.equal((await obter(A, `/psicologo/pacientes/${gabi.id}/resumo?dias=2`)).periodoDias, 2);
    const recorte = await obter(A, `/psicologo/pacientes/${gabi.id}/resumo?de=${await dia(3)}&ate=${await dia(1)}`);
    assert.deepEqual(recorte.registros.map((r: Json) => r.humor), [2, 4, 6]);
    assert.equal(recorte.periodoDias, 3);
  });

  it('compara dois períodos com médias e contagens', async () => {
    const caminho = `/psicologo/pacientes/${gabi.id}/resumo?de=${await dia(2)}&ate=${await dia(0)}&compararDe=${await dia(4)}&compararAte=${await dia(3)}`;
    const { comparacao } = await obter(A, caminho);
    assert.deepEqual(comparacao.atual, { registros: 3, humorMedio: 6, ansiedadeMedia: 4, sonoMedioHoras: 7 });
    assert.deepEqual(comparacao.anterior, { registros: 2, humorMedio: 3, ansiedadeMedia: 4, sonoMedioHoras: 7 });
  });

  it('período inválido: 400', async () => {
    const base = `/psicologo/pacientes/${gabi.id}/resumo`;
    for (const consulta of [
      `?de=${await dia(0)}&ate=${await dia(3)}`,
      `?de=${await dia(400)}&ate=${await dia(0)}`,
      `?compararDe=${await dia(4)}`,
      '?de=ontem',
    ]) {
      assert.equal((await A.requisitar('GET', base + consulta)).status, 400, consulta);
    }
  });

  it('dentro do consentimento: sem hábitos, sono e comparação de sono saem nulos', async () => {
    const corpo = await obter(A, `/psicologo/pacientes/${bruno.id}/resumo?compararDe=${await dia(9)}&compararAte=${await dia(8)}`);
    assert.equal(corpo.registros[0].sonoHoras, null);
    assert.equal(corpo.comparacao.atual.sonoMedioHoras, null);
    assert.equal(corpo.habitos, null);
    assert.equal(corpo.esparso, true);
  });
});

describe('correlação entre sono e humor', () => {
  async function comPares(nome: string, pares: Array<[number, number]>) {
    const p = await paciente(usuarioA, nome, { humor: true, habitos: true });
    for (const [i, [horasSono, humor]] of pares.entries()) {
      await criarCheckin(p.id, { diasAtras: i, horasSono, humor });
    }
    return (await obter(A, `/psicologo/pacientes/${p.id}/resumo`)).correlacaoSonoHumor;
  }
  const serie = (n: number, humorDe: (i: number) => number): Array<[number, number]> =>
    Array.from({ length: n }, (_, i) => [5 + (i % 5), humorDe(i)]);

  it('com menos de 10 pares é nula', async () => {
    assert.equal(await comPares('Corr Nove', serie(9, (i) => 3 + (i % 5))), null);
  });

  it('com 10 ou mais pares devolve r e n', async () => {
    const correlacao = await comPares('Corr Doze', serie(12, (i) => 3 + (i % 5)));
    assert.deepEqual(correlacao, { r: 1, n: 12 });
  });

  it('sem variação em uma das séries não há correlação', async () => {
    assert.equal(await comPares('Corr Constante', serie(10, () => 5)), null);
  });

  it('sem consentimento de hábitos é nula mesmo com 10 pares', async () => {
    const p = await paciente(usuarioA, 'Corr Sem Habitos', { humor: true });
    for (let i = 0; i < 10; i++) await criarCheckin(p.id, { diasAtras: i, horasSono: 5 + (i % 5), humor: 3 + (i % 5) });
    assert.equal((await obter(A, `/psicologo/pacientes/${p.id}/resumo`)).correlacaoSonoHumor, null);
  });
});

describe('GET /psicologo/pacientes/:id/linha-do-tempo', () => {
  it('mistura check-ins e o evento de vínculo, do mais novo ao mais antigo', async () => {
    const corpo = await obter(A, `/psicologo/pacientes/${ana.id}/linha-do-tempo`);
    assert.deepEqual(corpo.itens.map((i: Json) => i.tipo).sort(), ['checkin', 'checkin', 'checkin', 'checkin', 'vinculo_criado']);
    const instantes = corpo.itens.map((i: Json) => Date.parse(i.em));
    assert.deepEqual(instantes, [...instantes].sort((a, b) => b - a));

    const checkin = corpo.itens.find((i: Json) => i.id === checkinAna);
    assert.deepEqual(checkin, {
      tipo: 'checkin',
      em: checkin.em,
      id: checkinAna,
      data: await dia(0),
      horario: '12:00',
      emocoes: ['Feliz'],
      humor: 8,
      ansiedade: 4,
      sonoHoras: 7,
    });
    assert.deepEqual(Object.keys(corpo.itens.find((i: Json) => i.tipo === 'vinculo_criado')).sort(), ['em', 'tipo']);
    assert.equal(corpo.consentimentos.humor, true);
  });

  it('sono some sem consentimento de hábitos', async () => {
    const corpo = await obter(A, `/psicologo/pacientes/${bruno.id}/linha-do-tempo`);
    assert.equal(corpo.itens.find((i: Json) => i.id === checkinBruno).sonoHoras, null);
  });

  it('pagina por cursor sem repetir nem perder itens, e filtra por data', async () => {
    const inteiro = await obter(A, `/psicologo/pacientes/${ana.id}/linha-do-tempo?limite=100`);
    const paginado = await todasAsPaginas(A, `/psicologo/pacientes/${ana.id}/linha-do-tempo`, 'itens', 2);
    assert.deepEqual(paginado, inteiro.itens);

    const recorte = await obter(A, `/psicologo/pacientes/${ana.id}/linha-do-tempo?de=${await dia(1)}&ate=${await dia(0)}`);
    assert.deepEqual(
      recorte.itens.filter((i: Json) => i.tipo === 'checkin').map((i: Json) => i.data).sort(),
      [await dia(1), await dia(0)].sort(),
    );
    assert.equal((await A.requisitar('GET', `/psicologo/pacientes/${ana.id}/linha-do-tempo?cursor=lixo`)).status, 400);
  });
});

describe('GET /psicologo/checkins', () => {
  const idsDe = (itens: Json[]) => itens.map((i) => i.id);

  it('lista só quem compartilha humor, da data mais nova para a mais antiga', async () => {
    const { itens } = await obter(A, '/psicologo/checkins?limite=100');
    const esperados = await dono.query<{ id: number }>(
      `SELECT c.id FROM checkin_diario c
         JOIN vinculo v ON v.paciente_id = c.paciente_id AND v.status = 'ativo'
         JOIN psicologo ps ON ps.id = v.psicologo_id AND ps.user_id = $1
         JOIN consentimento co ON co.paciente_id = c.paciente_id AND co.compartilha_humor`,
      [usuarioA.id],
    );
    assert.deepEqual(new Set(idsDe(itens)), new Set(esperados.rows.map((r) => r.id)));
    const datas = itens.map((i: Json) => i.data);
    assert.deepEqual(datas, [...datas].sort().reverse());
    assert.ok(itens.every((i: Json) => i.pacienteId !== davi.id && i.pacienteId !== eva.id));
  });

  it('filtra por paciente e por período', async () => {
    const doAna = await obter(A, `/psicologo/checkins?pacienteId=${ana.id}`);
    assert.equal(doAna.itens.length, 4);
    const hoje = await obter(A, `/psicologo/checkins?pacienteId=${ana.id}&de=${await dia(0)}&ate=${await dia(0)}`);
    assert.deepEqual(idsDe(hoje.itens), [checkinAna]);
  });

  it('filtra por emoção depois de decifrar, sem diferenciar maiúsculas, e pagina', async () => {
    const todos = await todasAsPaginas(A, `/psicologo/checkins?pacienteId=${ana.id}&emocao=ansioso`, 'itens', 1);
    assert.equal(todos.length, 2);
    assert.ok(todos.every((i) => i.emocoes.includes('Ansioso')));
    assert.ok(idsDe(todos).includes(checkinAnaSemDiario));
    assert.deepEqual((await obter(A, `/psicologo/checkins?pacienteId=${ana.id}&emocao=raiva`)).itens, []);
  });

  it('sono depende de hábitos; paginação cobre tudo uma vez só', async () => {
    const todos = await todasAsPaginas(A, '/psicologo/checkins', 'itens', 3);
    assert.equal(new Set(idsDe(todos)).size, todos.length);
    assert.equal(todos.find((i) => i.id === checkinAna)?.sonoHoras, 7);
    assert.equal(todos.find((i) => i.id === checkinBruno)?.sonoHoras, null);
    assert.equal(typeof todos[0].horario, 'string');
  });

  it('parâmetros inválidos: 400', async () => {
    for (const consulta of ['?de=amanhã', '?pacienteId=abc', '?cursor=x', '?limite=500']) {
      assert.equal((await A.requisitar('GET', `/psicologo/checkins${consulta}`)).status, 400, consulta);
    }
  });
});

describe('GET /psicologo/checkins/:id', () => {
  const linhas = async () =>
    (await pool.query("SELECT paciente_id, alvo_tipo, alvo_id, metadados FROM auditoria WHERE ator_user_id = $1 AND acao = 'checkin_visualizado'", [usuarioA.id])).rows;

  it('devolve o registro completo, com o diário só se tudo permitir, e audita a visualização', async () => {
    const corpo = await obter(A, `/psicologo/checkins/${checkinAna}`);
    assert.deepEqual(corpo.checkin, {
      id: checkinAna,
      pacienteId: ana.id,
      nome: 'Ana Ativa',
      data: await dia(0),
      horario: '12:00',
      humor: 8,
      ansiedade: 4,
      emocoes: ['Feliz'],
      gatilhos: null,
      sonoHoras: 7,
      qualidadeSono: 'Regular',
      habitos: { exercicio: true, meditacao: false, medicacao: false },
      diario: 'texto do diário da Ana',
    });
    assert.deepEqual(corpo.consentimentos, { humor: true, habitos: true, escalas: false, diario: true });

    const auditadas = await linhas();
    const nossa = auditadas.find((l) => l.alvo_id === String(checkinAna));
    assert.equal(nossa?.paciente_id, ana.id);
    assert.equal(nossa?.alvo_tipo, 'checkin_diario');
    assert.ok(!JSON.stringify(auditadas).includes('texto do diário'));
  });

  it('diário não marcado como compartilhado no check-in fica de fora', async () => {
    const corpo = await obter(A, `/psicologo/checkins/${checkinAnaSemDiario}`);
    assert.equal(corpo.checkin.diario, null);
    assert.ok(!JSON.stringify(corpo).includes('texto reservado'));
  });

  it('sem consentimento de diário o texto fica de fora, mesmo marcado como compartilhado', async () => {
    const corpo = await obter(A, `/psicologo/checkins/${checkinBruno}`);
    assert.equal(corpo.checkin.diario, null);
    assert.equal(corpo.checkin.sonoHoras, null);
    assert.equal(corpo.checkin.habitos, null);
  });

  it('id inválido ou inexistente: 404', async () => {
    for (const id of ['abc', '0', '2147483000']) {
      assert.equal((await A.requisitar('GET', `/psicologo/checkins/${id}`)).status, 404, id);
    }
  });
});

describe('GET /psicologo/dashboard', () => {
  let D: Cliente;
  let p1: Awaited<ReturnType<typeof paciente>>;
  let p1Usuario: Usuario;

  before(async () => {
    const usuarioD = await criarPsicologo();
    D = await entrar(servidor.url, usuarioD);
    p1 = await paciente(usuarioD, 'Paciente Um', { humor: true, habitos: true });
    p1Usuario = p1.usuario;
    const p2 = await paciente(usuarioD, 'Paciente Dois', { humor: true });
    const p3 = await paciente(usuarioD, 'Paciente Três', { humor: false });

    for (const [diasAtras, humor] of [[0, 8], [1, 6], [2, 4], [20, 2]]) {
      await criarCheckin(p1.id, { diasAtras, humor, ansiedade: 3, horasSono: 6 });
    }
    await criarCheckin(p2.id, { diasAtras: 0, humor: 5, ansiedade: 5, horasSono: 9 });
    await criarCheckin(p3.id, { diasAtras: 0, humor: 1 });

    await criarCliente(servidor.url).requisitar('PUT', '/paciente/consentimento', {
      corpo: { humor: true, habitos: true, escalas: true, diario: false },
      cabecalhos: bearer(p1Usuario),
      origem: null,
    });
  });

  it('traz vinculados, série diária, check-ins recentes, atividade, dados insuficientes e médias', async () => {
    const corpo = await obter(D, '/psicologo/dashboard');
    assert.deepEqual(Object.keys(corpo).sort(), [
      'atividadeRecente',
      'checkinsRecentes',
      'consultasHoje',
      'dadosInsuficientes',
      'escalas',
      'medias',
      'pacientesVinculados',
      'serieVinculos',
    ]);
    assert.equal(corpo.pacientesVinculados, 3);

    assert.equal(corpo.serieVinculos.length, 30);
    assert.deepEqual(corpo.serieVinculos.at(-1).total, 3);
    assert.equal(corpo.serieVinculos[0].total, 0);
    assert.ok(corpo.serieVinculos.every((s: Json) => /^\d{4}-\d{2}-\d{2}$/.test(s.data)));

    assert.deepEqual(corpo.checkinsRecentes.map((c: Json) => c.nome).sort(), ['Paciente Dois', 'Paciente Um', 'Paciente Um', 'Paciente Um', 'Paciente Um']);
    assert.ok(corpo.checkinsRecentes.every((c: Json) => Array.isArray(c.emocoes) && c.em && c.pacienteId));

    assert.deepEqual(corpo.dadosInsuficientes, [{ pacienteId: corpo.dadosInsuficientes[0].pacienteId, nome: 'Paciente Dois', registros7d: 1 }]);

    const acoes = corpo.atividadeRecente.map((a: Json) => `${a.nome}:${a.acao}`);
    assert.ok(acoes.includes('Paciente Um:consentimento_alterado'));
    assert.ok(acoes.includes('Paciente Um:checkin_registrado'));
    assert.ok(!acoes.some((a: string) => a.startsWith('Paciente Três')));
    const instantes = corpo.atividadeRecente.map((a: Json) => Date.parse(a.em));
    assert.deepEqual(instantes, [...instantes].sort((a: number, b: number) => b - a));
  });

  it('o período muda a série e as médias', async () => {
    const trinta = await obter(D, '/psicologo/dashboard?periodo=30');
    assert.deepEqual(trinta.medias, { n: 5, humor: 5, ansiedade: 3.4, sono: 6 });

    const sete = await obter(D, '/psicologo/dashboard?periodo=7');
    assert.equal(sete.serieVinculos.length, 7);
    assert.deepEqual(sete.medias, { n: 4, humor: 5.8, ansiedade: 3.5, sono: 6 });

    assert.equal((await obter(D, '/psicologo/dashboard?periodo=90')).serieVinculos.length, 90);
    assert.equal((await D.requisitar('GET', '/psicologo/dashboard?periodo=15')).status, 400);
  });

  it('vínculo encerrado sai da contagem e da série daquele dia em diante', async () => {
    const outro = await criarPsicologo();
    const web = await entrar(servidor.url, outro);
    const a = await paciente(outro, 'Sai Hoje', { humor: true });
    await paciente(outro, 'Fica', { humor: true });
    assert.equal((await web.requisitar('POST', `/psicologo/pacientes/${a.id}/encerrar-vinculo`)).status, 200);

    const corpo = await obter(web, '/psicologo/dashboard?periodo=7');
    assert.equal(corpo.pacientesVinculados, 1);
    assert.equal(corpo.serieVinculos.at(-1).total, 1);
  });
});

describe('contratos antigos', () => {
  it('anotações continuam: cria, lista e audita', async () => {
    const criada = await A.requisitar('POST', `/psicologo/pacientes/${ana.id}/anotacoes`, {
      corpo: { conteudo: 'observação privada' },
    });
    assert.equal(criada.status, 201);
    const { anotacoes } = await obter(A, `/psicologo/pacientes/${ana.id}/anotacoes`);
    assert.deepEqual(anotacoes.map((a: Json) => a.conteudo), ['observação privada']);
    assert.equal((await A.requisitar('POST', `/psicologo/pacientes/${ana.id}/anotacoes`, { corpo: { conteudo: ' ' } })).status, 400);

    const guardado = await dono.query('SELECT conteudo FROM anotacao_clinica WHERE paciente_id = $1', [ana.id]);
    assert.ok(!guardado.rows[0].conteudo.includes('observação'));
  });

  it('/psicologo/me segue respondendo', async () => {
    const corpo = await obter(A, '/psicologo/me');
    assert.equal(corpo.email, usuarioA.email);
  });
});
