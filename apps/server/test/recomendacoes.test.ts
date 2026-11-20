import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import {
  bearer,
  capturarCodigos,
  carregarApp,
  criarCliente,
  criarPaciente,
  criarPsicologo,
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

const doPaciente = (paciente: Usuario, metodo: string, caminho: string) =>
  criarCliente(servidor.url).requisitar(metodo, `/paciente/recomendacoes${caminho}`, { cabecalhos: bearer(paciente), origem: null });

describe('recomendações de exercício (F15)', () => {
  it('psicólogo recomenda do catálogo ou texto livre; paciente vê, marca como feita; texto fica cifrado', async () => {
    const psicologo = await criarPsicologo();
    const paciente = await criarPaciente();
    await vincular(psicologo, paciente);
    const pacienteId = await pacienteIdDe(paciente);
    const cliente = await entrar(servidor.url, psicologo);
    const base = `/psicologo/pacientes/${pacienteId}/recomendacoes`;

    const catalogo = (await (await cliente.requisitar('GET', '/psicologo/exercicios')).json()) as Json;
    assert.ok(catalogo.exercicios.some((e: Json) => e.id === 'grounding'));

    assert.equal((await cliente.requisitar('POST', base, { corpo: {} })).status, 400);
    assert.equal((await cliente.requisitar('POST', base, { corpo: { exercicioId: 'inexistente' } })).status, 400);
    const r1 = await cliente.requisitar('POST', base, { corpo: { exercicioId: 'grounding', nota: 'antes de dormir' } });
    assert.equal(r1.status, 201);
    const r2 = await cliente.requisitar('POST', base, { corpo: { titulo: 'Caminhada de 10 min', descricao: 'Depois do almoço' } });
    assert.equal(r2.status, 201);

    const { rows } = await dono.query('SELECT conteudo_cifrado FROM recomendacao WHERE paciente_id = $1', [pacienteId]);
    assert.ok(rows.every((r) => !String(r.conteudo_cifrado).includes('Caminhada')));

    const lista = ((await (await doPaciente(paciente, 'GET', '')).json()) as Json).recomendacoes;
    assert.deepEqual(lista.map((r: Json) => r.titulo).sort(), ['Aterramento 5-4-3-2-1', 'Caminhada de 10 min']);
    const grounding = lista.find((r: Json) => r.exercicioId === 'grounding');
    assert.equal(grounding.nota, 'antes de dormir');

    assert.equal((await doPaciente(paciente, 'POST', `/${grounding.id}/feito`)).status, 200);
    const doPsicologo = ((await (await cliente.requisitar('GET', base)).json()) as Json).recomendacoes;
    assert.ok(doPsicologo.find((r: Json) => r.id === grounding.id).feitoEm);
  });

  it('cancelada some para o paciente; outro paciente e psicólogo sem vínculo não alcançam', async () => {
    const psicologo = await criarPsicologo();
    const estranho = await criarPsicologo();
    const paciente = await criarPaciente();
    const outro = await criarPaciente();
    await vincular(psicologo, paciente);
    const pacienteId = await pacienteIdDe(paciente);
    const cliente = await entrar(servidor.url, psicologo);
    const base = `/psicologo/pacientes/${pacienteId}/recomendacoes`;
    const { recomendacao } = (await (await cliente.requisitar('POST', base, { corpo: { exercicioId: 'breathing-478' } })).json()) as Json;

    assert.equal((await doPaciente(outro, 'POST', `/${recomendacao.id}/feito`)).status, 404);
    const deFora = await entrar(servidor.url, estranho);
    assert.equal((await deFora.requisitar('GET', base)).status, 404);

    assert.equal((await cliente.requisitar('DELETE', `${base}/${recomendacao.id}`)).status, 200);
    assert.deepEqual(((await (await doPaciente(paciente, 'GET', '')).json()) as Json).recomendacoes, []);
    assert.equal((await doPaciente(paciente, 'POST', `/${recomendacao.id}/feito`)).status, 404);
  });
});
