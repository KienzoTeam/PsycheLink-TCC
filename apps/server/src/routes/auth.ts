import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import rateLimit from 'express-rate-limit';
import { pool } from '../db';
import { registroSchema, senhaSchema } from '../schemas';
import { normalizarEmail, dominioTemMX } from '../lib/validarEmail';
import { gerarCodigo, hashCodigo, codigoConfere } from '../lib/codigo';
import { enviarCodigo } from '../lib/mailer';

export const auth = Router();

// Limite de requisições por rota
const limite = (n: number) => rateLimit({ windowMs: 15 * 60_000, limit: n });

export interface TokenPayload {
  id: number;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export const verificarToken = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
    next();
  } catch {
    return res.status(403).json({ error: 'Token inválido ou expirado.' });
  }
};

/** Gera novo OTP, persiste o HASH e envia por e-mail. */
async function emitirCodigo(email: string, assunto?: string): Promise<void> {
  const codigo = gerarCodigo();
  await pool.query(
    `INSERT INTO verificacoes_email (email, codigo_hash, expira_em, tentativas, criado_em)
     VALUES ($1, $2, now() + interval '15 minutes', 0, now())
     ON CONFLICT (email) DO UPDATE
       SET codigo_hash = $2,
           expira_em   = now() + interval '15 minutes',
           tentativas  = 0,
           criado_em   = now()`,
    [email, hashCodigo(codigo, email)],
  );
  await enviarCodigo(email, codigo, assunto);
}

type ResultadoCodigo = { ok: true } | { ok: false; status: number; msg: string };

/** Validação de OTP: existência, expiração, limite de tentativas e hash. */
async function conferirCodigo(email: string, codigo: number): Promise<ResultadoCodigo> {
  const { rows } = await pool.query(
    'SELECT codigo_hash, expira_em, tentativas FROM verificacoes_email WHERE email = $1',
    [email],
  );
  const registro = rows[0];

  if (!registro || new Date(registro.expira_em) < new Date()) {
    return { ok: false, status: 400, msg: 'Código inválido ou expirado. Solicite um novo.' };
  }
  if (registro.tentativas >= 5) {
    return { ok: false, status: 429, msg: 'Muitas tentativas. Solicite um novo código.' };
  }
  if (!codigoConfere(codigo, email, registro.codigo_hash)) {
    await pool.query(
      'UPDATE verificacoes_email SET tentativas = tentativas + 1 WHERE email = $1',
      [email],
    );
    return { ok: false, status: 400, msg: 'Código incorreto.' };
  }
  return { ok: true };
}

/** Cooldown de 1 minuto para reenvio. */
async function cooldownAtivo(email: string): Promise<boolean> {
  const { rows } = await pool.query(
    'SELECT criado_em FROM verificacoes_email WHERE email = $1',
    [email],
  );
  return Boolean(rows[0] && Date.now() - new Date(rows[0].criado_em).getTime() < 60_000);
}

// Registro de usuário
auth.post('/registro', limite(10), async (req, res) => {
  const parsed = registroSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' });
  }

  const email = normalizarEmail(parsed.data.email);
  if (!email) return res.status(400).json({ error: 'E-mail inválido.' });

  if (process.env.VALIDAR_MX !== 'false') {
    if (!(await dominioTemMX(email.split('@')[1]))) {
      return res
        .status(400)
        .json({ error: 'Este domínio de e-mail não está ativo para receber mensagens.' });
    }
  }

  try {
    const existente = await pool.query(
      'SELECT id, email_verificado FROM users WHERE email = $1',
      [email],
    );

    if (existente.rows[0]?.email_verificado) {
      return res.status(409).json({
        error:
          'Não foi possível concluir o cadastro com este e-mail. Motivos possíveis: ele já pertence a uma conta ativa. Tente fazer login ou recuperar a senha.',
      });
    }

    const { nome, password, dataNascimento } = parsed.data;
    const hashedPassword = await bcrypt.hash(password, 10);

    if (existente.rows[0]) {
      await pool.query(
        'UPDATE users SET nome = $1, password_hash = $2, data_nascimento = $3 WHERE email = $4',
        [nome, hashedPassword, dataNascimento, email],
      );
    } else {
      await pool.query(
        `INSERT INTO users (nome, email, password_hash, data_nascimento, email_verificado)
         VALUES ($1, $2, $3, $4, false)`,
        [nome, email, hashedPassword, dataNascimento],
      );
    }

    await emitirCodigo(email);

    return res.status(201).json({
      message: 'Enviamos um código de 6 dígitos para o seu e-mail.',
      precisaVerificacao: true,
    });
  } catch (err) {
    console.error('Erro ao registrar:', err);
    return res.status(500).json({ error: 'Erro interno ao registrar usuário.' });
  }
});

// Verificação do e-mail
auth.post('/verificar-email', limite(10), async (req, res) => {
  const email = normalizarEmail(req.body.email);
  const codigo = Number(req.body.codigo);

  if (!email || !Number.isInteger(codigo)) {
    return res.status(400).json({ error: 'Dados inválidos.' });
  }

  try {
    const resultado = await conferirCodigo(email, codigo);
    if (!resultado.ok) {
      return res.status(resultado.status).json({ error: resultado.msg });
    }

    await pool.query('UPDATE users SET email_verificado = true WHERE email = $1', [email]);
    await pool.query('DELETE FROM verificacoes_email WHERE email = $1', [email]);

    return res.json({ message: 'E-mail confirmado com sucesso!' });
  } catch (err) {
    console.error('Erro ao verificar código:', err);
    return res.status(500).json({ error: 'Erro interno na verificação.' });
  }
});

// Reenvio de código
auth.post('/reenviar-codigo', limite(5), async (req, res) => {
  const email = normalizarEmail(req.body.email);
  if (!email) return res.status(400).json({ error: 'E-mail inválido.' });

  try {
    const pendente = await pool.query(
      'SELECT 1 FROM users WHERE email = $1 AND NOT email_verificado',
      [email],
    );
    if (pendente.rows.length === 0) {
      return res.json({ message: 'Se houver uma conta pendente, você receberá um novo código.' });
    }

    if (await cooldownAtivo(email)) {
      return res.status(429).json({ error: 'Aguarde um minuto antes de pedir um novo código.' });
    }

    await emitirCodigo(email);
    return res.json({ message: 'Novo código enviado.' });
  } catch (err) {
    console.error('Erro ao reenviar código:', err);
    return res.status(500).json({ error: 'Erro interno ao reenviar código.' });
  }
});

// Redefinição de senha
auth.post('/esqueci-senha', limite(5), async (req, res) => {
  const email = normalizarEmail(req.body.email);
  if (!email) return res.status(400).json({ error: 'E-mail inválido.' });

  try {
    const alvo = await pool.query(
      'SELECT 1 FROM users WHERE email = $1 AND email_verificado',
      [email],
    );
    if (alvo.rows.length > 0 && !(await cooldownAtivo(email))) {
      await emitirCodigo(email, 'PsycheLink · Código de redefinição de senha');
    }
    return res.json({
      message: 'Se houver uma conta ativa com este e-mail, você receberá um código.',
    });
  } catch (err) {
    console.error('Erro ao solicitar redefinição:', err);
    return res.status(500).json({ error: 'Erro interno ao solicitar redefinição.' });
  }
});

auth.post('/verificar-codigo-senha', limite(10), async (req, res) => {
  const email = normalizarEmail(req.body.email);
  const codigo = Number(req.body.codigo);

  if (!email || !Number.isInteger(codigo)) {
    return res.status(400).json({ error: 'Dados inválidos.' });
  }

  try {
    const verificado = await pool.query(
      'SELECT 1 FROM users WHERE email = $1 AND email_verificado',
      [email],
    );
    if (verificado.rows.length === 0) {
      return res.status(400).json({ error: 'Código inválido ou expirado. Solicite um novo.' });
    }

    const resultado = await conferirCodigo(email, codigo);
    if (!resultado.ok) {
      return res.status(resultado.status).json({ error: resultado.msg });
    }

    await pool.query('DELETE FROM verificacoes_email WHERE email = $1', [email]);

    const token = jwt.sign(
      { email, tipo: 'redefinicao' },
      process.env.JWT_SECRET!,
      { expiresIn: '10m' },
    );
    return res.json({ token });
  } catch (err) {
    console.error('Erro ao verificar código de redefinição:', err);
    return res.status(500).json({ error: 'Erro interno na verificação.' });
  }
});

auth.post('/redefinir-senha', limite(5), async (req, res) => {
  const senha = senhaSchema.safeParse(req.body.password);

  if (typeof req.body.token !== 'string' || !senha.success) {
    return res.status(400).json({ error: senha.error?.issues[0]?.message ?? 'Dados inválidos.' });
  }

  let email: string;
  try {
    const payload = jwt.verify(req.body.token, process.env.JWT_SECRET!) as {
      email?: string;
      tipo?: string;
    };
    if (payload.tipo !== 'redefinicao' || !payload.email) throw new Error('tipo');
    email = payload.email;
  } catch {
    return res.status(400).json({ error: 'Token inválido ou expirado. Solicite um novo código.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(senha.data, 10);
    const atualizado = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2 AND email_verificado RETURNING id',
      [hashedPassword, email],
    );
    if (atualizado.rows.length === 0) {
      return res.status(400).json({ error: 'Conta não encontrada.' });
    }
    await pool.query('DELETE FROM verificacoes_email WHERE email = $1', [email]);
    return res.json({ message: 'Senha redefinida com sucesso!' });
  } catch (err) {
    console.error('Erro ao redefinir senha:', err);
    return res.status(500).json({ error: 'Erro interno ao redefinir senha.' });
  }
});

// Login
auth.post('/login', limite(10), async (req, res) => {
  const email = normalizarEmail(req.body.email);
  const { password } = req.body;

  if (!email || typeof password !== 'string' || !password) {
    return res.status(400).json({ error: 'Informe o e-mail e a senha.' });
  }

  try {
    const user = await pool.query(
      'SELECT id, nome, email, password_hash, email_verificado FROM users WHERE email = $1',
      [email],
    );
    if (user.rows.length === 0) {
      return res.status(400).json({ error: 'E-mail ou senha inválidos.' });
    }

    const valido = await bcrypt.compare(password, user.rows[0].password_hash);
    if (!valido) {
      return res.status(400).json({ error: 'E-mail ou senha inválidos.' });
    }

    if (!user.rows[0].email_verificado) {
      return res.status(403).json({
        codigo: 'EMAIL_NAO_VERIFICADO',
        error: 'Confirme seu e-mail para acessar.',
      });
    }

    const token = jwt.sign(
      { id: user.rows[0].id, email: user.rows[0].email },
      process.env.JWT_SECRET!,
      { expiresIn: '1d' },
    );
    return res.json({ token });
  } catch (err) {
    console.error('Erro ao logar:', err);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

// Endpoint /me ajustado sem a coluna 'telefone' da tabela psicologo
auth.get('/me', verificarToken, async (req, res) => {
  try {
    const userRes = await pool.query(
      'SELECT id, nome, email, data_nascimento, email_verificado FROM users WHERE id = $1',
      [req.user!.id],
    );
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const user = userRes.rows[0];

    // Busca dados da tabela psicologo sem requisitar a coluna 'telefone'
    const psicologoRes = await pool.query(
      'SELECT id, crp, especialidade FROM psicologo WHERE user_id = $1',
      [user.id],
    );

    return res.json({
      ...user,
      psicologo: psicologoRes.rows[0] || null,
    });
  } catch (err) {
    console.error('Erro ao buscar perfil:', err);
    return res.status(500).json({ error: 'Erro interno.' });
  }
});