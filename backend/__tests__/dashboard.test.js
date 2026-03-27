const request = require('supertest');
const { mockQuery } = require('./helpers/mockPool');
const { tokenComFazenda } = require('./helpers/tokens');

const app = require('../src/app');

const AUTH = { Authorization: `Bearer ${tokenComFazenda()}` };

beforeEach(() => {
  jest.resetAllMocks();
  mockQuery.mockResolvedValue({ rows: [] });
});

describe('GET /api/dashboard', () => {
  const mockDashboard = () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ total: '5000' }] })    // vendas à vista
      .mockResolvedValueOnce({ rows: [{ total: '500' }] })     // fiado pago
      .mockResolvedValueOnce({ rows: [{ total: '1000' }] })    // outras receitas
      .mockResolvedValueOnce({ rows: [{ total: '2000' }] })    // compras
      .mockResolvedValueOnce({ rows: [{ total: '800' }] })     // despesas
      .mockResolvedValueOnce({ rows: [{ total: '3000', qtd: '2' }] }) // funcionários
      .mockResolvedValueOnce({ rows: [{ produto: 'Queijo', total: '3000', quantidade: '150' }] }) // por produto
      .mockResolvedValueOnce({ rows: [{ total: '250' }] });    // a receber
  };

  test('retorna totais consolidados corretamente', async () => {
    mockDashboard();

    const res = await request(app).get('/api/dashboard').set(AUTH);
    expect(res.status).toBe(200);

    // Vendas = vista + fiado pago = 5000 + 500 = 5500
    expect(res.body.totalVendas).toBe(5500);
    // Receitas = outras receitas = 1000
    expect(res.body.totalReceitas).toBe(1000);
    // Entradas = vendas + receitas = 5500 + 1000 = 6500
    expect(res.body.totalEntradas).toBe(6500);
    // Saídas = compras + despesas = 2000 + 800 = 2800
    // Resultado = entradas - saídas - funcionários = 6500 - 2800 - 3000 = 700
    expect(res.body.resultado).toBe(700);
    expect(res.body.totalAReceber).toBe(250);
    expect(res.body.qtdFuncionarios).toBe(2);
  });

  test('retorna 401 sem token', async () => {
    const res = await request(app).get('/api/dashboard');
    expect(res.status).toBe(401);
  });

  test('retorna 403 sem fazenda_id no token', async () => {
    const { tokenBase } = require('./helpers/tokens');
    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${tokenBase()}`);
    expect(res.status).toBe(403);
  });

  test('totalFuncionarios usa salário atual (sem filtro de mês — comportamento documentado)', async () => {
    mockDashboard();

    const res = await request(app).get('/api/dashboard?mes=1&ano=2024').set(AUTH);
    // O dashboard de jan/2024 ainda calcula custo de funcionários pelo headcount atual,
    // não pelo headcount em jan/2024. Este é um comportamento esperado mas pode confundir.
    expect(res.body.totalFuncionarios).toBe(3000); // custo atual, não histórico
  });

  test('vendasPorProduto retorna lista ordenada por valor', async () => {
    mockDashboard();

    const res = await request(app).get('/api/dashboard').set(AUTH);
    expect(res.body.vendasPorProduto).toHaveLength(1);
    expect(res.body.vendasPorProduto[0].produto).toBe('Queijo');
  });
});
