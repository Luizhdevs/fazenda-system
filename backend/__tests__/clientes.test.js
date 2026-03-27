const request = require('supertest');
const { mockQuery, mockConnect, mockClient } = require('./helpers/mockPool');
const { tokenComFazenda } = require('./helpers/tokens');

const app = require('../src/app');

const AUTH = { Authorization: `Bearer ${tokenComFazenda()}` };

beforeEach(() => {
  jest.resetAllMocks();
  mockConnect.mockResolvedValue(mockClient);
  mockClient.query.mockResolvedValue({ rows: [] });
  mockQuery.mockResolvedValue({ rows: [] });
});

// ─── GET /api/clientes ────────────────────────────────────────────────────────

describe('GET /api/clientes', () => {
  test('lista clientes com totais de débito', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, nome: 'João', total_devido: '150.00', qtd_debitos: '2' }],
    });

    const res = await request(app).get('/api/clientes').set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].nome).toBe('João');
  });

  test('retorna 401 sem token', async () => {
    const res = await request(app).get('/api/clientes');
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/clientes/:id ────────────────────────────────────────────────────

describe('GET /api/clientes/:id', () => {
  test('retorna 404 quando cliente não pertence à fazenda', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/clientes/999').set(AUTH);
    expect(res.status).toBe(404);
  });

  test('retorna cliente com débitos', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 1, nome: 'João', fazenda_id: 10 }] })
      .mockResolvedValueOnce({ rows: [{ id: 5, valor: '50.00', pago: false }] })
      .mockResolvedValueOnce({ rows: [{ total_devido: '50.00', total_pago: '0.00' }] });

    const res = await request(app).get('/api/clientes/1').set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.debitos).toHaveLength(1);
    expect(res.body.total_devido).toBe('50.00');
  });
});

// ─── POST /api/clientes ───────────────────────────────────────────────────────

describe('POST /api/clientes', () => {
  // BUG ESPERADO: não há validação de campo obrigatório "nome"
  test('[BUG] cria cliente sem nome — deveria retornar 400 mas retorna 201', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 2, nome: null, fazenda_id: 10 }] });

    const res = await request(app).post('/api/clientes').set(AUTH).send({});
    // O sistema aceita sem nome — isso é um bug
    expect(res.status).toBe(201);
  });

  test('cria cliente com nome', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 2, nome: 'Maria', fazenda_id: 10 }] });

    const res = await request(app).post('/api/clientes').set(AUTH).send({ nome: 'Maria' });
    expect(res.status).toBe(201);
    expect(res.body.nome).toBe('Maria');
  });
});

// ─── PUT /api/clientes/:id ────────────────────────────────────────────────────

describe('PUT /api/clientes/:id', () => {
  test('retorna 404 quando cliente não encontrado ou de outra fazenda', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).put('/api/clientes/999').set(AUTH).send({ nome: 'X' });
    expect(res.status).toBe(404);
  });

  test('atualiza cliente com sucesso', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, nome: 'João Atualizado' }] });

    const res = await request(app).put('/api/clientes/1').set(AUTH).send({ nome: 'João Atualizado' });
    expect(res.status).toBe(200);
    expect(res.body.nome).toBe('João Atualizado');
  });
});

// ─── DELETE /api/clientes/:id ─────────────────────────────────────────────────

describe('DELETE /api/clientes/:id', () => {
  // BUG ESPERADO: retorna success:true mesmo quando cliente não existe
  test('[BUG] deleta cliente inexistente e retorna success:true', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await request(app).delete('/api/clientes/99999').set(AUTH);
    // Deveria retornar 404, mas retorna 200
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('soft-deleta cliente existente', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const res = await request(app).delete('/api/clientes/1').set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ─── POST /api/clientes/:id/debitos ──────────────────────────────────────────

describe('POST /api/clientes/:id/debitos', () => {
  test('retorna 404 quando cliente não pertence à fazenda', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // dono check

    const res = await request(app)
      .post('/api/clientes/1/debitos')
      .set(AUTH)
      .send({ descricao: 'Dívida', valor: 100, data_debito: '2025-03-01' });
    expect(res.status).toBe(404);
  });

  test('registra débito com sucesso', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // dono check
      .mockResolvedValueOnce({ rows: [{ id: 5, cliente_id: 1, valor: '100.00' }] }); // INSERT

    const res = await request(app)
      .post('/api/clientes/1/debitos')
      .set(AUTH)
      .send({ descricao: 'Dívida', valor: 100, data_debito: '2025-03-01' });
    expect(res.status).toBe(201);
    expect(res.body.valor).toBe('100.00');
  });
});

// ─── PATCH /api/clientes/debitos/:id/pagar ───────────────────────────────────

describe('PATCH /api/clientes/debitos/:id/pagar', () => {
  test('retorna 404 quando débito não encontrado', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [] }); // SELECT debito

    const res = await request(app)
      .patch('/api/clientes/debitos/999/pagar')
      .set(AUTH);
    expect(res.status).toBe(404);
  });

  test('marca débito como pago e gera receita', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({
        rows: [{ id: 5, valor: '100.00', descricao: 'Dívida', cliente_nome: 'João', fazenda_id: 10 }],
      }) // SELECT debito
      .mockResolvedValueOnce({ rows: [] }) // UPDATE debitos
      .mockResolvedValueOnce({ rows: [] }) // INSERT receitas
      .mockResolvedValueOnce({ rows: [] }); // COMMIT

    const res = await request(app)
      .patch('/api/clientes/debitos/5/pagar')
      .set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verifica que receita foi registrada (4ª chamada ao client.query)
    const chamadas = mockClient.query.mock.calls;
    const insertReceita = chamadas.find(c => typeof c[0] === 'string' && c[0].includes('INSERT INTO receitas'));
    expect(insertReceita).toBeDefined();
  });
});
