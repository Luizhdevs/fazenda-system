/**
 * Mock do pool do PostgreSQL.
 * Usa jest.fn() dentro do factory do jest.mock para evitar
 * o problema de Temporal Dead Zone com const/let.
 *
 * Cada test file deve fazer:
 *   const { mockQuery, mockClient } = require('./helpers/mockPool');
 *
 * O jest.mock é hoisted automaticamente pelo babel/jest.
 */

const mockRelease = jest.fn();

const mockClient = {
  query: jest.fn(),
  release: mockRelease,
};

const mockQuery   = jest.fn();
const mockConnect = jest.fn().mockResolvedValue(mockClient);

// Usa factory function para evitar TDZ
jest.mock('../../config/database', () => ({
  query:   (...args) => mockQuery(...args),
  connect: (...args) => mockConnect(...args),
}));

module.exports = { mockQuery, mockConnect, mockClient, mockRelease };
