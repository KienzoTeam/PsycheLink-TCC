import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
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

type Paciente = Awaited<ReturnType<typeof criarPaciente>>;
type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const SEIS_HABITOS = ['hidratacao', 'exercicio', 'meditacao', 'telas', 'social', 'medicacao'];

const BASE = {
  emocoes: ['Feliz', 'Calmo'],
  humor: 7,
  ansiedade: 3,
  horasSono: 7.5,
  qualidadeSono: 'Regular',
  contextos: ['Trabalho'],
  habitos: [],
  notas: 'Dia tranquilo.',
  diarioCompartilhado: true,
};

// Cada check-in aceito ocupa o dia do paciente, e a rota limita 20 requisições por IP: os casos
// que enviam um único corpo usam paciente e cliente novos.
async function enviar(corpo: unknown) {
  const paciente = await criarPaciente();
  const res = await criarCliente(servidor.url).requisitar('POST', '/checkin', {
    corpo,
    cabecalhos: bearer(paciente),
  });
  return { res, paciente };
}

async function linhasDe(paciente: Paciente) {
  const { rows } = await dono.query(
    'SELECT * FROM checkin_diario WHERE paciente_id = $1',
    [await pacienteIdDe(paciente)],
  );
  return rows;
}

async function habitosDe(paciente: Paciente) {
  const { rows } = await dono.query(
    `SELECT h.hidratacao, h.exercicio, h.meditacao, h.limite_telas, h.contato_social, h.medicacao
       FROM habito h JOIN checkin_diario c ON c.id = h.checkin_id
      WHERE c.paciente_id = $1`,
    [await pacienteIdDe(paciente)],
  );
  return rows;
}

const habitosColunas = (marcadas: string[]) =>
  Object.fromEntries(
    ['hidratacao', 'exercicio', 'meditacao', 'limite_telas', 'contato_social', 'medicacao'].map(
      (coluna) => [coluna, marcadas.includes(coluna)],
    ),
  );

async function dia(atras: number) {
  const { rows } = await dono.query<{ d: string }>(
    "SELECT to_char(CURRENT_DATE - $1::int, 'YYYY-MM-DD') AS d",
    [atras],
  );
  return rows[0].d;
}

describe('POST /checkin', () => {
  it('grava o check-in com os campos sensíveis criptografados', async () => {
    const { res, paciente } = await enviar(BASE);
    assert.equal(res.status, 201);
    const { checkin } = (await res.json()) as { checkin: { id: number; data: string } };
    assert.ok(checkin.id);
    assert.ok(checkin.data);

    const linhas = await linhasDe(paciente);
    assert.equal(linhas.length, 1);
    const [linha] = linhas;
    assert.equal(linha.intensidade_humor, 7);
    assert.equal(linha.intensidade_ansiedade, 3);
    // numeric(4,2): o pg devolve '7.50'.
    assert.equal(Number(linha.horas_sono), 7.5);
    assert.equal(linha.qualidade_sono, 2);
    assert.equal(linha.diario_compartilhado, true);
    assert.notEqual(linha.emocao_predominante, 'Feliz, Calmo');
    assert.equal(descriptografar(linha.emocao_predominante), 'Feliz, Calmo');
    assert.equal(descriptografar(linha.contexto_gatilho), 'Trabalho');
    assert.equal(descriptografar(linha.diario_livre), 'Dia tranquilo.');
  });

  it('não compartilha o diário quando não há notas', async () => {
    const { notas: _notas, ...semNotas } = BASE;
    const { res, paciente } = await enviar(semNotas);
    assert.equal(res.status, 201);
    const [linha] = await linhasDe(paciente);
    assert.equal(linha.diario_compartilhado, false);
    assert.equal(linha.diario_livre, null);
  });

  describe('hábitos e intensidade da emoção', () => {
    it('grava os seis hábitos e a intensidade', async () => {
      const { res, paciente } = await enviar({ ...BASE, habitos: SEIS_HABITOS, intensidade: 8 });
      assert.equal(res.status, 201);
      assert.deepEqual(await habitosDe(paciente), [
        habitosColunas(['hidratacao', 'exercicio', 'meditacao', 'limite_telas', 'contato_social', 'medicacao']),
      ]);
      assert.equal((await linhasDe(paciente))[0].intensidade_emocao, 8);
    });

    it('sem nenhum hábito marcado, grava a linha com tudo false', async () => {
      const { res, paciente } = await enviar({ ...BASE, habitos: [] });
      assert.equal(res.status, 201);
      assert.deepEqual(await habitosDe(paciente), [habitosColunas([])]);
    });

    it('marca só o hábito enviado', async () => {
      const { res, paciente } = await enviar({ ...BASE, habitos: ['exercicio'] });
      assert.equal(res.status, 201);
      assert.deepEqual(await habitosDe(paciente), [habitosColunas(['exercicio'])]);
    });

    it('sem intensidade, a coluna fica nula', async () => {
      const { res, paciente } = await enviar(BASE);
      assert.equal(res.status, 201);
      assert.equal((await linhasDe(paciente))[0].intensidade_emocao, null);
    });
  });

  it('recusa o segundo check-in do mesmo dia', async () => {
    const paciente = await criarPaciente();
    const cliente = criarCliente(servidor.url);
    const opcoes = { corpo: BASE, cabecalhos: bearer(paciente) };
    assert.equal((await cliente.requisitar('POST', '/checkin', opcoes)).status, 201);

    const res = await cliente.requisitar('POST', '/checkin', opcoes);
    assert.equal(res.status, 409);
    assert.deepEqual(await res.json(), { error: 'Você já registrou um check-in hoje.' });
    assert.equal((await linhasDe(paciente)).length, 1);
  });

  describe('fronteiras aceitas', () => {
    const aceitos: [string, object][] = [
      ['humor 1', { humor: 1 }],
      ['humor 10', { humor: 10 }],
      ['ansiedade 1', { ansiedade: 1 }],
      ['ansiedade 10', { ansiedade: 10 }],
      ['horasSono 0', { horasSono: 0 }],
      ['horasSono 24', { horasSono: 24 }],
      ['notas com 2000 caracteres', { notas: 'a'.repeat(2000) }],
      ['qualidadeSono null', { qualidadeSono: null }],
    ];
    for (const [nome, ajuste] of aceitos) {
      it(nome, async () => {
        const { res, paciente } = await enviar({ ...BASE, ...ajuste });
        assert.equal(res.status, 201);
        assert.equal((await linhasDe(paciente)).length, 1);
      });
    }
  });

  describe('corpos recusados', () => {
    const { habitos: _habitos, ...semHabitos } = BASE;
    const recusados: [string, unknown][] = [
      ['humor 0', { ...BASE, humor: 0 }],
      ['humor 11', { ...BASE, humor: 11 }],
      ['humor 5.5', { ...BASE, humor: 5.5 }],
      ['ansiedade 0', { ...BASE, ansiedade: 0 }],
      ['ansiedade 11', { ...BASE, ansiedade: 11 }],
      ['horasSono -1', { ...BASE, horasSono: -1 }],
      ['horasSono 24.5', { ...BASE, horasSono: 24.5 }],
      ['notas com 2001 caracteres', { ...BASE, notas: 'a'.repeat(2001) }],
      ["qualidadeSono 'Ótima'", { ...BASE, qualidadeSono: 'Ótima' }],
      ['sem habitos', semHabitos],
      ['hábito fora da lista', { ...BASE, habitos: ['natação'] }],
      ['intensidade 0', { ...BASE, intensidade: 0 }],
      ['intensidade 11', { ...BASE, intensidade: 11 }],
      ['corpo vazio', {}],
      ['sem corpo', undefined],
    ];
    for (const [nome, corpo] of recusados) {
      it(nome, async () => {
        const { res, paciente } = await enviar(corpo);
        assert.equal(res.status, 400);
        assert.equal((await linhasDe(paciente)).length, 0);
        assert.equal((await habitosDe(paciente)).length, 0);
      });
    }

    it('emocoes vazias explicam o motivo', async () => {
      const { res, paciente } = await enviar({ ...BASE, emocoes: [] });
      assert.equal(res.status, 400);
      assert.deepEqual(await res.json(), { error: 'Selecione ao menos uma emoção.' });
      assert.equal((await linhasDe(paciente)).length, 0);
    });
  });

  describe('leitura pelo psicólogo', () => {
    it('resumo, relatório e detalhe trazem os seis hábitos e a intensidade', async () => {
      const { res, paciente } = await enviar({ ...BASE, habitos: SEIS_HABITOS, intensidade: 8 });
      assert.equal(res.status, 201);
      const { checkin } = (await res.json()) as { checkin: { id: number } };
      const pacienteId = await pacienteIdDe(paciente);
      const psicologo = await criarPsicologo();
      await vincular(psicologo, paciente);
      await definirConsentimento(pacienteId, { humor: true, habitos: true });
      const web = await entrar(servidor.url, psicologo);
      const obter = async (caminho: string) => (await (await web.requisitar('GET', caminho)).json()) as Json;

      const periodo = `de=${await dia(1)}&ate=${await dia(0)}`;
      const contagens = {
        diasRegistrados: 1,
        hidratacao: 1,
        exercicio: 1,
        meditacao: 1,
        limiteTelas: 1,
        contatoSocial: 1,
        medicacao: 1,
      };
      const resumo = await obter(`/psicologo/pacientes/${pacienteId}/resumo?${periodo}`);
      assert.deepEqual(resumo.habitos, contagens);
      assert.deepEqual(Object.keys(resumo.habitos), Object.keys(contagens));
      const relatorio = await obter(`/psicologo/relatorios/pacientes/${pacienteId}?${periodo}`);
      assert.deepEqual(relatorio.habitos, contagens);
      assert.deepEqual(Object.keys(relatorio.habitos), Object.keys(contagens));

      const detalhe = await obter(`/psicologo/checkins/${checkin.id}`);
      assert.deepEqual(detalhe.checkin.habitos, {
        hidratacao: true,
        exercicio: true,
        meditacao: true,
        limiteTelas: true,
        contatoSocial: true,
        medicacao: true,
      });
      assert.deepEqual(Object.keys(detalhe.checkin.habitos), Object.keys(contagens).slice(1));
      assert.equal(detalhe.checkin.intensidadeEmocao, 8);
    });
  });

  describe('autenticação', () => {
    it('sem Authorization responde 401', async () => {
      const res = await criarCliente(servidor.url).requisitar('POST', '/checkin', { corpo: BASE });
      assert.equal(res.status, 401);
    });

    it('token inválido responde 403', async () => {
      const res = await criarCliente(servidor.url).requisitar('POST', '/checkin', {
        corpo: BASE,
        cabecalhos: { authorization: 'Bearer abc' },
      });
      assert.equal(res.status, 403);
    });
  });
});
