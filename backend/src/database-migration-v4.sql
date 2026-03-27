-- ==========================================================================
-- MIGRATION V4 — Módulo de Funcionários
-- ==========================================================================
-- Como executar: Neon Dashboard > SQL Editor > cole tudo e clique Run
-- ==========================================================================

BEGIN;

-- ─── 1. Tabela de funcionários ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS funcionarios (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fazenda_id     UUID NOT NULL REFERENCES fazendas(id) ON DELETE CASCADE,
  nome           VARCHAR(150) NOT NULL,
  cargo          VARCHAR(100),
  salario        DECIMAL(10,2) NOT NULL DEFAULT 0,
  data_admissao  DATE,
  observacao     TEXT,
  ativo          BOOLEAN NOT NULL DEFAULT true,
  criado_em      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_funcionarios_fazenda ON funcionarios(fazenda_id);

-- ─── 2. Adicionar funcionario_id em despesas ──────────────────────────────
-- Permite rastrear quais despesas são pagamentos de funcionários

ALTER TABLE despesas ADD COLUMN IF NOT EXISTS funcionario_id UUID REFERENCES funcionarios(id);

COMMIT;
