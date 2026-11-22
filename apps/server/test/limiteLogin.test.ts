import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { describe, it } from 'node:test';
import express from 'express';
import { limiteLogin, limiteSessao } from '../src/lib/rota';

// Sem importar ./ajuda: não precisa de banco. Limites pequenos (IP 5, e-mail 3, 2FA 2) para o teste
// ser rápido; o IP de cada pedido vem do X-Forwarded-For (trust proxy 1).
async function comServidor(teste: (post: (caminho: string, corpo: object, ip: string) => Promise<Response>) => Promise<void>) {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json());
  app.post('/login', ...limiteLogin(5, 3), (req, res) =>
    req.body.password === 'certa' ? res.json({ ok: true }) : res.status(400).json({ error: 'E-mail ou senha inválidos.' }),
  );
  app.post('/2fa', limiteSessao(2), (req, res) =>
    req.body.codigo === '123456' ? res.json({ ok: true }) : res.status(400).json({ error: 'Código inválido.' }),
  );
  const servidor = app.listen(0, '127.0.0.1');
  await once(servidor, 'listening');
  const url = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
  const post = (caminho: string, corpo: object, ip: string) =>
    fetch(url + caminho, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
      body: JSON.stringify(corpo),
    });
  try {
    await teste(post);
  } finally {
    servidor.closeAllConnections();
    await new Promise<void>((resolve, reject) => servidor.close((err) => (err ? reject(err) : resolve())));
  }
}

describe('limites do login e do 2FA (só falhas contam)', () => {
  it('logins certos não gastam o limite', async () => {
    await comServidor(async (post) => {
      for (let i = 0; i < 12; i++) {
        const res = await post('/login', { email: 'a@psychelink.test', password: 'certa' }, '10.0.0.1');
        assert.equal(res.status, 200);
      }
    });
  });

  it('por e-mail: passou do limite, 429 em JSON de qualquer IP; outro e-mail segue livre', async () => {
    await comServidor(async (post) => {
      // E-mail escrito de formas diferentes cai na mesma chave; cada tentativa vem de um IP novo.
      for (const [i, email] of [' Ana@PsycheLink.test ', 'ana@psychelink.test', 'ANA@psychelink.test'].entries()) {
        assert.equal((await post('/login', { email, password: 'errada' }, `10.0.1.${i + 1}`)).status, 400);
      }
      const bloqueado = await post('/login', { email: 'ana@psychelink.test', password: 'certa' }, '10.0.1.99');
      assert.equal(bloqueado.status, 429);
      assert.deepEqual(await bloqueado.json(), { error: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.' });

      const outra = await post('/login', { email: 'bia@psychelink.test', password: 'errada' }, '10.0.1.99');
      assert.equal(outra.status, 400);
    });
  });

  it('por IP: falhas com e-mails diferentes esgotam o IP; outro IP segue livre', async () => {
    await comServidor(async (post) => {
      for (let i = 0; i < 5; i++) {
        const res = await post('/login', { email: `u${i}@psychelink.test`, password: 'errada' }, '10.0.2.1');
        assert.equal(res.status, 400);
      }
      assert.equal((await post('/login', { email: 'novo@psychelink.test', password: 'errada' }, '10.0.2.1')).status, 429);
      assert.equal((await post('/login', { email: 'novo@psychelink.test', password: 'errada' }, '10.0.2.2')).status, 400);
    });
  });

  it('2FA: acertos não contam, a terceira falha vira 429', async () => {
    await comServidor(async (post) => {
      for (let i = 0; i < 5; i++) assert.equal((await post('/2fa', { codigo: '123456' }, '10.0.3.1')).status, 200);
      assert.equal((await post('/2fa', { codigo: '000000' }, '10.0.3.1')).status, 400);
      assert.equal((await post('/2fa', { codigo: '000000' }, '10.0.3.1')).status, 400);
      assert.equal((await post('/2fa', { codigo: '000000' }, '10.0.3.1')).status, 429);
    });
  });
});
