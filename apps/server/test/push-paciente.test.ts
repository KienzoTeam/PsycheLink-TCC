import assert from 'node:assert/strict';
import { after, before, describe, it, type TestContext } from 'node:test';
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
type Usuario = Awaited<ReturnType<typeof criarPaciente>>;

const URL_EXPO = 'https://exp.host/--/api/v2/push/send';
const sufixo = () => Math.random().toString(36).slice(2, 12);
const novoToken = () => `ExponentPushToken[teste${sufixo()}]`;

const doPaciente = (paciente: Usuario, metodo: string, corpo?: unknown) =>
  criarCliente(servidor.url).requisitar(metodo, '/paciente/push', { corpo, cabecalhos: bearer(paciente), origem: null });

const tokensDe = async (paciente: Usuario) =>
  (await dono.query<{ token: string }>('SELECT token FROM push_dispositivo WHERE user_id = $1', [paciente.id])).rows.map((r) => r.token);

// O envio é disparado sem esperar a resposta: espera a chamada à Expo aparecer.
async function esperar(condicao: () => boolean | Promise<boolean>) {
  for (let i = 0; i < 40; i++) {
    if (await condicao()) return;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error('condição não ocorreu');
}

// Só a URL da Expo é simulada: o cliente de teste usa o mesmo fetch para falar com o servidor local,
// e nenhum teste desta suíte chega à internet.
function simularExpo(t: TestContext, resposta: () => Promise<Response>) {
  const real = globalThis.fetch;
  return t.mock.method(globalThis, 'fetch', (entrada: string | URL | Request, init?: RequestInit) =>
    String(entrada) === URL_EXPO ? resposta() : real(entrada, init),
  );
}
const chamadasExpo = (mock: ReturnType<typeof simularExpo>) => mock.mock.calls.filter((c) => String(c.arguments[0]) === URL_EXPO);

async function pareada() {
  const psicologo = await criarPsicologo();
  const paciente = await criarPaciente();
  await vincular(psicologo, paciente);
  await definirConsentimento(await pacienteIdDe(paciente), { escalas: true });
  return { paciente, web: await entrar(servidor.url, psicologo), pacienteId: await pacienteIdDe(paciente) };
}

async function solicitarEscala(web: Awaited<ReturnType<typeof entrar>>, pacienteId: number) {
  const { escalas } = (await (await web.requisitar('GET', '/psicologo/escalas')).json()) as Json;
  return web.requisitar('POST', `/psicologo/pacientes/${pacienteId}/escalas`, { corpo: { escalaId: escalas[0].id } });
}

describe('token de push do paciente', () => {
  it('registra, repete sem duplicar e remove só o do próprio usuário', async () => {
    const paciente = await criarPaciente();
    const outro = await criarPaciente();
    const token = novoToken();

    assert.equal((await doPaciente(paciente, 'POST', { token })).status, 200);
    assert.equal((await doPaciente(paciente, 'POST', { token })).status, 200);
    assert.deepEqual(await tokensDe(paciente), [token]);

    assert.equal((await doPaciente(outro, 'DELETE', { token })).status, 200);
    assert.deepEqual(await tokensDe(paciente), [token]);
    assert.equal((await doPaciente(paciente, 'DELETE', { token })).status, 200);
    assert.deepEqual(await tokensDe(paciente), []);
  });

  it('o token passa para a conta que entra no mesmo aparelho', async () => {
    const primeiro = await criarPaciente();
    const segundo = await criarPaciente();
    const token = novoToken();
    await doPaciente(primeiro, 'POST', { token });
    await doPaciente(segundo, 'POST', { token });
    assert.deepEqual(await tokensDe(primeiro), []);
    assert.deepEqual(await tokensDe(segundo), [token]);
  });

  it('valida o formato e o tamanho, e exige login', async () => {
    const paciente = await criarPaciente();
    for (const token of ['abc', '', 'ExponentPushToken[]', 'ExponentPushToken[a b]', `ExponentPushToken[${'a'.repeat(200)}]`, 42, null]) {
      assert.equal((await doPaciente(paciente, 'POST', { token })).status, 400, String(token));
    }
    assert.equal((await doPaciente(paciente, 'POST', {})).status, 400);
    assert.equal((await doPaciente(paciente, 'DELETE', { token: 'abc' })).status, 400);
    assert.equal((await doPaciente(paciente, 'POST', { token: 'ExpoPushToken[abc-_123]' })).status, 200);
    assert.equal((await criarCliente(servidor.url).requisitar('POST', '/paciente/push', { corpo: { token: novoToken() }, origem: null })).status, 401);
  });
});

describe('envio do push ao paciente', () => {
  it('escala solicitada avisa o aparelho sem conteúdo clínico', async (t) => {
    const expo = simularExpo(t, async () => Response.json({ data: [{ status: 'ok', id: 'x' }] }));
    const { paciente, web, pacienteId } = await pareada();
    const token = novoToken();
    await doPaciente(paciente, 'POST', { token });

    assert.equal((await solicitarEscala(web, pacienteId)).status, 201);
    await esperar(() => chamadasExpo(expo).length === 1);

    const init = chamadasExpo(expo)[0].arguments[1] as RequestInit;
    assert.equal(init.method, 'POST');
    assert.equal((init.headers as Record<string, string>)['content-type'], 'application/json');
    assert.deepEqual(JSON.parse(String(init.body)), [
      {
        to: token,
        channelId: 'avisos',
        sound: 'default',
        title: 'Nova escala para responder',
        body: 'Seu psicólogo pediu uma escala. Abra o app para responder.',
        data: { tela: 'Escalas' },
      },
    ]);
  });

  it('recomendação criada avisa o aparelho', async (t) => {
    const expo = simularExpo(t, async () => Response.json({ data: [{ status: 'ok', id: 'x' }] }));
    const { paciente, web, pacienteId } = await pareada();
    await doPaciente(paciente, 'POST', { token: novoToken() });

    const res = await web.requisitar('POST', `/psicologo/pacientes/${pacienteId}/recomendacoes`, { corpo: { exercicioId: 'grounding' } });
    assert.equal(res.status, 201);
    await esperar(() => chamadasExpo(expo).length === 1);
    const [msg] = JSON.parse(String((chamadasExpo(expo)[0].arguments[1] as RequestInit).body));
    assert.deepEqual([msg.title, msg.body, msg.data], ['Nova recomendação', 'Seu psicólogo recomendou um exercício.', { tela: 'BemEstar' }]);
  });

  it('sem token registrado não chama a Expo', async (t) => {
    const expo = simularExpo(t, async () => Response.json({ data: [] }));
    const { web, pacienteId } = await pareada();
    assert.equal((await solicitarEscala(web, pacienteId)).status, 201);
    await new Promise((r) => setTimeout(r, 200));
    assert.equal(chamadasExpo(expo).length, 0);
  });

  it('token que a Expo diz não existir é apagado e a rota segue normal', async (t) => {
    const expo = simularExpo(t, async () =>
      Response.json({ data: [{ status: 'error', message: 'x', details: { error: 'DeviceNotRegistered' } }] }),
    );
    const { paciente, web, pacienteId } = await pareada();
    await doPaciente(paciente, 'POST', { token: novoToken() });

    assert.equal((await solicitarEscala(web, pacienteId)).status, 201);
    await esperar(async () => (await tokensDe(paciente)).length === 0);
    assert.equal(chamadasExpo(expo).length, 1);
  });

  it('falha de rede, timeout ou erro HTTP da Expo não quebram a rota nem apagam o token', async (t) => {
    const logados: string[] = [];
    const aviso = t.mock.method(console, 'warn', (...args: unknown[]) => logados.push(args.join(' ')));
    const falhas = [
      () => Promise.reject(Object.assign(new TypeError('fetch failed https://exp.host/ExponentPushToken[segredo]'), { name: 'TimeoutError' })),
      () => Promise.resolve(new Response('erro', { status: 500 })),
      () => Promise.resolve(new Response('não é json', { status: 200 })),
    ];
    for (const falha of falhas) {
      const expo = simularExpo(t, falha);
      const { paciente, web, pacienteId } = await pareada();
      await doPaciente(paciente, 'POST', { token: novoToken() });

      assert.equal((await solicitarEscala(web, pacienteId)).status, 201);
      await esperar(() => chamadasExpo(expo).length === 1);
      await esperar(() => aviso.mock.callCount() > 0);
      assert.equal((await tokensDe(paciente)).length, 1);
      expo.mock.restore();
      aviso.mock.resetCalls();
    }
    assert.equal(logados.length, falhas.length);
    // Nada do que foi logado traz o token ou a URL do erro original.
    for (const linha of logados) assert.doesNotMatch(linha, /Token|exp\.host/);
  });
});
