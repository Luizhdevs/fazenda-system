const express = require('express');
const router = express.Router();
const pool = require('../../config/database');

// GET /api/fornecedores
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM fornecedores WHERE ativo = true ORDER BY nome'
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
            'SELECT * FROM fornecedores WHERE id = $1',
            [req.params.id]
        );
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
            'INSERT INTO fornecedores (nome, telefone, observacao) VALUES ($1, $2, $3) RETURNING *',
            [nome, telefone, observacao]
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
            'UPDATE fornecedores SET nome = $1, telefone = $2, observacao = $3 WHERE id = $4 RETURNING *',
            [nome, telefone, observacao, req.params.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/fornecedores/:id (soft delete)
router.delete('/:id', async (req, res) => {
    try {
        await pool.query('UPDATE fornecedores SET ativo = false WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
