import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { describe, it } from 'node:test';
import express from 'express';
import { criarDepurarIp } from '../src/lib/depurarIp';

// Sem importar ./ajuda: não precisa de banco.
async function subir(saltos: number, limite: number) {
  const app = express();
  app.set('trust proxy', saltos);
  app.use(criarDepurarIp(limite));
  app.get('/ip', (req, res) => res.send(req.ip));
  const servidor = app.listen(0, '127.0.0.1');
  await once(servidor, 'listening');
  return { url: `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`, fechar: () => servidor.close() };
}

describe('depurarIp (DEBUG_IP=1)', () => {
  it('registra conexão, X-Forwarded-For e req.ip, e para no limite', async (t) => {
    const log = t.mock.method(console, 'log', () => {});
    const servidor = await subir(2, 2);
    try {
      for (let i = 0; i < 3; i++) {
        await (await fetch(`${servidor.url}/ip`, { headers: { 'x-forwarded-for': '203.0.113.9, 172.70.0.1' } })).text();
      }
    } finally {
      servidor.fechar();
    }
    assert.equal(log.mock.callCount(), 2);
    const [tag, json] = log.mock.calls[0].arguments as [string, string];
    assert.equal(tag, '[debug-ip]');
    assert.deepEqual(JSON.parse(json), {
      caminho: '/ip',
      conexao: '127.0.0.1',
      xForwardedFor: '203.0.113.9, 172.70.0.1',
      ip: '203.0.113.9',
    });
  });

  it('não gasta o limite com o /health do Render', async (t) => {
    const log = t.mock.method(console, 'log', () => {});
    const app = express();
    app.use(criarDepurarIp(1));
    app.get(['/health', '/ip'], (_req, res) => res.send('ok'));
    const servidor = app.listen(0, '127.0.0.1');
    await once(servidor, 'listening');
    const url = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
    try {
      for (const caminho of ['/health', '/health', '/ip', '/ip']) await (await fetch(url + caminho)).text();
    } finally {
      servidor.close();
    }
    assert.equal(log.mock.callCount(), 1);
    assert.equal(JSON.parse((log.mock.calls[0].arguments as string[])[1]).caminho, '/ip');
  });

  it('com mais saltos que a cadeia, o IP forjado no X-Forwarded-For vira o req.ip', async () => {
    const servidor = await subir(6, 0);
    try {
      const ip = await (await fetch(`${servidor.url}/ip`, { headers: { 'x-forwarded-for': '198.51.100.1' } })).text();
      assert.equal(ip, '198.51.100.1');
    } finally {
      servidor.fechar();
    }
  });
});
