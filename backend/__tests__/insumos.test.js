const request = require('supertest');
const { mockQuery } = require('./helpers/mockPool');
const { tokenComFazenda } = require('./helpers/tokens');

const app = require('../src/app');

const AUTH = { Authorization: `Bearer ${tokenComFazenda()}` };

beforeEach(() => {
  jest.resetAllMocks();
  mockQuery.mockResolvedValue({ rows: [] });
});

// ─── GET /api/insumos ─────────────────────────────────────────────────────────

describe('GET /api/insumos', () => {
  test('lista insumos da fazenda ordenados por nome', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 1, nome: 'Milho', tipo: 'racao', unidade: 'kg' },
        { id: 2, nome: 'Soja', tipo: 'racao', unidade: 'saco' },
      ],
    });

    const res = await request(app).get('/api/insumos').set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });
});

// ─── POST /api/insumos ────────────────────────────────────────────────────────

describe('POST /api/insumos', () => {
  // BUG ESPERADO: sem validação de campos obrigatórios
  test('[BUG] cria insumo sem nome — deveria retornar 400', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, nome: null }] });

    const res = await request(app)
      .post('/api/insumos')
      .set(AUTH)
      .send({}); // sem nome
    expect(res.status).toBe(201); // confirma ausência de validação
  });

  test('usa peso_por_unidade = 1 quando unidade é kg', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, nome: 'Ração', unidade: 'kg', peso_por_unidade: '1' }] });

    const res = await request(app)
      .post('/api/insumos')
      .set(AUTH)
      .send({ nome: 'Ração', tipo: 'racao', unidade: 'kg', peso_por_unidade: 50 }); // peso ignorado
    expect(res.status).toBe(201);

    const params = mockQuery.mock.calls[0][1];
    expect(params[3]).toBe(1); // peso_por_unidade deve ser 1 para kg
  });

  test('usa peso_por_unidade informado quando unidade não é kg', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 2, nome: 'Ração', unidade: 'saco', peso_por_unidade: '50' }] });

    const res = await request(app)
      .post('/api/insumos')
      .set(AUTH)
      .send({ nome: 'Ração', tipo: 'racao', unidade: 'saco', peso_por_unidade: 50 });
    expect(res.status).toBe(201);

    const params = mockQuery.mock.calls[0][1];
    expect(params[3]).toBe(50); // peso_por_unidade deve ser o informado
  });

  test('usa peso_por_unidade = 1 como padrão quando não informado para unidade não-kg', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 3, nome: 'X', unidade: 'litro', peso_por_unidade: '1' }] });

    await request(app)
      .post('/api/insumos')
      .set(AUTH)
      .send({ nome: 'X', unidade: 'litro' }); // sem peso_por_unidade

    const params = mockQuery.mock.calls[0][1];
    expect(params[3]).toBe(1); // fallback para 1
  });
});

// ─── PUT /api/insumos/:id ─────────────────────────────────────────────────────

describe('PUT /api/insumos/:id', () => {
  test('retorna 404 quando insumo não pertence à fazenda', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put('/api/insumos/999')
      .set(AUTH)
      .send({ nome: 'X', tipo: 'racao', unidade: 'kg' });
    expect(res.status).toBe(404);
  });

  test('atualiza insumo com sucesso', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, nome: 'Milho Atualizado', unidade: 'kg' }],
    });

    const res = await request(app)
      .put('/api/insumos/1')
      .set(AUTH)
      .send({ nome: 'Milho Atualizado', tipo: 'racao', unidade: 'kg' });
    expect(res.status).toBe(200);
    expect(res.body.nome).toBe('Milho Atualizado');
  });
});

// ─── DELETE /api/insumos/:id ──────────────────────────────────────────────────

describe('DELETE /api/insumos/:id', () => {
  // BUG: hard delete sem verificar se registro existe (não retorna 404)
  test('[BUG] deleta insumo inexistente e retorna success:true', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await request(app).delete('/api/insumos/99999').set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true); // sem 404
  });

  // BUG: é um hard delete, não soft delete como o restante do sistema
  test('[BUG] DELETE de insumo é permanente (hard delete), diferente dos outros recursos', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    await request(app).delete('/api/insumos/1').set(AUTH);

    const sql = mockQuery.mock.calls[0][0];
    // insumos usa DELETE real, não UPDATE SET ativo=false
    expect(sql).toMatch(/^DELETE FROM insumos/i);
  });
});
