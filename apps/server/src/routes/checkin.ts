import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { pool } from '../db';
import { checkinSchema } from '../schemas';
import { verificarToken } from './auth';
import { criptografar, criptografarOuNulo, descriptografar } from '../lib/criptografia';
import { comContextoPaciente } from '../lib/contextoseguro';

export const checkin = Router();

const limite = (n: number) => rateLimit({ windowMs: 15 * 60_000, limit: n });

const QUALIDADE_SONO_MAP: Record<'Ruim' | 'Regular' | 'Boa', number> = {
  Ruim: 1,
  Regular: 2,
  Boa: 3,
};

async function obterOuCriarPacienteId(userId: number): Promise<number> {
  const existente = await pool.query('SELECT id FROM paciente WHERE user_id = $1', [userId]);
  if (existente.rows[0]) {
    return existente.rows[0].id as number;
  }

  const criado = await pool.query(
    'INSERT INTO paciente (user_id) VALUES ($1) RETURNING id',
    [userId],
  );
  return criado.rows[0].id as number;
}

async function obterPacienteId(userId: number): Promise<number | null> {
  const resultado = await pool.query('SELECT id FROM paciente WHERE user_id = $1', [userId]);
  return (resultado.rows[0]?.id as number | undefined) ?? null;
}

// POST /checkin - Salva o check-in diário
checkin.post('/', limite(20), verificarToken, async (req, res) => {
  const parsed = checkinSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' });
  }

  const dados = parsed.data;

  const emocaoPredominante = criptografar(dados.emocoes.join(', '));
  const contextoGatilho = criptografarOuNulo(dados.contextos.join(', ') || null);
  const diarioLivre = criptografarOuNulo(dados.notas);
  const qualidadeSono = dados.qualidadeSono ? QUALIDADE_SONO_MAP[dados.qualidadeSono] : null;

  try {
    const pacienteId = await obterOuCriarPacienteId(req.user!.id);

    const resultado = await comContextoPaciente(pacienteId, (client) =>
      client.query(
        `INSERT INTO checkin_diario
           (paciente_id, emocao_predominante, intensidade_humor, intensidade_ansiedade,
            horas_sono, qualidade_sono, contexto_gatilho, diario_livre)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, data, criado_em`,
        [
          pacienteId,
          emocaoPredominante,
          dados.humor,
          dados.ansiedade,
          dados.horasSono,
          qualidadeSono,
          contextoGatilho,
          diarioLivre,
        ],
      ),
    );

    return res.status(201).json({ checkin: resultado.rows[0] });
  } catch (err: any) {
    // Trata caso o paciente já tenha feito check-in hoje
    if (err?.code === '23505' && err?.constraint === 'uk_paciente_data') {
      return res.status(409).json({ error: 'Você já registrou um check-in hoje.' });
    }

    console.error('Erro ao salvar check-in:', err);
    return res.status(500).json({ error: 'Erro interno ao salvar o check-in.' });
  }
});

// GET /checkin/resumo - Busca dados para a tela de gráficos/estatísticas
checkin.get('/resumo', limite(60), verificarToken, async (req, res) => {
  try {
    const pacienteId = await obterPacienteId(req.user!.id);

    if (pacienteId === null) {
      return res.json({ serieTemporal: [], frequenciaEmocional: [] });
    }

    const { rows } = await comContextoPaciente(pacienteId, (client) =>
      client.query(
        `SELECT to_char(data, 'YYYY-MM-DD') AS data,
                intensidade_humor, intensidade_ansiedade, emocao_predominante
           FROM checkin_diario
          WHERE paciente_id = $1
          ORDER BY data ASC
          LIMIT 30`,
        [pacienteId],
      ),
    );

    const serieTemporal = rows.map((linha) => ({
      data: linha.data as string,
      humor: linha.intensidade_humor as number | null,
      ansiedade: linha.intensidade_ansiedade as number | null,
    }));

    const contagemEmocoes = new Map<string, number>();
    for (const linha of rows) {
      const cifrado: string | null = linha.emocao_predominante;
      if (!cifrado) continue;

      let bruto: string;
      try {
        bruto = descriptografar(cifrado);
      } catch (erro) {
        console.warn('Não foi possível descriptografar emocao_predominante:', erro);
        continue;
      }

      for (const emocao of bruto.split(',').map((e) => e.trim()).filter(Boolean)) {
        contagemEmocoes.set(emocao, (contagemEmocoes.get(emocao) ?? 0) + 1);
      }
    }

    const frequenciaEmocional = Array.from(contagemEmocoes.entries())
      .map(([emocao, quantidade]) => ({ emocao, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 5);

    return res.json({ serieTemporal, frequenciaEmocional });
  } catch (err) {
    console.error('Erro ao buscar resumo de check-ins:', err);
    return res.status(500).json({ error: 'Erro interno ao buscar dados.' });
  }
});