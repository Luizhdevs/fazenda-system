import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const PAPEL_LABEL = { admin: 'Admin', membro: 'Membro' }
const PAPEL_COR = { admin: '#1D9E75', membro: '#6B7280' }

function lerSuperadminDoToken() {
  try {
    const token = localStorage.getItem('fazenda_token')
    if (!token) return false
    const payload = JSON.parse(atob(token.split('.')[1]))
    return !!payload.superadmin
  } catch { return false }
}

export default function Admin() {
  const { fazenda, usuario } = useAuth()
  const superadmin = lerSuperadminDoToken()
  const [aba, setAba] = useState('membros')

  return (
    <div style={{ padding: '16px', maxWidth: '540px', margin: '0 auto' }}>
      <div style={{ marginBottom: '16px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: 0 }}>Área Admin</h1>
        <p style={{ fontSize: '12px', color: '#6B7280', margin: '4px 0 0' }}>
          Fazenda: <strong>{fazenda?.nome}</strong>
        </p>
        <p style={{ fontSize: '11px', color: superadmin ? '#1D9E75' : '#EF4444', margin: '4px 0 0' }}>
          superadmin: {String(superadmin)} · v2
        </p>
      </div>

      {/* Abas */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', background: '#F3F4F6', borderRadius: '10px', padding: '3px' }}>
        <button onClick={() => setAba('membros')} style={estiloAba(aba === 'membros')}>
          Membros da fazenda
        </button>
        {superadmin && (
          <button onClick={() => setAba('sistema')} style={estiloAba(aba === 'sistema')}>
            Todos os usuários
          </button>
        )}
      </div>

      {aba === 'membros' && <AbaMembrosFazenda fazenda={fazenda} usuario={usuario} />}
      {aba === 'sistema' && superadmin && <AbaTodosUsuarios usuarioAtual={usuario} />}
    </div>
  )
}

function estiloAba(ativa) {
  return {
    flex: 1, padding: '7px 12px', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
    cursor: 'pointer', transition: 'all 0.15s',
    background: ativa ? '#fff' : 'transparent',
    color: ativa ? '#111827' : '#6B7280',
    boxShadow: ativa ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
  }
}

// ── Aba 1: membros da fazenda atual ──────────────────────────────────────────

function AbaMembrosFazenda({ fazenda, usuario }) {
  const [membros, setMembros] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  const [emailConvite, setEmailConvite] = useState('')
  const [papelConvite, setPapelConvite] = useState('membro')
  const [enviando, setEnviando] = useState(false)
  const [msgConvite, setMsgConvite] = useState(null)
  const [alterandoPapel, setAlterandoPapel] = useState(null)
  const [removendo, setRemovendo] = useState(null)

  useEffect(() => { buscarMembros() }, [fazenda])

  async function buscarMembros() {
    if (!fazenda) return
    setCarregando(true); setErro(null)
    try {
      const res = await api.get(`/fazendas/${fazenda.id}/usuarios`)
      setMembros(res.data)
    } catch (e) {
      setErro(e.response?.data?.error || 'Erro ao carregar membros')
    } finally { setCarregando(false) }
  }

  async function convidar(e) {
    e.preventDefault()
    if (!emailConvite.trim()) return
    setEnviando(true); setMsgConvite(null)
    try {
      const res = await api.post(`/fazendas/${fazenda.id}/usuarios`, { email: emailConvite.trim(), papel: papelConvite })
      setMsgConvite({ tipo: 'ok', texto: `${res.data.nome} adicionado como ${PAPEL_LABEL[papelConvite]}.` })
      setEmailConvite(''); setPapelConvite('membro')
      await buscarMembros()
    } catch (e) {
      setMsgConvite({ tipo: 'erro', texto: e.response?.data?.error || 'Erro ao convidar usuário' })
    } finally { setEnviando(false) }
  }

  async function alterarPapel(membroId, novoPapel) {
    setAlterandoPapel(membroId)
    try {
      await api.post(`/fazendas/${fazenda.id}/usuarios`, {
        email: membros.find(m => m.id === membroId)?.email, papel: novoPapel,
      })
      await buscarMembros()
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao alterar papel')
    } finally { setAlterandoPapel(null) }
  }

  async function remover(membroId) {
    if (!confirm('Remover este usuário da fazenda?')) return
    setRemovendo(membroId)
    try {
      await api.delete(`/fazendas/${fazenda.id}/usuarios/${membroId}`)
      await buscarMembros()
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao remover usuário')
    } finally { setRemovendo(null) }
  }

  return (
    <>
      {/* Convidar */}
      <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', marginBottom: '16px', border: '1px solid #E5E7EB' }}>
        <h2 style={estiloH2}>Adicionar membro</h2>
        <form onSubmit={convidar} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input type="email" placeholder="E-mail do usuário cadastrado" value={emailConvite}
            onChange={e => setEmailConvite(e.target.value)} required style={estiloInput} />
          <div style={{ display: 'flex', gap: '8px' }}>
            <select value={papelConvite} onChange={e => setPapelConvite(e.target.value)} style={{ ...estiloInput, flex: 1 }}>
              <option value="membro">Membro</option>
              <option value="admin">Admin</option>
            </select>
            <button type="submit" disabled={enviando} style={estiloBotao(enviando)}>
              {enviando ? 'Adicionando...' : 'Adicionar'}
            </button>
          </div>
          {msgConvite && <p style={{ margin: 0, fontSize: '12px', color: msgConvite.tipo === 'ok' ? '#1D9E75' : '#EF4444', fontWeight: '500' }}>{msgConvite.texto}</p>}
        </form>
      </div>

      {/* Lista membros */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ ...estiloH2, margin: 0 }}>Membros ({membros.length})</h2>
          <button onClick={buscarMembros} style={{ background: 'none', border: 'none', fontSize: '11px', color: '#6B7280', cursor: 'pointer' }}>Atualizar</button>
        </div>
        {carregando ? <Centralized>Carregando...</Centralized>
          : erro ? <Centralized cor="#EF4444">{erro}</Centralized>
          : membros.length === 0 ? <Centralized>Nenhum membro</Centralized>
          : membros.map((m, i) => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: i < membros.length - 1 ? '1px solid #F9FAFB' : 'none', background: m.id === usuario?.id ? '#F0FDF9' : '#fff' }}>
              <Avatar u={m} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.nome}</span>
                  {m.id === usuario?.id && <Badge>você</Badge>}
                </div>
                <div style={{ fontSize: '11px', color: '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                {m.id !== usuario?.id ? (
                  <select value={m.papel} disabled={alterandoPapel === m.id} onChange={e => alterarPapel(m.id, e.target.value)}
                    style={{ fontSize: '11px', fontWeight: '600', color: PAPEL_COR[m.papel], background: m.papel === 'admin' ? '#F0FDF9' : '#F9FAFB', border: `1px solid ${m.papel === 'admin' ? '#A7F3D0' : '#E5E7EB'}`, borderRadius: '6px', padding: '3px 6px', cursor: 'pointer', outline: 'none' }}>
                    <option value="membro">Membro</option>
                    <option value="admin">Admin</option>
                  </select>
                ) : (
                  <span style={{ fontSize: '11px', fontWeight: '600', color: PAPEL_COR[m.papel], background: m.papel === 'admin' ? '#F0FDF9' : '#F9FAFB', border: `1px solid ${m.papel === 'admin' ? '#A7F3D0' : '#E5E7EB'}`, borderRadius: '6px', padding: '3px 8px' }}>
                    {PAPEL_LABEL[m.papel]}
                  </span>
                )}
                {m.id !== usuario?.id && (
                  <button onClick={() => remover(m.id)} disabled={removendo === m.id}
                    style={{ background: 'none', border: '1px solid #FCA5A5', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', color: '#EF4444', cursor: 'pointer', fontWeight: '500' }}>
                    {removendo === m.id ? '...' : 'Remover'}
                  </button>
                )}
              </div>
            </div>
          ))}
      </div>
    </>
  )
}

// ── Aba 2: todos os usuários do sistema (superadmin only) ─────────────────────

function AbaTodosUsuarios({ usuarioAtual }) {
  const [usuarios, setUsuarios] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  const [alterando, setAlterando] = useState(null)

  useEffect(() => { buscar() }, [])

  async function buscar() {
    setCarregando(true); setErro(null)
    try {
      const res = await api.get('/admin/usuarios')
      setUsuarios(res.data)
    } catch (e) {
      setErro(e.response?.data?.error || 'Erro ao carregar usuários')
    } finally { setCarregando(false) }
  }

  async function toggleAtivo(u) {
    setAlterando(u.id)
    try {
      const res = await api.patch(`/admin/usuarios/${u.id}/ativo`, { ativo: !u.ativo })
      setUsuarios(prev => prev.map(x => x.id === u.id ? { ...x, ativo: res.data.ativo } : x))
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao alterar status')
    } finally { setAlterando(null) }
  }

  return (
    <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ ...estiloH2, margin: 0 }}>Usuários do sistema ({usuarios.length})</h2>
        <button onClick={buscar} style={{ background: 'none', border: 'none', fontSize: '11px', color: '#6B7280', cursor: 'pointer' }}>Atualizar</button>
      </div>

      {carregando ? <Centralized>Carregando...</Centralized>
        : erro ? <Centralized cor="#EF4444">{erro}</Centralized>
        : usuarios.length === 0 ? <Centralized>Nenhum usuário</Centralized>
        : usuarios.map((u, i) => (
          <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: i < usuarios.length - 1 ? '1px solid #F9FAFB' : 'none', background: !u.ativo ? '#FFF7F7' : u.id === usuarioAtual?.id ? '#F0FDF9' : '#fff', opacity: u.ativo ? 1 : 0.7 }}>
            <Avatar u={u} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.nome}</span>
                {u.superadmin && <Badge cor="#1D9E75">superadmin</Badge>}
                {u.id === usuarioAtual?.id && <Badge>você</Badge>}
                {!u.ativo && <Badge cor="#EF4444">desativado</Badge>}
              </div>
              <div style={{ fontSize: '11px', color: '#9CA3AF' }}>{u.email}</div>
              <div style={{ fontSize: '10px', color: '#D1D5DB', marginTop: '1px' }}>
                {u.total_fazendas} fazenda{u.total_fazendas !== '1' ? 's' : ''} · cadastrado {new Date(u.criado_em).toLocaleDateString('pt-BR')}
              </div>
            </div>
            {u.id !== usuarioAtual?.id && !u.superadmin && (
              <button onClick={() => toggleAtivo(u)} disabled={alterando === u.id}
                style={{ background: 'none', border: `1px solid ${u.ativo ? '#FCA5A5' : '#A7F3D0'}`, borderRadius: '6px', padding: '4px 10px', fontSize: '11px', color: u.ativo ? '#EF4444' : '#1D9E75', cursor: 'pointer', fontWeight: '500', flexShrink: 0 }}>
                {alterando === u.id ? '...' : u.ativo ? 'Desativar' : 'Ativar'}
              </button>
            )}
          </div>
        ))}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Avatar({ u }) {
  return u.avatar_url
    ? <img src={u.avatar_url} alt={u.nome} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
    : <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#1D9E75', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', flexShrink: 0 }}>
        {u.nome?.[0]?.toUpperCase() || '?'}
      </div>
}

function Badge({ children, cor = '#6B7280' }) {
  return (
    <span style={{ fontSize: '10px', background: '#F3F4F6', color: cor, borderRadius: '4px', padding: '1px 5px', flexShrink: 0, fontWeight: '600' }}>
      {children}
    </span>
  )
}

function Centralized({ children, cor = '#9CA3AF' }) {
  return <div style={{ padding: '24px', textAlign: 'center', color: cor, fontSize: '13px' }}>{children}</div>
}

const estiloH2 = { fontSize: '13px', fontWeight: '700', color: '#374151', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.05em' }
const estiloInput = { padding: '9px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '13px', outline: 'none', background: '#fff' }
const estiloBotao = (disabled) => ({ padding: '9px 18px', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.7 : 1 })
