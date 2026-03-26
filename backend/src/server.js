require('dotenv').config();
const express = require('express');
const cors = require('cors');
const autenticar = require('./middleware/auth');

const app = express();
app.use(cors());
app.use(express.json());

// Rotas públicas
app.use('/api/auth', require('./routes/auth'));
app.get('/', (req, res) => res.json({ message: 'Sistema Fazenda API rodando!' }));

// Rotas de fazendas (JWT básico — sem exigir fazenda selecionada)
app.use('/api/fazendas', require('./routes/fazendas'));

// Rotas de dados (JWT com fazenda_id obrigatório)
const comFazenda = autenticar.comFazenda;
app.use('/api/lancamentos', comFazenda, require('./routes/lancamentos'));
app.use('/api/estoques',    comFazenda, require('./routes/estoques'));
app.use('/api/dashboard',  comFazenda, require('./routes/dashboard'));
app.use('/api/produtos',   comFazenda, require('./routes/produtos'));
app.use('/api/clientes',   comFazenda, require('./routes/clientes'));
app.use('/api/insumos',    comFazenda, require('./routes/insumos'));
app.use('/api/fornecedores', comFazenda, require('./routes/fornecedores'));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
