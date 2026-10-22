import type { Request, Response } from 'express';
import type { PoolClient } from 'pg';
import { idDe } from './rota';

export type VinculoAtivo = {
  paciente_id: number;
  nome: string;
  compartilha_humor: boolean;
  compartilha_habitos: boolean;
  compartilha_escalas: boolean;
  compartilha_diario: boolean;
};

export type Consentimentos = { humor: boolean; habitos: boolean; escalas: boolean; diario: boolean };

export const PACIENTE_NAO_ENCONTRADO = 'Paciente não encontrado.';

/**
 * Condição SQL: a linha (de uma tabela com paciente_id e psicologo_id) pertence a um vínculo ativo.
 * A aplicação confere sozinha, sem depender só do RLS (que o papel dono do banco ignora).
 * `tabela` é sempre um alias fixo do código, nunca entrada do usuário.
 */
export const vinculoAtivoDe = (tabela: string) => `EXISTS (
  SELECT 1 FROM vinculo v
   WHERE v.paciente_id = ${tabela}.paciente_id AND v.psicologo_id = ${tabela}.psicologo_id
     AND v.status = 'ativo')`;

/**
 * Garante vínculo ativo com o paciente da URL; senão responde 404 genérico.
 * Roda dentro de comContextoPsicologo: o consentimento só é legível com vínculo ativo.
 */
export async function vinculoOuNegar(
  client: PoolClient,
  req: Request<{ pacienteId: string }>,
  res: Response,
): Promise<VinculoAtivo | null> {
  const pacienteId = idDe(req.params.pacienteId);
  if (pacienteId !== null) {
    const { rows } = await client.query<VinculoAtivo>(
      `SELECT v.paciente_id,
              u.nome,
              COALESCE(c.compartilha_humor, false)   AS compartilha_humor,
              COALESCE(c.compartilha_habitos, false) AS compartilha_habitos,
              COALESCE(c.compartilha_escalas, false) AS compartilha_escalas,
              COALESCE(c.compartilha_diario, false)  AS compartilha_diario
         FROM vinculo v
         JOIN paciente p ON p.id = v.paciente_id
         JOIN users u ON u.id = p.user_id
         LEFT JOIN consentimento c ON c.paciente_id = v.paciente_id
        WHERE v.psicologo_id = $1 AND v.paciente_id = $2 AND v.status = 'ativo'`,
      [res.locals.psicologoId, pacienteId],
    );
    if (rows[0]) return rows[0];
  }

  res.status(404).json({ error: PACIENTE_NAO_ENCONTRADO });
  return null;
}

export function consentimentosDe(v: VinculoAtivo): Consentimentos {
  return {
    humor: v.compartilha_humor,
    habitos: v.compartilha_habitos,
    escalas: v.compartilha_escalas,
    diario: v.compartilha_diario,
  };
}
