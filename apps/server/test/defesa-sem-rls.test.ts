import './comoDono';
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { pool } from '../src/db';
import {
  bearer,
  capturarCodigos,
  carregarApp,
  criarCheckin,
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

const diaIso = (diasDesdeHoje: number) =>
  new Date(Date.now() + diasDesdeHoje * 86_400_000).toISOString().slice(0, 10);

it('a app deste arquivo conecta como um papel que ignora o RLS', async () => {
  const { rows } = await pool.query<{ ignora: boolean }>(
    'SELECT rolbypassrls AS ignora FROM pg_roles WHERE rolname = current_user',
  );
  assert.equal(rows[0].ignora, true);
});

describe('vínculo encerrado: o psicólogo anterior perde o acesso na aplicação', () => {
  it('não lê aplicações nem altera consultas do ex-paciente, mesmo sem RLS', async () => {
    const psicologoA = await criarPsicologo();
    const psicologoB = await criarPsicologo();
    const paciente = await criarPaciente('Paciente Trocou');
    const pacienteId = await pacienteIdDe(paciente);
    await vincular(psicologoA, paciente);
    await definirConsentimento(pacienteId, { humor: true, escalas: true });
    const A = await entrar(servidor.url, psicologoA);

    // A pede um PHQ-9 e o paciente responde.
    const { rows: phq } = await dono.query<{ id: number }>("SELECT id FROM escala WHERE sigla = 'PHQ-9'");
    const pedido = await A.requisitar('POST', `/psicologo/pacientes/${pacienteId}/escalas`, {
      corpo: { escalaId: phq[0].id },
    });
    assert.equal(pedido.status, 201);
    const aplicacaoId = ((await pedido.json()) as { aplicacao: { id: number } }).aplicacao.id;
    const resposta = await fetch(`${servidor.url}/paciente/aplicacoes/${aplicacaoId}/respostas`, {
      method: 'POST',
      headers: { ...bearer(paciente), 'content-type': 'application/json' },
      body: JSON.stringify({ respostas: [1, 1, 1, 1, 1, 1, 1, 1, 0] }),
    });
    assert.equal(resposta.status, 200);

    // Consulta agendada no passado: o trigger do encerramento só cancela as futuras.
    const ontem = new Date(Date.now() - 86_400_000);
    const consulta = await A.requisitar('POST', '/psicologo/consultas', {
      corpo: {
        pacienteId,
        inicio: ontem.toISOString(),
        fim: new Date(ontem.getTime() + 50 * 60_000).toISOString(),
      },
    });
    assert.equal(consulta.status, 201);
    const consultaId = ((await consulta.json()) as { consulta: { id: number } }).consulta.id;

    // Controle: com o vínculo ativo, A lê a aplicação.
    assert.equal((await A.requisitar('GET', `/psicologo/aplicacoes/${aplicacaoId}`)).status, 200);

    // O paciente encerra com A e se vincula a B; o consentimento de escalas continua ligado.
    await dono.query(
      "UPDATE vinculo SET status = 'encerrado', encerrado_em = now() WHERE paciente_id = $1 AND status = 'ativo'",
      [pacienteId],
    );
    await vincular(psicologoB, paciente);

    assert.equal((await A.requisitar('GET', `/psicologo/aplicacoes/${aplicacaoId}`)).status, 404);
    const lista = (await (await A.requisitar('GET', '/psicologo/aplicacoes')).json()) as {
      aplicacoes: { id: number }[];
    };
    assert.ok(!lista.aplicacoes.some((a) => a.id === aplicacaoId));

    const painel = (await (await A.requisitar('GET', '/psicologo/dashboard')).json()) as {
      escalas: { respondidasRecentes: { aplicacaoId: number }[] };
    };
    assert.ok(!painel.escalas.respondidasRecentes.some((a) => a.aplicacaoId === aplicacaoId));

    const agenda = (await (
      await A.requisitar('GET', `/psicologo/consultas?de=${diaIso(-2)}&ate=${diaIso(1)}`)
    ).json()) as { consultas: { id: number }[] };
    assert.ok(!agenda.consultas.some((c) => c.id === consultaId));

    const alterar = await A.requisitar('PATCH', `/psicologo/consultas/${consultaId}`, {
      corpo: { observacao: 'tentativa depois do encerramento' },
    });
    assert.equal(alterar.status, 404);

    const amanha = new Date(Date.now() + 86_400_000);
    const remarcar = await A.requisitar('POST', `/psicologo/consultas/${consultaId}/remarcar`, {
      corpo: {
        inicio: amanha.toISOString(),
        fim: new Date(amanha.getTime() + 50 * 60_000).toISOString(),
      },
    });
    assert.equal(remarcar.status, 404);
    const { rows: depois } = await dono.query<{ n: number }>(
      'SELECT count(*)::int AS n FROM consulta WHERE paciente_id = $1',
      [pacienteId],
    );
    assert.equal(depois[0].n, 1);
  });
});

describe('sem consentimento de humor nem de hábitos, o volume de check-ins não sai', () => {
  it('resumo, comparação e relatório não trazem datas nem contagem', async () => {
    const psicologo = await criarPsicologo();
    const paciente = await criarPaciente('Paciente Reservado');
    const pacienteId = await pacienteIdDe(paciente);
    await vincular(psicologo, paciente);
    await definirConsentimento(pacienteId, {});
    for (const diasAtras of [1, 2, 3]) await criarCheckin(pacienteId, { diasAtras });
    const web = await entrar(servidor.url, psicologo);

    const comparar = `compararDe=${diaIso(-60)}&compararAte=${diaIso(-31)}`;
    const resumo = (await (
      await web.requisitar('GET', `/psicologo/pacientes/${pacienteId}/resumo?dias=30&${comparar}`)
    ).json()) as { registros: unknown[]; comparacao: { atual: { registros: number | null } } };
    assert.deepEqual(resumo.registros, []);
    assert.equal(resumo.comparacao.atual.registros, null);

    const relatorio = (await (
      await web.requisitar('GET', `/psicologo/relatorios/pacientes/${pacienteId}?de=${diaIso(-30)}&ate=${diaIso(0)}`)
    ).json()) as { serieDiaria: unknown[] };
    assert.deepEqual(relatorio.serieDiaria, []);

    // Com hábitos liberado, os dias voltam (o sono precisa da data), sem os campos de humor.
    await definirConsentimento(pacienteId, { habitos: true });
    const comHabitos = (await (
      await web.requisitar('GET', `/psicologo/pacientes/${pacienteId}/resumo?dias=30`)
    ).json()) as { registros: { humor: number | null }[] };
    assert.equal(comHabitos.registros.length, 3);
    assert.ok(comHabitos.registros.every((r) => r.humor === null));
  });
});
