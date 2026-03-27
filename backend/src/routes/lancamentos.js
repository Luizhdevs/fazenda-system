const express = require('express');
const router = express.Router();
const pool = require('../../config/database');

// GET /api/lancamentos?mes=3&ano=2025
router.get('/', async (req, res) => {
  const { mes, ano } = req.query;
  const mesAtual = mes || new Date().getMonth() + 1;
  const anoAtual = ano || new Date().getFullYear();
  const uid = req.usuario.fazenda_id;

  try {
    const vendas = await pool.query(
      `SELECT id, 'venda' as tipo, produto as descricao, cliente,
              quantidade, preco_unitario, preco_total as valor,
              data_venda as data, observacao, fiado
       FROM vendas
       WHERE fazenda_id = $1
         AND EXTRACT(MONTH FROM data_venda) = $2 AND EXTRACT(YEAR FROM data_venda) = $3
       ORDER BY data_venda DESC`,
      [uid, mesAtual, anoAtual]
    );

    const compras = await pool.query(
      `SELECT c.id, 'compra' as tipo, i.nome as descricao, c.fornecedor as cliente,
              c.quantidade, c.preco_unitario, c.preco_total as valor,
              c.data_compra as data, c.observacao
       FROM compras c JOIN insumos i ON c.insumo_id = i.id
       WHERE c.fazenda_id = $1
         AND EXTRACT(MONTH FROM c.data_compra) = $2 AND EXTRACT(YEAR FROM c.data_compra) = $3
       ORDER BY c.data_compra DESC`,
      [uid, mesAtual, anoAtual]
    );

    const receitas = await pool.query(
      `SELECT id, 'receita' as tipo, categoria as descricao, origem as cliente,
              null as quantidade, null as preco_unitario,
              valor, data_receita as data, descricao as observacao
       FROM receitas
       WHERE fazenda_id = $1
         AND EXTRACT(MONTH FROM data_receita) = $2 AND EXTRACT(YEAR FROM data_receita) = $3
       ORDER BY data_receita DESC`,
      [uid, mesAtual, anoAtual]
    );

    const despesas = await pool.query(
      `SELECT id, 'despesa' as tipo, categoria as descricao, null as cliente,
              null as quantidade, null as preco_unitario,
              valor, data_despesa as data, descricao as observacao
       FROM despesas
       WHERE fazenda_id = $1
         AND EXTRACT(MONTH FROM data_despesa) = $2 AND EXTRACT(YEAR FROM data_despesa) = $3
       ORDER BY data_despesa DESC`,
      [uid, mesAtual, anoAtual]
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
  const { produto, produto_id, quantidade, preco_unitario, custo_unitario, cliente, cliente_id, data_venda, observacao, fiado } = req.body;
  const uid = req.usuario.fazenda_id;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let custoTotal = parseFloat(custo_unitario || 0);
    if (produto_id) {
      // Verifica que o produto pertence ao usuário
      const prodDono = await client.query(
        'SELECT id FROM produtos WHERE id = $1 AND fazenda_id = $2',
        [produto_id, uid]
      );
      if (prodDono.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'Produto não encontrado' });
      }

      const qtdVenda = parseFloat(quantidade);
      const saldoProduto = await client.query(
        'SELECT COALESCE(quantidade_atual, 0) as quantidade_atual FROM estoque_produtos WHERE produto_id = $1',
        [produto_id]
      );
      const saldoAtual = parseFloat(saldoProduto.rows[0]?.quantidade_atual || 0);

      if (saldoAtual < qtdVenda) {
        await client.query('ROLLBACK');
        const nomeProd = await client.query('SELECT nome FROM produtos WHERE id = $1', [produto_id]);
        return res.status(400).json({
          error: `Estoque insuficiente de "${nomeProd.rows[0]?.nome}": disponível ${saldoAtual.toFixed(2)}, necessário ${qtdVenda.toFixed(2)}. Registre uma produção antes de vender.`
        });
      }

      await client.query(
        `UPDATE estoque_produtos SET quantidade_atual = quantidade_atual - $1, atualizado_em = NOW() WHERE produto_id = $2`,
        [qtdVenda, produto_id]
      );

      const custoFicha = await client.query(
        `SELECT COALESCE(SUM(pi.quantidade_por_unidade * COALESCE(e.custo_medio, 0)), 0) as custo
         FROM produto_insumos pi
         LEFT JOIN estoques e ON e.insumo_id = pi.insumo_id
         WHERE pi.produto_id = $1`,
        [produto_id]
      );
      custoTotal = parseFloat(custoFicha.rows[0]?.custo || 0);
    }

    const result = await client.query(
      `INSERT INTO vendas (produto, produto_id, quantidade, preco_unitario, custo_unitario, cliente, cliente_id, data_venda, observacao, fazenda_id, fiado)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [produto, produto_id || null, quantidade, preco_unitario, custoTotal, cliente, cliente_id || null, data_venda, observacao, uid, fiado === true]
    );

    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// POST /api/lancamentos/compra
router.post('/compra', async (req, res) => {
  const { insumo_id, fornecedor, fornecedor_id, quantidade, preco_unitario, data_compra, observacao } = req.body;
  const uid = req.usuario.fazenda_id;

  try {
    const result = await pool.query(
      `INSERT INTO compras (insumo_id, fornecedor, fornecedor_id, quantidade, preco_unitario, data_compra, observacao, fazenda_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [insumo_id, fornecedor, fornecedor_id || null, quantidade, preco_unitario, data_compra, observacao, uid]
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
      `INSERT INTO receitas (categoria, valor, data_receita, descricao, origem, fazenda_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [categoria, valor, data_receita, descricao, origem, req.usuario.fazenda_id]
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
      `INSERT INTO despesas (categoria, valor, data_despesa, descricao, fazenda_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [categoria, valor, data_despesa, descricao, req.usuario.fazenda_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
