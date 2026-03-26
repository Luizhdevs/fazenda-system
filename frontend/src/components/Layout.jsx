import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV = [
  { to: '/painel',       label: 'Painel'     },
  { to: '/lancamentos',  label: 'Lançam.'    },
  { to: '/novo',         label: '+ Novo'     },
  { to: '/estoque',      label: 'Estoque'    },
  { to: '/insumos',      label: 'Insumos'    },
  { to: '/produtos',     label: 'Produtos'   },
  { to: '/clientes',     label: 'Clientes'   },
  { to: '/fornecedores', label: 'Fornec.'    },
  { to: '/relatorio',    label: 'Relatório'  },
]

export default function Layout() {
  const { usuario, fazenda, trocarFazenda, sair } = useAuth()
  const navigate = useNavigate()

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
      <div style={{ padding: '8px 16px', background: '#fff', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>

        {/* Fazenda atual (clicável para trocar) */}
        <button
          onClick={handleTrocarFazenda}
          title="Trocar fazenda"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', minWidth: 0 }}
        >
          <span style={{ fontSize: '15px' }}>🌾</span>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#1D9E75', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '130px' }}>
            {fazenda?.nome || '—'}
          </span>
          <span style={{ fontSize: '10px', color: '#9CA3AF' }}>▾</span>
        </button>

        {/* Usuário + sair */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {usuario?.avatar_url ? (
            <img src={usuario.avatar_url} alt={usuario.nome} style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#1D9E75', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', flexShrink: 0 }}>
              {usuario?.nome?.[0]?.toUpperCase() || '?'}
            </div>
          )}
          <span style={{ fontSize: '12px', color: '#374151', fontWeight: '500', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {usuario?.nome?.split(' ')[0]}
          </span>
          <button
            onClick={handleSair}
            style={{ background: 'none', border: '1px solid #E5E7EB', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', color: '#6B7280', cursor: 'pointer', fontWeight: '500', flexShrink: 0 }}
          >
            Sair
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '68px' }}>
        <Outlet />
      </div>

      <nav style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: '480px',
        background: '#fff', borderTop: '1px solid #E5E7EB',
        boxShadow: '0 -2px 12px rgba(0,0,0,0.06)', zIndex: 100,
        display: 'flex', overflowX: 'auto', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
      }}>
        <style>{`nav::-webkit-scrollbar { display: none; }`}</style>
        {NAV.map(({ to, label }) => (
          <NavLink key={to} to={to} style={({ isActive }) => ({
            flexShrink: 0, minWidth: '60px', padding: '10px 6px 8px', fontSize: '10.5px',
            textAlign: 'center', textDecoration: 'none',
            borderTop: isActive ? '2.5px solid #1D9E75' : '2.5px solid transparent',
            color: isActive ? '#1D9E75' : '#9CA3AF',
            fontWeight: isActive ? '600' : '400', letterSpacing: '-0.01em', transition: 'color 0.15s',
          })}>
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
