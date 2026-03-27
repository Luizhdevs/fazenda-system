-- ==========================================================================
-- MIGRATION V6 — Conversão de unidade nos insumos
-- ==========================================================================
-- Adiciona peso_por_unidade: quantos kg equivale cada unidade do insumo
-- Ex: 1 saco de milho = 60 kg → peso_por_unidade = 60
-- Para insumos em kg, o valor é 1 (padrão)
-- ==========================================================================

ALTER TABLE insumos ADD COLUMN IF NOT EXISTS peso_por_unidade DECIMAL(10,4) NOT NULL DEFAULT 1;
