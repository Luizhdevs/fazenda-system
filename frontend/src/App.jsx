import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ClienteDetalhe from './pages/ClienteDetalhe'
import Clientes from './pages/Clientes'
import Estoque from './pages/Estoque'
import FornecedorDetalhe from './pages/FornecedorDetalhe'
import Fornecedores from './pages/Fornecedores'
import Insumos from './pages/Insumos'
import Lancamentos from './pages/Lancamentos'
import Novo from './pages/Novo'
import Painel from './pages/Painel'
import Produtos from './pages/Produtos'
import Relatorio from './pages/Relatorio'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/painel" replace />} />
        <Route path="painel" element={<Painel />} />
        <Route path="produtos" element={<Produtos />} />
        <Route path="lancamentos" element={<Lancamentos />} />
        <Route path="novo" element={<Novo />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="clientes/:id" element={<ClienteDetalhe />} />
        <Route path="fornecedores" element={<Fornecedores />} />
        <Route path="fornecedores/:id" element={<FornecedorDetalhe />} />
        <Route path="estoque" element={<Estoque />} />
        <Route path="insumos" element={<Insumos />} />
        <Route path="relatorio" element={<Relatorio />} />
      </Route>
    </Routes>
  )
}

export default App