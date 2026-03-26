const express = require('express');
const router = express.Router();
const pool = require('../../config/database');
const autenticar = require('../middleware/auth');

// Todas as rotas aqui requerem JWT básico (sem exigir fazenda_id no token)
router.use(autenticar);

// GET /api/fazendas — lista fazendas do usuário
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT f.id, f.nome, f.descricao, uf.papel, uf.criado_em,
              (SELECT COUNT(*) FROM usuario_fazendas WHERE fazenda_id = f.id) as total_usuarios
       FROM fazendas f
       JOIN usuario_fazendas uf ON uf.fazenda_id = f.id
       WHERE uf.usuario_id = $1 AND f.ativo = true
       ORDER BY uf.criado_em`,
      [req.usuario.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/fazendas — cria nova fazenda e torna o usuário admin
router.post('/', async (req, res) => {
  const { nome, descricao } = req.body;
  if (!nome) return res.status(400).json({ error: 'Nome da fazenda é obrigatório' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'INSERT INTO fazendas (nome, descricao) VALUES ($1, $2) RETURNING *',
      [nome.trim(), descricao || null]
    );
    await client.query(
      'INSERT INTO usuario_fazendas (usuario_id, fazenda_id, papel) VALUES ($1, $2, $3)',
      [req.usuario.id, rows[0].id, 'admin']
    );
    await client.query('COMMIT');
    res.status(201).json({ ...rows[0], papel: 'admin' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PUT /api/fazendas/:id — renomeia fazenda (somente admin)
router.put('/:id', async (req, res) => {
  const { nome, descricao } = req.body;
  try {
    const acesso = await pool.query(
      'SELECT papel FROM usuario_fazendas WHERE usuario_id = $1 AND fazenda_id = $2',
      [req.usuario.id, req.params.id]
    );
    if (acesso.rows.length === 0) return res.status(403).json({ error: 'Sem acesso a esta fazenda' });
    if (acesso.rows[0].papel !== 'admin') return res.status(403).json({ error: 'Somente admins podem renomear a fazenda' });

    const { rows } = await pool.query(
      'UPDATE fazendas SET nome = COALESCE($1, nome), descricao = COALESCE($2, descricao) WHERE id = $3 RETURNING *',
      [nome || null, descricao !== undefined ? descricao : null, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/fazendas/:id/usuarios — lista membros da fazenda
router.get('/:id/usuarios', async (req, res) => {
  try {
    const acesso = await pool.query(
      'SELECT papel FROM usuario_fazendas WHERE usuario_id = $1 AND fazenda_id = $2',
      [req.usuario.id, req.params.id]
    );
    if (acesso.rows.length === 0) return res.status(403).json({ error: 'Sem acesso a esta fazenda' });

    const { rows } = await pool.query(
      `SELECT u.id, u.nome, u.email, u.avatar_url, uf.papel, uf.criado_em
       FROM usuarios u
       JOIN usuario_fazendas uf ON uf.usuario_id = u.id
       WHERE uf.fazenda_id = $1
       ORDER BY uf.papel, u.nome`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/fazendas/:id/usuarios — convida usuário por email
router.post('/:id/usuarios', async (req, res) => {
  const { email, papel } = req.body;
  if (!email) return res.status(400).json({ error: 'E-mail é obrigatório' });
  const papelValido = ['admin', 'membro'].includes(papel) ? papel : 'membro';

  try {
    // Apenas admin pode convidar
    const acesso = await pool.query(
      'SELECT papel FROM usuario_fazendas WHERE usuario_id = $1 AND fazenda_id = $2',
      [req.usuario.id, req.params.id]
    );
    if (acesso.rows.length === 0) return res.status(403).json({ error: 'Sem acesso a esta fazenda' });
    if (acesso.rows[0].papel !== 'admin') return res.status(403).json({ error: 'Somente admins podem convidar usuários' });

    // Busca o usuário pelo email
    const { rows: userRows } = await pool.query(
      'SELECT id, nome, email FROM usuarios WHERE email = $1 AND ativo = true',
      [email.toLowerCase().trim()]
    );
    if (userRows.length === 0) return res.status(404).json({ error: 'Nenhum usuário encontrado com este e-mail' });

    const convidado = userRows[0];
    await pool.query(
      `INSERT INTO usuario_fazendas (usuario_id, fazenda_id, papel)
       VALUES ($1, $2, $3)
       ON CONFLICT (usuario_id, fazenda_id) DO UPDATE SET papel = $3`,
      [convidado.id, req.params.id, papelValido]
    );

    res.status(201).json({ ...convidado, papel: papelValido });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/fazendas/:id/usuarios/:uid — remove usuário da fazenda
router.delete('/:id/usuarios/:uid', async (req, res) => {
  try {
    const acesso = await pool.query(
      'SELECT papel FROM usuario_fazendas WHERE usuario_id = $1 AND fazenda_id = $2',
      [req.usuario.id, req.params.id]
    );
    if (acesso.rows.length === 0) return res.status(403).json({ error: 'Sem acesso a esta fazenda' });

    // Admin pode remover qualquer um; membro só pode remover a si mesmo
    const ehAdmin = acesso.rows[0].papel === 'admin';
    const removendoSiMesmo = req.params.uid === req.usuario.id;
    if (!ehAdmin && !removendoSiMesmo) return res.status(403).json({ error: 'Sem permissão para remover este usuário' });

    // Impede remoção do único admin
    if (req.params.uid !== req.usuario.id) {
      const { rows: admins } = await pool.query(
        "SELECT COUNT(*) as total FROM usuario_fazendas WHERE fazenda_id = $1 AND papel = 'admin'",
        [req.params.id]
      );
      const alvoAdmin = await pool.query(
        'SELECT papel FROM usuario_fazendas WHERE usuario_id = $1 AND fazenda_id = $2',
        [req.params.uid, req.params.id]
      );
      if (alvoAdmin.rows[0]?.papel === 'admin' && parseInt(admins.rows[0].total) <= 1) {
        return res.status(400).json({ error: 'Não é possível remover o único administrador da fazenda' });
      }
    }

    await pool.query(
      'DELETE FROM usuario_fazendas WHERE usuario_id = $1 AND fazenda_id = $2',
      [req.params.uid, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
