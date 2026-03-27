import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const PAPEL_LABEL = { admin: 'Admin', membro: 'Membro' }
const PAPEL_COR = { admin: '#1D9E75', membro: '#6B7280' }

export default function Admin() {
  const { fazenda, usuario } = useAuth()
  const [membros, setMembros] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)

  // Convite
  const [emailConvite, setEmailConvite] = useState('')
  const [papelConvite, setPapelConvite] = useState('membro')
  const [enviando, setEnviando] = useState(false)
  const [msgConvite, setMsgConvite] = useState(null)

  // Alterar papel
  const [alterandoPapel, setAlterandoPapel] = useState(null)

  // Remover
  const [removendo, setRemovendo] = useState(null)

  useEffect(() => {
    buscarMembros()
  }, [fazenda])

  async function buscarMembros() {
    if (!fazenda) return
    setCarregando(true)
    setErro(null)
    try {
      const res = await api.get(`/fazendas/${fazenda.id}/usuarios`)
      setMembros(res.data)
    } catch (e) {
      setErro(e.response?.data?.error || 'Erro ao carregar membros')
    } finally {
      setCarregando(false)
    }
  }

  async function convidar(e) {
    e.preventDefault()
    if (!emailConvite.trim()) return
    setEnviando(true)
    setMsgConvite(null)
    try {
      const res = await api.post(`/fazendas/${fazenda.id}/usuarios`, {
        email: emailConvite.trim(),
        papel: papelConvite,
      })
      setMsgConvite({ tipo: 'ok', texto: `${res.data.nome} adicionado como ${PAPEL_LABEL[papelConvite]}.` })
      setEmailConvite('')
      setPapelConvite('membro')
      await buscarMembros()
    } catch (e) {
      setMsgConvite({ tipo: 'erro', texto: e.response?.data?.error || 'Erro ao convidar usuário' })
    } finally {
      setEnviando(false)
    }
  }

  async function alterarPapel(membroId, novoPapel) {
    setAlterandoPapel(membroId)
    try {
      await api.post(`/fazendas/${fazenda.id}/usuarios`, {
        email: membros.find(m => m.id === membroId)?.email,
        papel: novoPapel,
      })
      await buscarMembros()
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao alterar papel')
    } finally {
      setAlterandoPapel(null)
    }
  }

  async function remover(membroId) {
    if (!confirm('Remover este usuário da fazenda?')) return
    setRemovendo(membroId)
    try {
      await api.delete(`/fazendas/${fazenda.id}/usuarios/${membroId}`)
      await buscarMembros()
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao remover usuário')
    } finally {
      setRemovendo(null)
    }
  }

  return (
    <div style={{ padding: '16px', maxWidth: '480px', margin: '0 auto' }}>

      {/* Cabeçalho */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: 0 }}>Área Admin</h1>
        <p style={{ fontSize: '12px', color: '#6B7280', margin: '4px 0 0' }}>
          Gerencie os membros da fazenda <strong>{fazenda?.nome}</strong>
        </p>
      </div>

      {/* Convidar usuário */}
      <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', marginBottom: '16px', border: '1px solid #E5E7EB' }}>
        <h2 style={{ fontSize: '13px', fontWeight: '700', color: '#374151', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Adicionar membro
        </h2>
        <form onSubmit={convidar} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input
            type="email"
            placeholder="E-mail do usuário cadastrado"
            value={emailConvite}
            onChange={e => setEmailConvite(e.target.value)}
            required
            style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '13px', outline: 'none' }}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <select
              value={papelConvite}
              onChange={e => setPapelConvite(e.target.value)}
              style={{ flex: 1, padding: '9px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '13px', background: '#fff', outline: 'none' }}
            >
              <option value="membro">Membro</option>
              <option value="admin">Admin</option>
            </select>
            <button
              type="submit"
              disabled={enviando}
              style={{ padding: '9px 18px', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: enviando ? 'not-allowed' : 'pointer', opacity: enviando ? 0.7 : 1 }}
            >
              {enviando ? 'Adicionando...' : 'Adicionar'}
            </button>
          </div>
          {msgConvite && (
            <p style={{ margin: 0, fontSize: '12px', color: msgConvite.tipo === 'ok' ? '#1D9E75' : '#EF4444', fontWeight: '500' }}>
              {msgConvite.texto}
            </p>
          )}
        </form>
      </div>

      {/* Lista de membros */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '13px', fontWeight: '700', color: '#374151', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Membros ({membros.length})
          </h2>
          <button
            onClick={buscarMembros}
            style={{ background: 'none', border: 'none', fontSize: '11px', color: '#6B7280', cursor: 'pointer', padding: '2px 6px' }}
          >
            Atualizar
          </button>
        </div>

        {carregando ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#9CA3AF', fontSize: '13px' }}>Carregando...</div>
        ) : erro ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#EF4444', fontSize: '13px' }}>{erro}</div>
        ) : membros.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#9CA3AF', fontSize: '13px' }}>Nenhum membro</div>
        ) : (
          membros.map((m, i) => (
            <div
              key={m.id}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 16px',
                borderBottom: i < membros.length - 1 ? '1px solid #F9FAFB' : 'none',
                background: m.id === usuario?.id ? '#F0FDF9' : '#fff',
              }}
            >
              {/* Avatar */}
              {m.avatar_url ? (
                <img src={m.avatar_url} alt={m.nome} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#1D9E75', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', flexShrink: 0 }}>
                  {m.nome?.[0]?.toUpperCase() || '?'}
                </div>
              )}

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.nome}
                  </span>
                  {m.id === usuario?.id && (
                    <span style={{ fontSize: '10px', background: '#F3F4F6', color: '#6B7280', borderRadius: '4px', padding: '1px 5px', flexShrink: 0 }}>você</span>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.email}
                </div>
              </div>

              {/* Papel + ações */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                {m.id !== usuario?.id ? (
                  <select
                    value={m.papel}
                    disabled={alterandoPapel === m.id}
                    onChange={e => alterarPapel(m.id, e.target.value)}
                    style={{
                      fontSize: '11px', fontWeight: '600',
                      color: PAPEL_COR[m.papel],
                      background: m.papel === 'admin' ? '#F0FDF9' : '#F9FAFB',
                      border: `1px solid ${m.papel === 'admin' ? '#A7F3D0' : '#E5E7EB'}`,
                      borderRadius: '6px', padding: '3px 6px', cursor: 'pointer', outline: 'none',
                    }}
                  >
                    <option value="membro">Membro</option>
                    <option value="admin">Admin</option>
                  </select>
                ) : (
                  <span style={{
                    fontSize: '11px', fontWeight: '600',
                    color: PAPEL_COR[m.papel],
                    background: m.papel === 'admin' ? '#F0FDF9' : '#F9FAFB',
                    border: `1px solid ${m.papel === 'admin' ? '#A7F3D0' : '#E5E7EB'}`,
                    borderRadius: '6px', padding: '3px 8px',
                  }}>
                    {PAPEL_LABEL[m.papel]}
                  </span>
                )}

                {m.id !== usuario?.id && (
                  <button
                    onClick={() => remover(m.id)}
                    disabled={removendo === m.id}
                    title="Remover da fazenda"
                    style={{ background: 'none', border: '1px solid #FCA5A5', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', color: '#EF4444', cursor: 'pointer', fontWeight: '500' }}
                  >
                    {removendo === m.id ? '...' : 'Remover'}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  )
}
