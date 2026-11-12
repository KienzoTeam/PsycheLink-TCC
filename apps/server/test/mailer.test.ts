import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import { definirAmbiente, limpar } from './ajuda';

const caminho = require.resolve('../src/lib/mailer');
after(() => {
  delete require.cache[caminho];
  return limpar();
});

const AMBIENTE = ['BREVO_API_KEY', 'EMAIL_FROM', 'NODE_ENV', 'SMTP_HOST'];
const salvarAmbiente = () => Object.fromEntries(AMBIENTE.map((chave) => [chave, process.env[chave]]));

// O mailer lê BREVO_API_KEY e SMTP_HOST ao ser carregado; recarrega com o ambiente pedido.
function carregarMailer(env: Record<string, string | undefined>) {
  definirAmbiente(env);
  delete require.cache[caminho];
  return require(caminho) as typeof import('../src/lib/mailer');
}

describe('envio pela API do Brevo', () => {
  const comBrevo = () =>
    carregarMailer({
      BREVO_API_KEY: 'chave-de-teste',
      EMAIL_FROM: 'PsycheLink <no-reply@psychelink.test>',
      SMTP_HOST: 'smtp.psychelink.test',
    });

  it('enviarCodigo chama a API com a chave, o remetente de EMAIL_FROM e o código, sem passar pelo SMTP', async (t) => {
    const anterior = salvarAmbiente();
    const log = t.mock.method(console, 'log', () => {});
    const api = t.mock.method(globalThis, 'fetch', async () => Response.json({ messageId: 'x' }, { status: 201 }));
    try {
      const { enviarCodigo, mailer } = comBrevo();
      const smtp = t.mock.method(mailer, 'sendMail', async () => ({}));
      await enviarCodigo('a@b.test', 123456);

      assert.equal(api.mock.callCount(), 1);
      const [url, init] = api.mock.calls[0].arguments as [string, RequestInit];
      assert.equal(url, 'https://api.brevo.com/v3/smtp/email');
      assert.equal(init.method, 'POST');
      assert.deepEqual(init.headers, {
        'api-key': 'chave-de-teste',
        'content-type': 'application/json',
        accept: 'application/json',
      });
      assert.ok(init.signal instanceof AbortSignal);
      const corpo = JSON.parse(String(init.body));
      assert.deepEqual(corpo.sender, { name: 'PsycheLink', email: 'no-reply@psychelink.test' });
      assert.deepEqual(corpo.to, [{ email: 'a@b.test' }]);
      assert.equal(corpo.subject, 'PsycheLink · Confirme seu e-mail');
      assert.match(corpo.htmlContent, /123456/);
      assert.equal(smtp.mock.callCount(), 0);
      assert.equal(log.mock.callCount(), 0);
    } finally {
      definirAmbiente(anterior);
    }
  });

  it('enviarAvisoCadastro usa o mesmo envio e não leva código', async (t) => {
    const anterior = salvarAmbiente();
    const api = t.mock.method(globalThis, 'fetch', async () => Response.json({ messageId: 'x' }, { status: 201 }));
    try {
      const { enviarAvisoCadastro, mailer } = comBrevo();
      const smtp = t.mock.method(mailer, 'sendMail', async () => ({}));
      await enviarAvisoCadastro('aviso@psychelink.test');

      assert.equal(api.mock.callCount(), 1);
      const corpo = JSON.parse(String((api.mock.calls[0].arguments[1] as RequestInit).body));
      assert.deepEqual(corpo.to, [{ email: 'aviso@psychelink.test' }]);
      assert.doesNotMatch(corpo.htmlContent, /\d{6}/);
      assert.equal(smtp.mock.callCount(), 0);
    } finally {
      definirAmbiente(anterior);
    }
  });

  it('resposta fora de 2xx lança EBREVO com o status, sem o corpo nem o destinatário', async (t) => {
    const anterior = salvarAmbiente();
    t.mock.method(globalThis, 'fetch', async () => Response.json({ message: 'corpo-do-provedor' }, { status: 401 }));
    try {
      const { enviarCodigo, mailer, resumoErroSmtp } = comBrevo();
      const smtp = t.mock.method(mailer, 'sendMail', async () => ({}));
      await assert.rejects(enviarCodigo('a@b.test', 123456), (erro: Error & { code?: string; responseCode?: number }) => {
        assert.equal(erro.code, 'EBREVO');
        assert.equal(erro.responseCode, 401);
        assert.doesNotMatch(erro.message, /corpo-do-provedor|a@b\.test/);
        assert.deepEqual(resumoErroSmtp(erro), { code: 'EBREVO', responseCode: 401 });
        return true;
      });
      assert.equal(smtp.mock.callCount(), 0);
    } finally {
      definirAmbiente(anterior);
    }
  });
});

describe('falhas do fetch no envio pelo Brevo', () => {
  const comBrevo = () => carregarMailer({ BREVO_API_KEY: 'chave-de-teste', EMAIL_FROM: 'PsycheLink <no-reply@psychelink.test>' });

  it('erro de rede ou timeout vira EBREVO sem responseCode, só com o nome do erro original', async (t) => {
    const anterior = salvarAmbiente();
    t.mock.method(globalThis, 'fetch', async () => {
      throw Object.assign(new TypeError('fetch failed a@b.test https://api.brevo.com/v3/smtp/email'), {
        cause: new Error('getaddrinfo ENOTFOUND api.brevo.com'),
      });
    });
    try {
      const { enviarCodigo, resumoErroSmtp } = comBrevo();
      await assert.rejects(enviarCodigo('a@b.test', 123456), (erro: Error & { code?: string; responseCode?: number }) => {
        assert.equal(erro.code, 'EBREVO');
        assert.equal(erro.responseCode, undefined);
        assert.equal(erro.cause, undefined);
        assert.match(erro.message, /TypeError/);
        assert.doesNotMatch(erro.message, /fetch failed|a@b\.test|brevo\.com|ENOTFOUND/);
        assert.deepEqual(resumoErroSmtp(erro), { code: 'EBREVO', responseCode: undefined });
        return true;
      });
    } finally {
      definirAmbiente(anterior);
    }
  });

  it('cancela o corpo da resposta, em 2xx e fora dele', async (t) => {
    const anterior = salvarAmbiente();
    try {
      const { enviarCodigo } = comBrevo();
      for (const status of [201, 401]) {
        const resposta = Response.json({ message: 'corpo-do-provedor' }, { status });
        const cancelar = t.mock.method(resposta.body!, 'cancel');
        t.mock.method(globalThis, 'fetch', async () => resposta);
        await enviarCodigo('a@b.test', 123456).catch(() => {});
        assert.equal(cancelar.mock.callCount(), 1, `status ${status}`);
        t.mock.restoreAll();
      }
    } finally {
      definirAmbiente(anterior);
    }
  });
});

describe('remetente', () => {
  const remetente = (from: string | undefined) => carregarMailer({ EMAIL_FROM: from }).remetente();

  it('lê "Nome <email>", com ou sem aspas no nome, e o endereço sozinho', () => {
    const anterior = salvarAmbiente();
    try {
      assert.deepEqual(remetente('Nome <a@b.c>'), { name: 'Nome', email: 'a@b.c' });
      assert.deepEqual(remetente('"Nome" <a@b.c>'), { name: 'Nome', email: 'a@b.c' });
      assert.deepEqual(remetente('"Nome Composto" <a@b.c>'), { name: 'Nome Composto', email: 'a@b.c' });
      assert.deepEqual(remetente('a@b.c'), { email: 'a@b.c' });
    } finally {
      definirAmbiente(anterior);
    }
  });

  it('ignora espaços nas pontas e omite o nome quando ele fica vazio', () => {
    const anterior = salvarAmbiente();
    try {
      assert.deepEqual(remetente('  Nome <a@b.c>  '), { name: 'Nome', email: 'a@b.c' });
      assert.deepEqual(remetente('a@b.c  '), { email: 'a@b.c' });
      assert.deepEqual(remetente('<a@b.c>'), { email: 'a@b.c' });
      assert.deepEqual(remetente('"" <a@b.c>'), { email: 'a@b.c' });
      assert.deepEqual(remetente(undefined), { email: '' });
    } finally {
      definirAmbiente(anterior);
    }
  });
});

describe('transporteDeEmail', () => {
  it('escolhe Brevo, SMTP, console de dev ou nenhum', () => {
    const anterior = salvarAmbiente();
    const transporte = (env: Record<string, string>) => carregarMailer({ BREVO_API_KEY: '', SMTP_HOST: '', ...env }).transporteDeEmail();
    try {
      assert.equal(transporte({ BREVO_API_KEY: 'chave', SMTP_HOST: 'smtp.psychelink.test', NODE_ENV: 'production' }), 'Brevo');
      assert.equal(transporte({ SMTP_HOST: 'smtp.psychelink.test', NODE_ENV: 'production' }), 'SMTP');
      assert.equal(transporte({ NODE_ENV: 'development' }), 'console de dev');
      assert.equal(transporte({ NODE_ENV: 'production' }), 'nenhum');
    } finally {
      definirAmbiente(anterior);
    }
  });
});
