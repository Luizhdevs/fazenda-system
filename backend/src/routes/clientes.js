const express = require('express');
const router = express.Router();
const pool = require('../../config/database');

// GET /api/clientes
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*,
        COALESCE(SUM(CASE WHEN d.pago = false THEN d.valor ELSE 0 END), 0) as total_devido,
        COUNT(CASE WHEN d.pago = false THEN 1 END) as qtd_debitos
      FROM clientes c
      LEFT JOIN debitos d ON d.cliente_id = c.id
      WHERE c.fazenda_id = $1 AND c.ativo = true
      GROUP BY c.id
      ORDER BY c.nome
    `, [req.usuario.fazenda_id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/clientes/:id
router.get('/:id', async (req, res) => {
  try {
    const cliente = await pool.query(
      'SELECT * FROM clientes WHERE id = $1 AND fazenda_id = $2',
      [req.params.id, req.usuario.fazenda_id]
    );
    if (cliente.rows.length === 0) return res.status(404).json({ error: 'Cliente não encontrado' });

    const debitos = await pool.query(
      'SELECT * FROM debitos WHERE cliente_id = $1 ORDER BY data_debito DESC',
      [req.params.id]
    );
    const totais = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN pago = false THEN valor ELSE 0 END), 0) as total_devido,
        COALESCE(SUM(CASE WHEN pago = true  THEN valor ELSE 0 END), 0) as total_pago
      FROM debitos WHERE cliente_id = $1
    `, [req.params.id]);

    res.json({
      ...cliente.rows[0],
      debitos: debitos.rows,
      total_devido: totais.rows[0].total_devido,
      total_pago: totais.rows[0].total_pago,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/clientes
router.post('/', async (req, res) => {
  const { nome, telefone, observacao } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO clientes (nome, telefone, observacao, fazenda_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [nome, telefone, observacao, req.usuario.fazenda_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/clientes/:id
router.put('/:id', async (req, res) => {
  const { nome, telefone, observacao } = req.body;
  try {
    const result = await pool.query(
      'UPDATE clientes SET nome = $1, telefone = $2, observacao = $3 WHERE id = $4 AND fazenda_id = $5 RETURNING *',
      [nome, telefone, observacao, req.params.id, req.usuario.fazenda_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Cliente não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/clientes/:id (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    await pool.query(
      'UPDATE clientes SET ativo = false WHERE id = $1 AND fazenda_id = $2',
      [req.params.id, req.usuario.fazenda_id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/clientes/:id/debitos
router.post('/:id/debitos', async (req, res) => {
  const { descricao, valor, data_debito, observacao } = req.body;
  try {
    // Verifica que o cliente pertence ao usuário
    const dono = await pool.query(
      'SELECT id FROM clientes WHERE id = $1 AND fazenda_id = $2',
      [req.params.id, req.usuario.fazenda_id]
    );
    if (dono.rows.length === 0) return res.status(404).json({ error: 'Cliente não encontrado' });

    const result = await pool.query(
      'INSERT INTO debitos (cliente_id, descricao, valor, data_debito, observacao) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.params.id, descricao, valor, data_debito, observacao]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/clientes/debitos/:id/pagar
router.patch('/debitos/:id/pagar', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Busca o débito com dados do cliente
    const debito = await client.query(
      `SELECT d.*, c.nome as cliente_nome, c.fazenda_id
       FROM debitos d
       JOIN clientes c ON c.id = d.cliente_id
       WHERE d.id = $1 AND c.fazenda_id = $2 AND d.pago = false`,
      [req.params.id, req.usuario.fazenda_id]
    );
    if (debito.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Débito não encontrado' });
    }

    const d = debito.rows[0];

    // Marca como pago
    await client.query(
      `UPDATE debitos SET pago = true, data_pagamento = CURRENT_DATE WHERE id = $1`,
      [req.params.id]
    );

    // Registra o recebimento como receita no mês do pagamento
    await client.query(
      `INSERT INTO receitas (categoria, valor, descricao, origem, data_receita, fazenda_id)
       VALUES ('fiado_pago', $1, $2, $3, CURRENT_DATE, $4)`,
      [d.valor, d.descricao, d.cliente_nome, d.fazenda_id]
    );

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
