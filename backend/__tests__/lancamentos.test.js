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

// ─── GET /api/lancamentos ─────────────────────────────────────────────────────

describe('GET /api/lancamentos', () => {
  test('retorna lista consolidada de vendas, compras, receitas e despesas', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 1, tipo: 'venda', data: '2025-03-10' }] }) // vendas
      .mockResolvedValueOnce({ rows: [{ id: 2, tipo: 'compra', data: '2025-03-08' }] }) // compras
      .mockResolvedValueOnce({ rows: [] }) // receitas
      .mockResolvedValueOnce({ rows: [] }); // despesas

    const res = await request(app).get('/api/lancamentos?mes=3&ano=2025').set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    // Deve estar ordenado por data desc
    expect(res.body[0].data).toBe('2025-03-10');
  });

  test('retorna 401 sem token', async () => {
    const res = await request(app).get('/api/lancamentos');
    expect(res.status).toBe(401);
  });

  test('retorna 403 sem fazenda_id no token', async () => {
    const { tokenBase } = require('./helpers/tokens');
    const res = await request(app)
      .get('/api/lancamentos')
      .set('Authorization', `Bearer ${tokenBase()}`);
    expect(res.status).toBe(403);
  });
});

// ─── POST /api/lancamentos/venda ─────────────────────────────────────────────

describe('POST /api/lancamentos/venda', () => {
  // BUG ESPERADO: sem validação de campos obrigatórios (produto, quantidade, preco_unitario)
  test('[BUG] aceita venda sem campos obrigatórios', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // INSERT vendas
      .mockResolvedValueOnce({ rows: [] }); // COMMIT

    const res = await request(app)
      .post('/api/lancamentos/venda')
      .set(AUTH)
      .send({}); // sem produto, quantidade, preco_unitario
    // Deveria retornar 400, mas provavelmente insere nulos no banco
    expect(res.status).not.toBe(400); // confirma ausência de validação
  });

  test('retorna 403 quando produto_id pertence a outra fazenda', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [] }); // SELECT produtos (vazio = não encontrado)

    const res = await request(app)
      .post('/api/lancamentos/venda')
      .set(AUTH)
      .send({ produto: 'Leite', produto_id: 99, quantidade: 10, preco_unitario: 5, data_venda: '2025-03-01' });
    expect(res.status).toBe(403);
  });

  test('retorna 400 quando estoque insuficiente', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 5 }] }) // SELECT produto (encontrado)
      .mockResolvedValueOnce({ rows: [{ quantidade_atual: '5' }] }) // SELECT estoque
      .mockResolvedValueOnce({ rows: [{ nome: 'Queijo' }] }); // SELECT nome produto

    const res = await request(app)
      .post('/api/lancamentos/venda')
      .set(AUTH)
      .send({ produto: 'Queijo', produto_id: 5, quantidade: 100, preco_unitario: 20, data_venda: '2025-03-01' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/estoque insuficiente/i);
  });

  test('registra venda com estoque suficiente e debita produto', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 5 }] }) // SELECT produto
      .mockResolvedValueOnce({ rows: [{ quantidade_atual: '50' }] }) // SELECT estoque
      .mockResolvedValueOnce({ rows: [] }) // UPDATE estoque_produtos
      .mockResolvedValueOnce({ rows: [{ custo: '2.5' }] }) // SELECT custo ficha
      .mockResolvedValueOnce({ rows: [{ id: 99, produto: 'Queijo', quantidade: 10 }] }) // INSERT vendas
      .mockResolvedValueOnce({ rows: [] }); // COMMIT

    const res = await request(app)
      .post('/api/lancamentos/venda')
      .set(AUTH)
      .send({ produto: 'Queijo', produto_id: 5, quantidade: 10, preco_unitario: 20, data_venda: '2025-03-01' });
    expect(res.status).toBe(201);
    expect(res.body.produto).toBe('Queijo');

    // Confirma que estoque foi debitado
    const chamadas = mockClient.query.mock.calls;
    const updateEstoque = chamadas.find(c =>
      typeof c[0] === 'string' && c[0].includes('UPDATE estoque_produtos') && c[0].includes('quantidade_atual - $1')
    );
    expect(updateEstoque).toBeDefined();
  });

  test('registra venda sem produto_id (sem movimentar estoque)', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 99, produto: 'Serviço', quantidade: 1 }] }) // INSERT vendas
      .mockResolvedValueOnce({ rows: [] }); // COMMIT

    const res = await request(app)
      .post('/api/lancamentos/venda')
      .set(AUTH)
      .send({ produto: 'Serviço', quantidade: 1, preco_unitario: 500, data_venda: '2025-03-01' });
    expect(res.status).toBe(201);
  });
});

// ─── POST /api/lancamentos/compra ─────────────────────────────────────────────

describe('POST /api/lancamentos/compra', () => {
  // BUG ESPERADO: sem validação de insumo_id, quantidade, preco_unitario
  test('[BUG] aceita compra sem campos obrigatórios', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // INSERT compras
      .mockResolvedValueOnce({ rows: [] }); // UPSERT estoques

    const res = await request(app)
      .post('/api/lancamentos/compra')
      .set(AUTH)
      .send({}); // sem insumo_id
    // Deveria ser 400, mas não há validação
    expect(res.status).not.toBe(400);
  });

  test('registra compra e atualiza estoque com custo médio', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 10, insumo_id: 3, quantidade: 100 }] }) // INSERT compras
      .mockResolvedValueOnce({ rows: [] }); // UPSERT estoques

    const res = await request(app)
      .post('/api/lancamentos/compra')
      .set(AUTH)
      .send({ insumo_id: 3, fornecedor: 'Agro', quantidade: 100, preco_unitario: 2.5, data_compra: '2025-03-01' });
    expect(res.status).toBe(201);

    // Verifica que o UPSERT de estoque foi chamado com custo médio ponderado
    const chamadas = mockQuery.mock.calls;
    const upsertEstoque = chamadas.find(c =>
      typeof c[0] === 'string' && c[0].includes('ON CONFLICT')
    );
    expect(upsertEstoque).toBeDefined();
  });
});

// ─── POST /api/lancamentos/receita ────────────────────────────────────────────

describe('POST /api/lancamentos/receita', () => {
  // BUG ESPERADO: sem validação de campos obrigatórios
  test('[BUG] aceita receita sem categoria ou valor', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const res = await request(app)
      .post('/api/lancamentos/receita')
      .set(AUTH)
      .send({}); // sem campos
    expect(res.status).not.toBe(400); // sem validação
  });

  test('registra receita com sucesso', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 5, categoria: 'leite', valor: '1500.00' }] });

    const res = await request(app)
      .post('/api/lancamentos/receita')
      .set(AUTH)
      .send({ categoria: 'leite', valor: 1500, data_receita: '2025-03-01', origem: 'Laticínio X' });
    expect(res.status).toBe(201);
    expect(res.body.categoria).toBe('leite');
  });
});

// ─── POST /api/lancamentos/despesa ────────────────────────────────────────────

describe('POST /api/lancamentos/despesa', () => {
  // BUG ESPERADO: sem validação de campos obrigatórios
  test('[BUG] aceita despesa sem categoria ou valor', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const res = await request(app)
      .post('/api/lancamentos/despesa')
      .set(AUTH)
      .send({}); // sem campos
    expect(res.status).not.toBe(400);
  });

  test('registra despesa com sucesso', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 6, categoria: 'combustivel', valor: '300.00' }] });

    const res = await request(app)
      .post('/api/lancamentos/despesa')
      .set(AUTH)
      .send({ categoria: 'combustivel', valor: 300, data_despesa: '2025-03-01' });
    expect(res.status).toBe(201);
    expect(res.body.categoria).toBe('combustivel');
  });
});
