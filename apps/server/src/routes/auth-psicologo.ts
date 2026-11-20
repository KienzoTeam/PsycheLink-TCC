import { Router } from 'express';
import bcrypt from 'bcrypt';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { pool } from '../db';
import { desafioSchema, doisFatoresSchema, psicologoRegistroSchema } from '../schemas';
import { HASH_REFERENCIA } from '../lib/hashReferencia';
import { normalizarEmail } from '../lib/validarEmail';
import { gerarCodigo, hashCodigo } from '../lib/codigo';
import { enviarCodigo, resumoErroSmtp } from '../lib/mailer';
import { registrarAuditoria } from '../lib/auditoria';
import { emTransacao } from '../lib/contextoseguro';
import { confiarNoDispositivo, dispositivoConfiavel } from '../lib/dispositivoConfiavel';
import { conferirDesafio, criarDesafio, MSG_CODIGO_INVALIDO, reenviarDesafio, usarDesafio } from '../lib/desafio2fa';
import {
  abrirSessao,
  COOKIE_DISPOSITIVO,
  COOKIE_REFRESH,
  emitirCookieDispositivo,
  emitirCookies,
  exigirSessaoWeb,
  hashesIguais,
  hashSegredo,
  lerCookie,
  limparCookies,
  novoSegredo,
  SESSAO_VIVA,
} from '../lib/sessaoWeb';

/**
 * Rotas de autenticação usadas exclusivamente pela plataforma web do psicólogo.
 * O mecanismo é o mesmo do aplicativo (tabela `users`, bcrypt, código por e-mail), mas aqui
 * o perfil é conferido no backend pela tabela `psicologo` e o acesso exige 2FA por e-mail.
 * A sessão vive em cookies httpOnly (ver lib/sessaoWeb). Nada enviado pelo frontend define o papel.
 */
export const authPsicologo = Router();

const limite = (n: number) => rateLimit({ windowMs: 15 * 60_000, limit: n });

const MSG_NAO_AUTORIZADO = 'Acesso não autorizado.';
const MSG_CADASTRO_INDISPONIVEL =
  'Não foi possível concluir o cadastro com estes dados. Tente fazer login ou recuperar a senha.';
const MSG_FALHA_ENVIO = 'Não foi possível enviar o código. Tente novamente.';


// Login do psicólogo, etapa 1: confere as credenciais e envia o código. Não emite sessão.
authPsicologo.post('/psicologo/login', limite(10), async (req, res) => {
  const email = normalizarEmail(req.body?.email);
  const password = req.body?.password;

  if (!email || typeof password !== 'string' || !password) {
    return res.status(400).json({ error: 'Informe o e-mail e a senha.' });
  }

  const { rows } = await pool.query<{
    id: number;
    password_hash: string;
    email_verificado: boolean;
    psicologo: boolean;
  }>(
    `SELECT u.id, u.password_hash, u.email_verificado,
            EXISTS (SELECT 1 FROM psicologo p WHERE p.user_id = u.id) AS psicologo
       FROM users u
      WHERE u.email = $1`,
    [email],
  );

  const conta = rows[0];
  const senhaConfere = await bcrypt.compare(password, conta?.password_hash ?? HASH_REFERENCIA);
  const ator = conta
    ? { id: conta.id, papel: conta.psicologo ? ('psicologo' as const) : ('paciente' as const) }
    : null;
  const falhar = (motivo: string) =>
    registrarAuditoria(req, 'login_falha', { ator, metadados: { motivo } });

  if (!conta || !senhaConfere) {
    await falhar('credenciais');
    return res.status(400).json({ error: 'E-mail ou senha inválidos.' });
  }

  // Credenciais válidas, mas sem registro em `psicologo` → nega com mensagem genérica.
  // Vale também para pacientes, que nunca têm linha em `psicologo`.
  if (!conta.psicologo) {
    await falhar('perfil');
    return res.status(403).json({ error: MSG_NAO_AUTORIZADO });
  }

  if (!conta.email_verificado) {
    await falhar('email_nao_verificado');
    return res.status(403).json({
      codigo: 'EMAIL_NAO_VERIFICADO',
      error: 'Confirme seu e-mail para acessar.',
    });
  }

  // Navegador confiável (pl_dc): a senha já conferiu, então abre a sessão sem código. A conferência
  // do token e a sessão ficam na mesma transação, com a linha do usuário travada como no /2fa: uma
  // troca de senha simultânea revoga o token antes ou alcança a sessão aberta aqui.
  const sidConfiavel = await emTransacao(async (client) => {
    await client.query('SELECT 1 FROM users WHERE id = $1 FOR SHARE', [conta.id]);
    const confiavel = await dispositivoConfiavel(conta.id, lerCookie(req, COOKIE_DISPOSITIVO), client);
    return confiavel ? abrirSessao(req, res, conta.id, client) : null;
  });
  if (sidConfiavel) {
    await registrarAuditoria(req, 'login_ok', { ator, metadados: { dispositivoConfiavel: true } });
    await registrarAuditoria(req, '2fa_ok', {
      ator,
      alvoTipo: 'sessao',
      alvoId: sidConfiavel,
      metadados: { dispositivoConfiavel: true },
    });
    return res.json({ ok: true });
  }

  let desafio;
  try {
    desafio = await criarDesafio(conta.id, email, 'web');
  } catch (erroSmtp) {
    console.error('[SMTP Error] Falha ao entregar o código de acesso:', resumoErroSmtp(erroSmtp));
    return res.status(502).json({ error: MSG_FALHA_ENVIO });
  }

  await registrarAuditoria(req, 'login_ok', { ator });
  return res.json(desafio);
});

// Login do psicólogo, etapa 2: confere o código e abre a sessão (cookies).
authPsicologo.post('/psicologo/2fa', limite(20), async (req, res) => {
  const parsed = doisFatoresSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos.' });
  const { desafioId, codigo, confiar } = parsed.data;

  const conferido = await conferirDesafio(req, desafioId, codigo, 'web');
  if ('erro' in conferido) return res.status(400).json({ error: conferido.erro });
  const ator = { id: conferido.userId, papel: 'psicologo' as const };

  const sid = await emTransacao(async (client) => {
    if (!(await usarDesafio(client, desafioId, conferido.userId))) return null;
    if (confiar) emitirCookieDispositivo(res, await confiarNoDispositivo(req, conferido.userId, client));
    return abrirSessao(req, res, conferido.userId, client);
  });
  if (!sid) return res.status(400).json({ error: MSG_CODIGO_INVALIDO });
  await registrarAuditoria(req, '2fa_ok', { ator, alvoTipo: 'sessao', alvoId: sid });
  return res.json({ ok: true });
});

authPsicologo.post('/psicologo/2fa/reenviar', limite(5), async (req, res) => {
  const parsed = desafioSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos.' });
  const { desafioId } = parsed.data;

  try {
    const { status, corpo } = await reenviarDesafio(desafioId, 'web');
    return res.status(status).json(corpo);
  } catch (erroSmtp) {
    console.error('[SMTP Error] Falha ao reenviar o código de acesso:', resumoErroSmtp(erroSmtp));
    return res.status(502).json({ error: MSG_FALHA_ENVIO });
  }
});

// Renova a sessão: o refresh é de uso único e cada uso emite um novo (rotação).
authPsicologo.post('/psicologo/refresh', limite(30), async (req, res) => {
  const negar = () => {
    limparCookies(res);
    return res.status(401).json({ error: 'Sessão ausente ou expirada.' });
  };
  const [sid, segredo] = (lerCookie(req, COOKIE_REFRESH) ?? '').split('.');
  if (!segredo || !z.uuid().safeParse(sid).success) return negar();

  const { rows } = await pool.query<{
    user_id: number;
    refresh_hash: string;
    refresh_anterior_hash: string | null;
    rotacao_recente: boolean;
    expira_absoluto_em: Date;
  }>(
    `SELECT user_id, refresh_hash, refresh_anterior_hash, expira_absoluto_em,
            COALESCE(rotacionado_em > now() - interval '10 seconds', false) AS rotacao_recente
       FROM sessao
      WHERE id = $1 AND ${SESSAO_VIVA}`,
    [sid],
  );
  const sessao = rows[0];
  if (!sessao) return negar();

  // Outra aba/requisição já rotacionou: o cliente só repete a requisição com os cookies novos.
  const concorrente = () =>
    res.status(409).json({
      codigo: 'REFRESH_CONCORRENTE',
      error: 'Sessão renovada por outra requisição. Tente novamente.',
    });

  const apresentado = hashSegredo(segredo);
  if (hashesIguais(apresentado, sessao.refresh_hash)) {
    const novo = novoSegredo();
    // O WHERE no hash lido garante que só uma de duas rotações simultâneas vence.
    const rotacionada = await pool.query(
      `UPDATE sessao
          SET refresh_anterior_hash = refresh_hash, refresh_hash = $2,
              rotacionado_em = now(), ultimo_uso_em = now()
        WHERE id = $1 AND refresh_hash = $3 AND ${SESSAO_VIVA}`,
      [sid, hashSegredo(novo), sessao.refresh_hash],
    );
    if (!rotacionada.rowCount) return concorrente();

    emitirCookies(res, sessao.user_id, sid, novo, sessao.expira_absoluto_em);
    return res.json({ ok: true });
  }

  if (sessao.rotacao_recente && hashesIguais(apresentado, sessao.refresh_anterior_hash)) {
    return concorrente();
  }

  // Refresh já rotacionado (ou forjado) fora da janela: possível roubo, derruba a sessão.
  await pool.query('UPDATE sessao SET revogada_em = now() WHERE id = $1', [sid]);
  await registrarAuditoria(req, 'sessao_reuso_detectado', {
    ator: { id: sessao.user_id, papel: 'psicologo' },
    alvoTipo: 'sessao',
    alvoId: sid,
  });
  return negar();
});

// O cookie pl_rt só viaja para /refresh, então o logout identifica a sessão pelo pl_at.
// Sem ele o 401 faz o cliente renovar a sessão e repetir.
authPsicologo.post('/psicologo/logout', limite(20), exigirSessaoWeb, async (req, res) => {
  const sid = res.locals.sessaoId as string;
  await pool.query('UPDATE sessao SET revogada_em = now() WHERE id = $1', [sid]);
  await registrarAuditoria(req, 'logout', { alvoTipo: 'sessao', alvoId: sid });
  limparCookies(res);
  return res.json({ ok: true });
});

// Cadastro do psicólogo: usuário + perfil + código de verificação, tudo ou nada.
authPsicologo.post('/registro-psicologo', limite(10), async (req, res) => {
  const parsed = psicologoRegistroSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' });
  }

  const email = normalizarEmail(parsed.data.email);
  if (!email) return res.status(400).json({ error: 'Formato de e-mail inválido.' });

  const { nome, password, dataNascimento, crp, especialidade, aceites } = parsed.data;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Mesmo lock do /auth/registro: cadastros do mesmo e-mail, por qualquer rota, entram um por vez.
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [email]);

    const existente = await client.query<{
      id: number;
      email_verificado: boolean;
      password_hash: string;
      codigo_ativo: boolean | null;
    }>(
      `SELECT u.id, u.email_verificado, u.password_hash, v.expira_em > now() AS codigo_ativo
         FROM users u LEFT JOIN verificacoes_email v ON v.email = u.email
        WHERE u.email = $1
          FOR UPDATE OF u`,
      [email],
    );
    const conta = existente.rows[0];

    // Cadastro pendente com código válido só é refeito por quem sabe a senha dele (ver /registro).
    if (
      conta?.email_verificado ||
      (conta?.codigo_ativo && !(await bcrypt.compare(password, conta.password_hash)))
    ) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: MSG_CADASTRO_INDISPONIVEL });
    }

    // CRP de outro psicólogo verificado não pode ser reutilizado. Cadastro pendente não conta:
    // senão qualquer um "ocupa" o CRP alheio sem nunca confirmar o e-mail.
    const crpEmUso = await client.query(
      `SELECT 1 FROM psicologo p JOIN users u ON u.id = p.user_id
        WHERE p.crp = $1 AND p.user_id <> $2 AND u.email_verificado`,
      [crp, conta?.id ?? 0],
    );
    if (crpEmUso.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: MSG_CADASTRO_INDISPONIVEL });
    }

    const hashSenha = await bcrypt.hash(password, 10);

    let userId: number;
    if (conta) {
      // Conta pendente (não verificada) pode ser refeita, como no cadastro comum.
      await client.query(
        'UPDATE users SET nome = $1, password_hash = $2, data_nascimento = $3 WHERE id = $4',
        [nome, hashSenha, dataNascimento, conta.id],
      );
      userId = conta.id;
    } else {
      const novo = await client.query<{ id: number }>(
        `INSERT INTO users (nome, email, password_hash, data_nascimento, email_verificado)
         VALUES ($1, $2, $3, $4, false)
         RETURNING id`,
        [nome, email, hashSenha, dataNascimento],
      );
      userId = novo.rows[0].id;
    }

    await client.query(
      `INSERT INTO psicologo (user_id, crp, especialidade)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE
         SET crp = EXCLUDED.crp, especialidade = EXCLUDED.especialidade`,
      [userId, crp, especialidade],
    );

    // Envio antes do COMMIT: se o SMTP falhar, nada é gravado (sem conta parcial).
    const codigo = gerarCodigo();
    try {
      await enviarCodigo(email, codigo);
    } catch (erroSmtp) {
      console.error('[SMTP Error] Falha ao entregar o código de verificação:', resumoErroSmtp(erroSmtp));
      await client.query('ROLLBACK');
      return res.status(400).json({
        error:
          'Não foi possível entregar o código para este e-mail. Verifique se o endereço foi digitado corretamente.',
      });
    }

    await client.query(
      `INSERT INTO verificacoes_email (email, codigo_hash, expira_em, tentativas, criado_em)
       VALUES ($1, $2, now() + interval '15 minutes', 0, now())
       ON CONFLICT (email) DO UPDATE
         SET codigo_hash = $2,
             expira_em   = now() + interval '15 minutes',
             tentativas  = 0,
             criado_em   = now()`,
      [email, hashCodigo(codigo, email)],
    );

    await client.query('COMMIT');

    if (aceites) {
      await registrarAuditoria(req, 'documentos_aceitos', {
        ator: { id: userId, papel: 'psicologo' },
        metadados: { versao: aceites.versao },
      });
    }

    return res.status(201).json({
      message: 'Enviamos um código de 6 dígitos para o seu e-mail.',
      precisaVerificacao: true,
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error('Erro ao registrar psicólogo:', err);
    return res.status(500).json({ error: 'Erro interno ao registrar usuário.' });
  } finally {
    client.release();
  }
});
