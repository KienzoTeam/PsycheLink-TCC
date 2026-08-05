const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// Conexão com o Neon DB usando a variável de ambiente (.env)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Middleware opcional para verificar tokens em rotas protegidas
const verificarToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido ou expirado.' });
    }
    req.user = user;
    next();
  });
};

// 1. Rota de Registro
app.post('/registro', async (req, res) => {
  const { nome, email, password, dataNascimento } = req.body;
  
  if (!nome || !email || !password || !dataNascimento) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  }

  try {
    console.log("Recebendo dados de registro para:", email);
    
    // Verifica se o e-mail já existe na base de dados
    const usuarioExistente = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (usuarioExistente.rows.length > 0) {
      return res.status(400).json({ error: 'Este e-mail já está registado.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Como a coluna data_nascimento é VARCHAR(50), salvamos a string diretamente (ex: "25/12/2000")
    await pool.query(
      'INSERT INTO users (nome, email, password_hash, data_nascimento) VALUES ($1, $2, $3, $4)',
      [nome, email, hashedPassword, dataNascimento]
    );

    console.log("Usuário cadastrado com sucesso!");
    return res.status(201).json({ message: 'Usuário criado com sucesso!' });
  } catch (err) {
    console.error('Erro detalhado no servidor ao registrar:', err);
    return res.status(500).json({ error: 'Erro interno ao registrar usuário.' });
  }
});

// 2. Rota de Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Informe o e-mail e a senha.' });
  }

  try {
    const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (user.rows.length === 0) {
      return res.status(400).json({ error: 'E-mail ou senha inválidos.' });
    }

    const validPassword = await bcrypt.compare(password, user.rows[0].password_hash);
    if (!validPassword) {
      return res.status(400).json({ error: 'E-mail ou senha inválidos.' });
    }

    const token = jwt.sign(
      { id: user.rows[0].id, email: user.rows[0].email }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1d' }
    );

    return res.json({ token });
  } catch (err) {
    console.error('Erro detalhado no servidor ao logar:', err);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

// 3. Rota de Perfil (Protegida por Token)
app.get('/me', verificarToken, async (req, res) => {
  try {
    const user = await pool.query('SELECT id, nome, email, data_nascimento FROM users WHERE id = $1', [req.user.id]);
    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
    return res.json(user.rows[0]);
  } catch (err) {
    console.error('Erro ao buscar perfil:', err);
    return res.status(500).json({ error: 'Erro interno.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});