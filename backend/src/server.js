require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Sistema Fazenda API rodando!' });
});

const lancamentosRoutes = require('./routes/lancamentos');
const estoquesRoutes = require('./routes/estoques');
const dashboardRoutes = require('./routes/dashboard');
const produtosRoutes = require('./routes/produtos');
const clientesRoutes = require('./routes/clientes');
const insumosRoutes = require('./routes/insumos');
const fornecedoresRoutes = require('./routes/fornecedores');

app.use('/api/lancamentos', lancamentosRoutes);
app.use('/api/estoques', estoquesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/produtos', produtosRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/insumos', insumosRoutes);
app.use('/api/fornecedores', fornecedoresRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
