import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import express from 'express';
import { ipDaPages } from '../src/lib/ipDaPages';
import { iniciar } from './ajuda';

const app = express();
app.use(ipDaPages);
app.get('/ip', (req, res) => res.json({ ip: req.ip }));

const ipVisto = async (url: string, cabecalhos: Record<string, string>) =>
  ((await (await fetch(url + '/ip', { headers: cabecalhos })).json()) as { ip: string }).ip;

describe('IP real vindo da Function da Pages', () => {
  const anterior = process.env.PROXY_SEGREDO;
  after(() => {
    process.env.PROXY_SEGREDO = anterior;
  });

  it('com o segredo certo, req.ip vira o IP enviado', async () => {
    process.env.PROXY_SEGREDO = 'segredo-de-teste';
    const servidor = await iniciar(app);
    try {
      const ip = await ipVisto(servidor.url, { 'x-psychelink-ip': '203.0.113.7', 'x-psychelink-segredo': 'segredo-de-teste' });
      assert.equal(ip, '203.0.113.7');
    } finally {
      servidor.fechar();
    }
  });

  it('segredo errado, IP inválido ou sem PROXY_SEGREDO: o cabeçalho é ignorado', async () => {
    const servidor = await iniciar(app);
    try {
      process.env.PROXY_SEGREDO = 'segredo-de-teste';
      const errado = await ipVisto(servidor.url, { 'x-psychelink-ip': '203.0.113.7', 'x-psychelink-segredo': 'chute' });
      const invalido = await ipVisto(servidor.url, { 'x-psychelink-ip': 'nao-e-ip', 'x-psychelink-segredo': 'segredo-de-teste' });
      delete process.env.PROXY_SEGREDO;
      const semSegredo = await ipVisto(servidor.url, { 'x-psychelink-ip': '203.0.113.7', 'x-psychelink-segredo': '' });
      for (const ip of [errado, invalido, semSegredo]) assert.notEqual(ip, '203.0.113.7');
      assert.notEqual(invalido, 'nao-e-ip');
    } finally {
      servidor.fechar();
    }
  });
});
