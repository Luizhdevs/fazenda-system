const express = require('express');
const router = express.Router();
const pool = require('../../config/database');

// GET /api/produtos
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM produtos WHERE ativo = true ORDER BY nome'
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
        await pool.query(
            'UPDATE produtos SET ativo = false WHERE id = $1',
            [req.params.id]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;