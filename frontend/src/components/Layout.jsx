import { NavLink, Outlet } from 'react-router-dom'

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
  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100svh', display: 'flex', flexDirection: 'column', background: '#F4F6F4', position: 'relative' }}>
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '68px' }}>
        <Outlet />
      </div>

      <nav style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: '480px',
        background: '#fff',
        borderTop: '1px solid #E5E7EB',
        boxShadow: '0 -2px 12px rgba(0,0,0,0.06)',
        zIndex: 100,
        display: 'flex',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch',
      }}>
        <style>{`nav::-webkit-scrollbar { display: none; }`}</style>
        {NAV.map(({ to, label }) => (
          <NavLink key={to} to={to} style={({ isActive }) => ({
            flexShrink: 0,
            minWidth: '60px',
            padding: '10px 6px 8px',
            fontSize: '10.5px',
            textAlign: 'center',
            textDecoration: 'none',
            borderTop: isActive ? '2.5px solid #1D9E75' : '2.5px solid transparent',
            color: isActive ? '#1D9E75' : '#9CA3AF',
            fontWeight: isActive ? '600' : '400',
            letterSpacing: '-0.01em',
            transition: 'color 0.15s',
          })}>
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
