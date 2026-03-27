const request = require('supertest');
const { mockQuery } = require('./helpers/mockPool');
const { tokenComFazenda } = require('./helpers/tokens');

const app = require('../src/app');

const AUTH = { Authorization: `Bearer ${tokenComFazenda()}` };

beforeEach(() => {
  jest.resetAllMocks();
  mockQuery.mockResolvedValue({ rows: [] });
});

// ─── GET /api/funcionarios ────────────────────────────────────────────────────

describe('GET /api/funcionarios', () => {
  test('lista funcionários ativos com custo_mensal calculado', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 1, nome: 'Carlos', cargo: 'Operador',
          salario: '2000', vale_transporte: '150', vale_alimentacao: '200', encargos_patronais: '300',
          custo_mensal: '2650',
        },
      ],
    });

    const res = await request(app).get('/api/funcionarios').set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body[0].custo_mensal).toBe('2650');
  });

  test('retorna 401 sem token', async () => {
    const res = await request(app).get('/api/funcionarios');
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/funcionarios/:id ────────────────────────────────────────────────

describe('GET /api/funcionarios/:id', () => {
  test('retorna 404 quando funcionário não pertence à fazenda', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/funcionarios/999').set(AUTH);
    expect(res.status).toBe(404);
  });

  test('retorna funcionário encontrado', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, nome: 'Carlos', custo_mensal: '2650' }],
    });

    const res = await request(app).get('/api/funcionarios/1').set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.nome).toBe('Carlos');
  });
});

// ─── POST /api/funcionarios ───────────────────────────────────────────────────

describe('POST /api/funcionarios', () => {
  test('retorna 400 quando nome não informado', async () => {
    const res = await request(app).post('/api/funcionarios').set(AUTH).send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/nome/i);
  });

  test('cria funcionário com valores padrão zero para campos financeiros omitidos', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 2, nome: 'Ana', salario: '0', vale_transporte: '0', vale_alimentacao: '0', encargos_patronais: '0' }],
    });

    const res = await request(app)
      .post('/api/funcionarios')
      .set(AUTH)
      .send({ nome: 'Ana' }); // sem salário
    expect(res.status).toBe(201);
    expect(res.body.nome).toBe('Ana');
    expect(res.body.salario).toBe('0');
  });

  test('cria funcionário completo', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 3, nome: 'João', cargo: 'Gerente',
        salario: '5000', vale_transporte: '300', vale_alimentacao: '400', encargos_patronais: '750',
      }],
    });

    const res = await request(app)
      .post('/api/funcionarios')
      .set(AUTH)
      .send({ nome: 'João', cargo: 'Gerente', salario: 5000, vale_transporte: 300, vale_alimentacao: 400, encargos_patronais: 750 });
    expect(res.status).toBe(201);
    expect(res.body.cargo).toBe('Gerente');
  });
});

// ─── PUT /api/funcionarios/:id ────────────────────────────────────────────────

describe('PUT /api/funcionarios/:id', () => {
  test('retorna 404 quando funcionário não pertence à fazenda', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put('/api/funcionarios/999')
      .set(AUTH)
      .send({ nome: 'X' });
    expect(res.status).toBe(404);
  });

  test('atualiza funcionário com sucesso', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, nome: 'Carlos Atualizado', salario: '2500' }],
    });

    const res = await request(app)
      .put('/api/funcionarios/1')
      .set(AUTH)
      .send({ nome: 'Carlos Atualizado', salario: 2500 });
    expect(res.status).toBe(200);
    expect(res.body.nome).toBe('Carlos Atualizado');
  });
});

// ─── DELETE /api/funcionarios/:id ────────────────────────────────────────────

describe('DELETE /api/funcionarios/:id', () => {
  // BUG ESPERADO: retorna success:true mesmo se funcionário não existir
  test('[BUG] deleta funcionário inexistente e retorna success:true', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await request(app).delete('/api/funcionarios/99999').set(AUTH);
    // Deveria ser 404, mas é 200
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('soft-deleta funcionário (ativo=false)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const res = await request(app).delete('/api/funcionarios/1').set(AUTH);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Confirma que é um soft-delete (UPDATE, não DELETE)
    const sql = mockQuery.mock.calls[0][0];
    expect(sql).toMatch(/UPDATE funcionarios SET ativo = false/i);
  });
});
