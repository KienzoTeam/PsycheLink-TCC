import { Router } from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../../db';
import { registrarAuditoria } from '../../lib/auditoria';
import { emTransacao } from '../../lib/contextoseguro';
import { lerOuNegar, limite, rota } from '../../lib/rota';
import { revogarDispositivos } from '../../lib/dispositivoConfiavel';
import {
  derrubarAcessosWeb,
  limparCookieDispositivo,
  limparCookies,
  revogarSessoes,
  SESSAO_VIVA,
} from '../../lib/sessaoWeb';
import { contaSchema, exclusaoContaSchema, trocaSenhaSchema } from '../../schemas';
import { perfilProfissional, perfilSchema, salvarPerfil } from '../../lib/perfilProfissional';

export const conta = Router();

export async function perfilDe(psicologoId: number) {
  const { rows } = await pool.query<{
    id: number;
    nome: string;
    email: string;
    crp: string;
    especialidade: string | null;
  }>(
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

// Perfil profissional que o paciente vinculado vê no app.
conta.get(
  '/me/perfil',
  limite(60),
  rota(async (_req, res) => res.json(await perfilProfissional(res.locals.psicologoId))),
);

conta.put(
  '/me/perfil',
  limite(30),
  rota(async (req, res) => {
    const corpo = lerOuNegar(perfilSchema, req.body, res);
    if (!corpo) return;
    return res.json(await salvarPerfil(res.locals.psicologoId, corpo));
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

    const hash = await bcrypt.hash(parsed.data.novaSenha, 10);
    await emTransacao(async (client) => {
      await client.query('UPDATE users SET password_hash = $1, sessao_invalidada_em = now() WHERE id = $2', [
        hash,
        req.user!.id,
      ]);
      await derrubarAcessosWeb(client, req.user!.id, res.locals.sessaoId);
    });
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
    const { rows: confiaveis } = await pool.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM dispositivo_confiavel
        WHERE user_id = $1 AND revogado_em IS NULL AND expira_em > now()`,
      [req.user!.id],
    );
    return res.json({ sessoes: rows, dispositivosConfiaveis: confiaveis[0].n });
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

// Todos os navegadores confiáveis da conta voltam a pedir o código (inclusive este).
conta.post(
  '/me/dispositivos/esquecer',
  limite(10),
  rota(async (req, res) => {
    const esquecidos = await revogarDispositivos(req.user!.id);
    limparCookieDispositivo(res);
    await registrarAuditoria(req, 'dispositivos_esquecidos', { metadados: { quantidade: esquecidos } });
    return res.json({ esquecidos });
  }),
);

// Excluir a conta só vale para quem nunca teve vínculo: as FKs apagam em cascata vínculos, consultas,
// escalas e anotações, e registro clínico não pode sumir (CFP). Encerrado também conta.
conta.post(
  '/me/excluir',
  limite(5),
  rota(async (req, res) => {
    const parsed = exclusaoContaSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' });
    }

    const { rows } = await pool.query<{ password_hash: string }>(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user!.id],
    );
    // 400 e não 401: o front renova a sessão em todo 401.
    if (!(await bcrypt.compare(parsed.data.senha, rows[0].password_hash))) {
      return res.status(400).json({ error: 'Senha incorreta.' });
    }

    const psicologoId: number = res.locals.psicologoId;
    const excluida = await emTransacao(async (client) => {
      // FOR UPDATE: o INSERT de um vínculo novo (código resgatado agora) espera por este lock
      // e depois falha na FK, em vez de nascer e ser apagado junto com a conta.
      await client.query('SELECT 1 FROM psicologo WHERE id = $1 FOR UPDATE', [psicologoId]);
      const vinculo = await client.query('SELECT 1 FROM vinculo WHERE psicologo_id = $1 LIMIT 1', [psicologoId]);
      if (vinculo.rows.length > 0) return false;
      await client.query('DELETE FROM users WHERE id = $1', [req.user!.id]);
      return true;
    });

    if (!excluida) {
      return res.status(409).json({
        codigo: 'CONTA_COM_VINCULO',
        error: 'Esta conta já teve pacientes vinculados e não pode ser excluída: os registros clínicos precisam ser guardados.',
      });
    }

    // Sem ator: o usuário acabou de ser apagado e a FK não aceitaria o id.
    await registrarAuditoria(req, 'conta_excluida', {
      ator: null,
      metadados: { userId: req.user!.id, psicologoId },
    });
    limparCookies(res);
    return res.json({ ok: true });
  }),
);
