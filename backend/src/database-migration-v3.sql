-- ==========================================================================
-- MIGRATION V3 — Fazendas como workspaces multi-usuário
-- ==========================================================================
-- Pré-requisito: migration v2 já executada
-- Como executar: Neon Dashboard > SQL Editor > cole tudo e clique Run
-- ==========================================================================

BEGIN;

-- ─── 1. Tabela de fazendas ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fazendas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        VARCHAR(150) NOT NULL,
  descricao   TEXT,
  ativo       BOOLEAN NOT NULL DEFAULT true,
  criado_em   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── 2. Vínculo usuário ↔ fazenda (com papel) ────────────────────────────

CREATE TABLE IF NOT EXISTS usuario_fazendas (
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  fazenda_id UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  papel      VARCHAR(20) NOT NULL DEFAULT 'membro', -- 'admin' | 'membro'
  criado_em  TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (usuario_id, fazenda_id)
);

-- ─── 3. Adicionar fazenda_id em todas as tabelas de dados ─────────────────

ALTER TABLE insumos      ADD COLUMN IF NOT EXISTS fazenda_id UUID REFERENCES fazendas(id) ON DELETE CASCADE;
ALTER TABLE compras      ADD COLUMN IF NOT EXISTS fazenda_id UUID REFERENCES fazendas(id) ON DELETE CASCADE;
ALTER TABLE produtos     ADD COLUMN IF NOT EXISTS fazenda_id UUID REFERENCES fazendas(id) ON DELETE CASCADE;
ALTER TABLE vendas       ADD COLUMN IF NOT EXISTS fazenda_id UUID REFERENCES fazendas(id) ON DELETE CASCADE;
ALTER TABLE receitas     ADD COLUMN IF NOT EXISTS fazenda_id UUID REFERENCES fazendas(id) ON DELETE CASCADE;
ALTER TABLE despesas     ADD COLUMN IF NOT EXISTS fazenda_id UUID REFERENCES fazendas(id) ON DELETE CASCADE;
ALTER TABLE clientes     ADD COLUMN IF NOT EXISTS fazenda_id UUID REFERENCES fazendas(id) ON DELETE CASCADE;
ALTER TABLE fornecedores ADD COLUMN IF NOT EXISTS fazenda_id UUID REFERENCES fazendas(id) ON DELETE CASCADE;

-- ─── 4. Migrar dados existentes ──────────────────────────────────────────
-- Para cada usuário existente: cria uma fazenda e migra seus dados

DO $$
DECLARE
  u RECORD;
  fid UUID;
BEGIN
  FOR u IN SELECT id, nome FROM usuarios LOOP
    -- Cria uma fazenda com o nome do usuário
    INSERT INTO fazendas (nome)
      VALUES (u.nome || ' — Fazenda')
      RETURNING id INTO fid;

    -- Vincula o usuário como admin dessa fazenda
    INSERT INTO usuario_fazendas (usuario_id, fazenda_id, papel)
      VALUES (u.id, fid, 'admin')
      ON CONFLICT DO NOTHING;

    -- Migra todos os dados do usuario_id para o fazenda_id
    UPDATE insumos      SET fazenda_id = fid WHERE usuario_id = u.id AND fazenda_id IS NULL;
    UPDATE compras      SET fazenda_id = fid WHERE usuario_id = u.id AND fazenda_id IS NULL;
    UPDATE produtos     SET fazenda_id = fid WHERE usuario_id = u.id AND fazenda_id IS NULL;
    UPDATE vendas       SET fazenda_id = fid WHERE usuario_id = u.id AND fazenda_id IS NULL;
    UPDATE receitas     SET fazenda_id = fid WHERE usuario_id = u.id AND fazenda_id IS NULL;
    UPDATE despesas     SET fazenda_id = fid WHERE usuario_id = u.id AND fazenda_id IS NULL;
    UPDATE clientes     SET fazenda_id = fid WHERE usuario_id = u.id AND fazenda_id IS NULL;
    UPDATE fornecedores SET fazenda_id = fid WHERE usuario_id = u.id AND fazenda_id IS NULL;
  END LOOP;

  -- Dados órfãos (sem usuario_id): agrupa em uma fazenda "Dados Importados"
  IF EXISTS (SELECT 1 FROM insumos WHERE fazenda_id IS NULL LIMIT 1) OR
     EXISTS (SELECT 1 FROM produtos WHERE fazenda_id IS NULL LIMIT 1) THEN
    INSERT INTO fazendas (nome) VALUES ('Dados Importados') RETURNING id INTO fid;
    UPDATE insumos      SET fazenda_id = fid WHERE fazenda_id IS NULL;
    UPDATE compras      SET fazenda_id = fid WHERE fazenda_id IS NULL;
    UPDATE produtos     SET fazenda_id = fid WHERE fazenda_id IS NULL;
    UPDATE vendas       SET fazenda_id = fid WHERE fazenda_id IS NULL;
    UPDATE receitas     SET fazenda_id = fid WHERE fazenda_id IS NULL;
    UPDATE despesas     SET fazenda_id = fid WHERE fazenda_id IS NULL;
    UPDATE clientes     SET fazenda_id = fid WHERE fazenda_id IS NULL;
    UPDATE fornecedores SET fazenda_id = fid WHERE fazenda_id IS NULL;
  END IF;
END $$;

-- ─── 5. Índices ───────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_insumos_fazenda      ON insumos(fazenda_id);
CREATE INDEX IF NOT EXISTS idx_compras_fazenda      ON compras(fazenda_id);
CREATE INDEX IF NOT EXISTS idx_produtos_fazenda     ON produtos(fazenda_id);
CREATE INDEX IF NOT EXISTS idx_vendas_fazenda       ON vendas(fazenda_id);
CREATE INDEX IF NOT EXISTS idx_receitas_fazenda     ON receitas(fazenda_id);
CREATE INDEX IF NOT EXISTS idx_despesas_fazenda     ON despesas(fazenda_id);
CREATE INDEX IF NOT EXISTS idx_clientes_fazenda     ON clientes(fazenda_id);
CREATE INDEX IF NOT EXISTS idx_fornecedores_fazenda ON fornecedores(fazenda_id);
CREATE INDEX IF NOT EXISTS idx_uf_fazenda           ON usuario_fazendas(fazenda_id);
CREATE INDEX IF NOT EXISTS idx_uf_usuario           ON usuario_fazendas(usuario_id);

COMMIT;

-- ==========================================================================
-- APÓS RODAR:
-- 1. Reinicie o backend
-- 2. No app, após login, você verá a tela para selecionar a fazenda
-- 3. A fazenda criada automaticamente terá o nome "[Seu nome] — Fazenda"
--    — você pode renomeá-la nas configurações depois
-- ==========================================================================
