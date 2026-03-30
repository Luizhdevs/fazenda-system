/**
 * Gera tokens JWT de teste sem precisar do banco.
 */
const jwt = require('jsonwebtoken');

const SECRET = 'test-secret-key';
process.env.JWT_SECRET = SECRET;
process.env.DATABASE_URL = 'postgresql://fake';

function tokenBase(overrides = {}) {
  return jwt.sign(
    { id: 1, email: 'test@fazenda.com', nome: 'Teste', avatar_url: null, superadmin: false, ...overrides },
    SECRET,
    { expiresIn: '1h' }
  );
}

function tokenSuperAdmin(overrides = {}) {
  return jwt.sign(
    { id: 1, email: 'test@fazenda.com', nome: 'Teste', avatar_url: null, superadmin: true, ...overrides },
    SECRET,
    { expiresIn: '1h' }
  );
}

function tokenComFazenda(overrides = {}) {
  return jwt.sign(
    {
      id: 1,
      email: 'test@fazenda.com',
      nome: 'Teste',
      avatar_url: null,
      fazenda_id: 10,
      fazenda_nome: 'Fazenda Teste',
      papel: 'admin',
      ...overrides,
    },
    SECRET,
    { expiresIn: '1h' }
  );
}

module.exports = { tokenBase, tokenComFazenda, tokenSuperAdmin, SECRET };
