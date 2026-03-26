-- ==========================================================================
-- MIGRATION V2 — Usuários, isolamento de dados e integridade referencial
-- ==========================================================================
-- Como executar:
--   Acesse o Neon Dashboard > SQL Editor e cole este arquivo inteiro.
--   Ou via psql: psql $DATABASE_URL -f database-migration-v2.sql
--
-- Após rodar: o sistema terá 0 usuários cadastrados.
-- O primeiro acesso abrirá a tela de "Configuração Inicial" para criar
-- o usuário administrador e vincular todos os dados existentes a ele.
-- ==========================================================================

BEGIN;

-- ─── 1. Tabela de usuários ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS usuarios (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome          VARCHAR(150) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  senha_hash    VARCHAR(255),         -- NULL para usuários somente-Google
  google_id     VARCHAR(100) UNIQUE,  -- NULL para usuários email/senha
  avatar_url    TEXT,
  ativo         BOOLEAN NOT NULL DEFAULT true,
  criado_em     TIMESTAMP NOT NULL DEFAULT NOW(),
  ultimo_acesso TIMESTAMP NOT NULL DEFAULT NOW(),
  -- Precisa ter pelo menos um método de autenticação
  CONSTRAINT chk_auth_method CHECK (
    senha_hash IS NOT NULL OR google_id IS NOT NULL
  )
);

-- ─── 2. Colunas faltando em tabelas existentes ────────────────────────────

-- clientes e fornecedores usam soft delete mas faltava a coluna no schema
ALTER TABLE clientes     ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT true;

-- debitos é inserido com observacao mas a coluna pode não existir
ALTER TABLE debitos ADD COLUMN IF NOT EXISTS observacao TEXT;

-- ─── 3. Novas FKs semânticas ─────────────────────────────────────────────

-- compras.fornecedor era texto livre — agora pode ter FK opcional
ALTER TABLE compras ADD COLUMN IF NOT EXISTS fornecedor_id UUID;
ALTER TABLE compras
  DROP CONSTRAINT IF EXISTS compras_fornecedor_id_fkey;
ALTER TABLE compras
  ADD CONSTRAINT compras_fornecedor_id_fkey
  FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id) ON DELETE SET NULL;

-- vendas.cliente era texto livre — agora pode ter FK opcional
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS cliente_id UUID;
ALTER TABLE vendas
  DROP CONSTRAINT IF EXISTS vendas_cliente_id_fkey;
ALTER TABLE vendas
  ADD CONSTRAINT vendas_cliente_id_fkey
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL;

-- ─── 4. Melhorar ON DELETE nas FKs existentes ────────────────────────────

-- compras.insumo_id: manter histórico mesmo se insumo for deletado
ALTER TABLE compras DROP CONSTRAINT IF EXISTS compras_insumo_id_fkey;
ALTER TABLE compras
  ADD CONSTRAINT compras_insumo_id_fkey
  FOREIGN KEY (insumo_id) REFERENCES insumos(id) ON DELETE SET NULL;

-- estoques: se insumo deletado, remove o registro de estoque também
ALTER TABLE estoques DROP CONSTRAINT IF EXISTS estoques_insumo_id_fkey;
ALTER TABLE estoques
  ADD CONSTRAINT estoques_insumo_id_fkey
  FOREIGN KEY (insumo_id) REFERENCES insumos(id) ON DELETE CASCADE;

-- estoque_produtos: cascateia com o produto
ALTER TABLE estoque_produtos DROP CONSTRAINT IF EXISTS estoque_produtos_produto_id_fkey;
ALTER TABLE estoque_produtos
  ADD CONSTRAINT estoque_produtos_produto_id_fkey
  FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE;

-- vendas.produto_id: preserva histórico se produto for desativado/deletado
ALTER TABLE vendas DROP CONSTRAINT IF EXISTS vendas_produto_id_fkey;
ALTER TABLE vendas
  ADD CONSTRAINT vendas_produto_id_fkey
  FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE SET NULL;

-- itens_producao.insumo_id: preserva histórico
ALTER TABLE itens_producao DROP CONSTRAINT IF EXISTS itens_producao_insumo_id_fkey;
ALTER TABLE itens_producao
  ADD CONSTRAINT itens_producao_insumo_id_fkey
  FOREIGN KEY (insumo_id) REFERENCES insumos(id) ON DELETE SET NULL;

-- ─── 5. Coluna usuario_id em todas as tabelas principais ─────────────────

ALTER TABLE insumos      ADD COLUMN IF NOT EXISTS usuario_id UUID;
ALTER TABLE compras      ADD COLUMN IF NOT EXISTS usuario_id UUID;
ALTER TABLE produtos     ADD COLUMN IF NOT EXISTS usuario_id UUID;
ALTER TABLE vendas       ADD COLUMN IF NOT EXISTS usuario_id UUID;
ALTER TABLE receitas     ADD COLUMN IF NOT EXISTS usuario_id UUID;
ALTER TABLE despesas     ADD COLUMN IF NOT EXISTS usuario_id UUID;
ALTER TABLE clientes     ADD COLUMN IF NOT EXISTS usuario_id UUID;
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS usuario_id UUID;

-- FKs para usuarios (cascateia: se usuário deletado, seus dados somem)
ALTER TABLE insumos      DROP CONSTRAINT IF EXISTS insumos_usuario_id_fkey;
ALTER TABLE compras      DROP CONSTRAINT IF EXISTS compras_usuario_id_fkey;
ALTER TABLE produtos     DROP CONSTRAINT IF EXISTS produtos_usuario_id_fkey;
ALTER TABLE vendas       DROP CONSTRAINT IF EXISTS vendas_usuario_id_fkey;
ALTER TABLE receitas     DROP CONSTRAINT IF EXISTS receitas_usuario_id_fkey;
ALTER TABLE despesas     DROP CONSTRAINT IF EXISTS despesas_usuario_id_fkey;
ALTER TABLE clientes     DROP CONSTRAINT IF EXISTS clientes_usuario_id_fkey;
ALTER TABLE fornecedores DROP CONSTRAINT IF EXISTS fornecedores_usuario_id_fkey;

ALTER TABLE insumos      ADD CONSTRAINT insumos_usuario_id_fkey      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE;
ALTER TABLE compras      ADD CONSTRAINT compras_usuario_id_fkey      FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE;
ALTER TABLE produtos     ADD CONSTRAINT produtos_usuario_id_fkey     FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE;
ALTER TABLE vendas       ADD CONSTRAINT vendas_usuario_id_fkey       FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE;
ALTER TABLE receitas     ADD CONSTRAINT receitas_usuario_id_fkey     FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE;
ALTER TABLE despesas     ADD CONSTRAINT despesas_usuario_id_fkey     FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE;
ALTER TABLE clientes     ADD CONSTRAINT clientes_usuario_id_fkey     FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE;
ALTER TABLE fornecedores ADD CONSTRAINT fornecedores_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE;

-- Nota: usuario_id fica NULLABLE aqui. Será definido como NOT NULL
-- após o primeiro usuário "reivindicar" os dados existentes via /api/auth/setup.

-- ─── 6. Índices para performance ─────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_insumos_usuario      ON insumos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_compras_usuario      ON compras(usuario_id);
CREATE INDEX IF NOT EXISTS idx_produtos_usuario     ON produtos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_vendas_usuario       ON vendas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_receitas_usuario     ON receitas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_despesas_usuario     ON despesas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_clientes_usuario     ON clientes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_fornecedores_usuario ON fornecedores(usuario_id);

COMMIT;

-- ==========================================================================
-- PRÓXIMOS PASSOS após rodar esta migration:
-- 1. Reinicie o backend
-- 2. Acesse o app — você será redirecionado para a tela de Setup
-- 3. Crie sua conta (email/senha ou Google)
-- 4. Todos os dados existentes serão vinculados à sua conta
-- ==========================================================================
