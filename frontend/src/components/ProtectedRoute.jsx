import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { usuario, fazenda, carregando } = useAuth()

  if (carregando) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100svh', background: '#F4F6F4' }}>
        <div style={{ color: '#1D9E75', fontSize: '14px' }}>Carregando...</div>
      </div>
    )
  }

  if (!usuario) return <Navigate to="/login" replace />
  if (!fazenda) return <Navigate to="/selecionar-fazenda" replace />

  return children
}
