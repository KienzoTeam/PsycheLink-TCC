import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { desviosDaMedia, variacaoEntre } from '../src/lib/estatistica';
import { contarEmocoes } from '../src/lib/resumo';
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

const obter = async (web: Web, caminho: string): Promise<Json> => (await web.requisitar('GET', caminho)).json() as Promise<Json>;

const dia = async (atras: number) =>
  (await dono.query<{ d: string }>("SELECT to_char(CURRENT_DATE - $1::int, 'YYYY-MM-DD') AS d", [atras])).rows[0].d;

async function novoPaciente(
  psicologo: { id: number },
  nome: string,
  consentimento: Parameters<typeof definirConsentimento>[1],
  sos = false,
) {
  const usuario = await criarPaciente(nome);
  await vincular(psicologo, usuario);
  const id = await pacienteIdDe(usuario);
  await definirConsentimento(id, consentimento);
  if (sos) await dono.query('UPDATE consentimento SET compartilha_sos = true WHERE paciente_id = $1', [id]);
  return { usuario, id };
}

const usarSos = (pacienteId: number, intervalo: string) =>
  dono.query(`INSERT INTO sos_uso (paciente_id, criado_em) VALUES ($1, now() - $2::interval)`, [pacienteId, intervalo]);

describe('estatística descritiva', () => {
  it('desvios em relação à média, com uma casa decimal', () => {
    const itens = [
      { data: '2026-11-18', valor: 6 },
      { data: '2026-11-19', valor: 8 },
      { data: '2026-11-20', valor: 3 },
    ];
    assert.deepEqual(desviosDaMedia(itens), {
      media: 5.7,
      dias: [
        { data: '2026-11-18', desvio: 0.3 },
        { data: '2026-11-19', desvio: 2.3 },
        { data: '2026-11-20', desvio: -2.7 },
      ],
    });
    assert.deepEqual(desviosDaMedia([]), { media: null, dias: [] });
  });

  it('variação entre médias arredondadas e nula sem um dos lados', () => {
    assert.equal(variacaoEntre(6, 4.3), 1.7);
    assert.equal(variacaoEntre(4, 7), -3);
    assert.equal(variacaoEntre(null, 4), null);
    assert.equal(variacaoEntre(4, null), null);
  });

  it('contagem de emoções desempata pelo nome e respeita o limite', () => {
    const listas = [['Calmo'], ['Feliz', 'Calmo'], null, ['Ansioso'], ['Calmo', 'Triste']];
    assert.deepEqual(contarEmocoes(listas, 3), [
      { emocao: 'Calmo', quantidade: 3 },
      { emocao: 'Ansioso', quantidade: 1 },
      { emocao: 'Feliz', quantidade: 1 },
    ]);
    assert.deepEqual(contarEmocoes([]), []);
  });
});

describe('Início: engajamento, alertas e insights da semana', () => {
  let P: Web;
  let ana: Awaited<ReturnType<typeof novoPaciente>>;
  let carla: Awaited<ReturnType<typeof novoPaciente>>;
  let aplicacaoPhq: number;
  let aplicacaoGad: number;

  before(async () => {
    const usuarioP = await criarPsicologo();
    P = await entrar(servidor.url, usuarioP);
    const psicologoId = await psicologoIdDe(usuarioP);

    // Ana: ativa (3 check-ins em 7 dias), compartilha tudo, inclusive o SOS.
    ana = await novoPaciente(usuarioP, 'Ana', { humor: true, habitos: true, escalas: true }, true);
    // Beto: esparso (1 check-in na semana), só humor.
    const beto = await novoPaciente(usuarioP, 'Beto', { humor: true });
    // Carla: não compartilha humor, mas compartilha o SOS; os check-ins dela não podem aparecer.
    carla = await novoPaciente(usuarioP, 'Carla', {}, true);
    // Davi: compartilha humor e não fez nenhum check-in; o SOS dele não é compartilhado.
    const davi = await novoPaciente(usuarioP, 'Davi', { humor: true });
    // Eva é de outro psicólogo e não entra em nada.
    const eva = await novoPaciente(await criarPsicologo(), 'Eva', { humor: true }, true);

    // Semana atual = hoje e os 6 dias anteriores; anterior = de 7 a 13 dias atrás.
    for (const [diasAtras, humor, ansiedade, emocoes] of [
      [0, 8, 2, ['Calmo']],
      [1, 6, 4, ['Calmo', 'Feliz']],
      [6, 4, 6, ['Ansioso']], // última da semana atual
      [7, 5, 6, ['Irritado']], // primeira da anterior
      [13, 3, 8, ['Irritado']], // última da anterior
      [14, 1, 1, ['Irritado']], // fora das duas
    ] as const) {
      await criarCheckin(ana.id, { diasAtras, humor, ansiedade, emocoes: [...emocoes] });
    }
    await criarCheckin(beto.id, { diasAtras: 3, humor: 6, ansiedade: 4, emocoes: ['Calmo', 'Triste'] });
    await criarCheckin(beto.id, { diasAtras: 9, humor: 5, ansiedade: 7, emocoes: ['Irritado'] });
    for (let diasAtras = 0; diasAtras < 5; diasAtras++) await criarCheckin(carla.id, { diasAtras, humor: 1, ansiedade: 10 });
    await criarCheckin(eva.id, { humor: 1, ansiedade: 10 });

    await usarSos(ana.id, '1 day');
    await usarSos(ana.id, '2 days');
    await usarSos(ana.id, '10 days'); // fora dos 7 dias
    await usarSos(carla.id, '1 hour');
    await usarSos(davi.id, '1 hour'); // sem consentimento de SOS
    await usarSos(eva.id, '1 hour'); // outro psicólogo

    // Duas escalas respondidas por Ana, uma delas aberta pelo psicólogo mais adiante.
    const catalogo = (await obter(P, '/psicologo/escalas')).escalas as Json[];
    const mobile = (metodo: string, caminho: string, corpo?: unknown) =>
      criarCliente(servidor.url).requisitar(metodo, caminho, { corpo, cabecalhos: bearer(ana.usuario), origem: null });
    const responder = async (sigla: string, respostas: number[]) => {
      const criada = await P.requisitar('POST', `/psicologo/pacientes/${ana.id}/escalas`, {
        corpo: { escalaId: catalogo.find((e) => e.sigla === sigla)!.id },
      });
      const id = ((await criada.json()) as Json).aplicacao.id as number;
      assert.equal((await mobile('POST', `/paciente/aplicacoes/${id}/respostas`, { respostas })).status, 200);
      return id;
    };
    aplicacaoPhq = await responder('PHQ-9', Array(9).fill(1));
    aplicacaoGad = await responder('GAD-7', Array(7).fill(2));

    // Resposta de quem não compartilha escalas não conta.
    const [{ id: escalaId }] = (
      await dono.query<{ id: number }>("SELECT id FROM escala WHERE sigla = 'PHQ-2'")
    ).rows;
    await dono.query(
      `INSERT INTO aplicacao_escala (paciente_id, psicologo_id, escala_id, status, respondido_em, score_total, respostas_cifradas)
       VALUES ($1, $2, $3, 'concluida', now(), 3, 'x')`,
      [carla.id, psicologoId, escalaId],
    );

    // Consultas de hoje (São Paulo): só a da Ana tem escalas para rever.
    const hoje = "date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo'";
    for (const [paciente, hora] of [[ana.id, 10], [beto.id, 12]]) {
      await dono.query(
        `INSERT INTO consulta (psicologo_id, paciente_id, inicio, fim)
         VALUES ($1, $2, ${hoje} + $3::int * interval '1 hour', ${hoje} + ($3::int + 1) * interval '1 hour')`,
        [psicologoId, paciente, hora],
      );
    }
  });

  it('engajamento: quem compartilha humor e fez 3 ou mais check-ins em 7 dias', async () => {
    const painel = await obter(P, '/psicologo/dashboard');
    assert.deepEqual(painel.engajamento, { compartilhando: 3, ativos: 1 });
    assert.deepEqual(
      painel.dadosInsuficientes.map((d: Json) => [d.nome, d.registros7d]),
      [['Beto', 1], ['Davi', 0]],
    );
  });

  it('alertas: esparsos, usos do SOS compartilhados em 7 dias e escalas ainda não abertas', async () => {
    const { alertas } = await obter(P, '/psicologo/dashboard');
    assert.deepEqual(alertas, {
      total: 2 + 3 + 2,
      esparsos: 2,
      sos: {
        usos: 3,
        pacientes: [
          { pacienteId: ana.id, nome: 'Ana', usos: 2 },
          { pacienteId: carla.id, nome: 'Carla', usos: 1 },
        ],
      },
      escalasNaoVistas: 2,
    });
  });

  it('abrir o detalhe da escala tira ela dos alertas e marca como vista', async () => {
    assert.equal((await P.requisitar('GET', `/psicologo/aplicacoes/${aplicacaoPhq}`)).status, 200);
    const painel = await obter(P, '/psicologo/dashboard');
    assert.equal(painel.alertas.escalasNaoVistas, 1);
    assert.equal(painel.alertas.total, 6);
    const vistas = Object.fromEntries(painel.escalas.respondidasRecentes.map((e: Json) => [e.aplicacaoId, e.vista]));
    assert.deepEqual(vistas, { [aplicacaoPhq]: true, [aplicacaoGad]: false });
  });

  it('sessões do dia mostram quantas escalas da pessoa estão para rever', async () => {
    const { consultasHoje } = await obter(P, '/psicologo/dashboard');
    assert.deepEqual(
      consultasHoje.map((c: Json) => [c.nome, c.escalasParaRever]),
      [['Ana', 1], ['Beto', 0]],
    );
  });

  it('insights da semana: variação do humor e da ansiedade do grupo e emoções mais frequentes', async () => {
    const { insightsSemana } = await obter(P, '/psicologo/dashboard');
    // Atual: Ana 8, 6, 4 e Beto 6 = 24/4. Anterior: Ana 5, 3 e Beto 5 = 13/3.
    assert.deepEqual(insightsSemana, {
      registros: { atual: 4, anterior: 3 },
      humor: { atual: 6, anterior: 4.3, variacao: 1.7 },
      ansiedade: { atual: 4, anterior: 7, variacao: -3 },
      emocoes: [
        { emocao: 'Calmo', quantidade: 3 },
        { emocao: 'Ansioso', quantidade: 1 },
        { emocao: 'Feliz', quantidade: 1 },
      ],
    });
  });

  it('sem registros na semana anterior não há variação', async () => {
    const outro = await criarPsicologo();
    const web = await entrar(servidor.url, outro);
    const nova = await novoPaciente(outro, 'Nova', { humor: true });
    await criarCheckin(nova.id, { humor: 7, ansiedade: 3 });
    const { insightsSemana, alertas, engajamento } = await obter(web, '/psicologo/dashboard');
    assert.deepEqual(insightsSemana.humor, { atual: 7, anterior: null, variacao: null });
    assert.deepEqual(engajamento, { compartilhando: 1, ativos: 0 });
    assert.deepEqual(alertas, { total: 1, esparsos: 1, sos: { usos: 0, pacientes: [] }, escalasNaoVistas: 0 });
  });
});

describe('painel do paciente: média móvel do humor e variação da ansiedade', () => {
  let P: Web;
  let completo: Awaited<ReturnType<typeof novoPaciente>>;
  let semHumor: Awaited<ReturnType<typeof novoPaciente>>;

  before(async () => {
    const usuarioP = await criarPsicologo();
    P = await entrar(servidor.url, usuarioP);
    completo = await novoPaciente(usuarioP, 'Rita', { humor: true, habitos: true });
    semHumor = await novoPaciente(usuarioP, 'Sérgio', { habitos: true });
    for (const [diasAtras, humor, ansiedade] of [
      [9, 2, 2],
      [5, 6, 4],
      [3, 8, 6],
      [1, 4, 8],
      [0, 6, 3],
    ]) {
      await criarCheckin(completo.id, { diasAtras, humor, ansiedade });
      await criarCheckin(semHumor.id, { diasAtras, humor, ansiedade });
    }
  });

  it('a média móvel de cada dia usa o dia e os 6 anteriores, também os de antes do período', async () => {
    const corpo = await obter(P, `/psicologo/pacientes/${completo.id}/resumo?de=${await dia(4)}&ate=${await dia(0)}`);
    // Dia 4: (2+6)/2. Dia 3: (2+6+8)/3. Dia 2: (6+8)/2. Dia 1: (6+8+4)/3. Hoje: (6+8+4+6)/4.
    assert.deepEqual(
      corpo.mediaMovelHumor.map((p: Json) => p.valor),
      [4, 5.3, 7, 6, 6],
    );
    assert.deepEqual(
      corpo.mediaMovelHumor.map((p: Json) => p.data),
      [await dia(4), await dia(3), await dia(2), await dia(1), await dia(0)],
    );
  });

  it('janela sem nenhum registro devolve null', async () => {
    const corpo = await obter(P, `/psicologo/pacientes/${completo.id}/resumo?de=${await dia(30)}&ate=${await dia(28)}`);
    assert.deepEqual(
      corpo.mediaMovelHumor.map((p: Json) => p.valor),
      [null, null, null],
    );
  });

  it('variação da ansiedade: desvio de cada registro do período em relação à média do período', async () => {
    const corpo = await obter(P, `/psicologo/pacientes/${completo.id}/resumo?de=${await dia(4)}&ate=${await dia(0)}`);
    // Registros do período: ansiedade 6, 8 e 3, média 17/3.
    assert.deepEqual(corpo.variacaoAnsiedade, {
      media: 5.7,
      dias: [
        { data: await dia(3), desvio: 0.3 },
        { data: await dia(1), desvio: 2.3 },
        { data: await dia(0), desvio: -2.7 },
      ],
    });
  });

  it('sem o consentimento de humor nenhum dos dois sai', async () => {
    const corpo = await obter(P, `/psicologo/pacientes/${semHumor.id}/resumo?de=${await dia(4)}&ate=${await dia(0)}`);
    assert.equal(corpo.mediaMovelHumor, null);
    assert.equal(corpo.variacaoAnsiedade, null);
  });
});
