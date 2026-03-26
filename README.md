# Sistema Fazenda

Sistema de controle financeiro e gestão de produção de ração.

---

## Como rodar o projeto

### 1. Banco de dados (PostgreSQL)

Instale o PostgreSQL em: https://www.postgresql.org/download/

Crie o banco:
```sql
CREATE DATABASE sistema_fazenda;
```

Rode o script de criação das tabelas:
```bash
psql -U postgres -d sistema_fazenda -f src/database.sql
```

---

### 2. Backend

Entre na pasta do backend:
```bash
cd backend
```

Instale as dependências:
```bash
npm install
```

Copie o arquivo de variáveis de ambiente:
```bash
cp .env.example .env
```

Edite o `.env` com os dados do seu banco:
```
PORT=3001
DATABASE_URL=postgresql://postgres:SUA_SENHA@localhost:5432/sistema_fazenda
JWT_SECRET=coloque_uma_chave_secreta_aqui
```

Rode o backend:
```bash
npm run dev
```

Acesse: http://localhost:3001 — deve aparecer a mensagem "Sistema Fazenda API rodando!"

---

### 3. Frontend (em breve)

O frontend será feito em React + Vite com PWA.

---

## Estrutura do projeto

```
sistema-fazenda/
├── backend/
│   ├── config/
│   │   └── database.js       # Conexão com PostgreSQL
│   ├── src/
│   │   ├── routes/
│   │   │   ├── lancamentos.js  # Vendas, compras, receitas, despesas
│   │   │   ├── estoques.js     # Controle de estoque
│   │   │   └── dashboard.js    # Resumo do mês
│   │   ├── database.sql        # Script de criação das tabelas
│   │   └── server.js           # Servidor principal
│   ├── .env.example
│   └── package.json
└── frontend/                   # Em breve
```

## Rotas da API

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/dashboard | Resumo financeiro do mês |
| GET | /api/lancamentos | Lista todos os lançamentos |
| POST | /api/lancamentos/venda | Registra uma venda |
| POST | /api/lancamentos/compra | Registra compra de insumo |
| POST | /api/lancamentos/receita | Registra receita (ex: leite) |
| POST | /api/lancamentos/despesa | Registra despesa fixa |
| GET | /api/estoques | Lista estoque atual |
| GET | /api/estoques/insumos | Lista insumos disponíveis |
