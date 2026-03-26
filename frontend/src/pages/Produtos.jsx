import { useEffect, useState } from 'react'
import api from '../services/api'

const unidades = ['kg', 'saco', 'litro', 'cabeça', 'unidade', 'caixa', 'fardo']

const S = {
  input:    { width: '100%', padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: '10px', fontSize: '14px', background: '#fff', color: '#111827' },
  select:   { width: '100%', padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: '10px', fontSize: '14px', background: '#fff', color: '#111827', cursor: 'pointer' },
  btnGreen: { padding: '8px 16px', background: '#1D9E75', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  btnGhost: { padding: '8px 16px', background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', color: '#374151' },
  btnDanger:{ padding: '8px 16px', background: '#fff', border: '1.5px solid #FECACA', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', color: '#E24B4A' },
}

export default function Produtos() {
  const [produtos, setProdutos] = useState([])
  const [editando, setEditando] = useState(null)
  const [novo, setNovo] = useState({ nome: '', unidade: 'kg' })
  const [mostraNovo, setMostraNovo] = useState(false)

  const carregar = () => api.get('/produtos').then(r => setProdutos(r.data))
  useEffect(() => { carregar() }, [])

  const salvarNovo = async () => {
    if (!novo.nome) return
    await api.post('/produtos', novo)
    setNovo({ nome: '', unidade: 'kg' })
    setMostraNovo(false)
    carregar()
  }

  const salvarEdicao = async (p) => {
    await api.put(`/produtos/${p.id}`, { nome: p.nome, unidade: p.unidade })
    setEditando(null)
    carregar()
  }

  const excluir = async (id) => {
    if (!confirm('Excluir este produto?')) return
    await api.delete(`/produtos/${id}`)
    carregar()
  }

  return (
    <div style={{ padding: '20px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ fontSize: '22px', fontWeight: '700', color: '#111827' }}>Produtos</div>
        <button onClick={() => setMostraNovo(!mostraNovo)} style={S.btnGreen}>+ Novo</button>
      </div>

      {mostraNovo && (
        <div style={{ background: '#fff', borderRadius: '14px', padding: '16px', marginBottom: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', border: '1.5px solid #E5E7EB' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '12px' }}>Novo produto</div>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', display: 'block', marginBottom: '5px' }}>Nome</label>
            <input value={novo.nome} onChange={e => setNovo({ ...novo, nome: e.target.value })}
              placeholder="Ex: Farelo de soja" style={S.input} />
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', display: 'block', marginBottom: '5px' }}>Unidade</label>
            <select value={novo.unidade} onChange={e => setNovo({ ...novo, unidade: e.target.value })} style={S.select}>
              {unidades.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={salvarNovo} style={S.btnGreen}>Salvar</button>
            <button onClick={() => setMostraNovo(false)} style={S.btnGhost}>Cancelar</button>
          </div>
        </div>
      )}

      {produtos.length === 0 && !mostraNovo && (
        <div style={{ background: '#fff', borderRadius: '14px', padding: '40px 20px', textAlign: 'center', color: '#9CA3AF', fontSize: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          Nenhum produto cadastrado ainda
        </div>
      )}

      {produtos.map(p => (
        <div key={p.id} style={{ background: '#fff', borderRadius: '14px', padding: '14px', marginBottom: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          {editando === p.id ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', marginBottom: '10px' }}>
                <input value={p.nome} onChange={e => setProdutos(produtos.map(x => x.id === p.id ? { ...x, nome: e.target.value } : x))} style={S.input} />
                <select value={p.unidade} onChange={e => setProdutos(produtos.map(x => x.id === p.id ? { ...x, unidade: e.target.value } : x))} style={{ ...S.select, width: 'auto' }}>
                  {unidades.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => salvarEdicao(p)} style={S.btnGreen}>Salvar</button>
                <button onClick={() => { setEditando(null); carregar() }} style={S.btnGhost}>Cancelar</button>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: '600', fontSize: '15px', color: '#111827' }}>{p.nome}</div>
                <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>{p.unidade}</div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => setEditando(p.id)} style={S.btnGhost}>Editar</button>
                <button onClick={() => excluir(p.id)} style={S.btnDanger}>Excluir</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
