import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import rateLimit from 'express-rate-limit';
import { pool } from '../db';
import { registroSchema, senhaSchema } from '../schemas';
import { normalizarEmail } from '../lib/validarEmail';
import { gerarCodigo, hashCodigo, codigoConfere } from '../lib/codigo';
import { enviarCodigo } from '../lib/mailer';

export const auth = Router();

const limite = (n: number) => rateLimit({ windowMs: 15 * 60_000, limit: n });

export interface TokenPayload {
  id: number;
  email: string;
  iat?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

// Middleware de Verificação de Token JWT
export const verificarToken = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });

  let payload: TokenPayload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
  } catch {
    return res.status(403).json({ error: 'Token inválido ou expirado.' });
  }

  if (!payload || !payload.id) {
    return res.status(403).json({ error: 'Token de acesso inválido.' });
  }

  try {
    const resultado = await pool.query(
      'SELECT sessao_invalidada_em FROM users WHERE id = $1',
      [payload.id],
    );
    const invalidadaEm = resultado.rows[0]?.sessao_invalidada_em as Date | null | undefined;

    if (invalidadaEm && payload.iat !== undefined) {
      const dataCorteMs = new Date(invalidadaEm).getTime();
      const dataTokenMs = payload.iat * 1000;

      if (dataTokenMs + 10000 < dataCorteMs) {
        return res.status(403).json({ error: 'Sessão encerrada. Faça login novamente.' });
      }
    }

    req.user = payload;
    next();
  } catch (err) {
    console.error('Erro ao verificar sessão:', err);
    return res.status(500).json({ error: 'Erro interno ao verificar sessão.' });
  }
};

/**
 * Tenta enviar o código via SMTP de verdade.
 * Salva na tabela verificacoes_email apenas se o envio SMTP for aceito.
 */
async function emitirCodigo(email: string, assunto?: string): Promise<boolean> {
  const codigo = gerarCodigo();

  try {
    // 1. Disparo real via SMTP
    await enviarCodigo(email, codigo, assunto);
  } catch (erroSmtp) {
    console.error(`[SMTP Error] Falha ao entregar e-mail para ${email}:`, erroSmtp);
    return false;
  }

  // 2. Com o e-mail já existente na tabela `users`, a Foreign Key é respeitada
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

  return true;
}

type ResultadoCodigo = { ok: true } | { ok: false; status: number; msg: string };

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

async function cooldownAtivo(email: string): Promise<boolean> {
  const { rows } = await pool.query(
    'SELECT criado_em FROM verificacoes_email WHERE email = $1',
    [email],
  );
  return Boolean(rows[0] && Date.now() - new Date(rows[0].criado_em).getTime() < 60_000);
}

// Rota de Cadastro de Usuário
auth.post('/registro', limite(10), async (req, res) => {
  const parsed = registroSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' });
  }

  const email = normalizarEmail(parsed.data.email);
  if (!email) return res.status(400).json({ error: 'Formato de e-mail inválido.' });

  try {
    // Conta de psicólogo nunca passa pelo cadastro de paciente (evita perfil misto).
    const ehPsicologo = await pool.query(
      'SELECT 1 FROM psicologo p JOIN users u ON u.id = p.user_id WHERE u.email = $1',
      [email],
    );
    if (ehPsicologo.rows.length > 0) {
      return res.status(409).json({
        error:
          'Não foi possível concluir o cadastro com este e-mail. Motivos possíveis: ele já pertence a uma conta ativa. Tente fazer login ou recuperar a senha.',
      });
    }

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

    // 1. PRIMEIRO cria ou atualiza o usuário pendente na tabela `users`
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

    // 2. AGORA QUE O REGISTRO EXISTE EM `users`, envia o código via SMTP e salva em `verificacoes_email`
    const enviadoPeloSmtp = await emitirCodigo(email);

    if (!enviadoPeloSmtp) {
      return res.status(400).json({
        error:
          'Não foi possível entregar o código para este e-mail. Verifique se o endereço foi digitado corretamente.',
      });
    }

    return res.status(201).json({
      message: 'Enviamos um código de 6 dígitos para o seu e-mail.',
      precisaVerificacao: true,
    });
  } catch (err) {
    console.error('Erro ao registrar:', err);
    return res.status(500).json({ error: 'Erro interno ao registrar usuário.' });
  }
});

// Confirmar Código do E-mail
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

// Reenviar Código
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

    const enviado = await emitirCodigo(email);
    if (!enviado) {
      return res.status(400).json({ error: 'Não foi possível entregar o código para este e-mail.' });
    }

    return res.json({ message: 'Novo código enviado.' });
  } catch (err) {
    console.error('Erro ao reenviar código:', err);
    return res.status(500).json({ error: 'Erro interno ao reenviar código.' });
  }
});

// Esqueci a Senha
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

// Validar Código da Redefinição de Senha
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

// Redefinir Senha
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
      `UPDATE users
          SET password_hash = $1, sessao_invalidada_em = now()
        WHERE email = $2 AND email_verificado
        RETURNING id`,
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
      'SELECT id, email, password_hash, email_verificado FROM users WHERE email = $1',
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

// Perfil do Usuário
auth.get('/me', verificarToken, async (req, res) => {
  try {
    const user = await pool.query(
      'SELECT id, nome, email, data_nascimento FROM users WHERE id = $1',
      [req.user!.id],
    );
    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
    return res.json(user.rows[0]);
  } catch (err) {
    console.error('Erro ao buscar perfil:', err);
    return res.status(500).json({ error: 'Erro interno.' });
  }
});

// Logout
auth.post('/logout', verificarToken, async (req, res) => {
  try {
    await pool.query('UPDATE users SET sessao_invalidada_em = now() WHERE id = $1', [
      req.user!.id,
    ]);
    return res.json({ message: 'Sessão encerrada.' });
  } catch (err) {
    console.error('Erro ao encerrar sessão:', err);
    return res.status(500).json({ error: 'Erro interno ao encerrar sessão.' });
  }
});