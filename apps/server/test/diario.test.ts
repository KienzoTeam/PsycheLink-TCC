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

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
type Paciente = Awaited<ReturnType<typeof criarPaciente>>;

const pedir = (paciente: Paciente, metodo: string, caminho: string, corpo?: unknown) =>
  criarCliente(servidor.url).requisitar(metodo, `/paciente/diario${caminho}`, {
    corpo,
    cabecalhos: bearer(paciente),
    origem: null,
  });

const escrever = async (paciente: Paciente, texto: string, compartilhado: boolean) =>
  ((await (await pedir(paciente, 'POST', '', { texto, compartilhado })).json()) as Json).entrada;

describe('diário fora do check-in (F8)', () => {
  it('cria várias entradas no dia, lista da mais nova para a mais antiga e guarda o texto cifrado', async () => {
    const paciente = await criarPaciente();
    await escrever(paciente, 'primeira', false);
    await escrever(paciente, 'segunda', true);

    const { entradas } = (await (await pedir(paciente, 'GET', '')).json()) as Json;
    assert.deepEqual(entradas.map((e: Json) => [e.texto, e.compartilhado]), [['segunda', true], ['primeira', false]]);

    const { rows } = await dono.query('SELECT texto FROM diario_entrada WHERE paciente_id = $1', [await pacienteIdDe(paciente)]);
    assert.ok(rows.every((r) => !String(r.texto).includes('primeira') && !String(r.texto).includes('segunda')));
  });

  it('recusa texto vazio e só o dono altera ou apaga a entrada', async () => {
    const dona = await criarPaciente();
    const outro = await criarPaciente();
    assert.equal((await pedir(dona, 'POST', '', { texto: '   ', compartilhado: false })).status, 400);

    const entrada = await escrever(dona, 'meu texto', false);
    assert.equal((await pedir(outro, 'PATCH', `/${entrada.id}`, { compartilhado: true })).status, 404);
    assert.equal((await pedir(outro, 'DELETE', `/${entrada.id}`)).status, 404);

    const mudou = (await (await pedir(dona, 'PATCH', `/${entrada.id}`, { compartilhado: true })).json()) as Json;
    assert.equal(mudou.entrada.compartilhado, true);
    assert.equal((await pedir(dona, 'DELETE', `/${entrada.id}`)).status, 204);
    assert.deepEqual(((await (await pedir(dona, 'GET', '')).json()) as Json).entradas, []);
  });

  it('o psicólogo vinculado vê só as compartilhadas, e "parar de compartilhar" revoga todas', async () => {
    const psicologo = await criarPsicologo();
    const paciente = await criarPaciente();
    await vincular(psicologo, paciente);
    await definirConsentimento(await pacienteIdDe(paciente), { humor: true });
    await escrever(paciente, 'texto aberto', true);
    await escrever(paciente, 'texto reservado', false);

    const cliente = await entrar(servidor.url, psicologo);
    const resumo = async () =>
      (await (await cliente.requisitar('GET', `/psicologo/pacientes/${await pacienteIdDe(paciente)}/resumo`)).json()) as Json;

    const antes = await resumo();
    assert.deepEqual(antes.diario.map((d: Json) => [d.texto, d.origem]), [['texto aberto', 'avulso']]);
    assert.ok(!JSON.stringify(antes).includes('texto reservado'));

    const parar = await criarCliente(servidor.url).requisitar('POST', '/paciente/consentimento/diario/parar', {
      cabecalhos: bearer(paciente),
      origem: null,
    });
    assert.deepEqual(await parar.json(), { revogados: 1 });
    assert.deepEqual((await resumo()).diario, []);
  });
});
