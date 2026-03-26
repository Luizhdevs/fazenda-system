const express = require('express');
const router = express.Router();
const pool = require('../../config/database');

// GET /api/insumos
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM insumos WHERE fazenda_id = $1 ORDER BY nome',
      [req.usuario.fazenda_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/insumos
router.post('/', async (req, res) => {
  const { nome, tipo, unidade } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO insumos (nome, tipo, unidade, fazenda_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [nome, tipo, unidade, req.usuario.fazenda_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/insumos/:id
router.put('/:id', async (req, res) => {
  const { nome, tipo, unidade } = req.body;
  try {
    const result = await pool.query(
      'UPDATE insumos SET nome = $1, tipo = $2, unidade = $3 WHERE id = $4 AND fazenda_id = $5 RETURNING *',
      [nome, tipo, unidade, req.params.id, req.usuario.fazenda_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Insumo não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/insumos/:id
router.delete('/:id', async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM insumos WHERE id = $1 AND fazenda_id = $2',
      [req.params.id, req.usuario.fazenda_id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
