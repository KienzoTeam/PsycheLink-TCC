import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
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

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
type Usuario = Awaited<ReturnType<typeof criarPaciente>>;

const abrirSos = async (paciente: Usuario) =>
  ((await (await criarCliente(servidor.url).requisitar('POST', '/paciente/sos', { cabecalhos: bearer(paciente), origem: null })).json()) as Json)
    .registrado;
const ligarSos = async (paciente: Usuario) =>
  dono.query('UPDATE consentimento SET compartilha_sos = true WHERE paciente_id = $1', [await pacienteIdDe(paciente)]);

describe('uso do SOS (F9)', () => {
  it('sem o consentimento "sos" nada é registrado; com ele, um registro a cada 10 minutos', async () => {
    const psicologo = await criarPsicologo();
    const paciente = await criarPaciente();
    await vincular(psicologo, paciente);
    await definirConsentimento(await pacienteIdDe(paciente), { humor: true });

    assert.equal(await abrirSos(paciente), false);
    await ligarSos(paciente);
    assert.equal(await abrirSos(paciente), true);
    assert.equal(await abrirSos(paciente), false);
  });

  it('sem vínculo ativo não registra', async () => {
    const paciente = await criarPaciente();
    await definirConsentimento(await pacienteIdDe(paciente), {});
    await ligarSos(paciente);
    assert.equal(await abrirSos(paciente), false);
  });

  it('o psicólogo vê data e hora só com consentimento, e as crises por horário somam SOS e ansiedade alta', async () => {
    const psicologo = await criarPsicologo();
    const paciente = await criarPaciente();
    await vincular(psicologo, paciente);
    const pacienteId = await pacienteIdDe(paciente);
    await definirConsentimento(pacienteId, { humor: true });
    await criarCheckin(pacienteId, { ansiedade: 9, horaUtc: '17:00' }); // 14:00 em Brasília: tarde
    await criarCheckin(pacienteId, { diasAtras: 1, ansiedade: 3 });

    const cliente = await entrar(servidor.url, psicologo);
    const resumo = async () =>
      (await (await cliente.requisitar('GET', `/psicologo/pacientes/${pacienteId}/resumo`)).json()) as Json;

    let r = await resumo();
    assert.equal(r.sos, null);
    assert.equal(r.crisesPorHorario.sos, null);
    assert.deepEqual(r.crisesPorHorario.ansiedadeAlta, { madrugada: 0, manha: 0, tarde: 1, noite: 0 });

    await ligarSos(paciente);
    await abrirSos(paciente);
    r = await resumo();
    assert.equal(r.sos.length, 1);
    assert.deepEqual(Object.keys(r.sos[0]).sort(), ['data', 'hora']);
    const total = Object.values(r.crisesPorHorario.sos as Record<string, number>).reduce((a, b) => a + b, 0);
    assert.equal(total, 1);
  });

  it('salvar o consentimento sem o campo "sos" (app antigo) mantém o valor', async () => {
    const paciente = await criarPaciente();
    await definirConsentimento(await pacienteIdDe(paciente), {});
    await ligarSos(paciente);
    const res = await criarCliente(servidor.url).requisitar('PUT', '/paciente/consentimento', {
      corpo: { humor: true, habitos: false, escalas: false, diario: false },
      cabecalhos: bearer(paciente),
      origem: null,
    });
    assert.equal(res.status, 200);
    assert.equal(((await res.json()) as Json).sos, true);
  });
});
