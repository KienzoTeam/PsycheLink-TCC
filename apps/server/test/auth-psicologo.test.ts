import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import jwt from 'jsonwebtoken';
import { app } from '../src/app';
import { criarPaciente, criarPsicologo, iniciar, limpar } from './ajuda';

describe('POST /auth/login-psicologo', () => {
  let servidor: Awaited<ReturnType<typeof iniciar>>;

  before(async () => {
    servidor = await iniciar(app);
  });
  after(async () => {
    servidor.fechar();
    await limpar();
  });

  const entrar = (email: string, senha: string) =>
    fetch(`${servidor.url}/auth/login-psicologo`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password: senha }),
    });

  it('nega paciente com credenciais válidas (403)', async () => {
    const paciente = await criarPaciente();
    const res = await entrar(paciente.email, paciente.senha);
    assert.equal(res.status, 403);
  });

  it('entrega o token ao psicólogo', async () => {
    const psicologo = await criarPsicologo();
    const res = await entrar(psicologo.email, psicologo.senha);
    assert.equal(res.status, 200);
    const { token } = (await res.json()) as { token: string };
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { id: number };
    assert.equal(payload.id, psicologo.id);
  });
});
