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
      WHERE c.ativo = true
      GROUP BY c.id
      ORDER BY c.nome
    `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/clientes/:id
router.get('/:id', async (req, res) => {
    try {
        const cliente = await pool.query(
            'SELECT * FROM clientes WHERE id = $1',
            [req.params.id]
        );
        const debitos = await pool.query(
            'SELECT * FROM debitos WHERE cliente_id = $1 ORDER BY data_debito DESC',
            [req.params.id]
        );
        const totais = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN pago = false THEN valor ELSE 0 END), 0) as total_devido,
        COALESCE(SUM(CASE WHEN pago = true THEN valor ELSE 0 END), 0) as total_pago
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
            'INSERT INTO clientes (nome, telefone, observacao) VALUES ($1, $2, $3) RETURNING *',
            [nome, telefone, observacao]
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
            'UPDATE clientes SET nome = $1, telefone = $2, observacao = $3 WHERE id = $4 RETURNING *',
            [nome, telefone, observacao, req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/clientes/:id (soft delete)
router.delete('/:id', async (req, res) => {
    try {
        await pool.query('UPDATE clientes SET ativo = false WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/clientes/:id/debitos
router.post('/:id/debitos', async (req, res) => {
    const { descricao, valor, data_debito, observacao } = req.body;
    try {
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
    try {
        const result = await pool.query(
            'UPDATE debitos SET pago = true, data_pagamento = CURRENT_DATE WHERE id = $1 RETURNING *',
            [req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;