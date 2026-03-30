require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const autenticar = require('./middleware/auth');

// Valida JWT_SECRET na inicialização
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32 || JWT_SECRET.includes('local_dev') || JWT_SECRET.includes('troca_por')) {
  if (process.env.NODE_ENV === 'production') {
    console.error('FATAL: JWT_SECRET fraco ou padrão em produção. Encerrando.');
    process.exit(1);
  } else {
    console.warn('AVISO: JWT_SECRET fraco ou padrão detectado. Troque antes de ir para produção.');
  }
}

const app = express();

// Headers de segurança HTTP
app.use(helmet());

// CORS restrito a origens permitidas
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // Permite requisições sem origin (ex: Postman em dev, chamadas server-to-server)
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`Origem não permitida: ${origin}`));
  },
  credentials: true,
}));

// Limite de tamanho do body (previne ataques de payload gigante)
app.use(express.json({ limit: '10kb' }));

// Rate limiting para rotas de autenticação (brute force)
const limiterAuth = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas. Aguarde 15 minutos antes de tentar novamente.' },
  skip: () => process.env.NODE_ENV === 'test',
});

// Rate limiting geral para rotas de dados
const limiterGeral = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente em instantes.' },
  skip: () => process.env.NODE_ENV === 'test',
});

// Rotas públicas
app.use('/api/auth', limiterAuth, require('./routes/auth'));
app.get('/', (req, res) => res.json({ message: 'Sistema Fazenda API rodando!' }));

// Rotas de fazendas (JWT básico — sem exigir fazenda selecionada)
app.use('/api/fazendas', limiterGeral, require('./routes/fazendas'));

// Rotas de dados (JWT com fazenda_id obrigatório)
const comFazenda = autenticar.comFazenda;
app.use('/api/lancamentos', limiterGeral, comFazenda, require('./routes/lancamentos'));
app.use('/api/estoques',    limiterGeral, comFazenda, require('./routes/estoques'));
app.use('/api/dashboard',  limiterGeral, comFazenda, require('./routes/dashboard'));
app.use('/api/produtos',   limiterGeral, comFazenda, require('./routes/produtos'));
app.use('/api/clientes',   limiterGeral, comFazenda, require('./routes/clientes'));
app.use('/api/insumos',    limiterGeral, comFazenda, require('./routes/insumos'));
app.use('/api/fornecedores',  limiterGeral, comFazenda, require('./routes/fornecedores'));
app.use('/api/funcionarios', limiterGeral, comFazenda, require('./routes/funcionarios'));
app.use('/api/ia',          limiterGeral, comFazenda, require('./routes/ia'));
app.use('/api/admin',       limiterGeral, require('./routes/admin'));

// Tratamento de erros — nunca vazar stack trace em produção
app.use((err, req, res, next) => {
  const isProd = process.env.NODE_ENV === 'production';
  const status = err.status || 500;

  // Erro de CORS vira 403
  if (err.message && err.message.startsWith('Origem não permitida')) {
    return res.status(403).json({ error: err.message });
  }

  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} — ${err.message}`);

  res.status(status).json({
    error: isProd ? 'Erro interno do servidor' : err.message,
  });
});

module.exports = app;
