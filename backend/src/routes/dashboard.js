const express = require('express');
const router = express.Router();
const pool = require('../../config/database');

// GET /api/dashboard?mes=3&ano=2025
router.get('/', async (req, res) => {
  const { mes, ano } = req.query;
  const mesAtual = mes || new Date().getMonth() + 1;
  const anoAtual = ano || new Date().getFullYear();
  const uid = req.usuario.fazenda_id;

  try {
    const totalVendas = await pool.query(
      `SELECT COALESCE(SUM(preco_total), 0) as total FROM vendas
       WHERE fazenda_id = $1 AND EXTRACT(MONTH FROM data_venda) = $2 AND EXTRACT(YEAR FROM data_venda) = $3`,
      [uid, mesAtual, anoAtual]
    );

    const totalReceitas = await pool.query(
      `SELECT COALESCE(SUM(valor), 0) as total FROM receitas
       WHERE fazenda_id = $1 AND EXTRACT(MONTH FROM data_receita) = $2 AND EXTRACT(YEAR FROM data_receita) = $3`,
      [uid, mesAtual, anoAtual]
    );

    const totalCompras = await pool.query(
      `SELECT COALESCE(SUM(preco_total), 0) as total FROM compras
       WHERE fazenda_id = $1 AND EXTRACT(MONTH FROM data_compra) = $2 AND EXTRACT(YEAR FROM data_compra) = $3`,
      [uid, mesAtual, anoAtual]
    );

    const totalDespesas = await pool.query(
      `SELECT COALESCE(SUM(valor), 0) as total FROM despesas
       WHERE fazenda_id = $1 AND EXTRACT(MONTH FROM data_despesa) = $2 AND EXTRACT(YEAR FROM data_despesa) = $3`,
      [uid, mesAtual, anoAtual]
    );

    const vendasPorProduto = await pool.query(
      `SELECT produto, SUM(preco_total) as total, SUM(quantidade) as quantidade
       FROM vendas
       WHERE fazenda_id = $1 AND EXTRACT(MONTH FROM data_venda) = $2 AND EXTRACT(YEAR FROM data_venda) = $3
       GROUP BY produto ORDER BY total DESC`,
      [uid, mesAtual, anoAtual]
    );

    const totalEntradas = parseFloat(totalVendas.rows[0].total) + parseFloat(totalReceitas.rows[0].total);
    const totalSaidas = parseFloat(totalCompras.rows[0].total) + parseFloat(totalDespesas.rows[0].total);

    res.json({
      totalEntradas,
      totalVendas: parseFloat(totalVendas.rows[0].total),
      totalReceitas: parseFloat(totalReceitas.rows[0].total),
      totalCompras: parseFloat(totalCompras.rows[0].total),
      totalDespesas: parseFloat(totalDespesas.rows[0].total),
      resultado: totalEntradas - totalSaidas,
      vendasPorProduto: vendasPorProduto.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
