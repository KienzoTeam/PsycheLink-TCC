import { Router } from 'express';
import { registrarAuditoria } from '../../lib/auditoria';
import { lerSeguro } from '../../lib/checkins';
import { comContextoPsicologo } from '../../lib/contextoseguro';
import { limite, rota } from '../../lib/rota';

// Anotações de pacientes sem vínculo ativo (encerrado ou conta excluída): só leitura. Ficam com o
// psicólogo pelos 5 anos de guarda do CFP, mesmo sem acesso aos dados do paciente.
export const arquivadas = Router();

type Linha = {
  id: number;
  paciente_id: number | null;
  nome: string | null;
  encerrado_em: Date | null;
  conteudo: string;
  criado_em: string;
};

arquivadas.get(
  '/',
  limite(30),
  rota(async (req, res) => {
    const psicologoId: number = res.locals.psicologoId;
    const { rows } = await comContextoPsicologo(psicologoId, (client) =>
      client.query<Linha>(
        `SELECT a.id, a.paciente_id, u.nome,
                (SELECT max(v.encerrado_em) FROM vinculo v
                  WHERE v.paciente_id = a.paciente_id AND v.psicologo_id = a.psicologo_id) AS encerrado_em,
                a.conteudo, to_char(a.criado_em, 'YYYY-MM-DD HH24:MI') AS criado_em
           FROM anotacao_clinica a
           LEFT JOIN paciente p ON p.id = a.paciente_id
           LEFT JOIN users u ON u.id = p.user_id
          WHERE a.psicologo_id = $1
            AND (a.expira_em IS NULL OR a.expira_em > now())
            AND NOT EXISTS (SELECT 1 FROM vinculo v
                             WHERE v.paciente_id = a.paciente_id AND v.psicologo_id = a.psicologo_id
                               AND v.status = 'ativo')
          ORDER BY a.paciente_id NULLS LAST, a.criado_em DESC`,
        [psicologoId],
      ),
    );

    const grupos = new Map<string, { pacienteId: number | null; nome: string | null; encerradoEm: Date | null; anotacoes: object[] }>();
    for (const l of rows) {
      const conteudo = lerSeguro(l.conteudo);
      if (conteudo === null) continue;
      // Sem paciente (conta excluída), cada anotação fica sozinha: não dá para saber se eram da mesma pessoa.
      const chave = l.paciente_id === null ? `excluida-${l.id}` : String(l.paciente_id);
      const grupo = grupos.get(chave) ?? { pacienteId: l.paciente_id, nome: l.nome, encerradoEm: l.encerrado_em, anotacoes: [] };
      grupo.anotacoes.push({ id: l.id, criadoEm: l.criado_em, conteudo });
      grupos.set(chave, grupo);
    }

    for (const g of grupos.values()) {
      await registrarAuditoria(req, 'anotacoes_lidas', {
        pacienteId: g.pacienteId ?? undefined,
        metadados: { arquivadas: true, quantidade: g.anotacoes.length },
      });
    }
    return res.json({ pacientes: [...grupos.values()] });
  }),
);
