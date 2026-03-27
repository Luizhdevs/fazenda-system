const request = require('supertest');
const { mockQuery } = require('./helpers/mockPool');
const { tokenComFazenda } = require('./helpers/tokens');

const app = require('../src/app');

const AUTH = { Authorization: `Bearer ${tokenComFazenda()}` };

beforeEach(() => {
  jest.resetAllMocks();
  mockQuery.mockResolvedValue({ rows: [] });
});

// ─── GET /api/produtos ────────────────────────────────────────────────────────

describe('GET /api/produtos', () => {
  test('lista produtos ativos com custo_producao calculado', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, nome: 'Queijo', unidade: 'kg', custo_producao: '12.50', ativo: true }],
    });

    const res = await request(app).get('/api/produtos').set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body[0].custo_producao).toBe('12.50');
  });
});

// ─── POST /api/produtos ───────────────────────────────────────────────────────

describe('POST /api/produtos', () => {
  // BUG ESPERADO: sem validação de campo obrigatório "nome"
  test('[BUG] cria produto sem nome — deveria retornar 400', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, nome: null }] });

    const res = await request(app).post('/api/produtos').set(AUTH).send({});
    expect(res.status).toBe(201); // confirma ausência de validação
  });

  test('peso_por_unidade = 1 quando unidade = kg', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, nome: 'Leite', unidade: 'kg', peso_por_unidade: '1' }] });

    await request(app).post('/api/produtos').set(AUTH).send({ nome: 'Leite', unidade: 'kg', peso_por_unidade: 10 });

    const params = mockQuery.mock.calls[0][1];
    expect(params[2]).toBe(1); // peso deve ser 1 para kg
  });

  test('usa peso_por_unidade informado quando unidade não é kg', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 2, nome: 'Queijo', unidade: 'peça', peso_por_unidade: '0.5' }] });

    await request(app).post('/api/produtos').set(AUTH).send({ nome: 'Queijo', unidade: 'peça', peso_por_unidade: 0.5 });

    const params = mockQuery.mock.calls[0][1];
    expect(params[2]).toBe(0.5);
  });
});

// ─── PUT /api/produtos/:id ────────────────────────────────────────────────────

describe('PUT /api/produtos/:id', () => {
  test('retorna 404 quando produto não pertence à fazenda', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).put('/api/produtos/999').set(AUTH).send({ nome: 'X', unidade: 'kg' });
    expect(res.status).toBe(404);
  });

  test('atualiza produto com sucesso', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, nome: 'Leite Integral', unidade: 'litro' }] });

    const res = await request(app).put('/api/produtos/1').set(AUTH).send({ nome: 'Leite Integral', unidade: 'litro' });
    expect(res.status).toBe(200);
    expect(res.body.nome).toBe('Leite Integral');
  });
});

// ─── DELETE /api/produtos/:id ─────────────────────────────────────────────────

describe('DELETE /api/produtos/:id', () => {
  // BUG: retorna success:true mesmo quando produto não existe
  test('[BUG] deleta produto inexistente sem retornar 404', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await request(app).delete('/api/produtos/99999').set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('soft-deleta produto', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    await request(app).delete('/api/produtos/1').set(AUTH);

    const sql = mockQuery.mock.calls[0][0];
    expect(sql).toMatch(/UPDATE produtos SET ativo = false/i);
  });
});

// ─── GET /api/produtos/:id/insumos ────────────────────────────────────────────

describe('GET /api/produtos/:id/insumos (ficha técnica)', () => {
  test('retorna 404 quando produto não pertence à fazenda', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // dono check

    const res = await request(app).get('/api/produtos/999/insumos').set(AUTH);
    expect(res.status).toBe(404);
  });

  test('retorna ficha técnica com insumos e subprodutos', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // dono check
      .mockResolvedValueOnce({
        rows: [
          { id: 10, componente_id: 3, componente_nome: 'Leite', tipo_componente: 'insumo', quantidade_por_unidade: 2 },
          { id: 11, componente_id: 5, componente_nome: 'Coalhada', tipo_componente: 'produto', quantidade_por_unidade: 1 },
        ],
      });

    const res = await request(app).get('/api/produtos/1/insumos').set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });
});

// ─── POST /api/produtos/:id/insumos ───────────────────────────────────────────

describe('POST /api/produtos/:id/insumos (ficha técnica)', () => {
  test('retorna 400 sem quantidade_por_unidade', async () => {
    const res = await request(app)
      .post('/api/produtos/1/insumos')
      .set(AUTH)
      .send({ insumo_id: 3 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/quantidade_por_unidade/i);
  });

  test('retorna 400 sem insumo_id nem componente_produto_id', async () => {
    const res = await request(app)
      .post('/api/produtos/1/insumos')
      .set(AUTH)
      .send({ quantidade_por_unidade: 2 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/insumo_id|componente_produto_id/i);
  });

  test('retorna 400 quando produto tenta ser componente de si mesmo', async () => {
    const res = await request(app)
      .post('/api/produtos/1/insumos')
      .set(AUTH)
      .send({ componente_produto_id: '1', quantidade_por_unidade: 1 }); // id '1' == req.params.id '1'
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/si mesmo/i);
  });

  test('adiciona insumo à ficha técnica com upsert', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // dono check
      .mockResolvedValueOnce({ rows: [{ id: 20, produto_id: 1, insumo_id: 3, quantidade_por_unidade: 2 }] }); // INSERT/upsert

    const res = await request(app)
      .post('/api/produtos/1/insumos')
      .set(AUTH)
      .send({ insumo_id: 3, quantidade_por_unidade: 2 });
    expect(res.status).toBe(201);
    expect(res.body.insumo_id).toBe(3);
  });
});

// ─── DELETE /api/produtos/:id/insumos/:item_id ────────────────────────────────

describe('DELETE /api/produtos/:id/insumos/:item_id', () => {
  test('retorna 404 quando produto não pertence à fazenda', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).delete('/api/produtos/999/insumos/20').set(AUTH);
    expect(res.status).toBe(404);
  });

  test('remove componente da ficha técnica', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // dono
      .mockResolvedValueOnce({ rows: [] }); // DELETE

    const res = await request(app).delete('/api/produtos/1/insumos/20').set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
