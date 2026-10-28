import { Router } from 'express';
import { z } from 'zod';
import { comContextoPsicologo } from '../../lib/contextoseguro';
import { codificarCursor, cursorDe } from '../../lib/cursor';
import { dia, periodoValido } from '../../lib/periodo';
import { lerOuNegar, limite, rota } from '../../lib/rota';

export const auditoria = Router();

// Ações que o sistema registra, com o rótulo da tela de auditoria.
const ROTULOS = {
  login_ok: 'Login',
  login_falha: 'Tentativa de login recusada',
  '2fa_ok': 'Verificação em duas etapas concluída',
  '2fa_falha': 'Verificação em duas etapas recusada',
  logout: 'Saída',
  sessao_reuso_detectado: 'Sessão revogada por reuso de credencial',
  sessoes_encerradas: 'Outras sessões encerradas',
  senha_alterada: 'Senha alterada',
  paciente_painel_visualizado: 'Painel do paciente visualizado',
  checkin_visualizado: 'Registro de check-in visualizado',
  anotacao_criada: 'Anotação criada',
  anotacoes_lidas: 'Anotações lidas',
  codigo_vinculo_gerado: 'Código de vínculo gerado',
  codigo_vinculo_revogado: 'Código de vínculo revogado',
  vinculo_criado: 'Vínculo criado',
  vinculo_encerrado: 'Vínculo encerrado',
  consentimento_alterado: 'Consentimento alterado',
  diario_compartilhamento_revogado: 'Compartilhamento do diário revogado',
  escala_solicitada: 'Escala solicitada',
  escala_cancelada: 'Escala cancelada',
  escala_visualizada: 'Escala visualizada',
  escala_respondida: 'Escala respondida',
  consulta_criada: 'Consulta criada',
  consulta_alterada: 'Consulta alterada',
  relatorio_visualizado: 'Relatório do paciente visualizado',
  relatorio_exportado: 'Relatório exportado',
} as const;

type Acao = keyof typeof ROTULOS;
const ACOES = Object.keys(ROTULOS) as [Acao, ...Acao[]];

const listaSchema = z
  .object({
    acao: z.enum(ACOES).optional(),
    pacienteId: z.coerce.number().int().positive().optional(),
    de: dia.optional(),
    ate: dia.optional(),
    cursor: cursorDe(z.tuple([z.iso.datetime(), z.string().regex(/^\d+$/)])).optional(),
    limite: z.coerce.number().int().min(1).max(100).default(30),
  })
  .refine((q) => periodoValido(q.de, q.ate));

type LinhaAuditoria = {
  id: string; // bigint chega como string do pg
  acao: string;
  ator_papel: string | null;
  paciente_id: number | null;
  paciente_nome: string | null;
  alvo_tipo: string | null;
  alvo_id: string | null;
  metadados: Record<string, string | number | boolean>;
  em: Date;
  ip: string | null;
  user_agent: string | null;
};

auditoria.get(
  '/acoes',
  limite(60),
  rota(async (_req, res) =>
    res.json({ acoes: ACOES.map((acao) => ({ acao, rotulo: ROTULOS[acao] })) }),
  ),
);

// Eventos do próprio psicólogo, mais os que o paciente vinculado fez depois do início do vínculo
// (ações de outros psicólogos sobre o mesmo paciente não entram; resposta de escala só com
// consentimento). IP e navegador só saem nos eventos do próprio psicólogo.
// A data usa milissegundos para o cursor repetir a ordem sem perder linhas.
auditoria.get(
  '/',
  limite(60),
  rota(async (req, res) => {
    const q = lerOuNegar(listaSchema, req.query, res);
    if (!q) return;

    const { rows } = await comContextoPsicologo(res.locals.psicologoId, (client) =>
      client.query<LinhaAuditoria>(
        `SELECT * FROM (
          SELECT a.id, a.acao, a.ator_papel, a.paciente_id, u.nome AS paciente_nome,
                 a.alvo_tipo, a.alvo_id, a.metadados,
                 date_trunc('milliseconds', a.criado_em) AS em,
                 CASE WHEN a.ator_user_id = $2 THEN host(a.ip) END AS ip,
                 CASE WHEN a.ator_user_id = $2 THEN a.user_agent END AS user_agent
            FROM auditoria a
            LEFT JOIN paciente p ON p.id = a.paciente_id
            LEFT JOIN users u ON u.id = p.user_id
           WHERE a.ator_user_id = $2
              OR (a.ator_papel = 'paciente' AND EXISTS (
                    SELECT 1 FROM vinculo v
                     WHERE v.paciente_id = a.paciente_id AND v.psicologo_id = $1 AND v.status = 'ativo'
                       AND a.criado_em >= (v.criado_em AT TIME ZONE 'UTC'))
                  AND (a.acao <> 'escala_respondida' OR EXISTS (
                    SELECT 1 FROM consentimento co
                     WHERE co.paciente_id = a.paciente_id AND co.compartilha_escalas)))
       ) t
        WHERE ($3::text IS NULL OR t.acao = $3)
          AND ($4::int IS NULL OR t.paciente_id = $4)
          AND ($5::date IS NULL OR (t.em AT TIME ZONE 'America/Sao_Paulo')::date >= $5::date)
          AND ($6::date IS NULL OR (t.em AT TIME ZONE 'America/Sao_Paulo')::date <= $6::date)
          AND ($7::timestamptz IS NULL OR (t.em, t.id) < ($7::timestamptz, $8::bigint))
        ORDER BY t.em DESC, t.id DESC
        LIMIT $9`,
        [
          res.locals.psicologoId,
          req.user!.id,
          q.acao ?? null,
          q.pacienteId ?? null,
          q.de ?? null,
          q.ate ?? null,
          q.cursor?.[0] ?? null,
          q.cursor?.[1] ?? null,
          q.limite + 1,
        ],
      ),
    );

    const pagina = rows.slice(0, q.limite);
    const ultima = pagina.at(-1);
    return res.json({
      eventos: pagina.map((l) => ({
        id: Number(l.id),
        acao: l.acao,
        atorPapel: l.ator_papel,
        pacienteId: l.paciente_id,
        pacienteNome: l.paciente_nome,
        alvoTipo: l.alvo_tipo,
        alvoId: l.alvo_id,
        metadados: l.metadados,
        criadoEm: l.em,
        ip: l.ip,
        userAgent: l.user_agent,
      })),
      proximoCursor:
        rows.length > q.limite && ultima
          ? codificarCursor([ultima.em.toISOString(), ultima.id])
          : null,
    });
  }),
);
