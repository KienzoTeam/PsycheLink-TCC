import { Router } from 'express';
import { pool } from '../db';
import { verificarToken } from './auth';

export const psicologoRouter = Router();

// Aplica a verificação do token JWT em todas as rotas de psicólogo
psicologoRouter.use(verificarToken);

// Retorna os alertas recentes dos pacientes vinculados ao psicólogo
psicologoRouter.get('/alertas/recentes', async (req, res) => {
  try {
    const userId = req.user!.id;

    // 1. Busca o ID do psicólogo associado ao user_id
    const psicologoRes = await pool.query(
      'SELECT id FROM psicologo WHERE user_id = $1',
      [userId]
    );

    if (psicologoRes.rows.length === 0) {
      return res.status(404).json({ error: 'Perfil de psicólogo não encontrado.' });
    }

    const psicologoId = psicologoRes.rows[0].id;

    // 2. Busca alertas dos pacientes que possuem vínculo ativo com este psicólogo
    const alertas = await pool.query(
      `SELECT a.id, a.paciente_id, u.nome AS paciente_nome, a.tipo, a.descricao, a.nivel, a.created_at
       FROM alerta a
       JOIN paciente p ON p.id = a.paciente_id
       JOIN users u ON u.id = p.user_id
       JOIN vinculo v ON v.paciente_id = p.id
       WHERE v.psicologo_id = $1 AND v.status = 'ATIVO'
       ORDER BY a.created_at DESC
       LIMIT 10`,
      [psicologoId]
    );

    return res.json(alertas.rows);
  } catch (err) {
    console.error('Erro ao buscar alertas recentes:', err);
    return res.status(500).json({ error: 'Erro interno ao buscar alertas.' });
  }
});