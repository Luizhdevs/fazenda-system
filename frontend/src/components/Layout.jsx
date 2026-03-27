import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV_BASE = [
  { to: '/painel',       icon: '🏠', label: 'Início'        },
  { to: '/novo',         icon: '✏️', label: 'Registrar'     },
  { to: '/estoque',      icon: '📦', label: 'Estoque'       },
  { to: '/produtos',     icon: '🌾', label: 'Produtos'      },
  { to: '/insumos',      icon: '🌽', label: 'Ingredientes'  },
  { to: '/funcionarios', icon: '👷', label: 'Funcionários'  },
  { to: '/lancamentos',  icon: '📋', label: 'Registros'     },
  { to: '/clientes',     icon: '🤝', label: 'Clientes'      },
  { to: '/fornecedores', icon: '🚚', label: 'Fornecedores'  },
  { to: '/relatorio',    icon: '📊', label: 'Relatório'     },
]

export default function Layout() {
  const { usuario, fazenda, trocarFazenda, sair } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isAdmin = fazenda?.papel === 'admin'
  const NAV = isAdmin
    ? [...NAV_BASE, { to: '/admin', icon: '⚙️', label: 'Admin' }]
    : NAV_BASE

  function handleTrocarFazenda() {
    trocarFazenda()
    navigate('/selecionar-fazenda', { replace: true })
  }

  function handleSair() {
    sair()
    navigate('/login', { replace: true })
  }

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100svh', display: 'flex', flexDirection: 'column', background: '#F4F6F4', position: 'relative' }}>

      {/* Barra superior */}
      <div style={{ padding: '10px 16px', background: '#fff', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>

        <button
          onClick={handleTrocarFazenda}
          title="Trocar fazenda"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', minWidth: 0 }}
        >
          <span style={{ fontSize: '16px' }}>🌾</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#1D9E75', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
              {fazenda?.nome || '—'}
            </div>
            <div style={{ fontSize: '10px', color: '#9CA3AF' }}>toque para trocar ▾</div>
          </div>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {usuario?.avatar_url ? (
            <img src={usuario.avatar_url} alt={usuario.nome} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#1D9E75', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', flexShrink: 0 }}>
              {usuario?.nome?.[0]?.toUpperCase() || '?'}
            </div>
          )}
          <span style={{ fontSize: '13px', color: '#374151', fontWeight: '600', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {usuario?.nome?.split(' ')[0]}
          </span>
          {isAdmin && (
            <button
              onClick={() => navigate('/admin')}
              style={{
                background: location.pathname === '/admin' ? '#FEF3C7' : 'none',
                border: '1px solid #FCD34D',
                borderRadius: '6px', padding: '3px 8px',
                fontSize: '11px', color: '#D97706',
                cursor: 'pointer', fontWeight: '600', flexShrink: 0,
              }}
            >
              ⚙ Admin
            </button>
          )}
          <button
            onClick={handleSair}
            style={{ background: 'none', border: '1px solid #E5E7EB', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', color: '#6B7280', cursor: 'pointer', fontWeight: '500', flexShrink: 0 }}
          >
            Sair
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '72px' }}>
        <Outlet />
      </div>

      <nav style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: '480px',
        background: '#fff', borderTop: '1px solid #E5E7EB',
        boxShadow: '0 -2px 12px rgba(0,0,0,0.08)', zIndex: 100,
        display: 'flex', overflowX: 'auto', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
      }}>
        <style>{`nav::-webkit-scrollbar { display: none; }`}</style>
        {NAV.map(({ to, icon, label }) => (
          <NavLink key={to} to={to} style={({ isActive }) => ({
            flexShrink: 0, minWidth: '64px', padding: '7px 4px 6px', fontSize: '9.5px',
            textAlign: 'center', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
            borderTop: isActive ? '2.5px solid #1D9E75' : '2.5px solid transparent',
            color: to === '/admin'
              ? (isActive ? '#D97706' : '#F59E0B')
              : (isActive ? '#1D9E75' : '#9CA3AF'),
            fontWeight: isActive ? '700' : '400',
            background: isActive ? '#F0FDF9' : 'transparent',
            transition: 'color 0.15s',
          })}>
            <span style={{ fontSize: '18px', lineHeight: 1 }}>{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
