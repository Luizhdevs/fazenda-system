import { useEffect, useState } from 'react'
import api from '../services/api'

const tipos   = ['graos', 'proteina', 'mineral', 'outro']
const unidades = ['kg', 'saco', 'litro']

const S = {
  input:    { width: '100%', padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: '10px', fontSize: '14px', background: '#fff', color: '#111827' },
  select:   { width: '100%', padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: '10px', fontSize: '14px', background: '#fff', color: '#111827', cursor: 'pointer' },
  btnGreen: { padding: '8px 16px', background: '#1D9E75', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  btnGhost: { padding: '8px 16px', background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', color: '#374151' },
  btnDanger:{ padding: '8px 16px', background: '#fff', border: '1.5px solid #FECACA', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', color: '#E24B4A' },
}

const TIPO_COR = { graos: '#D97706', proteina: '#7C3AED', mineral: '#2563EB', outro: '#6B7280' }
const TIPO_BG  = { graos: '#FEF3C7', proteina: '#EDE9FE', mineral: '#DBEAFE', outro: '#F3F4F6' }

export default function Insumos() {
  const [insumos, setInsumos] = useState([])
  const [editando, setEditando] = useState(null)
  const [novo, setNovo] = useState({ nome: '', tipo: 'graos', unidade: 'kg' })
  const [mostraNovo, setMostraNovo] = useState(false)

  const carregar = () => api.get('/insumos').then(r => setInsumos(r.data))
  useEffect(() => { carregar() }, [])

  const salvarNovo = async () => {
    if (!novo.nome) return
    await api.post('/insumos', novo)
    setNovo({ nome: '', tipo: 'graos', unidade: 'kg' })
    setMostraNovo(false)
    carregar()
  }

  const salvarEdicao = async (i) => {
    await api.put(`/insumos/${i.id}`, { nome: i.nome, tipo: i.tipo, unidade: i.unidade })
    setEditando(null)
    carregar()
  }

  const excluir = async (id) => {
    if (!confirm('Excluir este insumo?')) return
    await api.delete(`/insumos/${id}`)
    carregar()
  }

  return (
    <div style={{ padding: '20px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ fontSize: '22px', fontWeight: '700', color: '#111827' }}>Insumos</div>
        <button onClick={() => setMostraNovo(!mostraNovo)} style={S.btnGreen}>+ Novo</button>
      </div>

      {mostraNovo && (
        <div style={{ background: '#fff', borderRadius: '14px', padding: '16px', marginBottom: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', border: '1.5px solid #E5E7EB' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '12px' }}>Novo insumo</div>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', display: 'block', marginBottom: '5px' }}>Nome</label>
            <input value={novo.nome} onChange={e => setNovo({ ...novo, nome: e.target.value })}
              placeholder="Ex: Milho a granel" style={S.input} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', display: 'block', marginBottom: '5px' }}>Tipo</label>
              <select value={novo.tipo} onChange={e => setNovo({ ...novo, tipo: e.target.value })} style={S.select}>
                {tipos.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', display: 'block', marginBottom: '5px' }}>Unidade</label>
              <select value={novo.unidade} onChange={e => setNovo({ ...novo, unidade: e.target.value })} style={S.select}>
                {unidades.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={salvarNovo} style={S.btnGreen}>Salvar</button>
            <button onClick={() => setMostraNovo(false)} style={S.btnGhost}>Cancelar</button>
          </div>
        </div>
      )}

      {insumos.length === 0 && !mostraNovo && (
        <div style={{ background: '#fff', borderRadius: '14px', padding: '40px 20px', textAlign: 'center', color: '#9CA3AF', fontSize: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          Nenhum insumo cadastrado ainda
        </div>
      )}

      {insumos.map(i => (
        <div key={i.id} style={{ background: '#fff', borderRadius: '14px', padding: '14px', marginBottom: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          {editando === i.id ? (
            <>
              <div style={{ marginBottom: '10px' }}>
                <input value={i.nome} onChange={e => setInsumos(insumos.map(x => x.id === i.id ? { ...x, nome: e.target.value } : x))} style={S.input} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                <select value={i.tipo} onChange={e => setInsumos(insumos.map(x => x.id === i.id ? { ...x, tipo: e.target.value } : x))} style={S.select}>
                  {tipos.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={i.unidade} onChange={e => setInsumos(insumos.map(x => x.id === i.id ? { ...x, unidade: e.target.value } : x))} style={S.select}>
                  {unidades.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => salvarEdicao(i)} style={S.btnGreen}>Salvar</button>
                <button onClick={() => { setEditando(null); carregar() }} style={S.btnGhost}>Cancelar</button>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: '600', fontSize: '15px', color: '#111827', marginBottom: '4px' }}>{i.nome}</div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: TIPO_COR[i.tipo] || '#6B7280', background: TIPO_BG[i.tipo] || '#F3F4F6', padding: '2px 8px', borderRadius: '20px' }}>{i.tipo}</span>
                  <span style={{ fontSize: '11px', color: '#9CA3AF', background: '#F3F4F6', padding: '2px 8px', borderRadius: '20px' }}>{i.unidade}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => setEditando(i.id)} style={S.btnGhost}>Editar</button>
                <button onClick={() => excluir(i.id)} style={S.btnDanger}>Excluir</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
