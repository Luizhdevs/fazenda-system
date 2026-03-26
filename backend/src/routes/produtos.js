const express = require('express');
const router = express.Router();
const pool = require('../../config/database');

// GET /api/produtos
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*,
        COALESCE((
          SELECT SUM(pi.quantidade_por_unidade * COALESCE(e.custo_medio, 0))
          FROM produto_insumos pi
          LEFT JOIN estoques e ON e.insumo_id = pi.insumo_id
          WHERE pi.produto_id = p.id
        ), 0) as custo_producao
       FROM produtos p
       WHERE p.ativo = true
       ORDER BY p.nome`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/produtos
router.post('/', async (req, res) => {
  const { nome, unidade } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO produtos (nome, unidade) VALUES ($1, $2) RETURNING *',
      [nome, unidade]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/produtos/:id
router.put('/:id', async (req, res) => {
  const { nome, unidade } = req.body;
  try {
    const result = await pool.query(
      'UPDATE produtos SET nome = $1, unidade = $2 WHERE id = $3 RETURNING *',
      [nome, unidade, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/produtos/:id (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('UPDATE produtos SET ativo = false WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/produtos/:id/insumos — ficha técnica (insumos + produtos componentes)
router.get('/:id/insumos', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT pi.id, pi.quantidade_por_unidade,
              'insumo'          as tipo_componente,
              pi.insumo_id      as componente_id,
              i.nome            as componente_nome,
              i.unidade         as componente_unidade,
              i.tipo            as tipo,
              COALESCE(e.quantidade_atual, 0) as estoque_atual,
              COALESCE(e.custo_medio, 0)      as custo_medio
       FROM produto_insumos pi
       JOIN insumos i ON i.id = pi.insumo_id
       LEFT JOIN estoques e ON e.insumo_id = pi.insumo_id
       WHERE pi.produto_id = $1 AND pi.insumo_id IS NOT NULL

       UNION ALL

       SELECT pi.id, pi.quantidade_por_unidade,
              'produto'                as tipo_componente,
              pi.componente_produto_id as componente_id,
              p.nome                   as componente_nome,
              p.unidade                as componente_unidade,
              'produto'                as tipo,
              COALESCE(ep.quantidade_atual, 0) as estoque_atual,
              COALESCE((
                SELECT SUM(pi2.quantidade_por_unidade * COALESCE(e2.custo_medio, 0))
                FROM produto_insumos pi2
                LEFT JOIN estoques e2 ON e2.insumo_id = pi2.insumo_id
                WHERE pi2.produto_id = p.id AND pi2.insumo_id IS NOT NULL
              ), 0) as custo_medio
       FROM produto_insumos pi
       JOIN produtos p ON p.id = pi.componente_produto_id
       LEFT JOIN estoque_produtos ep ON ep.produto_id = pi.componente_produto_id
       WHERE pi.produto_id = $1 AND pi.componente_produto_id IS NOT NULL

       ORDER BY componente_nome`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/produtos/:id/insumos — adicionar componente (insumo ou produto) à ficha técnica
router.post('/:id/insumos', async (req, res) => {
  const { insumo_id, componente_produto_id, quantidade_por_unidade } = req.body;

  if (!quantidade_por_unidade) {
    return res.status(400).json({ error: 'quantidade_por_unidade é obrigatório' });
  }
  if (!insumo_id && !componente_produto_id) {
    return res.status(400).json({ error: 'Informe insumo_id ou componente_produto_id' });
  }
  if (componente_produto_id === req.params.id) {
    return res.status(400).json({ error: 'Um produto não pode ser componente de si mesmo' });
  }

  try {
    let result;
    if (insumo_id) {
      result = await pool.query(
        `INSERT INTO produto_insumos (produto_id, insumo_id, quantidade_por_unidade)
         VALUES ($1, $2, $3)
         ON CONFLICT (produto_id, insumo_id) DO UPDATE SET quantidade_por_unidade = $3
         RETURNING *`,
        [req.params.id, insumo_id, quantidade_por_unidade]
      );
    } else {
      // Partial index não suporta ON CONFLICT — faz upsert manual
      const existe = await pool.query(
        'SELECT id FROM produto_insumos WHERE produto_id = $1 AND componente_produto_id = $2',
        [req.params.id, componente_produto_id]
      );
      if (existe.rows.length > 0) {
        result = await pool.query(
          'UPDATE produto_insumos SET quantidade_por_unidade = $1 WHERE id = $2 RETURNING *',
          [quantidade_por_unidade, existe.rows[0].id]
        );
      } else {
        result = await pool.query(
          `INSERT INTO produto_insumos (produto_id, componente_produto_id, quantidade_por_unidade)
           VALUES ($1, $2, $3) RETURNING *`,
          [req.params.id, componente_produto_id, quantidade_por_unidade]
        );
      }
    }
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/produtos/:id/insumos/:item_id — remove componente da ficha (por id do registro)
router.delete('/:id/insumos/:item_id', async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM produto_insumos WHERE id = $1 AND produto_id = $2',
      [req.params.item_id, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
