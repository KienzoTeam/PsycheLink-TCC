import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { app } from '../src/app';
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
});
