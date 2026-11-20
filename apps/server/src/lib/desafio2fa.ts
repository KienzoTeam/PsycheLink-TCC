import { randomBytes } from 'node:crypto';
import type { Request } from 'express';
import type { PoolClient } from 'pg';
import { pool } from '../db';
import { registrarAuditoria } from './auditoria';
import { codigoConfere, gerarCodigo, hashCodigo } from './codigo';
import { enviarCodigo } from './mailer';

// 2FA por e-mail, igual no painel (canal 'web', psicólogo) e no app (canal 'app', paciente).
export type Canal = 'web' | 'app';

export const MSG_CODIGO_INVALIDO = 'Código inválido ou expirado. Solicite um novo.';

const mascararEmail = (email: string) => `${email[0]}•••${email.slice(email.lastIndexOf('@'))}`;
const papelDo = (canal: Canal) => (canal === 'web' ? ('psicologo' as const) : ('paciente' as const));

/** Envia o código e grava o desafio. O envio falha antes de gravar (o chamador responde 502). */
export async function criarDesafio(userId: number, email: string, canal: Canal) {
  const desafioId = randomBytes(32).toString('base64url');
  const codigo = gerarCodigo();
  await enviarCodigo(email, codigo, 'acesso');

  // Um desafio vivo por conta: o novo login invalida os anteriores.
  await pool.query('UPDATE desafio_2fa SET usado_em = now() WHERE user_id = $1 AND usado_em IS NULL', [userId]);
  const { rows } = await pool.query<{ reenviar_em: Date }>(
    `INSERT INTO desafio_2fa (id, user_id, codigo_hash, expira_em, canal)
     VALUES ($1, $2, $3, now() + interval '10 minutes', $4)
     RETURNING reenviado_em + interval '60 seconds' AS reenviar_em`,
    [desafioId, userId, hashCodigo(codigo, desafioId), canal],
  );
  return { desafioId, emailMascarado: mascararEmail(email), reenviarEm: rows[0].reenviar_em.toISOString() };
}

/** Confere o código (consome uma das 5 tentativas). Devolve o dono do desafio ou a mensagem de erro. */
export async function conferirDesafio(
  req: Request,
  desafioId: string,
  codigo: number,
  canal: Canal,
): Promise<{ userId: number } | { erro: string }> {
  // A tentativa é consumida antes da conferência: requisições paralelas não furam o limite de 5.
  const { rows } = await pool.query<{ user_id: number; codigo_hash: string }>(
    `UPDATE desafio_2fa SET tentativas = tentativas + 1
      WHERE id = $1 AND canal = $2 AND usado_em IS NULL AND expira_em > now() AND tentativas < 5
      RETURNING user_id, codigo_hash`,
    [desafioId, canal],
  );
  const desafio = rows[0];
  if (!desafio) {
    await registrarAuditoria(req, '2fa_falha', { ator: null, metadados: { motivo: 'desafio_invalido' } });
    return { erro: MSG_CODIGO_INVALIDO };
  }
  if (!codigoConfere(codigo, desafioId, desafio.codigo_hash)) {
    await registrarAuditoria(req, '2fa_falha', {
      ator: { id: desafio.user_id, papel: papelDo(canal) },
      metadados: { motivo: 'codigo_incorreto' },
    });
    return { erro: 'Código incorreto.' };
  }
  return { userId: desafio.user_id };
}

/**
 * Marca o desafio como usado com a linha do usuário travada (chamar dentro de uma transação, antes de
 * abrir sessão/emitir token). Uma troca de senha em andamento termina antes, e o desafio criado antes
 * dela já não vale; ou espera esta transação, e a revogação dela alcança o acesso aberto aqui.
 * Requisições paralelas com o código certo: só a primeira a marcar o uso passa.
 */
export async function usarDesafio(client: PoolClient, desafioId: string, userId: number) {
  await client.query('SELECT 1 FROM users WHERE id = $1 FOR SHARE', [userId]);
  const { rowCount } = await client.query(
    `UPDATE desafio_2fa d SET usado_em = now()
       FROM users u
      WHERE d.id = $1 AND d.usado_em IS NULL AND u.id = d.user_id
        AND (u.sessao_invalidada_em IS NULL OR d.criado_em > u.sessao_invalidada_em)`,
    [desafioId],
  );
  return rowCount === 1;
}

/** Reenvio com 60 s de intervalo e nunca além de 30 min do login. Devolve status e corpo da resposta. */
export async function reenviarDesafio(desafioId: string, canal: Canal) {
  // O UPDATE reserva o intervalo antes do envio; dois cliques seguidos geram um e-mail só. Reenviar
  // não ressuscita um desafio expirado nem renova as tentativas para sempre.
  const codigo = gerarCodigo();
  const { rows } = await pool.query<{ email: string; reenviar_em: Date }>(
    `UPDATE desafio_2fa d
        SET codigo_hash = $2, tentativas = 0, reenviado_em = now(),
            expira_em = LEAST(now() + interval '10 minutes', d.criado_em + interval '30 minutes')
       FROM users u
      WHERE d.id = $1 AND d.canal = $3 AND u.id = d.user_id AND d.usado_em IS NULL AND d.expira_em > now()
        AND d.reenviado_em <= now() - interval '60 seconds'
      RETURNING u.email, d.reenviado_em + interval '60 seconds' AS reenviar_em`,
    [desafioId, hashCodigo(codigo, desafioId), canal],
  );

  if (!rows[0]) {
    const { rows: pendente } = await pool.query<{ reenviar_em: Date }>(
      `SELECT reenviado_em + interval '60 seconds' AS reenviar_em
         FROM desafio_2fa WHERE id = $1 AND canal = $2 AND usado_em IS NULL AND expira_em > now()`,
      [desafioId, canal],
    );
    // Desafio vencido, usado ou inexistente: reenviar não adianta, o cliente precisa voltar ao login.
    if (!pendente[0]) {
      return {
        status: 400,
        corpo: { codigo: 'DESAFIO_EXPIRADO', error: 'Este acesso expirou. Entre de novo para receber outro código.' },
      };
    }
    return {
      status: 429,
      corpo: { error: 'Aguarde um minuto antes de pedir um novo código.', reenviarEm: pendente[0].reenviar_em.toISOString() },
    };
  }

  // Erro de envio sobe para o chamador (502).
  await enviarCodigo(rows[0].email, codigo, 'acesso');
  return { status: 200, corpo: { reenviarEm: rows[0].reenviar_em.toISOString() } };
}
