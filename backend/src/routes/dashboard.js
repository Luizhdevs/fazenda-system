const express = require('express');
const router = express.Router();
const pool = require('../../config/database');

// GET /api/dashboard?mes=3&ano=2025
router.get('/', async (req, res) => {
  const { mes, ano } = req.query;
  const mesAtual = mes || new Date().getMonth() + 1;
  const anoAtual = ano || new Date().getFullYear();

  try {
    const totalVendas = await pool.query(
      `SELECT COALESCE(SUM(preco_total), 0) as total FROM vendas
       WHERE EXTRACT(MONTH FROM data_venda) = $1 AND EXTRACT(YEAR FROM data_venda) = $2`,
      [mesAtual, anoAtual]
    );

    const totalReceitas = await pool.query(
      `SELECT COALESCE(SUM(valor), 0) as total FROM receitas
       WHERE EXTRACT(MONTH FROM data_receita) = $1 AND EXTRACT(YEAR FROM data_receita) = $2`,
      [mesAtual, anoAtual]
    );

    const totalCompras = await pool.query(
      `SELECT COALESCE(SUM(preco_total), 0) as total FROM compras
       WHERE EXTRACT(MONTH FROM data_compra) = $1 AND EXTRACT(YEAR FROM data_compra) = $2`,
      [mesAtual, anoAtual]
    );

    const totalDespesas = await pool.query(
      `SELECT COALESCE(SUM(valor), 0) as total FROM despesas
       WHERE EXTRACT(MONTH FROM data_despesa) = $1 AND EXTRACT(YEAR FROM data_despesa) = $2`,
      [mesAtual, anoAtual]
    );

    const vendasPorProduto = await pool.query(
      `SELECT produto, SUM(preco_total) as total, SUM(quantidade) as quantidade
       FROM vendas
       WHERE EXTRACT(MONTH FROM data_venda) = $1 AND EXTRACT(YEAR FROM data_venda) = $2
       GROUP BY produto ORDER BY total DESC`,
      [mesAtual, anoAtual]
    );

    const totalEntradas = parseFloat(totalVendas.rows[0].total) + parseFloat(totalReceitas.rows[0].total);
    const totalSaidas = parseFloat(totalCompras.rows[0].total) + parseFloat(totalDespesas.rows[0].total);
    const resultado = totalEntradas - totalSaidas;

    res.json({
      totalEntradas,
      totalVendas: parseFloat(totalVendas.rows[0].total),
      totalReceitas: parseFloat(totalReceitas.rows[0].total),
      totalCompras: parseFloat(totalCompras.rows[0].total),
      totalDespesas: parseFloat(totalDespesas.rows[0].total),
      resultado,
      vendasPorProduto: vendasPorProduto.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
