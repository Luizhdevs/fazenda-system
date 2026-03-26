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

-- Estoque atual de cada insumo
CREATE TABLE IF NOT EXISTS estoques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insumo_id UUID UNIQUE REFERENCES insumos(id),
  quantidade_atual DECIMAL(10,2) NOT NULL DEFAULT 0,
  custo_medio DECIMAL(10,2) NOT NULL DEFAULT 0,
  atualizado_em TIMESTAMP DEFAULT NOW()
);

-- Produções de ração
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

-- Insumos usados em cada produção
CREATE TABLE IF NOT EXISTS itens_producao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producao_id UUID REFERENCES producoes_racao(id) ON DELETE CASCADE,
  insumo_id UUID REFERENCES insumos(id),
  quantidade_usada DECIMAL(10,2) NOT NULL,
  custo_unitario DECIMAL(10,2) NOT NULL,
  custo_parcial DECIMAL(10,2) GENERATED ALWAYS AS (quantidade_usada * custo_unitario) STORED
);

-- Vendas (ração, fubá, milho em saco, outros)
CREATE TABLE IF NOT EXISTS vendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto VARCHAR(100) NOT NULL, -- 'racao', 'fuba', 'milho_saco', 'outro'
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

-- ==============================================
-- Dados iniciais de insumos
-- ==============================================
INSERT INTO insumos (nome, tipo, unidade) VALUES
  ('Milho a granel', 'graos', 'kg'),
  ('Milho em saco', 'graos', 'saco'),
  ('Soja', 'proteina', 'kg'),
  ('Mineral', 'mineral', 'kg')
ON CONFLICT DO NOTHING;
