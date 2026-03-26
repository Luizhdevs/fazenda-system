-- ==============================================
-- SISTEMA FAZENDA — Schema completo do banco
-- ==============================================

-- Insumos disponíveis (milho, soja, mineral, etc.)
CREATE TABLE IF NOT EXISTS insumos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL,
  tipo VARCHAR(50) NOT NULL, -- 'graos', 'proteina', 'mineral', 'outro'
  unidade VARCHAR(20) NOT NULL DEFAULT 'kg', -- 'kg', 'saco', 'litro'
  criado_em TIMESTAMP DEFAULT NOW()
);

-- Compras de insumos
CREATE TABLE IF NOT EXISTS compras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insumo_id UUID REFERENCES insumos(id),
  fornecedor VARCHAR(150),
  quantidade DECIMAL(10,2) NOT NULL,
  preco_unitario DECIMAL(10,2) NOT NULL,
  preco_total DECIMAL(10,2) GENERATED ALWAYS AS (quantidade * preco_unitario) STORED,
  data_compra DATE NOT NULL DEFAULT CURRENT_DATE,
  observacao TEXT,
  criado_em TIMESTAMP DEFAULT NOW()
);

-- Estoque atual de cada insumo (custo médio ponderado)
CREATE TABLE IF NOT EXISTS estoques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insumo_id UUID UNIQUE REFERENCES insumos(id),
  quantidade_atual DECIMAL(10,2) NOT NULL DEFAULT 0,
  custo_medio DECIMAL(10,2) NOT NULL DEFAULT 0,
  atualizado_em TIMESTAMP DEFAULT NOW()
);

-- Produções de ração (legado)
CREATE TABLE IF NOT EXISTS producoes_racao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_producao DATE NOT NULL DEFAULT CURRENT_DATE,
  sacos_produzidos DECIMAL(10,2) NOT NULL,
  custo_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  custo_por_saco DECIMAL(10,2) GENERATED ALWAYS AS (
    CASE WHEN sacos_produzidos > 0 THEN custo_total / sacos_produzidos ELSE 0 END
  ) STORED,
  observacao TEXT,
  criado_em TIMESTAMP DEFAULT NOW()
);

-- Insumos usados em cada produção (legado)
CREATE TABLE IF NOT EXISTS itens_producao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producao_id UUID REFERENCES producoes_racao(id) ON DELETE CASCADE,
  insumo_id UUID REFERENCES insumos(id),
  quantidade_usada DECIMAL(10,2) NOT NULL,
  custo_unitario DECIMAL(10,2) NOT NULL,
  custo_parcial DECIMAL(10,2) GENERATED ALWAYS AS (quantidade_usada * custo_unitario) STORED
);

-- Produtos finais (ração, fubá, banana, mandioca, etc.)
CREATE TABLE IF NOT EXISTS produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(150) NOT NULL,
  unidade VARCHAR(20) NOT NULL DEFAULT 'unidade',
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP DEFAULT NOW()
);

-- Ficha técnica: ingredientes de cada produto
-- Um ingrediente pode ser um insumo OU outro produto (ex: fubá entra na ração)
CREATE TABLE IF NOT EXISTS produto_insumos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  insumo_id UUID REFERENCES insumos(id),                   -- ingrediente do tipo insumo
  componente_produto_id UUID REFERENCES produtos(id),       -- ingrediente do tipo produto
  quantidade_por_unidade DECIMAL(10,4) NOT NULL,
  CONSTRAINT chk_componente CHECK (
    (insumo_id IS NOT NULL AND componente_produto_id IS NULL) OR
    (insumo_id IS NULL AND componente_produto_id IS NOT NULL)
  ),
  UNIQUE(produto_id, insumo_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS produto_insumos_componente_idx
  ON produto_insumos(produto_id, componente_produto_id)
  WHERE componente_produto_id IS NOT NULL;

-- Estoque de produtos acabados (sacos de ração, kg de banana colhida, etc.)
CREATE TABLE IF NOT EXISTS estoque_produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID UNIQUE NOT NULL REFERENCES produtos(id),
  quantidade_atual DECIMAL(10,2) NOT NULL DEFAULT 0,
  atualizado_em TIMESTAMP DEFAULT NOW()
);

-- Vendas
CREATE TABLE IF NOT EXISTS vendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto VARCHAR(100) NOT NULL,
  produto_id UUID REFERENCES produtos(id),   -- vínculo com produto cadastrado
  quantidade DECIMAL(10,2) NOT NULL,
  preco_unitario DECIMAL(10,2) NOT NULL,
  preco_total DECIMAL(10,2) GENERATED ALWAYS AS (quantidade * preco_unitario) STORED,
  custo_unitario DECIMAL(10,2) DEFAULT 0,
  lucro DECIMAL(10,2) GENERATED ALWAYS AS (
    (quantidade * preco_unitario) - (quantidade * custo_unitario)
  ) STORED,
  cliente VARCHAR(150),
  data_venda DATE NOT NULL DEFAULT CURRENT_DATE,
  observacao TEXT,
  criado_em TIMESTAMP DEFAULT NOW()
);

-- Receitas diversas (folha do leite, venda de animal, etc.)
CREATE TABLE IF NOT EXISTS receitas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria VARCHAR(100) NOT NULL, -- 'leite', 'animal', 'outro'
  valor DECIMAL(10,2) NOT NULL,
  data_receita DATE NOT NULL DEFAULT CURRENT_DATE,
  descricao TEXT,
  origem VARCHAR(150),
  criado_em TIMESTAMP DEFAULT NOW()
);

-- Despesas fixas (funcionário, energia, combustível, etc.)
CREATE TABLE IF NOT EXISTS despesas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria VARCHAR(100) NOT NULL, -- 'funcionario', 'energia', 'combustivel', 'manutencao', 'outro'
  valor DECIMAL(10,2) NOT NULL,
  data_despesa DATE NOT NULL DEFAULT CURRENT_DATE,
  descricao TEXT,
  criado_em TIMESTAMP DEFAULT NOW()
);

-- Clientes
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(150) NOT NULL,
  telefone VARCHAR(20),
  observacao TEXT,
  criado_em TIMESTAMP DEFAULT NOW()
);

-- Débitos de clientes (fiado)
CREATE TABLE IF NOT EXISTS debitos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  data_debito DATE NOT NULL DEFAULT CURRENT_DATE,
  pago BOOLEAN DEFAULT false,
  data_pagamento DATE,
  criado_em TIMESTAMP DEFAULT NOW()
);

-- Fornecedores
CREATE TABLE IF NOT EXISTS fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(150) NOT NULL,
  telefone VARCHAR(20),
  observacao TEXT,
  criado_em TIMESTAMP DEFAULT NOW()
);

-- ==============================================
-- Dados iniciais
-- ==============================================
INSERT INTO insumos (nome, tipo, unidade) VALUES
  ('Milho a granel', 'graos', 'kg'),
  ('Milho em saco',  'graos', 'saco'),
  ('Soja',           'proteina', 'kg'),
  ('Mineral',        'mineral', 'kg')
ON CONFLICT DO NOTHING;
