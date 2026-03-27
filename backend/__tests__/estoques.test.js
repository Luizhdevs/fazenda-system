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

// ─── GET /api/estoques ────────────────────────────────────────────────────────

describe('GET /api/estoques', () => {
  test('lista insumos com saldo (incluindo zerados)', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { insumo_id: 1, nome: 'Milho', tipo: 'racao', unidade: 'kg', quantidade_atual: '50', custo_medio: '1.20', valor_total: '60' },
        { insumo_id: 2, nome: 'Soja', tipo: 'racao', unidade: 'saco', quantidade_atual: '0', custo_medio: '0', valor_total: '0' },
      ],
    });

    const res = await request(app).get('/api/estoques').set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[1].quantidade_atual).toBe('0'); // zerado deve aparecer
  });
});

// ─── POST /api/estoques/ajuste ────────────────────────────────────────────────

describe('POST /api/estoques/ajuste', () => {
  test('retorna 400 quando campos obrigatórios faltam', async () => {
    const res = await request(app).post('/api/estoques/ajuste').set(AUTH).send({});
    expect(res.status).toBe(400);
  });

  test('retorna 404 quando insumo não pertence à fazenda', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [] }); // SELECT insumos (não encontrado)

    const res = await request(app)
      .post('/api/estoques/ajuste')
      .set(AUTH)
      .send({ insumo_id: 99, tipo: 'entrada', quantidade: 10, preco_unitario: 2 });
    expect(res.status).toBe(404);
  });

  test('retorna 400 em entrada sem preço unitário', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // SELECT insumos
      .mockResolvedValueOnce({ rows: [] }); // SELECT estoque

    const res = await request(app)
      .post('/api/estoques/ajuste')
      .set(AUTH)
      .send({ insumo_id: 1, tipo: 'entrada', quantidade: 10, preco_unitario: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/preço unitário/i);
  });

  test('retorna 400 em saída com quantidade maior que estoque', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // SELECT insumos
      .mockResolvedValueOnce({ rows: [{ quantidade_atual: '5', custo_medio: '2' }] }); // SELECT estoque

    const res = await request(app)
      .post('/api/estoques/ajuste')
      .set(AUTH)
      .send({ insumo_id: 1, tipo: 'saida', quantidade: 100 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/insuficiente/i);
  });

  test('[BUG] tipo inválido (nem "entrada" nem "saida") é tratado como saída', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // SELECT insumos
      .mockResolvedValueOnce({ rows: [{ quantidade_atual: '10', custo_medio: '2' }] }) // estoque
      .mockResolvedValueOnce({ rows: [] }) // UPSERT estoques
      .mockResolvedValueOnce({ rows: [] }); // COMMIT

    const res = await request(app)
      .post('/api/estoques/ajuste')
      .set(AUTH)
      .send({ insumo_id: 1, tipo: 'ajuste_qualquer', quantidade: 3 }); // tipo inválido
    // Deveria ser 400 (tipo inválido), mas é tratado como saída
    expect(res.status).toBe(201); // confirma o bug
  });

  test('registra entrada e recalcula custo médio ponderado', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // SELECT insumos
      .mockResolvedValueOnce({ rows: [{ quantidade_atual: '10', custo_medio: '2.00' }] }) // estoque atual
      .mockResolvedValueOnce({ rows: [] }) // UPSERT
      .mockResolvedValueOnce({ rows: [] }); // COMMIT

    const res = await request(app)
      .post('/api/estoques/ajuste')
      .set(AUTH)
      .send({ insumo_id: 1, tipo: 'entrada', quantidade: 10, preco_unitario: 4 });
    expect(res.status).toBe(201);
    // Custo médio deve ser (10*2 + 10*4) / 20 = 3.00
    expect(parseFloat(res.body.custo_medio)).toBeCloseTo(3.0, 2);
  });

  test('registra saída e mantém custo médio inalterado', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // insumo
      .mockResolvedValueOnce({ rows: [{ quantidade_atual: '20', custo_medio: '3.50' }] }) // estoque
      .mockResolvedValueOnce({ rows: [] }) // UPSERT
      .mockResolvedValueOnce({ rows: [] }); // COMMIT

    const res = await request(app)
      .post('/api/estoques/ajuste')
      .set(AUTH)
      .send({ insumo_id: 1, tipo: 'saida', quantidade: 5 });
    expect(res.status).toBe(201);
    expect(res.body.quantidade).toBe(15);
    expect(parseFloat(res.body.custo_medio)).toBeCloseTo(3.5, 2);
  });
});

// ─── GET /api/estoques/produtos ───────────────────────────────────────────────

describe('GET /api/estoques/produtos', () => {
  test('lista produtos com saldo e capacidade de produção', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          produto_id: 1,
          nome: 'Queijo',
          unidade: 'kg',
          quantidade_atual: '10',
          custo_unitario: '15.00',
          capacidade_producao: '5',
          tem_ficha: true,
        },
      ],
    });

    const res = await request(app).get('/api/estoques/produtos').set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body[0].nome).toBe('Queijo');
    expect(res.body[0].tem_ficha).toBe(true);
  });
});

// ─── POST /api/estoques/produtos/entrada ──────────────────────────────────────

describe('POST /api/estoques/produtos/entrada', () => {
  test('retorna 400 sem campos obrigatórios', async () => {
    const res = await request(app).post('/api/estoques/produtos/entrada').set(AUTH).send({});
    expect(res.status).toBe(400);
  });

  test('retorna 404 quando produto não pertence à fazenda', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [] }); // SELECT produto

    const res = await request(app)
      .post('/api/estoques/produtos/entrada')
      .set(AUTH)
      .send({ produto_id: 99, quantidade: 10 });
    expect(res.status).toBe(404);
  });

  test('adiciona entrada ao estoque do produto', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // SELECT produto
      .mockResolvedValueOnce({ rows: [] }) // UPSERT estoque_produtos
      .mockResolvedValueOnce({ rows: [] }); // COMMIT

    const res = await request(app)
      .post('/api/estoques/produtos/entrada')
      .set(AUTH)
      .send({ produto_id: 1, quantidade: 20 });
    expect(res.status).toBe(201);
    expect(res.body.quantidade_adicionada).toBe(20);
  });
});

// ─── POST /api/estoques/produtos/produzir ─────────────────────────────────────

describe('POST /api/estoques/produtos/produzir', () => {
  test('retorna 400 sem campos obrigatórios', async () => {
    const res = await request(app).post('/api/estoques/produtos/produzir').set(AUTH).send({});
    expect(res.status).toBe(400);
  });

  test('retorna 400 quando produto não tem ficha técnica', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // SELECT produto
      .mockResolvedValueOnce({ rows: [] }); // SELECT ficha (vazia)

    const res = await request(app)
      .post('/api/estoques/produtos/produzir')
      .set(AUTH)
      .send({ produto_id: 1, quantidade: 5 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/ficha técnica/i);
  });

  test('retorna 400 quando insumo tem estoque insuficiente', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // produto
      .mockResolvedValueOnce({
        rows: [
          {
            quantidade_por_unidade: 10, // precisa 10kg por unidade
            tipo_componente: 'insumo',
            componente_id: 3,
            componente_nome: 'Leite',
            unidade: 'kg',
            peso_por_unidade: 1,
            estoque_atual: '5', // só tem 5kg → insuficiente para produzir 1 unidade
          },
        ],
      });

    const res = await request(app)
      .post('/api/estoques/produtos/produzir')
      .set(AUTH)
      .send({ produto_id: 1, quantidade: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/insuficiente/i);
  });

  test('produz produto, debita insumos e adiciona ao estoque', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // produto
      .mockResolvedValueOnce({
        rows: [
          {
            quantidade_por_unidade: 2, // 2kg de leite por unidade
            tipo_componente: 'insumo',
            componente_id: 3,
            componente_nome: 'Leite',
            unidade: 'kg',
            peso_por_unidade: 1,
            estoque_atual: '20', // tem 20kg → suficiente para 10 unidades
          },
        ],
      }) // ficha
      .mockResolvedValueOnce({ rows: [] }) // UPDATE estoques (débito insumo)
      .mockResolvedValueOnce({ rows: [] }) // UPSERT estoque_produtos
      .mockResolvedValueOnce({ rows: [] }); // COMMIT

    const res = await request(app)
      .post('/api/estoques/produtos/produzir')
      .set(AUTH)
      .send({ produto_id: 1, quantidade: 5 });
    expect(res.status).toBe(201);
    expect(res.body.quantidade_produzida).toBe(5);

    // Confirma débito de insumo: 5 unidades × 2kg = 10kg, restando 10kg
    const chamadas = mockClient.query.mock.calls;
    const updateInsumo = chamadas.find(c =>
      typeof c[0] === 'string' && c[0].includes('UPDATE estoques') && c[0].includes('quantidade_atual = $1')
    );
    expect(updateInsumo).toBeDefined();
    expect(updateInsumo[1][0]).toBeCloseTo(10, 4); // 20 - 10 = 10
  });
});

// ─── POST /api/estoques/produtos/usar ─────────────────────────────────────────

describe('POST /api/estoques/produtos/usar', () => {
  test('retorna 400 sem campos obrigatórios', async () => {
    const res = await request(app).post('/api/estoques/produtos/usar').set(AUTH).send({});
    expect(res.status).toBe(400);
  });

  test('retorna 400 quando estoque insuficiente', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // produto
      .mockResolvedValueOnce({ rows: [{ quantidade_atual: '2' }] }); // saldo

    const res = await request(app)
      .post('/api/estoques/produtos/usar')
      .set(AUTH)
      .send({ produto_id: 1, quantidade: 10 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/insuficiente/i);
  });

  test('registra uso interno e retorna saldo restante', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // produto
      .mockResolvedValueOnce({ rows: [{ quantidade_atual: '10' }] }) // saldo
      .mockResolvedValueOnce({ rows: [] }) // UPDATE
      .mockResolvedValueOnce({ rows: [] }); // COMMIT

    const res = await request(app)
      .post('/api/estoques/produtos/usar')
      .set(AUTH)
      .send({ produto_id: 1, quantidade: 3, motivo: 'uso interno' });
    expect(res.status).toBe(201);
    expect(res.body.quantidade_restante).toBe(7);
  });
});
