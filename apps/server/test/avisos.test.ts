import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { avisarDadosEsparsos } from '../src/lib/avisos';
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

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

// O aviso é disparado sem esperar (o fluxo do paciente não pode depender dele): espera aparecer.
async function esperarAvisos(psicologoId: number, n: number) {
  for (let i = 0; i < 40; i++) {
    const { rows } = await dono.query('SELECT tipo, paciente_id FROM notificacao WHERE psicologo_id = $1 ORDER BY id', [psicologoId]);
    if (rows.length >= n) return rows;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error('aviso não apareceu');
}

describe('avisos do psicólogo (FP12)', () => {
  it('novo vínculo vira aviso no sino; marcar como lido zera a contagem', async () => {
    const psicologo = await criarPsicologo();
    const paciente = await criarPaciente('Paciente Aviso');
    const web = await entrar(servidor.url, psicologo);
    const { codigo } = (await (await web.requisitar('POST', '/psicologo/vinculo/codigos')).json()) as Json;
    const resgate = await criarCliente(servidor.url).requisitar('POST', '/paciente/vinculo', {
      corpo: { codigo },
      cabecalhos: bearer(paciente),
      origem: null,
    });
    assert.equal(resgate.status, 201);
    await esperarAvisos(await psicologoIdDe(psicologo), 1);

    const sino = (await (await web.requisitar('GET', '/psicologo/avisos')).json()) as Json;
    assert.equal(sino.naoLidas, 1);
    assert.equal(sino.avisos[0].tipo, 'vinculo_novo');
    assert.equal(sino.avisos[0].nome, 'Paciente Aviso');

    assert.equal((await web.requisitar('POST', '/psicologo/avisos/lidas', { corpo: {} })).status, 200);
    assert.equal(((await (await web.requisitar('GET', '/psicologo/avisos')).json()) as Json).naoLidas, 0);
  });

  it('desligar o painel de um tipo tira ele da lista; preferências validadas', async () => {
    const psicologo = await criarPsicologo();
    const web = await entrar(servidor.url, psicologo);
    const id = await psicologoIdDe(psicologo);
    await dono.query("INSERT INTO notificacao (psicologo_id, tipo) VALUES ($1, 'escala_respondida')", [id]);

    assert.equal((await web.requisitar('PUT', '/psicologo/avisos/preferencias', { corpo: { inventado: { painel: true, email: true, push: true } } })).status, 400);
    const salvo = await web.requisitar('PUT', '/psicologo/avisos/preferencias', {
      corpo: { escala_respondida: { painel: false, email: false, push: false } },
    });
    const tipos = ((await salvo.json()) as Json).tipos;
    assert.deepEqual(tipos.find((t: Json) => t.tipo === 'escala_respondida'), {
      tipo: 'escala_respondida',
      rotulo: 'Escala respondida',
      painel: false,
      email: false,
      push: false,
    });
    assert.equal(tipos.find((t: Json) => t.tipo === 'sos_usado').email, true);
    assert.deepEqual(((await (await web.requisitar('GET', '/psicologo/avisos')).json()) as Json).avisos, []);
  });

  it('inscrição de push exige https e fica só com o dono', async () => {
    const psicologo = await criarPsicologo();
    const web = await entrar(servidor.url, psicologo);
    const sub = { endpoint: 'https://push.exemplo.test/abc', keys: { p256dh: 'chave', auth: 'segredo' } };
    assert.equal((await web.requisitar('POST', '/psicologo/avisos/push', { corpo: { ...sub, endpoint: 'http://x.test' } })).status, 400);
    assert.equal((await web.requisitar('POST', '/psicologo/avisos/push', { corpo: sub })).status, 201);
    const { rows } = await dono.query('SELECT psicologo_id FROM push_navegador WHERE endpoint = $1', [sub.endpoint]);
    assert.equal(rows[0].psicologo_id, await psicologoIdDe(psicologo));
    assert.equal((await web.requisitar('DELETE', '/psicologo/avisos/push', { corpo: { endpoint: sub.endpoint } })).status, 200);
  });

  it('SOS com consentimento avisa; dados esparsos avisam uma vez por semana', async () => {
    const psicologo = await criarPsicologo();
    const paciente = await criarPaciente();
    await vincular(psicologo, paciente);
    const pacienteId = await pacienteIdDe(paciente);
    const psicologoId = await psicologoIdDe(psicologo);
    await definirConsentimento(pacienteId, { humor: true });
    await dono.query('UPDATE consentimento SET compartilha_sos = true WHERE paciente_id = $1', [pacienteId]);
    await dono.query("UPDATE vinculo SET criado_em = now() - interval '10 days' WHERE paciente_id = $1", [pacienteId]);
    await criarCheckin(pacienteId);

    await criarCliente(servidor.url).requisitar('POST', '/paciente/sos', { cabecalhos: bearer(paciente), origem: null });
    assert.deepEqual((await esperarAvisos(psicologoId, 1)).map((r) => r.tipo), ['sos_usado']);

    await avisarDadosEsparsos();
    await avisarDadosEsparsos();
    const tipos = (await dono.query('SELECT tipo FROM notificacao WHERE psicologo_id = $1', [psicologoId])).rows.map((r) => r.tipo);
    assert.equal(tipos.filter((t) => t === 'dados_esparsos').length, 1);
  });
});
