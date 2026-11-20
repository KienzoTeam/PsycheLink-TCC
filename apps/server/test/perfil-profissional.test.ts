import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import {
  bearer,
  capturarCodigos,
  carregarApp,
  criarCliente,
  criarPaciente,
  criarPsicologo,
  entrar,
  iniciar,
  limpar,
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

const PERFIL = {
  especialidade: 'Ansiedade em adultos',
  abordagem: 'Terapia cognitivo-comportamental',
  sobre: 'Atendo jovens adultos.',
  modalidades: ['online', 'presencial'],
  atendeEm: 'São José dos Campos, SP',
  contato: 'WhatsApp (12) 90000-0000',
};

describe('perfil profissional', () => {
  it('o psicólogo salva e o paciente vinculado lê; sem vínculo, 404', async () => {
    const psicologo = await criarPsicologo();
    const paciente = await criarPaciente();
    const semVinculo = await criarPaciente();
    await vincular(psicologo, paciente);
    const cliente = await entrar(servidor.url, psicologo);

    assert.equal((await cliente.requisitar('PUT', '/psicologo/me/perfil', { corpo: { ...PERFIL, modalidades: ['hibrido'] } })).status, 400);
    const salvo = await cliente.requisitar('PUT', '/psicologo/me/perfil', { corpo: PERFIL });
    assert.equal(salvo.status, 200);
    assert.deepEqual(await salvo.json(), PERFIL);

    const lido = await criarCliente(servidor.url).requisitar('GET', '/paciente/vinculo/psicologo', { cabecalhos: bearer(paciente), origem: null });
    assert.deepEqual(((await lido.json()) as { perfil: unknown }).perfil, PERFIL);

    const negado = await criarCliente(servidor.url).requisitar('GET', '/paciente/vinculo/psicologo', { cabecalhos: bearer(semVinculo), origem: null });
    assert.equal(negado.status, 404);
  });

  it('campo vazio vira nulo', async () => {
    const psicologo = await criarPsicologo();
    const cliente = await entrar(servidor.url, psicologo);
    const res = await cliente.requisitar('PUT', '/psicologo/me/perfil', {
      corpo: { especialidade: '', abordagem: null, sobre: '  ', modalidades: [], atendeEm: null, contato: null },
    });
    assert.deepEqual(await res.json(), { especialidade: null, abordagem: null, sobre: null, modalidades: [], atendeEm: null, contato: null });
  });
});
