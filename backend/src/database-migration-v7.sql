-- ==========================================================================
-- MIGRATION V7 — peso_por_unidade nos produtos
-- ==========================================================================
-- Igual ao insumos: saber quantos kg equivale cada unidade do produto
-- Ex: 1 saco de Ração = 50 kg → peso_por_unidade = 50
-- Para produtos em kg, o valor é 1 (padrão)
-- ==========================================================================

ALTER TABLE produtos ADD COLUMN IF NOT EXISTS peso_por_unidade DECIMAL(10,4) NOT NULL DEFAULT 1;
