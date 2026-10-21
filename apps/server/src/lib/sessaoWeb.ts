import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { pool } from '../db';
import { origemDe } from './auditoria';

// O navegador fala com /api/...; o proxy remove o prefixo antes de chegar ao Express.
// Por isso os cookies usam o caminho externo e as rotas do Express não.
const PREFIXO_API = '/api';
export const COOKIE_REFRESH = 'pl_rt';
const COOKIE_ACESSO = 'pl_at';
const AUDIENCIA = 'web-psicologo';
const ACESSO_MS = 15 * 60_000;

const MSG_SESSAO_EXPIRADA = 'Sessão ausente ou expirada.';

// Sessão utilizável: não revogada, dentro das 12 h absolutas e com uso nos últimos 30 min.
export const SESSAO_VIVA = `revogada_em IS NULL
  AND expira_absoluto_em > now()
  AND ultimo_uso_em > now() - interval '30 minutes'`;

const opcoesComuns = { httpOnly: true, secure: true, sameSite: 'strict' } as const;
const opcoesAcesso = { ...opcoesComuns, path: PREFIXO_API };
const opcoesRefresh = { ...opcoesComuns, path: `${PREFIXO_API}/auth/psicologo/refresh` };

export const novoSegredo = () => randomBytes(32).toString('base64url');

export const hashSegredo = (segredo: string) =>
  createHash('sha256').update(segredo).digest('hex');

export const hashesIguais = (a: string, b: string | null) =>
  b !== null && timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));

export function lerCookie(req: Request, nome: string): string | undefined {
  for (const par of (req.headers.cookie ?? '').split(';')) {
    const [chave, ...valor] = par.trim().split('=');
    if (chave === nome) return valor.join('=');
  }
  return undefined;
}

export function emitirCookies(
  res: Response,
  userId: number,
  sid: string,
  segredo: string,
  expiraEm: Date,
): void {
  const acesso = jwt.sign({ sid, typ: 'access' }, process.env.JWT_SECRET!, {
    subject: String(userId),
    audience: AUDIENCIA,
    expiresIn: ACESSO_MS / 1000,
  });
  res.cookie(COOKIE_ACESSO, acesso, { ...opcoesAcesso, maxAge: ACESSO_MS });
  res.cookie(COOKIE_REFRESH, `${sid}.${segredo}`, {
    ...opcoesRefresh,
    maxAge: expiraEm.getTime() - Date.now(),
  });
}

export function limparCookies(res: Response): void {
  res.clearCookie(COOKIE_ACESSO, opcoesAcesso);
  res.clearCookie(COOKIE_REFRESH, opcoesRefresh);
}

/** Grava só o hash do refresh e entrega os dois cookies. Devolve o id da sessão. */
export async function abrirSessao(req: Request, res: Response, userId: number): Promise<string> {
  const segredo = novoSegredo();
  const { ip, userAgent } = origemDe(req);
  const { rows } = await pool.query<{ id: string; expira_absoluto_em: Date }>(
    `INSERT INTO sessao (user_id, refresh_hash, expira_absoluto_em, ip, user_agent)
     VALUES ($1, $2, now() + interval '12 hours', $3, $4)
     RETURNING id, expira_absoluto_em`,
    [userId, hashSegredo(segredo), ip, userAgent],
  );
  emitirCookies(res, userId, rows[0].id, segredo, rows[0].expira_absoluto_em);
  return rows[0].id;
}

export async function revogarSessoes(userId: number, exceto?: string): Promise<number> {
  const { rowCount } = await pool.query(
    `UPDATE sessao SET revogada_em = now()
      WHERE user_id = $1 AND ($2::uuid IS NULL OR id <> $2) AND ${SESSAO_VIVA}`,
    [userId, exceto ?? null],
  );
  return rowCount ?? 0;
}

// Só o cookie pl_at vale aqui: o Bearer do mobile nunca autentica rotas do psicólogo web.
export async function exigirSessaoWeb(req: Request, res: Response, next: NextFunction) {
  const negar = () => res.status(401).json({ error: MSG_SESSAO_EXPIRADA });

  const token = lerCookie(req, COOKIE_ACESSO);
  if (!token) return negar();

  let payload: JwtPayload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET!, {
      algorithms: ['HS256'],
      audience: AUDIENCIA,
    }) as JwtPayload;
  } catch {
    return negar();
  }

  const userId = Number(payload.sub);
  if (payload.typ !== 'access' || typeof payload.sid !== 'string' || !Number.isInteger(userId)) {
    return negar();
  }

  // Confere e marca o uso na mesma ida ao banco: a inatividade de 30 min conta atividade real.
  const { rowCount } = await pool.query(
    `UPDATE sessao SET ultimo_uso_em = now()
      WHERE id = $1 AND user_id = $2 AND ${SESSAO_VIVA}`,
    [payload.sid, userId],
  );
  if (!rowCount) return negar();

  req.user = { id: userId };
  res.locals.sessaoId = payload.sid;
  return next();
}

// CSRF: SameSite=Strict já barra o envio cross-site; a allowlist de Origin cobre o resto.
const origensWeb = (process.env.WEB_ORIGINS ?? '')
  .split(',')
  .map((origem) => origem.trim())
  .filter(Boolean);

export function exigirOrigem(req: Request, res: Response, next: NextFunction) {
  if (req.method === 'GET' || req.method === 'HEAD') return next();

  const origem = req.get('origin');
  if (!origem || !origensWeb.includes(origem)) {
    return res.status(403).json({ error: 'Origem não autorizada.' });
  }
  return next();
}
