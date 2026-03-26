const express = require('express');
const router = express.Router();
const pool = require('../../config/database');

// GET /api/estoques
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT e.id, i.nome, i.tipo, i.unidade,
              e.quantidade_atual, e.custo_medio,
              (e.quantidade_atual * e.custo_medio) as valor_total,
              e.atualizado_em
       FROM estoques e
       JOIN insumos i ON e.insumo_id = i.id
       ORDER BY i.nome`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/estoques/insumos (lista insumos para os selects)
router.get('/insumos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM insumos ORDER BY nome');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
