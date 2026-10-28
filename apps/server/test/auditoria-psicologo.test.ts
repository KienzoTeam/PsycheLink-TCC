import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
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

const CONSENTIMENTO = { humor: true, habitos: false, escalas: true, diario: false };

async function novoPaciente(nome: string) {
  const usuario = await criarPaciente(nome);
  const mobile = criarCliente(servidor.url);
  return {
    usuario,
    id: await pacienteIdDe(usuario),
    // Cada chamada muda uma categoria, então cada uma gera um evento consentimento_alterado.
    mudarConsentimento: (humor: boolean) =>
      mobile.requisitar('PUT', '/paciente/consentimento', {
        corpo: { ...CONSENTIMENTO, humor },
        cabecalhos: bearer(usuario),
        origem: null,
      }),
    responder: (aplicacaoId: number, respostas: number[]) =>
      mobile.requisitar('POST', `/paciente/aplicacoes/${aplicacaoId}/respostas`, {
        corpo: { respostas },
        cabecalhos: bearer(usuario),
        origem: null,
      }),
  };
}

let usuarioA: Awaited<ReturnType<typeof criarPsicologo>>;
let usuarioB: Awaited<ReturnType<typeof criarPsicologo>>;
let A: Web;
let B: Web;
let ana: Awaited<ReturnType<typeof novoPaciente>>;
let eva: typeof ana;
let fran: typeof ana;
let gil: typeof ana;

before(async () => {
  usuarioA = await criarPsicologo();
  usuarioB = await criarPsicologo();
  ana = await novoPaciente('Ana Auditada');
  eva = await novoPaciente('Eva Auditada');
  fran = await novoPaciente('Fran Auditada');
  gil = await novoPaciente('Gil Auditado');

  // Fran muda o consentimento antes de ter vínculo; Gil, enquanto está com o B.
  await fran.mudarConsentimento(true);
  await vincular(usuarioB, gil.usuario);
  await gil.mudarConsentimento(true);

  [A, B] = [await entrar(servidor.url, usuarioA), await entrar(servidor.url, usuarioB)];
  await vincular(usuarioA, ana.usuario);
  await vincular(usuarioB, eva.usuario);
  await vincular(usuarioA, fran.usuario);

  await ana.mudarConsentimento(true);
  await fran.mudarConsentimento(false);
  await eva.mudarConsentimento(true);
  await definirConsentimento(ana.id, CONSENTIMENTO);
  assert.equal((await A.requisitar('GET', `/psicologo/pacientes/${ana.id}/resumo`)).status, 200);
  assert.equal((await B.requisitar('GET', `/psicologo/pacientes/${eva.id}/resumo`)).status, 200);
  assert.equal((await B.requisitar('GET', `/psicologo/pacientes/${gil.id}/resumo`)).status, 200);
  assert.equal((await B.requisitar('POST', `/psicologo/pacientes/${gil.id}/encerrar-vinculo`, { corpo: {} })).status, 200);

  await vincular(usuarioA, gil.usuario);
  await gil.mudarConsentimento(false);
});

const todos = async (web: Web, consulta = '') => (await obter(web, `/psicologo/auditoria?limite=100${consulta}`)).eventos as Json[];
const resumo = (eventos: Json[]) => eventos.map((e) => `${e.acao}:${e.atorPapel}:${e.pacienteNome ?? '-'}`);

describe('auditoria do psicólogo', () => {
  it('traz as ações dele e os eventos dos pacientes vinculados, com nome e sem IP de paciente', async () => {
    const eventos = await todos(A);
    const vistos = resumo(eventos);

    for (const esperado of [
      'login_ok:psicologo:-',
      '2fa_ok:psicologo:-',
      'paciente_painel_visualizado:psicologo:Ana Auditada',
      'consentimento_alterado:paciente:Ana Auditada',
      'consentimento_alterado:paciente:Fran Auditada',
      'consentimento_alterado:paciente:Gil Auditado',
    ]) {
      assert.ok(vistos.includes(esperado), esperado);
    }

    for (const e of eventos.filter((x) => x.atorPapel === 'paciente')) {
      assert.deepEqual([e.ip, e.userAgent], [null, null], e.acao);
    }
    const proprio = eventos.find((e) => e.acao === 'login_ok');
    assert.match(proprio?.ip, /^10\.\d+\.\d+\.\d+$/);
    assert.ok(eventos.every((e) => Number.isInteger(e.id) && Date.parse(e.criadoEm)));
    assert.ok(eventos.every((e) => e.metadados !== null && typeof e.metadados === 'object'));
  });

  it('não mostra eventos de paciente de outro psicólogo, nem os de antes do vínculo, nem as ações de quem era o psicólogo', async () => {
    const eventos = await todos(A);
    assert.ok(!eventos.some((e) => e.pacienteId === eva.id), 'paciente do B');
    assert.ok(!eventos.some((e) => e.pacienteId === gil.id && e.atorPapel === 'psicologo'), 'ações do B sobre o Gil');

    const deFran = eventos.filter((e) => e.pacienteId === fran.id);
    assert.deepEqual(deFran.map((e) => e.metadados), [{ humor: false }]);
    const deGil = eventos.filter((e) => e.pacienteId === gil.id && e.acao === 'consentimento_alterado');
    assert.deepEqual(deGil.map((e) => e.metadados), [{ humor: false }]);
  });

  it('o outro psicólogo vê o paciente dele e nada do A', async () => {
    const eventosB = await todos(B);
    const vistos = resumo(eventosB);
    assert.ok(vistos.includes('consentimento_alterado:paciente:Eva Auditada'));
    assert.ok(vistos.includes('paciente_painel_visualizado:psicologo:Eva Auditada'));
    for (const paciente of [ana, fran]) assert.ok(!eventosB.some((e) => e.pacienteId === paciente.id));
    assert.ok(!eventosB.some((e) => e.pacienteId === gil.id && e.atorPapel === 'paciente' && e.metadados.humor === false));
    assert.ok(eventosB.every((e) => e.atorPapel !== 'psicologo' || e.pacienteId !== ana.id));
  });

  it('filtra por ação, paciente e período', async () => {
    const porAcao = await todos(A, '&acao=consentimento_alterado');
    assert.ok(porAcao.length >= 3 && porAcao.every((e) => e.acao === 'consentimento_alterado'));

    const porPaciente = await todos(A, `&pacienteId=${ana.id}`);
    assert.ok(porPaciente.length >= 2 && porPaciente.every((e) => e.pacienteId === ana.id));

    const { rows } = await dono.query<{ d: string }>("SELECT to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD') AS d");
    const hoje = rows[0].d;
    assert.ok((await todos(A, `&de=${hoje}&ate=${hoje}`)).length > 0);
    assert.deepEqual(await todos(A, '&de=2999-01-01'), []);
    assert.deepEqual(await todos(A, '&ate=2000-01-01'), []);

    for (const invalido of ['&acao=inventada', '&pacienteId=x', '&de=ontem', '&limite=0', '&limite=101', '&cursor=zzz']) {
      assert.equal((await A.requisitar('GET', `/psicologo/auditoria?${invalido.slice(1)}`)).status, 400, invalido);
    }
  });

  it('pagina por cursor sem repetir nem perder eventos, do mais novo ao mais antigo', async () => {
    const completo = await todos(A);
    const ids: number[] = [];
    let cursor: string | null = null;
    do {
      const pagina: Json = await obter(A, `/psicologo/auditoria?limite=3${cursor ? `&cursor=${cursor}` : ''}`);
      assert.ok(pagina.eventos.length <= 3);
      ids.push(...pagina.eventos.map((e: Json) => e.id));
      cursor = pagina.proximoCursor;
    } while (cursor);
    assert.deepEqual(ids, completo.map((e) => e.id));
    assert.equal(new Set(ids).size, ids.length);
    const instantes = completo.map((e) => Date.parse(e.criadoEm));
    assert.deepEqual(instantes, [...instantes].sort((a, b) => b - a));
  });

  it('resposta de escala só aparece enquanto o paciente compartilha escalas', async () => {
    const escala = (await dono.query("SELECT id FROM escala WHERE sigla = 'PHQ-2'")).rows[0].id;
    const solicitada = await ler(await A.requisitar('POST', `/psicologo/pacientes/${ana.id}/escalas`, { corpo: { escalaId: escala } }));
    assert.equal((await ana.responder(solicitada.aplicacao.id, [1, 2])).status, 200);

    let vistos = resumo(await todos(A));
    assert.ok(vistos.includes('escala_solicitada:psicologo:Ana Auditada'));
    assert.ok(vistos.includes('escala_respondida:paciente:Ana Auditada'));

    await definirConsentimento(ana.id, { ...CONSENTIMENTO, escalas: false });
    vistos = resumo(await todos(A));
    assert.ok(vistos.includes('escala_solicitada:psicologo:Ana Auditada'));
    assert.ok(!vistos.includes('escala_respondida:paciente:Ana Auditada'));
  });

  it('lista as ações conhecidas com rótulo, só para quem tem sessão', async () => {
    const { acoes } = await obter(A, '/psicologo/auditoria/acoes');
    const codigos = acoes.map((a: Json) => a.acao);
    for (const esperado of ['login_ok', 'escala_solicitada', 'escala_respondida', 'consulta_criada', 'consulta_alterada', 'relatorio_exportado']) {
      assert.ok(codigos.includes(esperado), esperado);
    }
    assert.ok(acoes.every((a: Json) => typeof a.rotulo === 'string' && a.rotulo.length > 0));
    assert.equal(new Set(codigos).size, codigos.length);
    assert.equal((await criarCliente(servidor.url).requisitar('GET', '/psicologo/auditoria/acoes')).status, 401);
    assert.equal((await criarCliente(servidor.url).requisitar('GET', '/psicologo/auditoria')).status, 401);
  });

  it('toda ação registrada por uma rota está na lista de ações', async () => {
    const { acoes } = await obter(A, '/psicologo/auditoria/acoes');
    const conhecidas = new Set(acoes.map((a: Json) => a.acao));
    const vistas = new Set((await todos(A)).map((e) => e.acao));
    for (const acao of vistas) assert.ok(conhecidas.has(acao), acao);
  });
});
