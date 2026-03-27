-- ==========================================================================
-- MIGRATION V5 — Encargos nos Funcionários
-- ==========================================================================
-- Como executar: Neon Dashboard > SQL Editor > cole tudo e clique Run
-- ==========================================================================

BEGIN;

ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS vale_transporte   DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS vale_alimentacao  DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS encargos_patronais DECIMAL(10,2) NOT NULL DEFAULT 0;

COMMIT;
