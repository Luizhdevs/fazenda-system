const express = require('express');
const router = express.Router();
const pool = require('../../config/database');

// GET /api/lancamentos?mes=3&ano=2025
router.get('/', async (req, res) => {
  const { mes, ano } = req.query;
  const mesAtual = mes || new Date().getMonth() + 1;
  const anoAtual = ano || new Date().getFullYear();

  try {
    const vendas = await pool.query(
      `SELECT id, 'venda' as tipo, produto as descricao, cliente,
              quantidade, preco_unitario, preco_total as valor,
              data_venda as data, observacao
       FROM vendas
       WHERE EXTRACT(MONTH FROM data_venda) = $1 AND EXTRACT(YEAR FROM data_venda) = $2
       ORDER BY data_venda DESC`,
      [mesAtual, anoAtual]
    );

    const compras = await pool.query(
      `SELECT c.id, 'compra' as tipo, i.nome as descricao, c.fornecedor as cliente,
              c.quantidade, c.preco_unitario, c.preco_total as valor,
              c.data_compra as data, c.observacao
       FROM compras c JOIN insumos i ON c.insumo_id = i.id
       WHERE EXTRACT(MONTH FROM c.data_compra) = $1 AND EXTRACT(YEAR FROM c.data_compra) = $2
       ORDER BY c.data_compra DESC`,
      [mesAtual, anoAtual]
    );

    const receitas = await pool.query(
      `SELECT id, 'receita' as tipo, categoria as descricao, origem as cliente,
              null as quantidade, null as preco_unitario,
              valor, data_receita as data, descricao as observacao
       FROM receitas
       WHERE EXTRACT(MONTH FROM data_receita) = $1 AND EXTRACT(YEAR FROM data_receita) = $2
       ORDER BY data_receita DESC`,
      [mesAtual, anoAtual]
    );

    const despesas = await pool.query(
      `SELECT id, 'despesa' as tipo, categoria as descricao, null as cliente,
              null as quantidade, null as preco_unitario,
              valor, data_despesa as data, descricao as observacao
       FROM despesas
       WHERE EXTRACT(MONTH FROM data_despesa) = $1 AND EXTRACT(YEAR FROM data_despesa) = $2
       ORDER BY data_despesa DESC`,
      [mesAtual, anoAtual]
    );

    const todos = [
      ...vendas.rows,
      ...compras.rows,
      ...receitas.rows,
      ...despesas.rows,
    ].sort((a, b) => new Date(b.data) - new Date(a.data));

    res.json(todos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/lancamentos/venda
router.post('/venda', async (req, res) => {
  const { produto, quantidade, preco_unitario, custo_unitario, cliente, data_venda, observacao } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO vendas (produto, quantidade, preco_unitario, custo_unitario, cliente, data_venda, observacao)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [produto, quantidade, preco_unitario, custo_unitario || 0, cliente, data_venda, observacao]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/lancamentos/compra
router.post('/compra', async (req, res) => {
  const { insumo_id, fornecedor, quantidade, preco_unitario, data_compra, observacao } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO compras (insumo_id, fornecedor, quantidade, preco_unitario, data_compra, observacao)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [insumo_id, fornecedor, quantidade, preco_unitario, data_compra, observacao]
    );

    // Atualiza estoque com custo médio ponderado
    await pool.query(
      `INSERT INTO estoques (insumo_id, quantidade_atual, custo_medio)
       VALUES ($1, $2, $3)
       ON CONFLICT (insumo_id) DO UPDATE SET
         custo_medio = (
           (estoques.quantidade_atual * estoques.custo_medio + $2 * $3) /
           (estoques.quantidade_atual + $2)
         ),
         quantidade_atual = estoques.quantidade_atual + $2,
         atualizado_em = NOW()`,
      [insumo_id, quantidade, preco_unitario]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/lancamentos/receita
router.post('/receita', async (req, res) => {
  const { categoria, valor, data_receita, descricao, origem } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO receitas (categoria, valor, data_receita, descricao, origem)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [categoria, valor, data_receita, descricao, origem]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/lancamentos/despesa
router.post('/despesa', async (req, res) => {
  const { categoria, valor, data_despesa, descricao } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO despesas (categoria, valor, data_despesa, descricao)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [categoria, valor, data_despesa, descricao]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
