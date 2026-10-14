import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import rateLimit from 'express-rate-limit';
import { pool } from '../db';
import { psicologoRegistroSchema } from '../schemas';
import { normalizarEmail } from '../lib/validarEmail';
import { gerarCodigo, hashCodigo } from '../lib/codigo';
import { enviarCodigo } from '../lib/mailer';

/**
 * Rotas de autenticação usadas exclusivamente pela plataforma web do psicólogo.
 * O mecanismo é o mesmo do aplicativo (tabela `users`, bcrypt, JWT, código por e-mail),
 * mas aqui o perfil é conferido no backend pela tabela `psicologo`. Nada enviado pelo
 * frontend define o papel do usuário.
 */
export const authPsicologo = Router();

const limite = (n: number) => rateLimit({ windowMs: 15 * 60_000, limit: n });

const MSG_NAO_AUTORIZADO = 'Acesso não autorizado.';
const MSG_CADASTRO_INDISPONIVEL =
  'Não foi possível concluir o cadastro com estes dados. Tente fazer login ou recuperar a senha.';

// Hash de referência usado quando o e-mail não existe, para o tempo de resposta
// não revelar quais e-mails estão cadastrados.
const HASH_REFERENCIA = bcrypt.hashSync('referencia-sem-conta', 10);

// Login do psicólogo
authPsicologo.post('/login-psicologo', limite(10), async (req, res) => {
  const email = normalizarEmail(req.body?.email);
  const password = req.body?.password;

  if (!email || typeof password !== 'string' || !password) {
    return res.status(400).json({ error: 'Informe o e-mail e a senha.' });
  }

  try {
    const { rows } = await pool.query<{
      id: number;
      email: string;
      password_hash: string;
      email_verificado: boolean;
    }>('SELECT id, email, password_hash, email_verificado FROM users WHERE email = $1', [email]);

    const conta = rows[0];
    const senhaConfere = await bcrypt.compare(password, conta?.password_hash ?? HASH_REFERENCIA);

    if (!conta || !senhaConfere) {
      return res.status(400).json({ error: 'E-mail ou senha inválidos.' });
    }

    // Credenciais válidas, mas sem registro em `psicologo` → nega com mensagem genérica.
    // Vale também para pacientes, que nunca têm linha em `psicologo`.
    const perfil = await pool.query('SELECT 1 FROM psicologo WHERE user_id = $1', [conta.id]);
    if (perfil.rows.length === 0) {
      return res.status(403).json({ error: MSG_NAO_AUTORIZADO });
    }

    if (!conta.email_verificado) {
      return res.status(403).json({
        codigo: 'EMAIL_NAO_VERIFICADO',
        error: 'Confirme seu e-mail para acessar.',
      });
    }

    const token = jwt.sign({ id: conta.id, email: conta.email }, process.env.JWT_SECRET!, {
      expiresIn: '1d',
    });
    return res.json({ token });
  } catch (err) {
    console.error('Erro ao logar psicólogo:', err);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

// Cadastro do psicólogo: usuário + perfil + código de verificação, tudo ou nada.
authPsicologo.post('/registro-psicologo', limite(10), async (req, res) => {
  const parsed = psicologoRegistroSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' });
  }

  const email = normalizarEmail(parsed.data.email);
  if (!email) return res.status(400).json({ error: 'Formato de e-mail inválido.' });

  const { nome, password, dataNascimento, crp, especialidade } = parsed.data;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existente = await client.query<{ id: number; email_verificado: boolean }>(
      'SELECT id, email_verificado FROM users WHERE email = $1 FOR UPDATE',
      [email],
    );
    const conta = existente.rows[0];

    if (conta?.email_verificado) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: MSG_CADASTRO_INDISPONIVEL });
    }

    // CRP já associado a outro psicólogo não pode ser reutilizado.
    const crpEmUso = await client.query(
      'SELECT 1 FROM psicologo WHERE crp = $1 AND user_id <> $2',
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
      console.error(`[SMTP Error] Falha ao entregar e-mail para ${email}:`, erroSmtp);
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
