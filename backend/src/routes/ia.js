const express = require('express');
const router = express.Router();
const pool = require('../../config/database');
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `Você é um assistente para um sistema de gestão de fazenda brasileiro. Interprete o texto do usuário e extraia os dados para registrar no sistema.

Responda APENAS com JSON válido, sem markdown, sem texto adicional.

Formato obrigatório:
{
  "tipo": "venda" | "compra" | "receita" | "despesa" | "producao" | "desconhecido",
  "confianca": "alta" | "media" | "baixa",
  "mensagem": "texto curto confirmando o que entendeu",
  "dados": { ... }
}

Campos por tipo (inclua apenas os relevantes):

venda: produto_nome, produto_id, quantidade (número), preco_unitario (número), preco_total (número), cliente_nome, cliente_id, fiado (boolean), data (YYYY-MM-DD)

compra: insumo_nome, insumo_id, quantidade (número), preco_unitario (número), preco_total (número), fornecedor_nome, fornecedor_id, data (YYYY-MM-DD)

receita: categoria ("leite" | "animal" | "outro"), valor (número), descricao, data (YYYY-MM-DD)

despesa: categoria ("energia" | "combustivel" | "manutencao" | "veterinario" | "impostos" | "outro"), valor (número), descricao, data (YYYY-MM-DD)

producao: produto_nome, produto_id, quantidade (número), data (YYYY-MM-DD)

Regras:
- Para valores monetários, extraia apenas o número (sem R$, sem vírgulas)
- Se o preço total não for mencionado, calcule: quantidade × preco_unitario
- Se a data não for mencionada, use a data de hoje
- Tente encontrar o produto/insumo/cliente/fornecedor mais próximo pelo nome na lista do contexto
- Se "fiado" não for mencionado, use false
- Para "compra de ração/insumo" → tipo compra; para "venda de produto" → tipo venda
- Para "receita de leite" → tipo receita, categoria leite
- Para "conta de luz/energia" → tipo despesa, categoria energia`;

router.post('/interpretar', async (req, res) => {
  const { texto } = req.body;
  const fazenda_id = req.usuario.fazenda_id;

  if (!texto || !texto.trim()) {
    return res.status(400).json({ erro: 'Texto obrigatório' });
  }

  try {
    const [produtos, insumos, clientes, fornecedores] = await Promise.all([
      pool.query('SELECT id, nome, unidade FROM produtos WHERE fazenda_id = $1 ORDER BY nome', [fazenda_id]),
      pool.query('SELECT id, nome, unidade FROM insumos WHERE fazenda_id = $1 ORDER BY nome', [fazenda_id]),
      pool.query('SELECT id, nome FROM clientes WHERE fazenda_id = $1 ORDER BY nome', [fazenda_id]),
      pool.query('SELECT id, nome FROM fornecedores WHERE fazenda_id = $1 ORDER BY nome', [fazenda_id]),
    ]);

    const hoje = new Date().toISOString().split('T')[0];

    const contexto = `Data de hoje: ${hoje}
Produtos: ${JSON.stringify(produtos.rows)}
Insumos: ${JSON.stringify(insumos.rows)}
Clientes: ${JSON.stringify(clientes.rows)}
Fornecedores: ${JSON.stringify(fornecedores.rows)}`;

    const response = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Contexto:\n${contexto}\n\nTexto: "${texto}"` },
      ],
      temperature: 0.1,
      max_tokens: 1024,
    });

    const textContent = response.choices[0].message.content.replace(/```json\n?|```/g, '').trim();

    let resultado;
    try {
      resultado = JSON.parse(textContent);
    } catch {
      resultado = {
        tipo: 'desconhecido',
        confianca: 'baixa',
        mensagem: 'Não entendi, pode reformular?',
        dados: {},
      };
    }

    res.json(resultado);
  } catch (err) {
    console.error('Erro IA completo:', err);
    res.status(500).json({ erro: err.message || 'Erro ao processar texto' });
  }
});

module.exports = router;
