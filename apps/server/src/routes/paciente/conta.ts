import { Router } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { pool } from '../../db';
import { registrarAuditoria } from '../../lib/auditoria';
import { avisar } from '../../lib/avisos';
import { lerSeguro } from '../../lib/checkins';
import { comContextoPaciente, emTransacao } from '../../lib/contextoseguro';
import { revogarDispositivos } from '../../lib/dispositivoConfiavel';
import { DIAS_PARA_EXCLUIR } from '../../lib/exclusaoConta';
import { obterPacienteId } from '../../lib/paciente';
import { checkinsDoPeriodo, resumirCheckins } from '../../lib/resumo';
import { lerOuNegar, limite, limitePorIp, rota } from '../../lib/rota';
import { exclusaoContaSchema, trocaSenhaSchema } from '../../schemas';
import { acessoApp } from '../auth';

// Configurações da Conta e Privacidade e Segurança do app do paciente.
export const conta = Router();

const nomeSchema = z.object({ nome: z.string().trim().min(2, 'Nome muito curto').max(120) });
const paciente = (req: { user?: { id: number } }) => ({ id: req.user!.id, papel: 'paciente' as const });

async function senhaConfere(userId: number, senha: string) {
  const { rows } = await pool.query<{ password_hash: string }>('SELECT password_hash FROM users WHERE id = $1', [userId]);
  return bcrypt.compare(senha, rows[0].password_hash);
}

conta.get(
  '/',
  limite(60),
  rota(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT u.nome, u.email, u.exclusao_agendada_em AS "exclusaoAgendadaEm",
              u.exclusao_agendada_em + make_interval(days => $2) AS "excluirEm",
              (SELECT count(*)::int FROM dispositivo_confiavel d
                WHERE d.user_id = u.id AND d.revogado_em IS NULL AND d.expira_em > now()) AS "dispositivosConfiaveis"
         FROM users u WHERE u.id = $1`,
      [req.user!.id, DIAS_PARA_EXCLUIR],
    );
    return res.json(rows[0]);
  }),
);

conta.patch(
  '/',
  limite(30),
  rota(async (req, res) => {
    const corpo = lerOuNegar(nomeSchema, req.body, res);
    if (!corpo) return;
    await pool.query('UPDATE users SET nome = $1 WHERE id = $2', [corpo.nome, req.user!.id]);
    return res.json({ nome: corpo.nome });
  }),
);

// Trocar a senha encerra as outras sessões e esquece os celulares confiáveis; este celular
// recebe um token novo e continua dentro.
conta.post(
  '/senha',
  limitePorIp(50),
  limite(5),
  rota(async (req, res) => {
    const parsed = trocaSenhaSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' });
    }
    if (!(await senhaConfere(req.user!.id, parsed.data.senhaAtual))) {
      return res.status(400).json({ error: 'Senha atual incorreta.' });
    }
    const hash = await bcrypt.hash(parsed.data.novaSenha, 10);
    const { rows } = await pool.query(
      `UPDATE users SET password_hash = $1, sessao_invalidada_em = now() WHERE id = $2
       RETURNING id, nome, email, data_nascimento`,
      [hash, req.user!.id],
    );
    await revogarDispositivos(req.user!.id);
    await registrarAuditoria(req, 'senha_alterada', { ator: paciente(req) });
    return res.json(acessoApp(rows[0]));
  }),
);

conta.post(
  '/dispositivos/esquecer',
  limite(10),
  rota(async (req, res) => {
    const esquecidos = await revogarDispositivos(req.user!.id);
    await registrarAuditoria(req, 'dispositivos_esquecidos', { ator: paciente(req), metadados: { quantidade: esquecidos } });
    return res.json({ esquecidos });
  }),
);

// Exclusão em duas etapas: agenda agora (encerra o vínculo e as sessões) e apaga em 30 dias.
conta.post(
  '/excluir',
  limitePorIp(50),
  limite(5),
  rota(async (req, res) => {
    const parsed = exclusaoContaSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' });
    }
    if (!(await senhaConfere(req.user!.id, parsed.data.senha))) {
      return res.status(400).json({ error: 'Senha incorreta.' });
    }
    const vinculo = await emTransacao(async (client) => {
      await client.query(
        'UPDATE users SET exclusao_agendada_em = now(), sessao_invalidada_em = now() WHERE id = $1',
        [req.user!.id],
      );
      const { rows } = await client.query<{ id: number; paciente_id: number; psicologo_id: number }>(
        `UPDATE vinculo v SET status = 'encerrado', encerrado_em = now(), encerrado_por = $1
           FROM paciente pa
          WHERE pa.id = v.paciente_id AND pa.user_id = $1 AND v.status = 'ativo'
      RETURNING v.id, v.paciente_id, v.psicologo_id`,
        [req.user!.id],
      );
      return rows[0] ?? null;
    });
    await revogarDispositivos(req.user!.id);
    await registrarAuditoria(req, 'exclusao_agendada', {
      ator: paciente(req),
      pacienteId: vinculo?.paciente_id,
      metadados: { dias: DIAS_PARA_EXCLUIR, ...(vinculo && { psicologoId: vinculo.psicologo_id }) },
    });
    if (vinculo) void avisar(vinculo.psicologo_id, 'conta_excluida', vinculo.paciente_id);
    return res.json({ ok: true, dias: DIAS_PARA_EXCLUIR });
  }),
);

conta.post(
  '/excluir/cancelar',
  limite(10),
  rota(async (req, res) => {
    const { rowCount } = await pool.query(
      'UPDATE users SET exclusao_agendada_em = NULL WHERE id = $1 AND exclusao_agendada_em IS NOT NULL',
      [req.user!.id],
    );
    if (!rowCount) return res.status(404).json({ error: 'Nenhuma exclusão agendada.' });
    await registrarAuditoria(req, 'exclusao_cancelada', { ator: paciente(req) });
    return res.json({ ok: true });
  }),
);

// LGPD (acesso e portabilidade): tudo o que o paciente registrou, em JSON. O app monta o PDF.
conta.get(
  '/exportar',
  limite(10),
  rota(async (req, res) => {
    const { rows: perfil } = await pool.query(
      `SELECT nome, email, to_char(data_nascimento, 'YYYY-MM-DD') AS "dataNascimento", created_at AS "criadoEm"
         FROM users WHERE id = $1`,
      [req.user!.id],
    );
    const pacienteId = await obterPacienteId(req.user!.id);
    const dados =
      pacienteId === null
        ? { checkins: [], diario: [], escalas: [], consentimento: null }
        : await comContextoPaciente(pacienteId, async (client) => {
            const linhas = await checkinsDoPeriodo(client, pacienteId, '2000-01-01', null);
            const { registros } = resumirCheckins(linhas, { humor: true, habitos: true, escalas: true, diario: true });
            const porId = new Map(linhas.map((l) => [l.id, l]));
            const diario = await client.query<{ texto: string; compartilhado: boolean; criado_em: Date }>(
              'SELECT texto, compartilhado, criado_em FROM diario_entrada WHERE paciente_id = $1 ORDER BY criado_em',
              [pacienteId],
            );
            const escalas = await client.query(
              `SELECT e.sigla, e.nome, a.status, a.solicitado_em AS "solicitadoEm", a.respondido_em AS "respondidoEm",
                      a.score_total AS "scoreTotal", a.subscores
                 FROM aplicacao_escala a JOIN escala e ON e.id = a.escala_id
                WHERE a.paciente_id = $1 ORDER BY a.solicitado_em`,
              [pacienteId],
            );
            const consentimento = await client.query(
              `SELECT compartilha_humor AS humor, compartilha_habitos AS habitos,
                      compartilha_escalas AS escalas, compartilha_diario AS diario
                 FROM consentimento WHERE paciente_id = $1`,
              [pacienteId],
            );
            return {
              checkins: registros.map((r) => {
                const l = porId.get(r.id)!;
                return { ...r, habitos: l.habitos, notas: lerSeguro(l.diario_livre), notasCompartilhadas: l.diario_compartilhado };
              }),
              diario: diario.rows.map((d) => ({ texto: lerSeguro(d.texto), compartilhado: d.compartilhado, criadoEm: d.criado_em })),
              escalas: escalas.rows,
              consentimento: consentimento.rows[0] ?? null,
            };
          });
    await registrarAuditoria(req, 'dados_exportados', { ator: paciente(req), pacienteId: pacienteId ?? undefined });
    return res.json({ geradoEm: new Date().toISOString(), perfil: perfil[0], ...dados });
  }),
);
