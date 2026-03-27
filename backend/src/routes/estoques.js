const express = require('express');
const router = express.Router();
const pool = require('../../config/database');

// Arredonda para evitar imprecisão de ponto flutuante (ex: 49.98 em vez de 50)
const r6 = (v) => Math.round(v * 1e6) / 1e6;

// GET /api/estoques — lista todos os insumos com saldo (mesmo os zerados)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT i.id as insumo_id, i.nome, i.tipo, i.unidade,
              COALESCE(e.quantidade_atual, 0) as quantidade_atual,
              COALESCE(e.custo_medio, 0) as custo_medio,
              COALESCE(e.quantidade_atual * e.custo_medio, 0) as valor_total,
              e.atualizado_em
       FROM insumos i
       LEFT JOIN estoques e ON e.insumo_id = i.id
       WHERE i.fazenda_id = $1
       ORDER BY i.nome`,
      [req.usuario.fazenda_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/estoques/ajuste — entrada ou saída manual de insumo
router.post('/ajuste', async (req, res) => {
  const { insumo_id, tipo, quantidade, preco_unitario, observacao } = req.body;

  if (!insumo_id || !tipo || !quantidade) {
    return res.status(400).json({ error: 'insumo_id, tipo e quantidade são obrigatórios' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verifica que o insumo pertence ao usuário
    const dono = await client.query(
      'SELECT id FROM insumos WHERE id = $1 AND fazenda_id = $2',
      [insumo_id, req.usuario.fazenda_id]
    );
    if (dono.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Insumo não encontrado' });
    }

    const estoqueAtual = await client.query(
      'SELECT quantidade_atual, custo_medio FROM estoques WHERE insumo_id = $1',
      [insumo_id]
    );

    const qtdAtual = parseFloat(estoqueAtual.rows[0]?.quantidade_atual || 0);
    const custoAtual = parseFloat(estoqueAtual.rows[0]?.custo_medio || 0);
    const qtd = parseFloat(quantidade);
    const preco = parseFloat(preco_unitario || 0);

    let novaQtd, novoCusto;

    if (tipo === 'entrada') {
      if (preco <= 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Preço unitário é obrigatório para entradas' });
      }
      novaQtd = r6(qtdAtual + qtd);
      novoCusto = r6((qtdAtual * custoAtual + qtd * preco) / novaQtd);
    } else {
      if (qtd > qtdAtual) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Quantidade insuficiente em estoque' });
      }
      novaQtd = r6(qtdAtual - qtd);
      novoCusto = custoAtual;
    }

    await client.query(
      `INSERT INTO estoques (insumo_id, quantidade_atual, custo_medio)
       VALUES ($1, $2, $3)
       ON CONFLICT (insumo_id) DO UPDATE SET
         quantidade_atual = $2, custo_medio = $3, atualizado_em = NOW()`,
      [insumo_id, novaQtd, novoCusto]
    );

    await client.query('COMMIT');
    res.status(201).json({ insumo_id, tipo, quantidade: novaQtd, custo_medio: novoCusto });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ─── Estoque de Produtos ──────────────────────────────────────────────────────

// GET /api/estoques/produtos — saldo de todos os produtos
router.get('/produtos', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.id as produto_id, p.nome, p.unidade,
              COALESCE(ep.quantidade_atual, 0) as quantidade_atual,
              ep.atualizado_em,
              COALESCE((
                SELECT SUM(pi.quantidade_por_unidade * COALESCE(e.custo_medio, 0) / NULLIF(i2.peso_por_unidade, 1))
                FROM produto_insumos pi
                JOIN insumos i2 ON i2.id = pi.insumo_id
                LEFT JOIN estoques e ON e.insumo_id = pi.insumo_id
                WHERE pi.produto_id = p.id AND pi.insumo_id IS NOT NULL
              ), 0) as custo_unitario,
              COALESCE((
                SELECT MIN(cap) FROM (
                  SELECT FLOOR(
                    (COALESCE(e.quantidade_atual, 0) * COALESCE(i2.peso_por_unidade, 1))
                    / NULLIF(pi.quantidade_por_unidade, 0)
                  ) as cap
                  FROM produto_insumos pi
                  JOIN insumos i2 ON i2.id = pi.insumo_id
                  LEFT JOIN estoques e ON e.insumo_id = pi.insumo_id
                  WHERE pi.produto_id = p.id AND pi.insumo_id IS NOT NULL
                  UNION ALL
                  SELECT FLOOR(
                    (COALESCE(ep2.quantidade_atual, 0) * COALESCE(p2.peso_por_unidade, 1))
                    / NULLIF(pi.quantidade_por_unidade, 0)
                  ) as cap
                  FROM produto_insumos pi
                  JOIN produtos p2 ON p2.id = pi.componente_produto_id
                  LEFT JOIN estoque_produtos ep2 ON ep2.produto_id = pi.componente_produto_id
                  WHERE pi.produto_id = p.id AND pi.componente_produto_id IS NOT NULL
                ) caps
              ), 0) as capacidade_producao,
              EXISTS(SELECT 1 FROM produto_insumos WHERE produto_id = p.id) as tem_ficha
       FROM produtos p
       LEFT JOIN estoque_produtos ep ON ep.produto_id = p.id
       WHERE p.fazenda_id = $1 AND p.ativo = true
       ORDER BY p.nome`,
      [req.usuario.fazenda_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/estoques/produtos/entrada — entrada manual (colheita, doação, ajuste)
router.post('/produtos/entrada', async (req, res) => {
  const { produto_id, quantidade, custo_unitario, observacao } = req.body;
  if (!produto_id || !quantidade) {
    return res.status(400).json({ error: 'produto_id e quantidade são obrigatórios' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verifica que o produto pertence ao usuário
    const dono = await client.query(
      'SELECT id FROM produtos WHERE id = $1 AND fazenda_id = $2',
      [produto_id, req.usuario.fazenda_id]
    );
    if (dono.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    const qtd = parseFloat(quantidade);
    await client.query(
      `INSERT INTO estoque_produtos (produto_id, quantidade_atual)
       VALUES ($1, $2)
       ON CONFLICT (produto_id) DO UPDATE SET
         quantidade_atual = estoque_produtos.quantidade_atual + $2,
         atualizado_em = NOW()`,
      [produto_id, qtd]
    );

    await client.query('COMMIT');
    res.status(201).json({ success: true, quantidade_adicionada: qtd });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// POST /api/estoques/produtos/produzir — produz X unidades: debita insumos e adiciona ao estoque
router.post('/produtos/produzir', async (req, res) => {
  const { produto_id, quantidade } = req.body;
  if (!produto_id || !quantidade) {
    return res.status(400).json({ error: 'produto_id e quantidade são obrigatórios' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verifica que o produto pertence ao usuário
    const dono = await client.query(
      'SELECT id FROM produtos WHERE id = $1 AND fazenda_id = $2',
      [produto_id, req.usuario.fazenda_id]
    );
    if (dono.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    const qtd = parseFloat(quantidade);

    const ficha = await client.query(
      `SELECT pi.quantidade_por_unidade,
              'insumo' as tipo_componente,
              pi.insumo_id as componente_id,
              i.nome as componente_nome, i.unidade,
              COALESCE(i.peso_por_unidade, 1) as peso_por_unidade,
              COALESCE(e.quantidade_atual, 0) as estoque_atual
       FROM produto_insumos pi
       JOIN insumos i ON i.id = pi.insumo_id
       LEFT JOIN estoques e ON e.insumo_id = pi.insumo_id
       WHERE pi.produto_id = $1 AND pi.insumo_id IS NOT NULL

       UNION ALL

       SELECT pi.quantidade_por_unidade,
              'produto' as tipo_componente,
              pi.componente_produto_id as componente_id,
              p.nome as componente_nome, p.unidade,
              COALESCE(p.peso_por_unidade, 1) as peso_por_unidade,
              COALESCE(ep.quantidade_atual, 0) as estoque_atual
       FROM produto_insumos pi
       JOIN produtos p ON p.id = pi.componente_produto_id
       LEFT JOIN estoque_produtos ep ON ep.produto_id = pi.componente_produto_id
       WHERE pi.produto_id = $1 AND pi.componente_produto_id IS NOT NULL`,
      [produto_id]
    );

    if (ficha.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Produto sem ficha técnica. Cadastre os ingredientes primeiro.' });
    }

    for (const item of ficha.rows) {
      // quantidade_por_unidade está em kg; estoque pode estar em sacos/litros
      // convertemos o estoque para kg antes de comparar
      const peso = parseFloat(item.peso_por_unidade) || 1;
      const necessario_kg = item.quantidade_por_unidade * qtd;
      const disponivel_kg = parseFloat(item.estoque_atual) * peso;
      if (disponivel_kg < necessario_kg) {
        await client.query('ROLLBACK');
        const dispNativo = parseFloat(item.estoque_atual).toFixed(2);
        const dispKg = disponivel_kg.toFixed(2);
        const necKg = necessario_kg.toFixed(2);
        const label = item.unidade === 'kg'
          ? `${dispNativo} kg`
          : `${dispNativo} ${item.unidade} (${dispKg} kg)`;
        return res.status(400).json({
          error: `Estoque insuficiente de "${item.componente_nome}": disponível ${label}, necessário ${necKg} kg`
        });
      }
    }

    for (const item of ficha.rows) {
      const peso = parseFloat(item.peso_por_unidade) || 1;
      // converte kg necessários de volta para a unidade nativa do insumo
      const consumo_nativo = r6((item.quantidade_por_unidade * qtd) / peso);
      const novaQtd = r6(parseFloat(item.estoque_atual) - consumo_nativo);
      if (item.tipo_componente === 'insumo') {
        await client.query(
          `UPDATE estoques SET quantidade_atual = $1, atualizado_em = NOW() WHERE insumo_id = $2`,
          [novaQtd, item.componente_id]
        );
      } else {
        await client.query(
          `UPDATE estoque_produtos SET quantidade_atual = $1, atualizado_em = NOW() WHERE produto_id = $2`,
          [novaQtd, item.componente_id]
        );
      }
    }

    await client.query(
      `INSERT INTO estoque_produtos (produto_id, quantidade_atual)
       VALUES ($1, $2)
       ON CONFLICT (produto_id) DO UPDATE SET
         quantidade_atual = estoque_produtos.quantidade_atual + $2,
         atualizado_em = NOW()`,
      [produto_id, qtd]
    );

    await client.query('COMMIT');
    res.status(201).json({ success: true, quantidade_produzida: qtd });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// POST /api/estoques/produtos/usar — saída interna (uso no gado, sem registro financeiro)
router.post('/produtos/usar', async (req, res) => {
  const { produto_id, quantidade, motivo } = req.body;
  if (!produto_id || !quantidade) {
    return res.status(400).json({ error: 'produto_id e quantidade são obrigatórios' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verifica que o produto pertence ao usuário
    const dono = await client.query(
      'SELECT id FROM produtos WHERE id = $1 AND fazenda_id = $2',
      [produto_id, req.usuario.fazenda_id]
    );
    if (dono.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    const qtd = parseFloat(quantidade);
    const saldo = await client.query(
      'SELECT COALESCE(quantidade_atual, 0) as quantidade_atual FROM estoque_produtos WHERE produto_id = $1',
      [produto_id]
    );
    const qtdAtual = parseFloat(saldo.rows[0]?.quantidade_atual || 0);

    if (qtd > qtdAtual) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `Estoque insuficiente: disponível ${qtdAtual.toFixed(2)}, solicitado ${qtd.toFixed(2)}`
      });
    }

    await client.query(
      `UPDATE estoque_produtos SET quantidade_atual = quantidade_atual - $1, atualizado_em = NOW() WHERE produto_id = $2`,
      [qtd, produto_id]
    );

    await client.query('COMMIT');
    res.status(201).json({ success: true, quantidade_restante: qtdAtual - qtd });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
