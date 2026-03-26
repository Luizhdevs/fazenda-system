const express = require('express');
const router = express.Router();
const pool = require('../../config/database');

// GET /api/fornecedores
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM fornecedores WHERE fazenda_id = $1 AND ativo = true ORDER BY nome',
      [req.usuario.fazenda_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/fornecedores/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM fornecedores WHERE id = $1 AND fazenda_id = $2',
      [req.params.id, req.usuario.fazenda_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Fornecedor não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/fornecedores
router.post('/', async (req, res) => {
  const { nome, telefone, observacao } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO fornecedores (nome, telefone, observacao, fazenda_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [nome, telefone, observacao, req.usuario.fazenda_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/fornecedores/:id
router.put('/:id', async (req, res) => {
  const { nome, telefone, observacao } = req.body;
  try {
    const result = await pool.query(
      'UPDATE fornecedores SET nome = $1, telefone = $2, observacao = $3 WHERE id = $4 AND fazenda_id = $5 RETURNING *',
      [nome, telefone, observacao, req.params.id, req.usuario.fazenda_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Fornecedor não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/fornecedores/:id (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    await pool.query(
      'UPDATE fornecedores SET ativo = false WHERE id = $1 AND fazenda_id = $2',
      [req.params.id, req.usuario.fazenda_id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
