import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../../db';
import { exigirSessaoWeb } from '../../lib/sessaoWeb';
import { conta } from './conta';
import { pacientes } from './pacientes';
import { vinculo } from './vinculo';
import { checkins } from './checkins';
import { dashboard } from './dashboard';

/**
 * Plataforma web do psicólogo. Regras de acesso:
 *  1. A sessão web precisa ser válida (exigirSessaoWeb: cookie pl_at, assinatura, sessão ativa).
 *  2. O usuário precisa ter registro em `psicologo` (conferido a cada requisição).
 *  3. Só é lido dado de pacientes com vínculo ativo com este psicólogo, dentro de
 *     comContextoPsicologo (o RLS repete essa regra no banco).
 *  4. Só é exibido o que o paciente consentiu, por categoria (consentimento).
 */
export const psicologo = Router();

async function exigirPsicologo(req: Request, res: Response, next: NextFunction) {
  try {
    const { rows } = await pool.query<{ id: number }>(
      'SELECT id FROM psicologo WHERE user_id = $1',
      [req.user!.id],
    );
    if (rows.length === 0) return res.status(403).json({ error: 'Acesso não autorizado.' });

    res.locals.psicologoId = rows[0].id;
    return next();
  } catch (err) {
    console.error('Erro ao validar perfil de psicólogo:', err);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
}

psicologo.use(exigirSessaoWeb, exigirPsicologo);
psicologo.use(conta);
psicologo.use('/pacientes', pacientes);
psicologo.use('/vinculo', vinculo);
psicologo.use('/checkins', checkins);
psicologo.use('/dashboard', dashboard);
