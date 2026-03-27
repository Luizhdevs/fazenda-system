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
    const [totalVendasVista, totalFiadoPago, totalReceitas, totalCompras, totalDespesas, totalFuncionarios, vendasPorProduto, totalAReceber] = await Promise.all([
      // Vendas à vista (já recebidas no ato)
      pool.query(
        `SELECT COALESCE(SUM(preco_total), 0) as total FROM vendas
         WHERE fazenda_id = $1
           AND EXTRACT(MONTH FROM data_venda) = $2 AND EXTRACT(YEAR FROM data_venda) = $3
           AND (fiado = false OR fiado IS NULL)`,
        [uid, mesAtual, anoAtual]
      ),
      // Fiado recebido este mês (pagamentos de débitos)
      pool.query(
        `SELECT COALESCE(SUM(valor), 0) as total FROM receitas
         WHERE fazenda_id = $1
           AND EXTRACT(MONTH FROM data_receita) = $2 AND EXTRACT(YEAR FROM data_receita) = $3
           AND categoria = 'fiado_pago'`,
        [uid, mesAtual, anoAtual]
      ),
      // Outras receitas (leite, subsídios, etc.) — sem fiado_pago
      pool.query(
        `SELECT COALESCE(SUM(valor), 0) as total FROM receitas
         WHERE fazenda_id = $1
           AND EXTRACT(MONTH FROM data_receita) = $2 AND EXTRACT(YEAR FROM data_receita) = $3
           AND categoria != 'fiado_pago'`,
        [uid, mesAtual, anoAtual]
      ),
      pool.query(
        `SELECT COALESCE(SUM(preco_total), 0) as total FROM compras
         WHERE fazenda_id = $1 AND EXTRACT(MONTH FROM data_compra) = $2 AND EXTRACT(YEAR FROM data_compra) = $3`,
        [uid, mesAtual, anoAtual]
      ),
      pool.query(
        `SELECT COALESCE(SUM(valor), 0) as total FROM despesas
         WHERE fazenda_id = $1
           AND EXTRACT(MONTH FROM data_despesa) = $2 AND EXTRACT(YEAR FROM data_despesa) = $3
           AND (categoria IS DISTINCT FROM 'funcionario' OR funcionario_id IS NULL)`,
        [uid, mesAtual, anoAtual]
      ),
      pool.query(
        `SELECT
           COALESCE(SUM(salario + vale_transporte + vale_alimentacao + encargos_patronais), 0) as total,
           COUNT(*) as qtd
         FROM funcionarios
         WHERE fazenda_id = $1 AND ativo = true`,
        [uid]
      ),
      pool.query(
        `SELECT produto, SUM(preco_total) as total, SUM(quantidade) as quantidade
         FROM vendas
         WHERE fazenda_id = $1 AND EXTRACT(MONTH FROM data_venda) = $2 AND EXTRACT(YEAR FROM data_venda) = $3
         GROUP BY produto ORDER BY total DESC`,
        [uid, mesAtual, anoAtual]
      ),
      pool.query(
        `SELECT COALESCE(SUM(d.valor), 0) as total
         FROM debitos d
         JOIN clientes c ON c.id = d.cliente_id
         WHERE c.fazenda_id = $1 AND d.pago = false`,
        [uid]
      ),
    ]);

    const vendas     = parseFloat(totalVendasVista.rows[0].total) + parseFloat(totalFiadoPago.rows[0].total);
    const receitas   = parseFloat(totalReceitas.rows[0].total);
    const entradas   = vendas + receitas;
    const saidas     = parseFloat(totalCompras.rows[0].total) + parseFloat(totalDespesas.rows[0].total);
    const custoFolha = parseFloat(totalFuncionarios.rows[0].total);

    res.json({
      totalEntradas:      entradas,
      totalVendas:        vendas,
      totalReceitas:      receitas,
      totalCompras:       parseFloat(totalCompras.rows[0].total),
      totalDespesas:      parseFloat(totalDespesas.rows[0].total),
      totalFuncionarios:  custoFolha,
      qtdFuncionarios:    parseInt(totalFuncionarios.rows[0].qtd),
      resultado:          entradas - saidas - custoFolha,
      vendasPorProduto:   vendasPorProduto.rows,
      totalAReceber:      parseFloat(totalAReceber.rows[0].total),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
