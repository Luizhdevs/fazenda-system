import { useEffect, useState } from 'react'
import api from '../services/api'

const unidades = ['kg', 'saco', 'litro', 'cabeça', 'unidade', 'caixa', 'fardo']
const TIPO_COR = { graos: '#D97706', proteina: '#7C3AED', mineral: '#2563EB', outro: '#6B7280' }
const TIPO_BG  = { graos: '#FEF3C7', proteina: '#EDE9FE', mineral: '#DBEAFE', outro: '#F3F4F6' }

const S = {
  input:     { width: '100%', padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: '10px', fontSize: '14px', background: '#fff', color: '#111827', boxSizing: 'border-box' },
  select:    { width: '100%', padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: '10px', fontSize: '14px', background: '#fff', color: '#111827', cursor: 'pointer', boxSizing: 'border-box' },
  btnGreen:  { padding: '8px 16px', background: '#1D9E75', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  btnGhost:  { padding: '8px 16px', background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', color: '#374151' },
  btnDanger: { padding: '8px 16px', background: '#fff', border: '1.5px solid #FECACA', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', color: '#E24B4A' },
  btnSmall:  { padding: '4px 10px', background: '#fff', border: '1.5px solid #FECACA', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', color: '#E24B4A' },
}

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
const fmtR = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function Produtos() {
  const [produtos, setProdutos]       = useState([])
  const [insumos, setInsumos]         = useState([])
  const [editando, setEditando]       = useState(null)
  const [fichaAberta, setFichaAberta] = useState(null)
  const [fichas, setFichas]           = useState({})
  const [novo, setNovo]               = useState({ nome: '', unidade: 'kg' })
  const [mostraNovo, setMostraNovo]   = useState(false)
  const [tipoComp, setTipoComp]       = useState('insumo') // 'insumo' | 'produto'
  const [novoComp, setNovoComp]       = useState({ insumo_id: '', componente_produto_id: '', quantidade_por_unidade: '' })

  const carregar = () => api.get('/produtos').then(r => setProdutos(r.data))

  useEffect(() => {
    carregar()
    api.get('/insumos').then(r => setInsumos(r.data))
  }, [])

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
    if (fichaAberta === id) setFichaAberta(null)
    carregar()
  }

  const recarregarFicha = async (produtoId) => {
    const r = await api.get(`/produtos/${produtoId}/insumos`)
    setFichas(f => ({ ...f, [produtoId]: r.data }))
  }

  const abrirFicha = async (produtoId) => {
    if (fichaAberta === produtoId) { setFichaAberta(null); return }
    setFichaAberta(produtoId)
    await recarregarFicha(produtoId)
    setTipoComp('insumo')
    setNovoComp({ insumo_id: insumos[0]?.id || '', componente_produto_id: '', quantidade_por_unidade: '' })
  }

  const adicionarComponente = async (produtoId) => {
    if (!novoComp.quantidade_por_unidade) return
    const payload = { quantidade_por_unidade: novoComp.quantidade_por_unidade }
    if (tipoComp === 'insumo') {
      if (!novoComp.insumo_id) return
      payload.insumo_id = novoComp.insumo_id
    } else {
      if (!novoComp.componente_produto_id) return
      payload.componente_produto_id = novoComp.componente_produto_id
    }
    await api.post(`/produtos/${produtoId}/insumos`, payload)
    await recarregarFicha(produtoId)
    setNovoComp({ insumo_id: insumos[0]?.id || '', componente_produto_id: '', quantidade_por_unidade: '' })
    carregar()
  }

  const removerComponente = async (produtoId, itemId) => {
    await api.delete(`/produtos/${produtoId}/insumos/${itemId}`)
    await recarregarFicha(produtoId)
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
              placeholder="Ex: Ração mista" style={S.input} />
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

      {produtos.map(p => {
        const ficha = fichas[p.id] || []
        const aberta = fichaAberta === p.id

        return (
          <div key={p.id} style={{ background: '#fff', borderRadius: '14px', marginBottom: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' }}>

            {/* Cabeçalho do produto */}
            <div style={{ padding: '14px 16px' }}>
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
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: '15px', color: '#111827' }}>{p.nome}</div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '3px', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: '#9CA3AF' }}>{p.unidade}</span>
                      {parseFloat(p.custo_producao) > 0 && (
                        <span style={{ fontSize: '12px', color: '#1D9E75', fontWeight: '500' }}>
                          custo: {fmtR(p.custo_producao)}/{p.unidade}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button
                      onClick={() => abrirFicha(p.id)}
                      style={{ padding: '6px 12px', background: aberta ? '#F0FDF4' : '#F9FAFB', border: `1.5px solid ${aberta ? '#6EE7B7' : '#E5E7EB'}`, borderRadius: '10px', fontSize: '12px', cursor: 'pointer', color: aberta ? '#065F46' : '#6B7280', fontWeight: '500' }}>
                      Ficha técnica
                    </button>
                    <button onClick={() => setEditando(p.id)} style={S.btnGhost}>Editar</button>
                    <button onClick={() => excluir(p.id)} style={S.btnDanger}>Excluir</button>
                  </div>
                </div>
              )}
            </div>

            {/* Ficha técnica */}
            {aberta && (
              <div style={{ borderTop: '1px solid #F3F4F6', padding: '14px 16px', background: '#FAFAFA' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                  Ficha técnica — ingredientes por {p.unidade}
                </div>

                {ficha.length === 0 ? (
                  <div style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '12px' }}>Nenhum ingrediente vinculado ainda.</div>
                ) : (
                  <div style={{ marginBottom: '12px' }}>
                    {ficha.map(item => (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', background: '#fff', borderRadius: '10px', padding: '8px 12px', border: '1px solid #E5E7EB' }}>
                        <span style={{ fontSize: '11px', fontWeight: '600', flexShrink: 0, padding: '2px 7px', borderRadius: '20px',
                          color:      item.tipo_componente === 'produto' ? '#065F46'  : (TIPO_COR[item.tipo] || '#6B7280'),
                          background: item.tipo_componente === 'produto' ? '#DCFCE7'  : (TIPO_BG[item.tipo]  || '#F3F4F6'),
                        }}>
                          {item.tipo_componente === 'produto' ? 'produto' : item.tipo}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: '500', color: '#111827' }}>{item.componente_nome}</div>
                          <div style={{ fontSize: '12px', color: '#6B7280' }}>
                            {fmt(item.quantidade_por_unidade)} {item.componente_unidade}/{p.unidade}
                            <span style={{ marginLeft: '6px', color: parseFloat(item.estoque_atual) > 0 ? '#1D9E75' : '#F59E0B' }}>
                              · estoque: {fmt(item.estoque_atual)} {item.componente_unidade}
                            </span>
                          </div>
                        </div>
                        <button onClick={() => removerComponente(p.id, item.id)} style={S.btnSmall}>Remover</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Adicionar componente (insumo ou produto) */}
                <div style={{ border: '1px dashed #D1D5DB', borderRadius: '10px', padding: '10px 12px' }}>
                  {/* Seletor de tipo */}
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                    {[['insumo', 'Insumo'], ['produto', 'Produto']].map(([v, l]) => (
                      <button key={v} onClick={() => {
                        setTipoComp(v)
                        setNovoComp({ insumo_id: insumos[0]?.id || '', componente_produto_id: '', quantidade_por_unidade: novoComp.quantidade_por_unidade })
                      }}
                        style={{ padding: '5px 14px', borderRadius: '20px', border: '1.5px solid', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                          borderColor:  tipoComp === v ? '#1D9E75' : '#E5E7EB',
                          background:   tipoComp === v ? '#1D9E75' : '#fff',
                          color:        tipoComp === v ? '#fff'    : '#6B7280',
                        }}>
                        {l}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                    <div style={{ flex: 2 }}>
                      <label style={{ fontSize: '11px', fontWeight: '600', color: '#9CA3AF', display: 'block', marginBottom: '4px' }}>
                        {tipoComp === 'insumo' ? 'Insumo' : 'Produto'}
                      </label>
                      {tipoComp === 'insumo' ? (
                        <select value={novoComp.insumo_id}
                          onChange={e => setNovoComp({ ...novoComp, insumo_id: e.target.value })}
                          style={{ ...S.select, fontSize: '13px', padding: '8px 10px' }}>
                          {insumos.map(i => <option key={i.id} value={i.id}>{i.nome} ({i.unidade})</option>)}
                        </select>
                      ) : (
                        <select value={novoComp.componente_produto_id}
                          onChange={e => setNovoComp({ ...novoComp, componente_produto_id: e.target.value })}
                          style={{ ...S.select, fontSize: '13px', padding: '8px 10px' }}>
                          <option value="">Selecione...</option>
                          {produtos.filter(x => x.id !== p.id).map(x => <option key={x.id} value={x.id}>{x.nome} ({x.unidade})</option>)}
                        </select>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '11px', fontWeight: '600', color: '#9CA3AF', display: 'block', marginBottom: '4px' }}>Qtd por {p.unidade}</label>
                      <input type="number" min="0" step="0.001"
                        value={novoComp.quantidade_por_unidade}
                        onChange={e => setNovoComp({ ...novoComp, quantidade_por_unidade: e.target.value })}
                        placeholder="0,000"
                        style={{ ...S.input, fontSize: '13px', padding: '8px 10px' }} />
                    </div>
                    <button onClick={() => adicionarComponente(p.id)} style={{ ...S.btnGreen, flexShrink: 0, padding: '8px 14px' }}>
                      Adicionar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
