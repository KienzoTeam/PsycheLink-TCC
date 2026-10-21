import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import rateLimit from 'express-rate-limit';
import { pool } from '../db';
import { registrarAuditoria } from '../lib/auditoria';
import { comContextoPaciente } from '../lib/contextoseguro';
import { criptografar, descriptografar } from '../lib/criptografia';
import { exigirSessaoWeb, revogarSessoes, SESSAO_VIVA } from '../lib/sessaoWeb';
import { anotacaoSchema, contaSchema, trocaSenhaSchema } from '../schemas';

/**
 * Plataforma web do psicólogo. Regras de acesso:
 *  1. A sessão web precisa ser válida (exigirSessaoWeb: cookie pl_at, assinatura, sessão ativa).
 *  2. O usuário precisa ter registro em `psicologo` (conferido a cada requisição).
 *  3. Só é lido dado de pacientes com vínculo ativo com este psicólogo.
 *  4. Só é exibido o que o paciente consentiu, por categoria (consentimento).
 */
export const psicologo = Router();

const limite = (n: number) => rateLimit({ windowMs: 15 * 60_000, limit: n });
const NAO_AUTORIZADO = 'Acesso não autorizado.';
const PACIENTE_NAO_ENCONTRADO = 'Paciente não encontrado.';

const QUALIDADE_SONO_REVERSO: Record<number, string> = { 1: 'Ruim', 2: 'Regular', 3: 'Boa' };

type VinculoAtivo = {
  paciente_id: number;
  nome: string;
  compartilha_humor: boolean;
  compartilha_habitos: boolean;
  compartilha_escalas: boolean;
  compartilha_diario: boolean;
};

type Consentimentos = { humor: boolean; habitos: boolean; escalas: boolean; diario: boolean };

type LinhaPainel = {
  data: string;
  intensidade_humor: number | null;
  intensidade_ansiedade: number | null;
  emocao_predominante: string | null;
  recente: boolean;
};

type LinhaDetalhe = {
  data: string;
  intensidade_humor: number | null;
  intensidade_ansiedade: number | null;
  horas_sono: string | null; // numeric chega como string do pg
  qualidade_sono: number | null;
  emocao_predominante: string | null;
  contexto_gatilho: string | null;
  diario_livre: string | null;
  diario_compartilhado: boolean;
  exercicio: boolean | null; // null quando não há registro em `habito`
  meditacao: boolean | null;
  medicacao: boolean | null;
};

// Middlewares

async function exigirPsicologo(req: Request, res: Response, next: NextFunction) {
  try {
    const { rows } = await pool.query<{ id: number }>(
      'SELECT id FROM psicologo WHERE user_id = $1',
      [req.user!.id],
    );
    if (rows.length === 0) return res.status(403).json({ error: NAO_AUTORIZADO });

    res.locals.psicologoId = rows[0].id;
    return next();
  } catch (err) {
    console.error('Erro ao validar perfil de psicólogo:', err);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
}

psicologo.use(exigirSessaoWeb, exigirPsicologo);

// Utilitários

/** Envolve a rota e converte qualquer erro inesperado em 500 padronizado. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rota<P extends Record<string, string> = any>(
  fn: (req: Request<P>, res: Response) => Promise<unknown>,
) {
  return async (req: Request<P>, res: Response) => {
    try {
      await fn(req, res);
    } catch (err) {
      console.error('Erro na rota do psicólogo:', err);
      if (!res.headersSent) res.status(500).json({ error: 'Erro interno no servidor.' });
    }
  };
}

async function listarVinculosAtivos(
  psicologoId: number,
  pacienteId?: number,
): Promise<VinculoAtivo[]> {
  const params: number[] = [psicologoId];
  let filtro = '';
  if (pacienteId !== undefined) {
    params.push(pacienteId);
    filtro = 'AND v.paciente_id = $2';
  }

  const { rows } = await pool.query<VinculoAtivo>(
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
      WHERE v.psicologo_id = $1 AND v.status = 'ativo' ${filtro}
      ORDER BY u.nome`,
    params,
  );
  return rows;
}

/** Garante vínculo ativo com o paciente informado na URL; senão responde 404 genérico. */
async function vinculoOuNegar(
  req: Request<{ pacienteId: string }>,
  res: Response,
): Promise<VinculoAtivo | null> {
  const pacienteId = Number(req.params.pacienteId);
  if (!Number.isInteger(pacienteId) || pacienteId <= 0) {
    res.status(404).json({ error: PACIENTE_NAO_ENCONTRADO });
    return null;
  }

  const [vinculo] = await listarVinculosAtivos(res.locals.psicologoId as number, pacienteId);
  if (!vinculo) {
    res.status(404).json({ error: PACIENTE_NAO_ENCONTRADO });
    return null;
  }
  return vinculo;
}

function consentimentosDe(v: VinculoAtivo): Consentimentos {
  return {
    humor: v.compartilha_humor,
    habitos: v.compartilha_habitos,
    escalas: v.compartilha_escalas,
    diario: v.compartilha_diario,
  };
}

/** Descriptografa um campo; falha isolada não derruba a resposta inteira. */
function lerSeguro(valor: string | null): string | null {
  if (!valor) return null;
  try {
    return descriptografar(valor);
  } catch (erro) {
    console.warn('Não foi possível descriptografar um campo do paciente:', erro);
    return null;
  }
}

function separarLista(texto: string | null): string[] | null {
  if (texto === null) return null;
  return texto
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function media(valores: Array<number | null | undefined>): number | null {
  const validos = valores.filter((v): v is number => v !== null && v !== undefined);
  if (validos.length === 0) return null;
  return validos.reduce((soma, v) => soma + v, 0) / validos.length;
}

function arredondar(valor: number | null): number | null {
  return valor === null ? null : Number(valor.toFixed(1));
}

async function resumoPaciente(v: VinculoAtivo) {
  const base = {
    id: v.paciente_id,
    nome: v.nome,
    compartilhaHumor: v.compartilha_humor,
    compartilhaHabitos: v.compartilha_habitos,
    compartilhaEscalas: v.compartilha_escalas,
    compartilhaDiario: v.compartilha_diario,
  };

  // Sem consentimento de humor, nenhum dado de check-in sai do servidor.
  if (!v.compartilha_humor) {
    return {
      ...base,
      ultimoCheckin: null,
      checkinsUltimos7Dias: 0,
      humorMedio7d: null,
      ansiedadeMedia7d: null,
    };
  }

  const { rows } = (await comContextoPaciente(v.paciente_id, (client) =>
    client.query(
      `SELECT to_char(data, 'YYYY-MM-DD') AS data,
              intensidade_humor,
              intensidade_ansiedade,
              emocao_predominante,
              (data >= CURRENT_DATE - 6) AS recente
         FROM checkin_diario
        WHERE paciente_id = $1
        ORDER BY data DESC
        LIMIT 60`,
      [v.paciente_id],
    ),
  )) as { rows: LinhaPainel[] };

  const semana = rows.filter((r) => r.recente);
  const ultimo = rows[0];

  return {
    ...base,
    ultimoCheckin: ultimo
      ? {
          data: ultimo.data,
          emocoes: separarLista(lerSeguro(ultimo.emocao_predominante)),
        }
      : null,
    checkinsUltimos7Dias: semana.length,
    humorMedio7d: arredondar(media(semana.map((r) => r.intensidade_humor))),
    ansiedadeMedia7d: arredondar(media(semana.map((r) => r.intensidade_ansiedade))),
  };
}

// Rotas

// Conta

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
psicologo.get(
  '/me',
  limite(60),
  rota(async (_req, res) => res.json(await perfilDe(res.locals.psicologoId))),
);

// Nome e especialidade; o e-mail e o CRP não mudam por aqui.
psicologo.patch(
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

psicologo.post(
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

psicologo.get(
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

psicologo.post(
  '/me/sessoes/encerrar-outras',
  limite(10),
  rota(async (req, res) => {
    const encerradas = await revogarSessoes(req.user!.id, res.locals.sessaoId);
    await registrarAuditoria(req, 'sessoes_encerradas', { metadados: { quantidade: encerradas } });
    return res.json({ encerradas });
  }),
);

// Lista de pacientes vinculados com indicadores (já filtrados pelo consentimento)
psicologo.get(
  '/pacientes',
  limite(60),
  rota(async (_req, res) => {
    const vinculos = await listarVinculosAtivos(res.locals.psicologoId as number);

    // Sequencial de propósito: cada paciente abre uma conexão com contexto de RLS.
    const pacientes = [];
    for (const v of vinculos) {
      pacientes.push(await resumoPaciente(v));
    }
    return res.json({ pacientes });
  }),
);

// Detalhe de um paciente: somente as categorias consentidas
psicologo.get(
  '/pacientes/:pacienteId/resumo',
  limite(60),
  rota<{ pacienteId: string }>(async (req, res) => {
    const vinculo = await vinculoOuNegar(req, res);
    if (!vinculo) return;

    const dias = Math.min(Math.max(Number(req.query.dias) || 30, 1), 365);
    const consent = consentimentosDe(vinculo);

    const { rows } = (await comContextoPaciente(vinculo.paciente_id, (client) =>
      client.query(
        `SELECT to_char(c.data, 'YYYY-MM-DD') AS data,
                c.intensidade_humor, c.intensidade_ansiedade,
                c.horas_sono, c.qualidade_sono,
                c.emocao_predominante, c.contexto_gatilho,
                c.diario_livre, c.diario_compartilhado,
                h.exercicio, h.meditacao, h.medicacao
           FROM checkin_diario c
           LEFT JOIN habito h ON h.checkin_id = c.id
          WHERE c.paciente_id = $1
            AND c.data >= CURRENT_DATE - $2::int
          ORDER BY c.data ASC`,
        [vinculo.paciente_id, dias],
      ),
    )) as { rows: LinhaDetalhe[] };

    // Humor/ansiedade/emoções/gatilhos → consentimento "humor".
    // Sono e hábitos → consentimento "hábitos".
    const registros = rows.map((l) => ({
      data: l.data,
      humor: consent.humor ? l.intensidade_humor : null,
      ansiedade: consent.humor ? l.intensidade_ansiedade : null,
      sonoHoras:
        consent.habitos && l.horas_sono !== null ? Number(l.horas_sono) : null,
      qualidadeSono:
        consent.habitos && l.qualidade_sono !== null
          ? (QUALIDADE_SONO_REVERSO[l.qualidade_sono] ?? null)
          : null,
      emocoes: consent.humor ? separarLista(lerSeguro(l.emocao_predominante)) : null,
      gatilhos: consent.humor ? separarLista(lerSeguro(l.contexto_gatilho)) : null,
    }));

    const contagem = new Map<string, number>();
    for (const registro of registros) {
      for (const emocao of registro.emocoes ?? []) {
        contagem.set(emocao, (contagem.get(emocao) ?? 0) + 1);
      }
    }
    const frequenciaEmocional = [...contagem.entries()]
      .map(([emocao, quantidade]) => ({ emocao, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 5);

    let habitos: null | {
      diasRegistrados: number;
      exercicio: number;
      meditacao: number;
      medicacao: number;
    } = null;
    if (consent.habitos) {
      const comHabito = rows.filter((l) => l.exercicio !== null);
      habitos = {
        diasRegistrados: comHabito.length,
        exercicio: comHabito.filter((l) => l.exercicio).length,
        meditacao: comHabito.filter((l) => l.meditacao).length,
        medicacao: comHabito.filter((l) => l.medicacao).length,
      };
    }

    // Diário livre exige as duas permissões: consentimento geral e marcação no check-in.
    const diario: Array<{ data: string; texto: string }> = [];
    if (consent.diario) {
      for (const l of rows) {
        if (!l.diario_compartilhado || !l.diario_livre) continue;
        const texto = lerSeguro(l.diario_livre);
        if (texto !== null) diario.push({ data: l.data, texto });
      }
    }

    await registrarAuditoria(req, 'paciente_painel_visualizado', {
      pacienteId: vinculo.paciente_id,
    });

    return res.json({
      paciente: { id: vinculo.paciente_id, nome: vinculo.nome },
      consentimentos: consent,
      periodoDias: dias,
      registros,
      frequenciaEmocional,
      habitos,
      diario,
    });
  }),
);

// Anotações clínicas do psicólogo sobre o paciente (sempre cifradas no banco)
psicologo.get(
  '/pacientes/:pacienteId/anotacoes',
  limite(60),
  rota<{ pacienteId: string }>(async (req, res) => {
    const vinculo = await vinculoOuNegar(req, res);
    if (!vinculo) return;

    const { rows } = await pool.query<{ id: number; conteudo: string; criadoEm: string }>(
      `SELECT id,
              conteudo,
              to_char(criado_em, 'YYYY-MM-DD HH24:MI') AS "criadoEm"
         FROM anotacao_clinica
        WHERE psicologo_id = $1
          AND paciente_id = $2
          AND (expira_em IS NULL OR expira_em > now())
        ORDER BY criado_em DESC`,
      [res.locals.psicologoId, vinculo.paciente_id],
    );

    const anotacoes = rows
      .map((a) => ({ id: a.id, criadoEm: a.criadoEm, conteudo: lerSeguro(a.conteudo) }))
      .filter((a): a is { id: number; criadoEm: string; conteudo: string } => a.conteudo !== null);

    await registrarAuditoria(req, 'anotacoes_lidas', { pacienteId: vinculo.paciente_id });
    return res.json({ anotacoes });
  }),
);

psicologo.post(
  '/pacientes/:pacienteId/anotacoes',
  limite(60),
  rota<{ pacienteId: string }>(async (req, res) => {
    const vinculo = await vinculoOuNegar(req, res);
    if (!vinculo) return;

    const parsed = anotacaoSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' });
    }

    const { rows } = await pool.query<{ id: number; criado_em: string }>(
      `INSERT INTO anotacao_clinica (psicologo_id, paciente_id, conteudo, expira_em)
       VALUES ($1, $2, $3, now() + interval '5 years')
       RETURNING id, to_char(criado_em, 'YYYY-MM-DD HH24:MI') AS criado_em`,
      [res.locals.psicologoId, vinculo.paciente_id, criptografar(parsed.data.conteudo)],
    );

    await registrarAuditoria(req, 'anotacao_criada', {
      pacienteId: vinculo.paciente_id,
      alvoTipo: 'anotacao_clinica',
      alvoId: rows[0].id,
    });

    return res.status(201).json({
      anotacao: { id: rows[0].id, criadoEm: rows[0].criado_em, conteudo: parsed.data.conteudo },
    });
  }),
);
