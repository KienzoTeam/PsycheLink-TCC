import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import bcrypt from 'bcrypt';
import { app } from '../src/app';
import { HASH_REFERENCIA } from '../src/lib/hashReferencia';
import { criarCliente, criarPaciente, iniciar, limpar } from './ajuda';

let servidor: Awaited<ReturnType<typeof iniciar>>;
before(async () => {
  servidor = await iniciar(app);
});
after(async () => {
  servidor.fechar();
  await limpar();
});

describe('POST /auth/login (app)', () => {
  it('devolve o token e o mesmo perfil do GET /me', async () => {
    const paciente = await criarPaciente('Paciente do Login');
    const cliente = criarCliente(servidor.url);

    const login = await cliente.requisitar('POST', '/auth/login', {
      corpo: { email: paciente.email, password: paciente.senha },
    });
    assert.equal(login.status, 200);
    const { token, usuario } = await login.json();

    const me = await cliente.requisitar('GET', '/auth/me', {
      cabecalhos: { authorization: `Bearer ${token}` },
    });
    assert.equal(me.status, 200);
    assert.deepEqual(usuario, await me.json());
    assert.equal(usuario.nome, 'Paciente do Login');
  });

  it('e-mail inexistente também passa pelo bcrypt (tempo não revela a conta)', async (t) => {
    const compare = t.mock.method(bcrypt, 'compare');
    const cliente = criarCliente(servidor.url);

    const res = await cliente.requisitar('POST', '/auth/login', {
      corpo: { email: `sem-conta-${Date.now()}@teste.com`, password: 'qualquer-senha' },
    });

    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, 'E-mail ou senha inválidos.');
    assert.equal(compare.mock.callCount(), 1);
    assert.equal(compare.mock.calls[0].arguments[1], HASH_REFERENCIA);
  });
});
