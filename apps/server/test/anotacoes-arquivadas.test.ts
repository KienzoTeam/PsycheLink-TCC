import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { criptografar } from '../src/lib/criptografia';
import {
  capturarCodigos,
  carregarApp,
  criarPaciente,
  criarPsicologo,
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

async function anotar(psicologo: { id: number }, paciente: { id: number }, texto: string) {
  await dono.query('INSERT INTO anotacao_clinica (psicologo_id, paciente_id, conteudo) VALUES ($1, $2, $3)', [
    await psicologoIdDe(psicologo),
    await pacienteIdDe(paciente),
    criptografar(texto),
  ]);
}

describe('anotações arquivadas', () => {
  it('mostram só as de pacientes sem vínculo ativo, só ao autor, e a leitura é auditada', async () => {
    const psicologo = await criarPsicologo();
    const outro = await criarPsicologo();
    const encerrado = await criarPaciente('Paciente Encerrado');
    const ativo = await criarPaciente('Paciente Ativo');
    await vincular(psicologo, encerrado);
    await vincular(psicologo, ativo);
    await anotar(psicologo, encerrado, 'nota antiga');
    await anotar(psicologo, ativo, 'nota atual');
    await dono.query(
      "UPDATE vinculo SET status = 'encerrado', encerrado_em = now() WHERE paciente_id = $1",
      [await pacienteIdDe(encerrado)],
    );

    const corpo = (await (await (await entrar(servidor.url, psicologo)).requisitar('GET', '/psicologo/anotacoes-arquivadas')).json()) as Json;
    assert.equal(corpo.pacientes.length, 1);
    assert.equal(corpo.pacientes[0].nome, 'Paciente Encerrado');
    assert.deepEqual(corpo.pacientes[0].anotacoes.map((a: Json) => a.conteudo), ['nota antiga']);
    assert.ok(!JSON.stringify(corpo).includes('nota atual'));

    const deOutro = (await (await (await entrar(servidor.url, outro)).requisitar('GET', '/psicologo/anotacoes-arquivadas')).json()) as Json;
    assert.deepEqual(deOutro.pacientes, []);

    const { rows } = await dono.query(
      "SELECT metadados FROM auditoria WHERE acao = 'anotacoes_lidas' AND paciente_id = $1",
      [await pacienteIdDe(encerrado)],
    );
    assert.deepEqual(rows.at(-1)?.metadados, { arquivadas: true, quantidade: 1 });
  });
});
