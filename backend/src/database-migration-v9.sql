-- Migration v9: campo superadmin na tabela usuarios
-- O primeiro usuário criado via /setup vira superadmin automaticamente.
-- Superadmins podem: ver todos os usuários, criar novas fazendas, ativar/desativar usuários.

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS superadmin BOOLEAN NOT NULL DEFAULT false;

-- O usuário mais antigo do sistema (o que fez o setup) vira superadmin
UPDATE usuarios
SET superadmin = true
WHERE id = (SELECT id FROM usuarios ORDER BY criado_em ASC LIMIT 1);
