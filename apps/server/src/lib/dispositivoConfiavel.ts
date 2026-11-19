import { createHash, randomBytes } from 'node:crypto';
import type { Request } from 'express';
import type { Pool, PoolClient } from 'pg';
import { pool } from '../db';
import { origemDe } from './auditoria';

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

// Confiar no dispositivo dispensa só o código por e-mail: a senha continua obrigatória.
export const DIAS_CONFIANCA = 30;

/** Grava o hash e devolve o token, que só o dispositivo guarda. */
export async function confiarNoDispositivo(req: Request, userId: number, db: Pool | PoolClient = pool) {
  const token = randomBytes(32).toString('base64url');
  await db.query(
    `INSERT INTO dispositivo_confiavel (token_hash, user_id, expira_em, user_agent)
     VALUES ($1, $2, now() + make_interval(days => $3), $4)`,
    [hashToken(token), userId, DIAS_CONFIANCA, origemDe(req).userAgent],
  );
  return token;
}

/** O token vale para esta conta, não foi revogado e não venceu? Marca o uso. */
export async function dispositivoConfiavel(userId: number, token: string | undefined, db: Pool | PoolClient = pool) {
  if (!token) return false;
  const { rowCount } = await db.query(
    `UPDATE dispositivo_confiavel SET ultimo_uso_em = now()
      WHERE token_hash = $1 AND user_id = $2 AND revogado_em IS NULL AND expira_em > now()`,
    [hashToken(token), userId],
  );
  return rowCount === 1;
}

export async function revogarDispositivos(userId: number, db: Pool | PoolClient = pool) {
  const { rowCount } = await db.query(
    'UPDATE dispositivo_confiavel SET revogado_em = now() WHERE user_id = $1 AND revogado_em IS NULL',
    [userId],
  );
  return rowCount ?? 0;
}
