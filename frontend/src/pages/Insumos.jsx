import { useEffect, useState } from 'react'
import api from '../services/api'

const tipos   = ['graos', 'proteina', 'mineral', 'outro']
const unidades = ['kg', 'saco', 'litro']

const TIPO_NOME = { graos: 'Grãos', proteina: 'Proteína', mineral: 'Mineral', outro: 'Outro' }
const TIPO_COR  = { graos: '#D97706', proteina: '#7C3AED', mineral: '#2563EB', outro: '#6B7280' }
const TIPO_BG   = { graos: '#FEF3C7', proteina: '#EDE9FE', mineral: '#DBEAFE', outro: '#F3F4F6' }

const S = {
  input:    { width: '100%', padding: '12px 14px', border: '1.5px solid #E5E7EB', borderRadius: '12px', fontSize: '15px', background: '#fff', color: '#111827', boxSizing: 'border-box' },
  select:   { width: '100%', padding: '12px 14px', border: '1.5px solid #E5E7EB', borderRadius: '12px', fontSize: '15px', background: '#fff', color: '#111827', cursor: 'pointer', boxSizing: 'border-box' },
  label:    { fontSize: '13px', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '6px' },
  dica:     { fontSize: '11px', color: '#9CA3AF', marginTop: '4px' },
  btnGreen: { padding: '10px 18px', background: '#1D9E75', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: 'pointer' },
  btnGhost: { padding: '10px 18px', background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: '10px', fontSize: '14px', cursor: 'pointer', color: '#374151' },
  btnDanger:{ padding: '10px 18px', background: '#fff', border: '1.5px solid #FECACA', borderRadius: '10px', fontSize: '14px', cursor: 'pointer', color: '#E24B4A' },
}

export default function Insumos() {
  const [insumos, setInsumos]       = useState([])
  const [editando, setEditando]     = useState(null)
  const [novo, setNovo]             = useState({ nome: '', tipo: 'graos', unidade: 'kg', peso_por_unidade: '' })
  const [mostraNovo, setMostraNovo] = useState(false)

  const carregar = () => api.get('/insumos').then(r => setInsumos(r.data))
  useEffect(() => { carregar() }, [])

  const salvarNovo = async () => {
    if (!novo.nome) return
    if (novo.unidade !== 'kg' && !novo.peso_por_unidade) {
      alert(`Informe quantos kg tem cada ${novo.unidade}`)
      return
    }
    await api.post('/insumos', novo)
    setNovo({ nome: '', tipo: 'graos', unidade: 'kg', peso_por_unidade: '' })
    setMostraNovo(false)
    carregar()
  }

  const salvarEdicao = async (i) => {
    if (i.unidade !== 'kg' && !i.peso_por_unidade) {
      alert(`Informe quantos kg tem cada ${i.unidade}`)
      return
    }
    await api.put(`/insumos/${i.id}`, { nome: i.nome, tipo: i.tipo, unidade: i.unidade, peso_por_unidade: i.peso_por_unidade })
    setEditando(null)
    carregar()
  }

  const excluir = async (id) => {
    if (!confirm('Quer mesmo excluir este ingrediente? Ele vai sumir da lista.')) return
    await api.delete(`/insumos/${id}`)
    carregar()
  }

  return (
    <div style={{ padding: '20px 16px' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
        <div>
          <div style={{ fontSize: '22px', fontWeight: '700', color: '#111827' }}>Ingredientes</div>
          <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '3px' }}>O que você compra para fabricar os produtos</div>
        </div>
        <button onClick={() => setMostraNovo(!mostraNovo)} style={{ ...S.btnGreen, marginTop: '4px' }}>+ Novo</button>
      </div>

      {/* Explicação */}
      {insumos.length === 0 && !mostraNovo && (
        <div style={{ background: '#F0FDF4', border: '1.5px solid #6EE7B7', borderRadius: '14px', padding: '20px', marginTop: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '15px', fontWeight: '600', color: '#065F46', marginBottom: '6px' }}>Nenhum ingrediente ainda</div>
          <div style={{ fontSize: '13px', color: '#6B7280', lineHeight: 1.5 }}>
            Aqui você cadastra o milho, farelo de soja, sal mineral e tudo mais que usa para fazer a ração.<br />
            Clique em <strong>+ Novo</strong> para começar.
          </div>
        </div>
      )}

      {/* Formulário de novo ingrediente */}
      {mostraNovo && (
        <div style={{ background: '#fff', borderRadius: '14px', padding: '18px', marginTop: '16px', marginBottom: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', border: '1.5px solid #E5E7EB' }}>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#111827', marginBottom: '16px' }}>Novo ingrediente</div>

          <div style={{ marginBottom: '14px' }}>
            <label style={S.label}>Nome do ingrediente *</label>
            <input value={novo.nome} onChange={e => setNovo({ ...novo, nome: e.target.value })}
              placeholder="Ex: Milho a granel, Farelo de Soja..." style={S.input} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: novo.unidade !== 'kg' ? '10px' : '14px' }}>
            <div>
              <label style={S.label}>Tipo</label>
              <select value={novo.tipo} onChange={e => setNovo({ ...novo, tipo: e.target.value })} style={S.select}>
                {tipos.map(t => <option key={t} value={t}>{TIPO_NOME[t]}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>Unidade de compra</label>
              <select value={novo.unidade} onChange={e => setNovo({ ...novo, unidade: e.target.value, peso_por_unidade: '' })} style={S.select}>
                {unidades.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <div style={S.dica}>Como você compra: por kg, por saco...</div>
            </div>
          </div>

          {novo.unidade !== 'kg' && (
            <div style={{ background: '#FFFBEB', border: '1.5px solid #FDE68A', borderRadius: '12px', padding: '14px', marginBottom: '14px' }}>
              <label style={{ fontSize: '13px', fontWeight: '700', color: '#92400E', display: 'block', marginBottom: '6px' }}>
                Quantos kg tem cada {novo.unidade}? *
              </label>
              <input
                type="number"
                value={novo.peso_por_unidade}
                onChange={e => setNovo({ ...novo, peso_por_unidade: e.target.value })}
                placeholder={`Ex: 60 (se cada ${novo.unidade} pesa 60 kg)`}
                style={{ ...S.input, borderColor: '#FCD34D' }}
              />
              <div style={{ fontSize: '12px', color: '#92400E', marginTop: '6px', lineHeight: 1.4 }}>
                Isso é importante para o sistema calcular corretamente a receita dos produtos.
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={salvarNovo} style={S.btnGreen}>Salvar ingrediente</button>
            <button onClick={() => setMostraNovo(false)} style={S.btnGhost}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Lista de ingredientes */}
      <div style={{ marginTop: mostraNovo ? '0' : '16px' }}>
        {insumos.map(i => (
          <div key={i.id} style={{ background: '#fff', borderRadius: '14px', padding: '16px', marginBottom: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderLeft: `4px solid ${TIPO_COR[i.tipo] || '#6B7280'}` }}>
            {editando === i.id ? (
              <>
                <div style={{ marginBottom: '10px' }}>
                  <label style={S.label}>Nome</label>
                  <input value={i.nome} onChange={e => setInsumos(insumos.map(x => x.id === i.id ? { ...x, nome: e.target.value } : x))} style={S.input} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                  <div>
                    <label style={S.label}>Tipo</label>
                    <select value={i.tipo} onChange={e => setInsumos(insumos.map(x => x.id === i.id ? { ...x, tipo: e.target.value } : x))} style={S.select}>
                      {tipos.map(t => <option key={t} value={t}>{TIPO_NOME[t]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={S.label}>Unidade</label>
                    <select value={i.unidade} onChange={e => setInsumos(insumos.map(x => x.id === i.id ? { ...x, unidade: e.target.value, peso_por_unidade: '' } : x))} style={S.select}>
                      {unidades.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
                {i.unidade !== 'kg' && (
                  <div style={{ background: '#FFFBEB', border: '1.5px solid #FDE68A', borderRadius: '10px', padding: '12px', marginBottom: '10px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '700', color: '#92400E', display: 'block', marginBottom: '5px' }}>
                      Quantos kg tem cada {i.unidade}? *
                    </label>
                    <input
                      type="number"
                      value={i.peso_por_unidade || ''}
                      onChange={e => setInsumos(insumos.map(x => x.id === i.id ? { ...x, peso_por_unidade: e.target.value } : x))}
                      placeholder="Ex: 60"
                      style={{ ...S.input, borderColor: '#FCD34D' }}
                    />
                  </div>
                )}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => salvarEdicao(i)} style={S.btnGreen}>Salvar</button>
                  <button onClick={() => { setEditando(null); carregar() }} style={S.btnGhost}>Cancelar</button>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '16px', color: '#111827', marginBottom: '6px' }}>{i.nome}</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: TIPO_COR[i.tipo] || '#6B7280', background: TIPO_BG[i.tipo] || '#F3F4F6', padding: '3px 10px', borderRadius: '20px' }}>
                      {TIPO_NOME[i.tipo] || i.tipo}
                    </span>
                    <span style={{ fontSize: '12px', color: '#6B7280', background: '#F3F4F6', padding: '3px 10px', borderRadius: '20px' }}>
                      {i.unidade}{i.unidade !== 'kg' && parseFloat(i.peso_por_unidade) > 1 ? ` (${parseFloat(i.peso_por_unidade)} kg cada)` : ''}
                    </span>
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
    </div>
  )
}
