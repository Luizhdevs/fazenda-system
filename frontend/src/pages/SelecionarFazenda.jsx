import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const verde = '#1D9E75'

export default function SelecionarFazenda() {
  const { usuario, fazendas, selecionarFazenda, entrar, sair } = useAuth()

  function lerSuperadminDoToken() {
    try {
      const token = localStorage.getItem('fazenda_token')
      if (!token) return false
      const payload = JSON.parse(atob(token.split('.')[1]))
      return !!payload.superadmin
    } catch { return false }
  }
  const superadmin = lerSuperadminDoToken()
  const navigate = useNavigate()

  const [criando, setCriando] = useState(false)
  const [nomeFazenda, setNomeFazenda] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function handleSelecionar(fazenda_id) {
    setCarregando(true)
    setErro('')
    try {
      await selecionarFazenda(fazenda_id)
      navigate('/painel', { replace: true })
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao selecionar fazenda')
    } finally {
      setCarregando(false)
    }
  }

  async function handleCriarFazenda(e) {
    e.preventDefault()
    if (!nomeFazenda.trim()) return
    setCarregando(true)
    setErro('')
    try {
      const res = await api.post('/fazendas', { nome: nomeFazenda.trim() })
      // Após criar, seleciona a nova fazenda
      await selecionarFazenda(res.data.id)
      navigate('/painel', { replace: true })
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao criar fazenda')
    } finally {
      setCarregando(false)
    }
  }

  function handleSair() {
    sair()
    navigate('/login', { replace: true })
  }

  const papelLabel = { admin: 'Admin', membro: 'Membro' }

  return (
    <div style={{ minHeight: '100svh', background: '#F4F6F4', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: verde, margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '28px' }}>🌾</span>
          </div>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#111827' }}>
            Olá, {usuario?.nome?.split(' ')[0]}!
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6B7280' }}>
            {fazendas.length > 0 ? 'Selecione qual fazenda deseja acessar' : 'Crie sua primeira fazenda para começar'}
          </p>
        </div>

        <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 8px rgba(0,0,0,0.08)' }}>

          {/* Lista de fazendas */}
          {fazendas.length > 0 && !criando && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {fazendas.map(f => (
                <button
                  key={f.id}
                  onClick={() => handleSelecionar(f.id)}
                  disabled={carregando}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 16px', background: '#F9FAFB',
                    border: '1.5px solid #E5E7EB', borderRadius: '10px',
                    cursor: carregando ? 'not-allowed' : 'pointer',
                    transition: 'border-color 0.15s, background 0.15s',
                    textAlign: 'left',
                  }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = verde; e.currentTarget.style.background = '#F0FDF9' }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.background = '#F9FAFB' }}
                >
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>{f.nome}</div>
                    <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>{papelLabel[f.papel] || f.papel}</div>
                  </div>
                  <span style={{ fontSize: '18px', color: '#9CA3AF' }}>›</span>
                </button>
              ))}
            </div>
          )}

          {/* Formulário de criar fazenda — só superadmin pode criar */}
          {criando ? (
            <form onSubmit={handleCriarFazenda} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: '#111827' }}>Nova Fazenda</h3>
              <div>
                <label style={labelStyle}>Nome da fazenda</label>
                <input
                  style={inputStyle}
                  type="text"
                  placeholder="Ex: Fazenda São João"
                  value={nomeFazenda}
                  onChange={e => setNomeFazenda(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              {erro && <div style={erroStyle}>{erro}</div>}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => { setCriando(false); setErro('') }}
                  style={{ ...btnSecundario, flex: 1 }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={carregando}
                  style={{ ...btnPrimario, flex: 2, opacity: carregando ? 0.7 : 1 }}
                >
                  {carregando ? 'Criando...' : 'Criar Fazenda'}
                </button>
              </div>
            </form>
          ) : (
            <>
              {erro && <div style={{ ...erroStyle, marginBottom: '12px' }}>{erro}</div>}
              {superadmin && (
                <button
                  onClick={() => { setCriando(true); setErro('') }}
                  style={{ ...btnSecundario, width: '100%' }}
                >
                  + Criar nova fazenda
                </button>
              )}
            </>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: '#9CA3AF' }}>
          <button
            onClick={handleSair}
            style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline', padding: 0 }}
          >
            Sair da conta
          </button>
        </p>
      </div>
    </div>
  )
}

const labelStyle = { display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '4px' }
const inputStyle = { width: '100%', padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '14px', color: '#111827', background: '#F9FAFB', outline: 'none', boxSizing: 'border-box' }
const btnPrimario = { padding: '11px 16px', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }
const btnSecundario = { padding: '11px 16px', background: '#fff', color: '#374151', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }
const erroStyle = { background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: '#DC2626' }
