const express = require('express');
const router = express.Router();
const pool = require('../../config/database');

// Calcula custo mensal total de um funcionário
const custoMensal = `(f.salario + f.vale_transporte + f.vale_alimentacao + f.encargos_patronais)`;

// GET /api/funcionarios
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT f.*,
        ${custoMensal} as custo_mensal
       FROM funcionarios f
       WHERE f.fazenda_id = $1 AND f.ativo = true
       ORDER BY f.nome`,
      [req.usuario.fazenda_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/funcionarios/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT f.*, ${custoMensal} as custo_mensal
       FROM funcionarios f
       WHERE f.id = $1 AND f.fazenda_id = $2`,
      [req.params.id, req.usuario.fazenda_id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Funcionário não encontrado' });

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/funcionarios
router.post('/', async (req, res) => {
  const { nome, cargo, salario, vale_transporte, vale_alimentacao, encargos_patronais, data_admissao, observacao } = req.body;
  if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });

  try {
    const { rows } = await pool.query(
      `INSERT INTO funcionarios
         (fazenda_id, nome, cargo, salario, vale_transporte, vale_alimentacao, encargos_patronais, data_admissao, observacao)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        req.usuario.fazenda_id, nome,
        cargo || null,
        parseFloat(salario) || 0,
        parseFloat(vale_transporte) || 0,
        parseFloat(vale_alimentacao) || 0,
        parseFloat(encargos_patronais) || 0,
        data_admissao || null,
        observacao || null,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/funcionarios/:id
router.put('/:id', async (req, res) => {
  const { nome, cargo, salario, vale_transporte, vale_alimentacao, encargos_patronais, data_admissao, observacao } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE funcionarios
       SET nome = $1, cargo = $2, salario = $3, vale_transporte = $4,
           vale_alimentacao = $5, encargos_patronais = $6, data_admissao = $7, observacao = $8
       WHERE id = $9 AND fazenda_id = $10 RETURNING *`,
      [
        nome, cargo || null,
        parseFloat(salario) || 0,
        parseFloat(vale_transporte) || 0,
        parseFloat(vale_alimentacao) || 0,
        parseFloat(encargos_patronais) || 0,
        data_admissao || null,
        observacao || null,
        req.params.id, req.usuario.fazenda_id,
      ]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Funcionário não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/funcionarios/:id (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    await pool.query(
      'UPDATE funcionarios SET ativo = false WHERE id = $1 AND fazenda_id = $2',
      [req.params.id, req.usuario.fazenda_id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
