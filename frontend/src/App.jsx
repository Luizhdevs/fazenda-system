import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import ProtectedRoute, { AdminRoute } from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import SelecionarFazenda from './pages/SelecionarFazenda'
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
import Admin from './pages/Admin'
import Funcionarios from './pages/Funcionarios'
import FuncionarioDetalhe from './pages/FuncionarioDetalhe'
import Assistente from './pages/Assistente'

// Guard para /selecionar-fazenda: só acessível se logado mas sem fazenda selecionada
function SelecionarFazendaGuard() {
  const { usuario, fazenda, carregando } = useAuth()
  if (carregando) return null
  if (!usuario) return <Navigate to="/login" replace />
  if (fazenda) return <Navigate to="/painel" replace />
  return <SelecionarFazenda />
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/selecionar-fazenda" element={<SelecionarFazendaGuard />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
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
        <Route path="funcionarios" element={<Funcionarios />} />
        <Route path="funcionarios/:id" element={<FuncionarioDetalhe />} />
        <Route path="assistente" element={<Assistente />} />
        <Route path="admin" element={<AdminRoute><Admin /></AdminRoute>} />
      </Route>
    </Routes>
  )
}

export default App
