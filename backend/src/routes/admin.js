const express = require('express');
const router = express.Router();
const pool = require('../../config/database');
const autenticar = require('../middleware/auth');

// Todas as rotas exigem JWT válido + superadmin
router.use(autenticar);
router.use((req, res, next) => {
  if (!req.usuario.superadmin) return res.status(403).json({ error: 'Acesso restrito a superadmins' });
  next();
});

// GET /api/admin/usuarios — lista todos os usuários do sistema
router.get('/usuarios', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.nome, u.email, u.avatar_url, u.ativo, u.superadmin, u.criado_em, u.ultimo_acesso,
              COUNT(uf.fazenda_id) as total_fazendas
       FROM usuarios u
       LEFT JOIN usuario_fazendas uf ON uf.usuario_id = u.id
       GROUP BY u.id
       ORDER BY u.criado_em ASC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/usuarios/:id/ativo — ativa ou desativa usuário
router.patch('/usuarios/:id/ativo', async (req, res) => {
  const { ativo } = req.body;
  if (typeof ativo !== 'boolean') return res.status(400).json({ error: 'Campo "ativo" deve ser true ou false' });
  if (req.params.id === req.usuario.id) return res.status(400).json({ error: 'Você não pode desativar sua própria conta' });

  try {
    const { rows } = await pool.query(
      'UPDATE usuarios SET ativo = $1 WHERE id = $2 RETURNING id, nome, email, ativo',
      [ativo, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
