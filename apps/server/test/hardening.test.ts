import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import { app } from '../src/app';
import { pool } from '../src/db';
import { enviarAvisoCadastro, enviarCodigo } from '../src/lib/mailer';
import { carregarApp, definirAmbiente, iniciar, limpar } from './ajuda';

after(limpar);

describe('Cache-Control', () => {
  it('é no-store em /auth, /psicologo e /paciente', async () => {
    const servidor = await iniciar(app);
    try {
      for (const caminho of ['/auth/me', '/psicologo/pacientes', '/paciente/vinculo', '/auth/rota-inexistente']) {
        const res = await fetch(servidor.url + caminho);
        assert.equal(res.headers.get('cache-control'), 'no-store', caminho);
      }
    } finally {
      servidor.fechar();
    }
  });
});

describe('CORS', () => {
  const origemNaResposta = async (instancia: typeof app, origem: string) => {
    const servidor = await iniciar(instancia);
    try {
      const res = await fetch(`${servidor.url}/auth/me`, { headers: { origin: origem } });
      return res.headers.get('access-control-allow-origin');
    } finally {
      servidor.fechar();
    }
  };

  it('libera só as origens de ALLOWED_ORIGINS', async () => {
    const instancia = carregarApp({ ALLOWED_ORIGINS: 'https://painel.exemplo, http://localhost:5173' });
    assert.equal(await origemNaResposta(instancia, 'http://localhost:5173'), 'http://localhost:5173');
    assert.equal(await origemNaResposta(instancia, 'https://invasor.exemplo'), null);
  });

  it('sem ALLOWED_ORIGINS nenhuma origem é liberada', async () => {
    const instancia = carregarApp({ ALLOWED_ORIGINS: undefined });
    assert.equal(await origemNaResposta(instancia, 'https://qualquer.exemplo'), null);
  });
});

describe('trust proxy', () => {
  const ipVisto = async (instancia: typeof app) => {
    instancia.get('/ip', (req, res) => res.send(req.ip));
    const servidor = await iniciar(instancia);
    try {
      const res = await fetch(`${servidor.url}/ip`, { headers: { 'x-forwarded-for': '203.0.113.9' } });
      return res.text();
    } finally {
      servidor.fechar();
    }
  };

  it('confia no X-Forwarded-For só com TRUST_PROXY', async () => {
    assert.equal(await ipVisto(carregarApp({ TRUST_PROXY: '1' })), '203.0.113.9');
    assert.notEqual(await ipVisto(carregarApp({ TRUST_PROXY: undefined })), '203.0.113.9');
  });
});

describe('código OTP no log', () => {
  it('só aparece fora de produção', async (t) => {
    const log = t.mock.method(console, 'log', () => {});
    const anterior = { NODE_ENV: process.env.NODE_ENV };
    try {
      definirAmbiente({ NODE_ENV: 'production' });
      await enviarCodigo('otp@psychelink.test', 123456);
      assert.equal(log.mock.callCount(), 0);

      definirAmbiente({ NODE_ENV: 'development' });
      await enviarCodigo('otp@psychelink.test', 123456);
      assert.equal(log.mock.callCount(), 1);
    } finally {
      definirAmbiente(anterior);
    }
  });

  it('o aviso de cadastro só loga fora de produção e nunca leva código', async (t) => {
    const log = t.mock.method(console, 'log', () => {});
    const anterior = { NODE_ENV: process.env.NODE_ENV };
    try {
      definirAmbiente({ NODE_ENV: 'production' });
      await enviarAvisoCadastro('aviso@psychelink.test');
      assert.equal(log.mock.callCount(), 0);

      definirAmbiente({ NODE_ENV: 'development' });
      await enviarAvisoCadastro('aviso@psychelink.test');
      assert.equal(log.mock.callCount(), 1);
      assert.doesNotMatch(String(log.mock.calls[0].arguments[0]), /\d{6}/);
    } finally {
      definirAmbiente(anterior);
    }
  });

  it('nunca aparece com SMTP configurado, nem fora de produção', async (t) => {
    const log = t.mock.method(console, 'log', () => {});
    const anterior = { NODE_ENV: process.env.NODE_ENV, SMTP_HOST: process.env.SMTP_HOST };
    const caminho = require.resolve('../src/lib/mailer');
    try {
      // O mailer lê SMTP_HOST ao ser carregado; recarrega com SMTP e sem rede (sendMail falso).
      definirAmbiente({ NODE_ENV: 'development', SMTP_HOST: 'smtp.psychelink.test' });
      delete require.cache[caminho];
      const comSmtp = require(caminho) as typeof import('../src/lib/mailer');
      const envio = t.mock.method(comSmtp.mailer, 'sendMail', async () => ({}));
      await comSmtp.enviarCodigo('otp@psychelink.test', 123456);
      assert.equal(envio.mock.callCount(), 1);
      assert.equal(log.mock.callCount(), 0);
    } finally {
      definirAmbiente(anterior);
      delete require.cache[caminho];
    }
  });
});

describe('TLS do banco', () => {
  it('não desliga a verificação do certificado e conecta', async () => {
    const { ssl } = pool.options;
    assert.ok(!(typeof ssl === 'object' && ssl.rejectUnauthorized === false));
    const { rows } = await pool.query<{ ok: number }>('SELECT 1 AS ok');
    assert.equal(rows[0].ok, 1);
  });
});
