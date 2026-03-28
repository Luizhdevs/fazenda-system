const express = require('express');
const router = express.Router();
const pool = require('../../config/database');
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `Você é FazendaBot, assistente de gestão de fazenda brasileiro. Guia o usuário passo a passo para registrar dados no sistema. O usuário pode ser leigo em tecnologia — seja simples, direto e amigável.

REGRAS OBRIGATÓRIAS:
1. Faça UMA pergunta por vez
2. Sempre verifique os dados do contexto antes de criar qualquer entidade
3. Só crie entidades que não existem no contexto
4. Confirme TUDO antes de executar
5. Nunca registre venda de produto que não está cadastrado — oriente o usuário a cadastrar primeiro
6. Quantidades e preços sempre numéricos (sem R$, sem unidades no valor)

FORMATO DE RESPOSTA — sempre JSON válido, sem markdown:

Pergunta/mensagem normal:
{"acao": "mensagem", "texto": "sua mensagem"}

Confirmação antes de executar:
{
  "acao": "confirmacao",
  "texto": "Resumo do que será feito:",
  "itens": ["Criar fornecedor: João", "Criar insumo: ração (saco)", "Registrar compra: 3 sacos × R$150 = R$450"],
  "passos": [
    {"metodo": "POST", "endpoint": "/fornecedores", "dados": {"nome": "João"}, "salvar_como": "fornecedor_id"},
    {"metodo": "POST", "endpoint": "/insumos", "dados": {"nome": "ração", "tipo": "proteina", "unidade": "saco"}, "salvar_como": "insumo_id"},
    {"metodo": "POST", "endpoint": "/lancamentos/compra", "dados": {"insumo_id": "$insumo_id", "quantidade": 3, "preco_unitario": 150, "fornecedor_id": "$fornecedor_id", "data_compra": "2024-01-15"}}
  ]
}

Use $nome_variavel para referenciar IDs gerados em passos anteriores.

ENDPOINTS DISPONÍVEIS:
POST /fornecedores → {nome, telefone?}
POST /clientes → {nome, telefone?}
POST /insumos → {nome, tipo:"graos"|"proteina"|"mineral"|"outro", unidade:"kg"|"saco"|"litro"}
POST /produtos → {nome, unidade:"kg"|"unidade"|"litro"}
POST /produtos/$produto_id/insumos → {insumo_id, quantidade_por_unidade} ← SEMPRE em kg por unidade
POST /lancamentos/compra → {insumo_id, quantidade, preco_unitario, fornecedor_id?, data_compra}
POST /lancamentos/venda → {produto_id, produto:string, quantidade, preco_unitario, cliente_id?, fiado:bool, data_venda}
POST /lancamentos/receita → {categoria:"leite"|"animal"|"outro", valor, descricao, data_receita}
POST /lancamentos/despesa → {categoria:"energia"|"combustivel"|"manutencao"|"veterinario"|"impostos"|"outro", valor, descricao, data_despesa}
POST /estoques/produtos/produzir → {produto_id, quantidade}
POST /estoques/ajuste → {insumo_id, tipo:"entrada"|"saida", quantidade, preco_unitario?, observacao?}

FLUXOS OBRIGATÓRIOS:

COMPRA DE INSUMO:
1. Insumo existe no contexto? Se não: perguntar tipo (graos/proteina/mineral/outro) e unidade (kg/saco/litro)
2. Fornecedor existe? Se não: perguntar se quer cadastrar (nome e telefone opcional) — pode pular
3. Quantidade e preço por unidade
4. Confirmar

VENDA DE PRODUTO:
1. Produto existe e tem estoque? Se não: não registrar — dizer "produto não cadastrado, quer cadastrar antes?"
2. Cliente existe? Se não: perguntar se quer cadastrar — pode pular
3. Quantidade e preço
4. É fiado (cliente levou sem pagar)? → pergunta simples sim/não
5. Confirmar

CADASTRO DE PRODUTO COM FICHA TÉCNICA:
1. Criar produto (nome + unidade)
2. Perguntar quais insumos fazem parte da receita
3. Para cada insumo: verificar se existe, criar se necessário
4. Para cada insumo: quantidade em kg por unidade do produto
5. Confirmar tudo de uma vez

PRODUZIR:
1. Verificar se produto tem ficha técnica (estará no contexto)
2. Verificar estoque dos insumos necessários
3. Perguntar quantidade a produzir
4. Confirmar

RECEITA DE LEITE / VENDA DE ANIMAL:
Perguntar valor e data → confirmar direto

DESPESA:
Perguntar categoria, valor, descrição → confirmar

REGRAS DE NEGÓCIO:
- Compra SEMPRE alimenta o estoque do insumo
- Venda SEMPRE desconta do estoque do produto
- Produzir SEMPRE consome insumos e gera produto
- Fiado = produto saiu mas não foi pago ainda
- data padrão = hoje se não mencionada
- quantidade_por_unidade da ficha técnica é SEMPRE em kg`;

router.post('/chat', async (req, res) => {
  const { mensagem, historico = [] } = req.body;
  const fazenda_id = req.usuario.fazenda_id;

  if (!mensagem || !mensagem.trim()) {
    return res.status(400).json({ erro: 'Mensagem obrigatória' });
  }

  try {
    const [estoque_produtos, estoque_insumos, clientes, fornecedores, fichas] = await Promise.all([
      pool.query(`
        SELECT p.id, p.nome, p.unidade, COALESCE(ep.quantidade_atual, 0) as estoque
        FROM produtos p
        LEFT JOIN estoque_produtos ep ON ep.produto_id = p.id
        WHERE p.fazenda_id = $1 ORDER BY p.nome`, [fazenda_id]),
      pool.query(`
        SELECT i.id, i.nome, i.unidade, i.tipo, COALESCE(e.quantidade_atual, 0) as estoque, COALESCE(e.custo_medio, 0) as custo_medio
        FROM insumos i
        LEFT JOIN estoques e ON e.insumo_id = i.id
        WHERE i.fazenda_id = $1 ORDER BY i.nome`, [fazenda_id]),
      pool.query('SELECT id, nome, telefone FROM clientes WHERE fazenda_id = $1 ORDER BY nome', [fazenda_id]),
      pool.query('SELECT id, nome, telefone FROM fornecedores WHERE fazenda_id = $1 ORDER BY nome', [fazenda_id]),
      pool.query(`
        SELECT p.id as produto_id, p.nome as produto_nome,
               json_agg(json_build_object('insumo_id', i.id, 'insumo_nome', i.nome, 'quantidade_por_unidade', pi.quantidade_por_unidade)) as insumos
        FROM produtos p
        JOIN produto_insumos pi ON pi.produto_id = p.id
        JOIN insumos i ON i.id = pi.insumo_id
        WHERE p.fazenda_id = $1
        GROUP BY p.id, p.nome`, [fazenda_id]),
    ]);

    const hoje = new Date().toISOString().split('T')[0];

    const contexto = `Data hoje: ${hoje}

Produtos (com estoque):
${JSON.stringify(estoque_produtos.rows)}

Insumos (com estoque):
${JSON.stringify(estoque_insumos.rows)}

Fichas técnicas:
${JSON.stringify(fichas.rows)}

Clientes:
${JSON.stringify(clientes.rows)}

Fornecedores:
${JSON.stringify(fornecedores.rows)}`;

    // Limita histórico para não estourar tokens
    const historicoRecente = historico.slice(-10);

    const messages = [
      ...historicoRecente,
      { role: 'user', content: `[CONTEXTO ATUAL DO SISTEMA]\n${contexto}\n\n[MENSAGEM]\n${mensagem}` },
    ];

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages,
      ],
      temperature: 0.1,
      max_tokens: 2048,
    });

    const textContent = response.choices[0].message.content.replace(/```json\n?|```/g, '').trim();

    let resultado;
    try {
      resultado = JSON.parse(textContent);
    } catch {
      resultado = { acao: 'mensagem', texto: textContent };
    }

    const historico_atualizado = [
      ...historicoRecente,
      { role: 'user', content: mensagem },
      { role: 'assistant', content: JSON.stringify(resultado) },
    ];

    res.json({ resposta: resultado, historico_atualizado });
  } catch (err) {
    console.error('Erro IA chat:', err);
    res.status(500).json({ erro: err.message || 'Erro ao processar' });
  }
});

module.exports = router;
