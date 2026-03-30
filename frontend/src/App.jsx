import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import ProtectedRoute, { AdminRoute } from './components/ProtectedRoute'
import Layout from './components/Layout'

// Carregamento sob demanda — cada página vira chunk separado
const Login            = lazy(() => import('./pages/Login'))
const SelecionarFazenda = lazy(() => import('./pages/SelecionarFazenda'))
const Painel           = lazy(() => import('./pages/Painel'))
const Produtos         = lazy(() => import('./pages/Produtos'))
const Lancamentos      = lazy(() => import('./pages/Lancamentos'))
const Novo             = lazy(() => import('./pages/Novo'))
const Clientes         = lazy(() => import('./pages/Clientes'))
const ClienteDetalhe   = lazy(() => import('./pages/ClienteDetalhe'))
const Fornecedores     = lazy(() => import('./pages/Fornecedores'))
const FornecedorDetalhe = lazy(() => import('./pages/FornecedorDetalhe'))
const Estoque          = lazy(() => import('./pages/Estoque'))
const Insumos          = lazy(() => import('./pages/Insumos'))
const Relatorio        = lazy(() => import('./pages/Relatorio'))
const Funcionarios     = lazy(() => import('./pages/Funcionarios'))
const FuncionarioDetalhe = lazy(() => import('./pages/FuncionarioDetalhe'))
const Assistente       = lazy(() => import('./pages/Assistente'))
const Admin            = lazy(() => import('./pages/Admin'))

function Loading() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div style={{ width: 32, height: 32, border: '3px solid #e5e7eb', borderTopColor: '#1D9E75', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

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
    <Suspense fallback={<Loading />}>
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
    </Suspense>
  )
}

export default App
