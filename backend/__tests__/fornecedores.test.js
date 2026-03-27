const request = require('supertest');
const { mockQuery } = require('./helpers/mockPool');
const { tokenComFazenda } = require('./helpers/tokens');

const app = require('../src/app');

const AUTH = { Authorization: `Bearer ${tokenComFazenda()}` };

beforeEach(() => {
  jest.resetAllMocks();
  mockQuery.mockResolvedValue({ rows: [] });
});

describe('GET /api/fornecedores', () => {
  test('lista fornecedores ativos da fazenda', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, nome: 'Agro S.A.', telefone: '99999' }],
    });

    const res = await request(app).get('/api/fornecedores').set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body[0].nome).toBe('Agro S.A.');
  });
});

describe('GET /api/fornecedores/:id', () => {
  test('retorna 404 quando não pertence à fazenda', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/fornecedores/999').set(AUTH);
    expect(res.status).toBe(404);
  });

  test('retorna fornecedor', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, nome: 'Agro S.A.' }] });

    const res = await request(app).get('/api/fornecedores/1').set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.nome).toBe('Agro S.A.');
  });
});

describe('POST /api/fornecedores', () => {
  // BUG ESPERADO: sem validação de campo obrigatório "nome"
  test('[BUG] cria fornecedor sem nome — deveria retornar 400', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, nome: null }] });

    const res = await request(app).post('/api/fornecedores').set(AUTH).send({});
    expect(res.status).toBe(201); // sem validação
  });

  test('cria fornecedor com nome', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 2, nome: 'Vet Insumos', telefone: null }] });

    const res = await request(app)
      .post('/api/fornecedores')
      .set(AUTH)
      .send({ nome: 'Vet Insumos' });
    expect(res.status).toBe(201);
    expect(res.body.nome).toBe('Vet Insumos');
  });
});

describe('PUT /api/fornecedores/:id', () => {
  test('retorna 404 quando não pertence à fazenda', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).put('/api/fornecedores/999').set(AUTH).send({ nome: 'X' });
    expect(res.status).toBe(404);
  });

  test('atualiza fornecedor', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, nome: 'Agro Novo' }] });

    const res = await request(app).put('/api/fornecedores/1').set(AUTH).send({ nome: 'Agro Novo' });
    expect(res.status).toBe(200);
    expect(res.body.nome).toBe('Agro Novo');
  });
});

describe('DELETE /api/fornecedores/:id', () => {
  // BUG ESPERADO: retorna success:true mesmo para IDs inexistentes
  test('[BUG] deleta fornecedor inexistente sem retornar 404', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await request(app).delete('/api/fornecedores/99999').set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('soft-deleta fornecedor', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    await request(app).delete('/api/fornecedores/1').set(AUTH);

    const sql = mockQuery.mock.calls[0][0];
    expect(sql).toMatch(/UPDATE fornecedores SET ativo = false/i);
  });
});
