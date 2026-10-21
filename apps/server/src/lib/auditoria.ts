import { isIP } from 'node:net';
import type { Request } from 'express';
import { pool } from '../db';

type Ator = { id: number; papel: 'psicologo' | 'paciente' } | null;

interface OpcoesAuditoria {
  // Omitido: o usuário da sessão web (psicólogo). null: ator desconhecido.
  ator?: Ator;
  pacienteId?: number;
  alvoTipo?: string;
  alvoId?: string | number;
  // Só ids, tipos e contagens. Nunca texto de nota, emoção, resposta, e-mail ou senha.
  metadados?: Record<string, string | number | boolean>;
}

export function origemDe(req: Request) {
  return {
    // Um X-Forwarded-For malformado não pode derrubar o INSERT em coluna inet.
    ip: req.ip && isIP(req.ip) ? req.ip : null,
    userAgent: req.get('user-agent')?.slice(0, 200) ?? null,
  };
}

export async function registrarAuditoria(
  req: Request,
  acao: string,
  opcoes: OpcoesAuditoria = {},
): Promise<number> {
  const ator: Ator =
    opcoes.ator !== undefined
      ? opcoes.ator
      : req.user
        ? { id: req.user.id, papel: 'psicologo' }
        : null;
  const { ip, userAgent } = origemDe(req);

  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO auditoria
       (ator_user_id, ator_papel, acao, paciente_id, alvo_tipo, alvo_id, ip, user_agent, metadados)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [
      ator?.id ?? null,
      ator?.papel ?? null,
      acao,
      opcoes.pacienteId ?? null,
      opcoes.alvoTipo ?? null,
      opcoes.alvoId === undefined ? null : String(opcoes.alvoId),
      ip,
      userAgent,
      opcoes.metadados ?? {},
    ],
  );
  return Number(rows[0].id);
}
