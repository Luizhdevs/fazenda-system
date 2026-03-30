const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const pool = require('../../config/database');
const autenticar = require('../middleware/auth');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Token base (sem fazenda) — usado antes de selecionar fazenda
function gerarTokenBase(usuario) {
  return jwt.sign(
    { id: usuario.id, email: usuario.email, nome: usuario.nome, avatar_url: usuario.avatar_url, superadmin: !!usuario.superadmin },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
}

// Token completo (com fazenda) — usado para acessar dados
function gerarTokenFazenda(usuario, fazenda, papel) {
  return jwt.sign(
    {
      id: usuario.id,
      email: usuario.email,
      nome: usuario.nome,
      avatar_url: usuario.avatar_url,
      superadmin: !!usuario.superadmin,
      fazenda_id: fazenda.id,
      fazenda_nome: fazenda.nome,
      papel,
    },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
}

async function listarFazendasDoUsuario(usuario_id) {
  const { rows } = await pool.query(
    `SELECT f.id, f.nome, f.descricao, uf.papel, uf.criado_em
     FROM fazendas f
     JOIN usuario_fazendas uf ON uf.fazenda_id = f.id
     WHERE uf.usuario_id = $1 AND f.ativo = true
     ORDER BY uf.criado_em`,
    [usuario_id]
  );
  return rows;
}

// GET /api/auth/status
router.get('/status', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT COUNT(*) as total FROM usuarios');
    const precisaSetup = parseInt(rows[0].total) === 0;
    res.json({ precisaSetup, googleHabilitado: !!process.env.GOOGLE_CLIENT_ID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/setup — cria primeiro usuário + primeira fazenda
router.post('/setup', async (req, res) => {
  const { nome, email, senha, nome_fazenda } = req.body;

  if (!nome || !email || !senha) return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
  if (senha.length < 6) return res.status(400).json({ error: 'Senha deve ter ao menos 6 caracteres' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existentes = await client.query('SELECT COUNT(*) as total FROM usuarios');
    if (parseInt(existentes.rows[0].total) > 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Setup já foi realizado. Use /login para entrar.' });
    }

    const senha_hash = await bcrypt.hash(senha, 10);
    const { rows: userRows } = await client.query(
      'INSERT INTO usuarios (nome, email, senha_hash) VALUES ($1, $2, $3) RETURNING *',
      [nome, email.toLowerCase().trim(), senha_hash]
    );
    const novoUsuario = userRows[0];

    // Cria a fazenda
    const nomeFazenda = (nome_fazenda || nome).trim();
    const { rows: fazendaRows } = await client.query(
      'INSERT INTO fazendas (nome) VALUES ($1) RETURNING *',
      [nomeFazenda]
    );
    const fazenda = fazendaRows[0];

    // Vincula usuário como admin
    await client.query(
      'INSERT INTO usuario_fazendas (usuario_id, fazenda_id, papel) VALUES ($1, $2, $3)',
      [novoUsuario.id, fazenda.id, 'admin']
    );

    // Migra dados órfãos (fazenda_id IS NULL) para esta fazenda
    await client.query('UPDATE insumos      SET fazenda_id = $1 WHERE fazenda_id IS NULL', [fazenda.id]);
    await client.query('UPDATE compras      SET fazenda_id = $1 WHERE fazenda_id IS NULL', [fazenda.id]);
    await client.query('UPDATE produtos     SET fazenda_id = $1 WHERE fazenda_id IS NULL', [fazenda.id]);
    await client.query('UPDATE vendas       SET fazenda_id = $1 WHERE fazenda_id IS NULL', [fazenda.id]);
    await client.query('UPDATE receitas     SET fazenda_id = $1 WHERE fazenda_id IS NULL', [fazenda.id]);
    await client.query('UPDATE despesas     SET fazenda_id = $1 WHERE fazenda_id IS NULL', [fazenda.id]);
    await client.query('UPDATE clientes     SET fazenda_id = $1 WHERE fazenda_id IS NULL', [fazenda.id]);
    await client.query('UPDATE fornecedores SET fazenda_id = $1 WHERE fazenda_id IS NULL', [fazenda.id]);

    await client.query('COMMIT');

    const token = gerarTokenFazenda(novoUsuario, fazenda, 'admin');
    res.status(201).json({
      token,
      usuario: { id: novoUsuario.id, nome: novoUsuario.nome, email: novoUsuario.email, avatar_url: novoUsuario.avatar_url },
      fazenda: { id: fazenda.id, nome: fazenda.nome, papel: 'admin' },
      fazendas: [{ id: fazenda.id, nome: fazenda.nome, papel: 'admin' }],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(409).json({ error: 'Este e-mail já está cadastrado' });
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// POST /api/auth/register — cadastro de novo usuário (sem fazenda automática)
router.post('/register', async (req, res) => {
  const { nome, email, senha } = req.body;

  if (!nome || !email || !senha) return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
  if (senha.length < 6) return res.status(400).json({ error: 'Senha deve ter ao menos 6 caracteres' });

  try {
    const senha_hash = await bcrypt.hash(senha, 10);
    const { rows } = await pool.query(
      'INSERT INTO usuarios (nome, email, senha_hash) VALUES ($1, $2, $3) RETURNING *',
      [nome, email.toLowerCase().trim(), senha_hash]
    );
    const token = gerarTokenBase(rows[0]);
    res.status(201).json({
      token,
      usuario: { id: rows[0].id, nome: rows[0].nome, email: rows[0].email, avatar_url: rows[0].avatar_url },
      fazendas: [],
    });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Este e-mail já está cadastrado' });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });

  try {
    const { rows } = await pool.query(
      'SELECT * FROM usuarios WHERE email = $1 AND ativo = true',
      [email.toLowerCase().trim()]
    );
    if (rows.length === 0 || !rows[0].senha_hash) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos' });
    }
    if (!await bcrypt.compare(senha, rows[0].senha_hash)) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos' });
    }

    await pool.query('UPDATE usuarios SET ultimo_acesso = NOW() WHERE id = $1', [rows[0].id]);

    const fazendas = await listarFazendasDoUsuario(rows[0].id);
    const token = gerarTokenBase(rows[0]);

    res.json({
      token,
      usuario: { id: rows[0].id, nome: rows[0].nome, email: rows[0].email, avatar_url: rows[0].avatar_url },
      fazendas,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/google
router.post('/google', async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ error: 'Token do Google não informado' });
  if (!process.env.GOOGLE_CLIENT_ID) return res.status(503).json({ error: 'Login com Google não está configurado' });

  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
    const { sub: google_id, email, name: nome, picture: avatar_url } = ticket.getPayload();

    let usuario = null;
    const porGoogleId = await pool.query('SELECT * FROM usuarios WHERE google_id = $1', [google_id]);

    if (porGoogleId.rows.length > 0) {
      usuario = porGoogleId.rows[0];
      await pool.query('UPDATE usuarios SET avatar_url = $1, ultimo_acesso = NOW() WHERE id = $2', [avatar_url, usuario.id]);
    } else {
      const porEmail = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
      if (porEmail.rows.length > 0) {
        usuario = porEmail.rows[0];
        await pool.query('UPDATE usuarios SET google_id = $1, avatar_url = $2, ultimo_acesso = NOW() WHERE id = $3', [google_id, avatar_url, usuario.id]);
      } else {
        const { rows } = await pool.query(
          'INSERT INTO usuarios (nome, email, google_id, avatar_url) VALUES ($1, $2, $3, $4) RETURNING *',
          [nome, email, google_id, avatar_url]
        );
        usuario = rows[0];
      }
    }

    if (!usuario.ativo) return res.status(403).json({ error: 'Conta desativada' });

    const fazendas = await listarFazendasDoUsuario(usuario.id);
    const token = gerarTokenBase(usuario);
    res.json({
      token,
      usuario: { id: usuario.id, nome: usuario.nome || nome, email: usuario.email, avatar_url },
      fazendas,
    });
  } catch (err) {
    res.status(401).json({ error: 'Token do Google inválido: ' + err.message });
  }
});

// POST /api/auth/selecionar-fazenda — troca o token base por um token com fazenda_id
router.post('/selecionar-fazenda', autenticar, async (req, res) => {
  const { fazenda_id } = req.body;
  if (!fazenda_id) return res.status(400).json({ error: 'fazenda_id é obrigatório' });

  try {
    const { rows } = await pool.query(
      `SELECT f.id, f.nome, uf.papel FROM fazendas f
       JOIN usuario_fazendas uf ON uf.fazenda_id = f.id
       WHERE uf.usuario_id = $1 AND f.id = $2 AND f.ativo = true`,
      [req.usuario.id, fazenda_id]
    );
    if (rows.length === 0) return res.status(403).json({ error: 'Acesso negado a esta fazenda' });

    const fazenda = rows[0];
    const usuario = { id: req.usuario.id, email: req.usuario.email, nome: req.usuario.nome, avatar_url: req.usuario.avatar_url, superadmin: !!req.usuario.superadmin };
    const token = gerarTokenFazenda(usuario, fazenda, fazenda.papel);

    res.json({ token, fazenda: { id: fazenda.id, nome: fazenda.nome, papel: fazenda.papel } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', autenticar, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, nome, email, avatar_url, superadmin, criado_em, ultimo_acesso FROM usuarios WHERE id = $1',
      [req.usuario.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });

    const fazendas = await listarFazendasDoUsuario(req.usuario.id);
    res.json({ ...rows[0], fazendas });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/auth/me
router.put('/me', autenticar, async (req, res) => {
  const { nome, senha_atual, nova_senha } = req.body;
  try {
    const { rows } = await pool.query('SELECT * FROM usuarios WHERE id = $1', [req.usuario.id]);
    const usuario = rows[0];
    let updates = [], params = [], i = 1;

    if (nome) { updates.push(`nome = $${i++}`); params.push(nome); }
    if (nova_senha) {
      if (nova_senha.length < 6) return res.status(400).json({ error: 'Nova senha deve ter ao menos 6 caracteres' });
      if (usuario.senha_hash) {
        if (!senha_atual) return res.status(400).json({ error: 'Informe a senha atual' });
        if (!await bcrypt.compare(senha_atual, usuario.senha_hash)) return res.status(401).json({ error: 'Senha atual incorreta' });
      }
      updates.push(`senha_hash = $${i++}`);
      params.push(await bcrypt.hash(nova_senha, 10));
    }
    if (updates.length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar' });

    params.push(req.usuario.id);
    const result = await pool.query(
      `UPDATE usuarios SET ${updates.join(', ')} WHERE id = $${i} RETURNING id, nome, email, avatar_url`,
      params
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
