import { Router } from 'express';
import { DatabaseError } from 'pg';
import { pool } from '../../db';
import { registrarAuditoria } from '../../lib/auditoria';
import { gerarCodigoVinculo, hmacCodigoVinculo } from '../../lib/codigo';
import { idDe, limite, rota } from '../../lib/rota';

export const vinculo = Router();

const MAX_CODIGOS_ATIVOS = 10;
const MAX_COLISOES = 5;
const CODIGO_NAO_ENCONTRADO = 'Código não encontrado.';

// O código só aparece na resposta de criação; no banco fica o HMAC. Colisão no índice único
// dos códigos abertos (mesmo código já ativo para outro psicólogo) sorteia outro.
vinculo.post(
  '/codigos',
  limite(30),
  rota(async (req, res) => {
    for (let tentativa = 0; tentativa < MAX_COLISOES; tentativa++) {
      const codigo = gerarCodigoVinculo();
      try {
        const { rows } = await pool.query<{ id: number; expira_em: Date }>(
          `INSERT INTO codigo_vinculo (psicologo_id, codigo_hmac, expira_em)
           SELECT $1::int, $2::text, now() + interval '24 hours'
            WHERE (SELECT count(*) FROM codigo_vinculo
                    WHERE psicologo_id = $1::int AND usado_em IS NULL AND revogado_em IS NULL
                      AND expira_em > now()) < $3::int
           RETURNING id, expira_em`,
          [res.locals.psicologoId, hmacCodigoVinculo(codigo), MAX_CODIGOS_ATIVOS],
        );
        if (!rows[0]) {
          return res.status(409).json({
            error: `Limite de ${MAX_CODIGOS_ATIVOS} códigos ativos. Revogue um para gerar outro.`,
          });
        }

        await registrarAuditoria(req, 'codigo_vinculo_gerado', {
          alvoTipo: 'codigo_vinculo',
          alvoId: rows[0].id,
        });
        return res.status(201).json({ id: rows[0].id, codigo, expiraEm: rows[0].expira_em });
      } catch (erro) {
        if (!(erro instanceof DatabaseError && erro.code === '23505')) throw erro;
      }
    }
    throw new Error('Colisões seguidas ao gerar o código de vínculo.');
  }),
);

// Sem o código: o psicólogo só vê estado e datas.
vinculo.get(
  '/codigos',
  limite(60),
  rota(async (_req, res) => {
    const { rows } = await pool.query(
      `SELECT id,
              CASE WHEN usado_em IS NOT NULL THEN 'usado'
                   WHEN revogado_em IS NOT NULL THEN 'revogado'
                   WHEN expira_em <= now() THEN 'expirado'
                   ELSE 'ativo' END AS status,
              criado_em AS "criadoEm",
              expira_em AS "expiraEm",
              usado_em AS "usadoEm",
              revogado_em AS "revogadoEm"
         FROM codigo_vinculo
        WHERE psicologo_id = $1
        ORDER BY criado_em DESC, id DESC
        LIMIT 50`,
      [res.locals.psicologoId],
    );
    return res.json({ codigos: rows });
  }),
);

vinculo.delete(
  '/codigos/:id',
  limite(30),
  rota<{ id: string }>(async (req, res) => {
    const id = idDe(req.params.id);
    if (id === null) return res.status(404).json({ error: CODIGO_NAO_ENCONTRADO });

    const { rowCount } = await pool.query(
      `UPDATE codigo_vinculo SET revogado_em = now()
        WHERE id = $1 AND psicologo_id = $2 AND usado_em IS NULL AND revogado_em IS NULL`,
      [id, res.locals.psicologoId],
    );
    if (!rowCount) return res.status(404).json({ error: CODIGO_NAO_ENCONTRADO });

    await registrarAuditoria(req, 'codigo_vinculo_revogado', {
      alvoTipo: 'codigo_vinculo',
      alvoId: id,
    });
    return res.json({ ok: true });
  }),
);

// Vínculos ativos e encerrados deste psicólogo, do mais recente ao mais antigo.
vinculo.get(
  '/historico',
  limite(60),
  rota(async (_req, res) => {
    const { rows } = await pool.query(
      `SELECT v.paciente_id AS "pacienteId",
              u.nome,
              v.status,
              v.criado_em AT TIME ZONE 'UTC' AS "vinculadoEm",
              v.encerrado_em AS "encerradoEm",
              CASE WHEN v.encerrado_por = ps.user_id THEN 'psicologo'
                   WHEN v.encerrado_por IS NOT NULL THEN 'paciente' END AS "encerradoPor"
         FROM vinculo v
         JOIN psicologo ps ON ps.id = v.psicologo_id
         JOIN paciente pa ON pa.id = v.paciente_id
         JOIN users u ON u.id = pa.user_id
        WHERE v.psicologo_id = $1
        ORDER BY v.criado_em DESC, v.id DESC`,
      [res.locals.psicologoId],
    );
    return res.json({ vinculos: rows });
  }),
);
