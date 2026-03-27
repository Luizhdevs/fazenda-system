const request = require('supertest');
const { mockQuery, mockConnect, mockClient } = require('./helpers/mockPool');
const { tokenBase, tokenComFazenda } = require('./helpers/tokens');

const app = require('../src/app');

const AUTH_BASE     = { Authorization: `Bearer ${tokenBase()}` };
const AUTH_FAZENDA  = { Authorization: `Bearer ${tokenComFazenda()}` };

beforeEach(() => {
  jest.resetAllMocks();
  mockConnect.mockResolvedValue(mockClient);
  mockClient.query.mockResolvedValue({ rows: [] });
  mockQuery.mockResolvedValue({ rows: [] });
});

// ─── GET /api/fazendas ────────────────────────────────────────────────────────

describe('GET /api/fazendas', () => {
  test('lista fazendas do usuário logado', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 10, nome: 'Fazenda A', papel: 'admin', total_usuarios: '2' }],
    });

    const res = await request(app).get('/api/fazendas').set(AUTH_BASE);
    expect(res.status).toBe(200);
    expect(res.body[0].nome).toBe('Fazenda A');
  });

  test('retorna 401 sem token', async () => {
    const res = await request(app).get('/api/fazendas');
    expect(res.status).toBe(401);
  });
});

// ─── POST /api/fazendas ───────────────────────────────────────────────────────

describe('POST /api/fazendas', () => {
  test('retorna 400 quando nome não informado', async () => {
    const res = await request(app).post('/api/fazendas').set(AUTH_BASE).send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/nome/i);
  });

  test('cria fazenda e vincula usuário como admin', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 20, nome: 'Nova Fazenda' }] }) // INSERT fazendas
      .mockResolvedValueOnce({ rows: [] }) // INSERT usuario_fazendas
      .mockResolvedValueOnce({ rows: [] }); // COMMIT

    const res = await request(app).post('/api/fazendas').set(AUTH_BASE).send({ nome: 'Nova Fazenda' });
    expect(res.status).toBe(201);
    expect(res.body.nome).toBe('Nova Fazenda');
    expect(res.body.papel).toBe('admin');
  });
});

// ─── PUT /api/fazendas/:id ────────────────────────────────────────────────────

describe('PUT /api/fazendas/:id', () => {
  test('retorna 403 quando usuário não tem acesso', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).put('/api/fazendas/10').set(AUTH_BASE).send({ nome: 'X' });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/sem acesso/i);
  });

  test('retorna 403 quando usuário não é admin', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ papel: 'membro' }] });

    const res = await request(app).put('/api/fazendas/10').set(AUTH_BASE).send({ nome: 'X' });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/admin/i);
  });

  test('renomeia fazenda quando usuário é admin', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ papel: 'admin' }] }) // acesso check
      .mockResolvedValueOnce({ rows: [{ id: 10, nome: 'Fazenda Renomeada' }] }); // UPDATE

    const res = await request(app).put('/api/fazendas/10').set(AUTH_BASE).send({ nome: 'Fazenda Renomeada' });
    expect(res.status).toBe(200);
    expect(res.body.nome).toBe('Fazenda Renomeada');
  });
});

// ─── GET /api/fazendas/:id/usuarios ──────────────────────────────────────────

describe('GET /api/fazendas/:id/usuarios', () => {
  test('retorna 403 quando usuário não tem acesso à fazenda', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/fazendas/10/usuarios').set(AUTH_BASE);
    expect(res.status).toBe(403);
  });

  test('lista membros da fazenda', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ papel: 'admin' }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, nome: 'Admin', email: 'a@a.com', papel: 'admin' }] });

    const res = await request(app).get('/api/fazendas/10/usuarios').set(AUTH_BASE);
    expect(res.status).toBe(200);
    expect(res.body[0].papel).toBe('admin');
  });
});

// ─── POST /api/fazendas/:id/usuarios ─────────────────────────────────────────

describe('POST /api/fazendas/:id/usuarios', () => {
  test('retorna 400 sem email', async () => {
    // Precisa de acesso check primeiro
    mockQuery.mockResolvedValueOnce({ rows: [{ papel: 'admin' }] });

    const res = await request(app)
      .post('/api/fazendas/10/usuarios')
      .set(AUTH_BASE)
      .send({});
    expect(res.status).toBe(400);
  });

  test('retorna 403 quando não é admin', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ papel: 'membro' }] });

    const res = await request(app)
      .post('/api/fazendas/10/usuarios')
      .set(AUTH_BASE)
      .send({ email: 'x@x.com' });
    expect(res.status).toBe(403);
  });

  test('retorna 404 quando email não cadastrado', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ papel: 'admin' }] }) // acesso
      .mockResolvedValueOnce({ rows: [] }); // busca por email

    const res = await request(app)
      .post('/api/fazendas/10/usuarios')
      .set(AUTH_BASE)
      .send({ email: 'inexistente@x.com' });
    expect(res.status).toBe(404);
  });

  test('convida usuário como membro com sucesso', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ papel: 'admin' }] }) // acesso
      .mockResolvedValueOnce({ rows: [{ id: 5, nome: 'Maria', email: 'maria@x.com' }] }) // busca email
      .mockResolvedValueOnce({ rows: [] }); // INSERT ON CONFLICT

    const res = await request(app)
      .post('/api/fazendas/10/usuarios')
      .set(AUTH_BASE)
      .send({ email: 'maria@x.com', papel: 'membro' });
    expect(res.status).toBe(201);
    expect(res.body.papel).toBe('membro');
  });

  test('papel inválido cai para "membro"', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ papel: 'admin' }] })
      .mockResolvedValueOnce({ rows: [{ id: 5, nome: 'Maria', email: 'maria@x.com' }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/fazendas/10/usuarios')
      .set(AUTH_BASE)
      .send({ email: 'maria@x.com', papel: 'superusuario' }); // papel inválido
    expect(res.status).toBe(201);
    expect(res.body.papel).toBe('membro'); // sanitizado
  });
});

// ─── DELETE /api/fazendas/:id/usuarios/:uid ───────────────────────────────────

describe('DELETE /api/fazendas/:id/usuarios/:uid', () => {
  test('retorna 403 quando usuário não tem acesso à fazenda', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete('/api/fazendas/10/usuarios/5')
      .set(AUTH_BASE);
    expect(res.status).toBe(403);
  });

  test('retorna 403 quando membro tenta remover outro usuário', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ papel: 'membro' }] });

    const res = await request(app)
      .delete('/api/fazendas/10/usuarios/5') // uid=5, req.usuario.id=1 (diferentes)
      .set(AUTH_BASE);
    expect(res.status).toBe(403);
  });

  test('[BUG] admins.rows[0] deveria ser admins[0] — TypeError causa 500 ao remover único admin', async () => {
    // fazendas.js linha 149: `const { rows: admins } = await pool.query(...)`
    // → admins JÁ É o array rows. Mas na linha 157 acessa admins.rows[0], que é undefined.
    // Isso lança TypeError e retorna 500 em vez de 400.
    mockQuery
      .mockResolvedValueOnce({ rows: [{ papel: 'admin' }] }) // acesso do solicitante
      .mockResolvedValueOnce({ rows: [{ total: '1' }] })     // count admins
      .mockResolvedValueOnce({ rows: [{ papel: 'admin' }] }); // papel do alvo

    const res = await request(app)
      .delete('/api/fazendas/10/usuarios/2')
      .set(AUTH_BASE);
    // BUG: deveria ser 400 mas é 500 (TypeError: Cannot read properties of undefined)
    expect(res.status).toBe(500);
    // Fix necessário: mudar admins.rows[0].total → admins[0].total (linha 157 de fazendas.js)
  });

  test('[BUG] comparação string vs number pode falhar ao remover a si mesmo', () => {
    // req.params.uid é string '1'; req.usuario.id do JWT é número 1
    // A comparação === falharia se os tipos forem diferentes
    // Este teste documenta o bug potencial
    const uidParam = '1';   // sempre string (vem da URL)
    const uidJwt   = 1;     // pode ser number (depende de como foi gerado o JWT)
    expect(uidParam === uidJwt).toBe(false); // strict equality falha!
    expect(uidParam == uidJwt).toBe(true);   // loose equality funciona
  });

  test('remove usuário com sucesso', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ papel: 'admin' }] }) // acesso
      .mockResolvedValueOnce({ rows: [{ total: '2' }] }) // count admins
      .mockResolvedValueOnce({ rows: [{ papel: 'membro' }] }) // papel do alvo
      .mockResolvedValueOnce({ rows: [] }); // DELETE

    const res = await request(app)
      .delete('/api/fazendas/10/usuarios/5')
      .set(AUTH_BASE);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
