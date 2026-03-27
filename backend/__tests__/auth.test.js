const request = require('supertest');
const { mockQuery, mockConnect, mockClient } = require('./helpers/mockPool');
const { tokenBase } = require('./helpers/tokens');

const app = require('../src/app');

beforeEach(() => {
  jest.resetAllMocks();
  mockConnect.mockResolvedValue(mockClient);
  mockClient.query.mockResolvedValue({ rows: [] });
  mockQuery.mockResolvedValue({ rows: [] });
});

// ─── GET /api/auth/status ─────────────────────────────────────────────────────

describe('GET /api/auth/status', () => {
  test('retorna precisaSetup=true quando não há usuários', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ total: '0' }] });

    const res = await request(app).get('/api/auth/status');
    expect(res.status).toBe(200);
    expect(res.body.precisaSetup).toBe(true);
  });

  test('retorna precisaSetup=false quando há usuários', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ total: '3' }] });

    const res = await request(app).get('/api/auth/status');
    expect(res.status).toBe(200);
    expect(res.body.precisaSetup).toBe(false);
  });
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  test('retorna 400 quando email ou senha não informados', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/obrigatórios/i);
  });

  test('retorna 401 quando usuário não existe', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] }); // SELECT usuarios

    const res = await request(app).post('/api/auth/login').send({ email: 'x@x.com', senha: '123456' });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/incorretos/i);
  });

  test('retorna 401 quando senha incorreta', async () => {
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('correta', 10);

    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 1, email: 'x@x.com', senha_hash: hash, ativo: true, nome: 'X', avatar_url: null }] }) // SELECT
      .mockResolvedValueOnce({ rows: [] }); // UPDATE ultimo_acesso nunca chega

    const res = await request(app).post('/api/auth/login').send({ email: 'x@x.com', senha: 'errada' });
    expect(res.status).toBe(401);
  });

  test('retorna token e fazendas ao autenticar com sucesso', async () => {
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('senha123', 10);

    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 1, email: 'x@x.com', senha_hash: hash, ativo: true, nome: 'X', avatar_url: null }] })
      .mockResolvedValueOnce({ rows: [] }) // UPDATE ultimo_acesso
      .mockResolvedValueOnce({ rows: [{ id: 10, nome: 'Fazenda A', papel: 'admin' }] }); // listarFazendas

    const res = await request(app).post('/api/auth/login').send({ email: 'x@x.com', senha: 'senha123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.fazendas).toHaveLength(1);
  });
});

// ─── POST /api/auth/register ──────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  test('retorna 400 quando campos obrigatórios faltam', async () => {
    const res = await request(app).post('/api/auth/register').send({ nome: 'X' });
    expect(res.status).toBe(400);
  });

  test('retorna 400 quando senha tem menos de 6 caracteres', async () => {
    const res = await request(app).post('/api/auth/register').send({ nome: 'X', email: 'x@x.com', senha: '123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/6 caracteres/i);
  });

  test('retorna 409 quando email já cadastrado', async () => {
    mockQuery.mockRejectedValueOnce({ code: '23505' });

    const res = await request(app).post('/api/auth/register').send({ nome: 'X', email: 'x@x.com', senha: 'senha123' });
    expect(res.status).toBe(409);
  });

  test('cria usuário com sucesso', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 2, nome: 'X', email: 'x@x.com', avatar_url: null }],
    });

    const res = await request(app).post('/api/auth/register').send({ nome: 'X', email: 'x@x.com', senha: 'senha123' });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.fazendas).toEqual([]);
  });
});

// ─── POST /api/auth/selecionar-fazenda ───────────────────────────────────────

describe('POST /api/auth/selecionar-fazenda', () => {
  test('retorna 401 sem token', async () => {
    const res = await request(app).post('/api/auth/selecionar-fazenda').send({ fazenda_id: 10 });
    expect(res.status).toBe(401);
  });

  test('retorna 400 quando fazenda_id não informado', async () => {
    const res = await request(app)
      .post('/api/auth/selecionar-fazenda')
      .set('Authorization', `Bearer ${tokenBase()}`)
      .send({});
    expect(res.status).toBe(400);
  });

  test('retorna 403 quando usuário não tem acesso à fazenda', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/auth/selecionar-fazenda')
      .set('Authorization', `Bearer ${tokenBase()}`)
      .send({ fazenda_id: 99 });
    expect(res.status).toBe(403);
  });

  test('retorna novo token com fazenda_id quando acesso é válido', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 10, nome: 'Fazenda A', papel: 'admin' }] });

    const res = await request(app)
      .post('/api/auth/selecionar-fazenda')
      .set('Authorization', `Bearer ${tokenBase()}`)
      .send({ fazenda_id: 10 });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.fazenda.id).toBe(10);
  });
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────

describe('GET /api/auth/me', () => {
  test('retorna 401 sem token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('retorna 404 quando usuário não existe no banco', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tokenBase()}`);
    expect(res.status).toBe(404);
  });

  test('retorna dados do usuário com fazendas', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 1, nome: 'X', email: 'x@x.com', avatar_url: null, criado_em: new Date(), ultimo_acesso: null }] })
      .mockResolvedValueOnce({ rows: [{ id: 10, nome: 'Fazenda A', papel: 'admin' }] });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tokenBase()}`);
    expect(res.status).toBe(200);
    expect(res.body.fazendas).toHaveLength(1);
  });
});

// ─── PUT /api/auth/me ─────────────────────────────────────────────────────────

describe('PUT /api/auth/me', () => {
  test('retorna 400 quando nenhum campo enviado', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, senha_hash: null }] });

    const res = await request(app)
      .put('/api/auth/me')
      .set('Authorization', `Bearer ${tokenBase()}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/nenhum campo/i);
  });

  test('retorna 400 quando nova_senha tem menos de 6 caracteres', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, senha_hash: null }] });

    const res = await request(app)
      .put('/api/auth/me')
      .set('Authorization', `Bearer ${tokenBase()}`)
      .send({ nova_senha: '123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/6 caracteres/i);
  });

  test('retorna 400 quando senha_atual não informada para usuário com senha', async () => {
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('atual', 10);
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, senha_hash: hash }] });

    const res = await request(app)
      .put('/api/auth/me')
      .set('Authorization', `Bearer ${tokenBase()}`)
      .send({ nova_senha: 'nova123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/senha atual/i);
  });

  test('atualiza nome com sucesso', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 1, senha_hash: null }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, nome: 'Novo Nome', email: 'x@x.com', avatar_url: null }] });

    const res = await request(app)
      .put('/api/auth/me')
      .set('Authorization', `Bearer ${tokenBase()}`)
      .send({ nome: 'Novo Nome' });
    expect(res.status).toBe(200);
    expect(res.body.nome).toBe('Novo Nome');
  });
});
