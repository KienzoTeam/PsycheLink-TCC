import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { excluirContasVencidas } from '../src/lib/exclusaoConta';
import {
  bearer,
  capturarCodigos,
  carregarApp,
  criarCheckin,
  criarCliente,
  criarPaciente,
  criarPsicologo,
  dono,
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

const pedir = (cabecalhos: Record<string, string>, metodo: string, caminho: string, corpo?: unknown) =>
  criarCliente(servidor.url).requisitar(metodo, `/paciente/conta${caminho}`, { corpo, cabecalhos, origem: null });

describe('conta do paciente', () => {
  it('muda o nome e mostra os dados da conta', async () => {
    const paciente = await criarPaciente('Nome Antigo');
    assert.equal((await pedir(bearer(paciente), 'PATCH', '', { nome: 'Nome Novo' })).status, 200);
    const corpo = (await (await pedir(bearer(paciente), 'GET', '')).json()) as Json;
    assert.equal(corpo.nome, 'Nome Novo');
    assert.equal(corpo.exclusaoAgendadaEm, null);
  });

  it('troca a senha: exige a atual, recusa senha fraca e devolve um token novo que vale', async () => {
    const paciente = await criarPaciente();
    const errada = await pedir(bearer(paciente), 'POST', '/senha', { senhaAtual: 'errada', novaSenha: 'Outra!Senha#2026' });
    assert.equal(errada.status, 400);
    const fraca = await pedir(bearer(paciente), 'POST', '/senha', { senhaAtual: paciente.senha, novaSenha: '12345678' });
    assert.equal(fraca.status, 400);

    const res = await pedir(bearer(paciente), 'POST', '/senha', { senhaAtual: paciente.senha, novaSenha: 'Outra!Senha#2026' });
    assert.equal(res.status, 200);
    const { token } = (await res.json()) as Json;
    assert.equal((await pedir({ authorization: `Bearer ${token}` }, 'GET', '')).status, 200);
  });

  it('exclusão: agenda, encerra o vínculo, pode ser cancelada, e após 30 dias apaga tudo menos as anotações', async () => {
    const psicologo = await criarPsicologo();
    const paciente = await criarPaciente();
    await vincular(psicologo, paciente);
    const pacienteId = await pacienteIdDe(paciente);
    await criarCheckin(pacienteId);
    await dono.query(
      `INSERT INTO anotacao_clinica (psicologo_id, paciente_id, conteudo) VALUES ($1, $2, 'nota cifrada')`,
      [await psicologoIdDe(psicologo), pacienteId],
    );

    assert.equal((await pedir(bearer(paciente), 'POST', '/excluir', { senha: 'errada' })).status, 400);
    assert.equal((await pedir(bearer(paciente), 'POST', '/excluir', { senha: paciente.senha })).status, 200);
    const { rows: vinculos } = await dono.query('SELECT status FROM vinculo WHERE paciente_id = $1', [pacienteId]);
    assert.deepEqual(vinculos.map((v) => v.status), ['encerrado']);

    // As sessões caem (o token de teste é recente demais para a tolerância de 10 s); num login novo, dá para desistir.
    const { rows: usuario } = await dono.query('SELECT sessao_invalidada_em FROM users WHERE id = $1', [paciente.id]);
    assert.ok(usuario[0].sessao_invalidada_em);
    assert.equal((await pedir(bearer(paciente), 'POST', '/excluir/cancelar')).status, 200);
    assert.equal((await pedir(bearer(paciente), 'POST', '/excluir/cancelar')).status, 404);

    await dono.query("UPDATE users SET exclusao_agendada_em = now() - interval '31 days' WHERE id = $1", [paciente.id]);
    assert.ok((await excluirContasVencidas()) >= 1);
    assert.equal((await dono.query('SELECT 1 FROM users WHERE id = $1', [paciente.id])).rowCount, 0);
    assert.equal((await dono.query('SELECT 1 FROM checkin_diario WHERE paciente_id = $1', [pacienteId])).rowCount, 0);
    const { rows: notas } = await dono.query("SELECT paciente_id FROM anotacao_clinica WHERE conteudo = 'nota cifrada'");
    assert.deepEqual(notas, [{ paciente_id: null }]);
  });

  it('exclusão agendada há menos de 30 dias não apaga', async () => {
    const paciente = await criarPaciente();
    await dono.query("UPDATE users SET exclusao_agendada_em = now() - interval '29 days' WHERE id = $1", [paciente.id]);
    await excluirContasVencidas();
    assert.equal((await dono.query('SELECT 1 FROM users WHERE id = $1', [paciente.id])).rowCount, 1);
  });

  it('exporta os dados do próprio paciente e audita sem conteúdo', async () => {
    const paciente = await criarPaciente('Pessoa Exporta');
    const pacienteId = await pacienteIdDe(paciente);
    await criarCheckin(pacienteId, { diario: 'meu texto secreto' });
    const res = await pedir(bearer(paciente), 'GET', '/exportar');
    assert.equal(res.status, 200);
    const corpo = (await res.json()) as Json;
    assert.equal(corpo.perfil.nome, 'Pessoa Exporta');
    assert.equal(corpo.checkins[0].notas, 'meu texto secreto');
    const { rows } = await dono.query(
      "SELECT metadados FROM auditoria WHERE acao = 'dados_exportados' AND ator_user_id = $1",
      [paciente.id],
    );
    assert.equal(rows.length, 1);
    assert.ok(!JSON.stringify(rows).includes('secreto'));
  });
});
