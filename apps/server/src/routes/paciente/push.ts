import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../db';
import { lerOuNegar, limite, rota } from '../../lib/rota';

// Token do Expo Push do aparelho do paciente (escala nova, recomendação nova).
export const push = Router();

const tokenSchema = z.object({
  token: z.string().max(200).regex(/^Expo(nent)?PushToken\[[\w-]+\]$/),
});

// Reenviado a cada sessão (o token pode mudar). O token é do aparelho: se outra conta entrar
// nele, passa a valer para ela.
push.post(
  '/',
  limite(30),
  rota(async (req, res) => {
    const corpo = lerOuNegar(tokenSchema, req.body, res);
    if (!corpo) return;
    await pool.query(
      `INSERT INTO push_dispositivo (token, user_id) VALUES ($1, $2)
       ON CONFLICT (token) DO UPDATE SET user_id = EXCLUDED.user_id, criado_em = now()`,
      [corpo.token, req.user!.id],
    );
    return res.json({ ok: true });
  }),
);

push.delete(
  '/',
  limite(30),
  rota(async (req, res) => {
    const corpo = lerOuNegar(tokenSchema, req.body, res);
    if (!corpo) return;
    await pool.query('DELETE FROM push_dispositivo WHERE token = $1 AND user_id = $2', [corpo.token, req.user!.id]);
    return res.json({ ok: true });
  }),
);
