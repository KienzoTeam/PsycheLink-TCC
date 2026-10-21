import { Router } from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../../db';
import { registrarAuditoria } from '../../lib/auditoria';
import { limite, rota } from '../../lib/rota';
import { revogarSessoes, SESSAO_VIVA } from '../../lib/sessaoWeb';
import { contaSchema, trocaSenhaSchema } from '../../schemas';

export const conta = Router();

async function perfilDe(psicologoId: number) {
  const { rows } = await pool.query(
    `SELECT p.id, u.nome, u.email, p.crp, p.especialidade
       FROM psicologo p
       JOIN users u ON u.id = p.user_id
      WHERE p.id = $1`,
    [psicologoId],
  );
  return rows[0];
}

// Perfil do psicólogo logado
conta.get(
  '/me',
  limite(60),
  rota(async (_req, res) => res.json(await perfilDe(res.locals.psicologoId))),
);

// Nome e especialidade; o e-mail e o CRP não mudam por aqui.
conta.patch(
  '/me',
  limite(30),
  rota(async (req, res) => {
    const parsed = contaSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' });
    }

    await pool.query(
      `WITH usuario AS (UPDATE users SET nome = $1 WHERE id = $3)
       UPDATE psicologo SET especialidade = $2 WHERE user_id = $3`,
      [parsed.data.nome, parsed.data.especialidade, req.user!.id],
    );
    return res.json(await perfilDe(res.locals.psicologoId));
  }),
);

conta.post(
  '/me/senha',
  limite(5),
  rota(async (req, res) => {
    const parsed = trocaSenhaSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' });
    }

    const { rows } = await pool.query<{ password_hash: string }>(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user!.id],
    );
    // 400 e não 401: o front renova a sessão em todo 401.
    if (!(await bcrypt.compare(parsed.data.senhaAtual, rows[0].password_hash))) {
      return res.status(400).json({ error: 'Senha atual incorreta.' });
    }

    // Revoga antes de trocar: se a troca falhar, o pior caso é perder sessões à toa.
    await revogarSessoes(req.user!.id, res.locals.sessaoId);
    await pool.query(
      'UPDATE users SET password_hash = $1, sessao_invalidada_em = now() WHERE id = $2',
      [await bcrypt.hash(parsed.data.novaSenha, 10), req.user!.id],
    );
    await registrarAuditoria(req, 'senha_alterada');
    return res.json({ ok: true });
  }),
);

conta.get(
  '/me/sessoes',
  limite(60),
  rota(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT id,
              criado_em AS "criadoEm",
              ultimo_uso_em AS "ultimoUsoEm",
              host(ip) AS ip,
              user_agent AS "userAgent",
              (id = $2) AS atual
         FROM sessao
        WHERE user_id = $1 AND ${SESSAO_VIVA}
        ORDER BY ultimo_uso_em DESC`,
      [req.user!.id, res.locals.sessaoId],
    );
    return res.json({ sessoes: rows });
  }),
);

conta.post(
  '/me/sessoes/encerrar-outras',
  limite(10),
  rota(async (req, res) => {
    const encerradas = await revogarSessoes(req.user!.id, res.locals.sessaoId);
    await registrarAuditoria(req, 'sessoes_encerradas', { metadados: { quantidade: encerradas } });
    return res.json({ encerradas });
  }),
);
