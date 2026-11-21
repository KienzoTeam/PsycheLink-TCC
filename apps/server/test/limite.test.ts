import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { describe, it } from 'node:test';
import express from 'express';
import { limite, limitePorIp } from '../src/lib/rota';

// Identidades simuladas apenas neste servidor isolado; na aplicação real vêm da autenticação.
async function comServidor(teste: (url: string) => Promise<void>) {
  const app = express();
  app.get('/publico', limite(2), (_req, res) => res.sendStatus(204));
  app.get('/protegido', (req, _res, next) => {
    const id = Number(req.get('x-teste-usuario'));
    if (Number.isInteger(id) && id > 0) req.user = { id };
    next();
  }, limite(2), (_req, res) => res.sendStatus(204));
  app.get('/defesa', limitePorIp(2), (_req, res) => res.sendStatus(204));
  app.get('/camadas', limitePorIp(4), (req, _res, next) => {
    req.user = { id: Number(req.get('x-teste-usuario')) };
    next();
  }, limite(2), (_req, res) => res.sendStatus(204));
  const servidor = app.listen(0, '127.0.0.1');
  await once(servidor, 'listening');
  try {
    await teste(`http://127.0.0.1:${(servidor.address() as AddressInfo).port}`);
  } finally {
    servidor.closeAllConnections();
    await new Promise<void>((resolve, reject) => servidor.close((err) => err ? reject(err) : resolve()));
  }
}

const obter = async (url: string, usuario?: number) =>
  (await fetch(url, { headers: usuario ? { 'x-teste-usuario': String(usuario) } : {} })).status;

describe('limites de requisições', () => {
  it('isola usuários no mesmo IP, mas ainda limita cada usuário', async () => {
    await comServidor(async (url) => {
      assert.equal(await obter(url + '/protegido', 1), 204);
      assert.equal(await obter(url + '/protegido', 1), 204);
      assert.equal(await obter(url + '/protegido', 1), 429);
      assert.equal(await obter(url + '/protegido', 2), 204);
      assert.equal(await obter(url + '/protegido', 2), 204);
      assert.equal(await obter(url + '/protegido', 2), 429);
    });
  });

  it('combina proteção por IP e por usuário sem compartilhar contadores', async () => {
    await comServidor(async (url) => {
      assert.equal(await obter(url + '/camadas', 1), 204);
      assert.equal(await obter(url + '/camadas', 1), 204);
      assert.equal(await obter(url + '/camadas', 1), 429);
      assert.equal(await obter(url + '/camadas', 2), 204);
      assert.equal(await obter(url + '/camadas', 2), 429); // quinta requisição do mesmo IP
    });
  });

  it('sem autenticação continua limitando pelo IP, inclusive no fallback', async () => {
    await comServidor(async (url) => {
      for (const caminho of ['/publico', '/protegido', '/defesa']) {
        assert.equal(await obter(url + caminho), 204);
        assert.equal(await obter(url + caminho), 204);
        assert.equal(await obter(url + caminho), 429);
      }
    });
  });
});
