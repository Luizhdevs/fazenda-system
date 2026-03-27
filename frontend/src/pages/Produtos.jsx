import { useEffect, useState } from 'react'
import api from '../services/api'

const unidades = ['kg', 'tonelada', 'saco', 'litro', 'cabeça', 'unidade', 'caixa', 'fardo']
// peso padrão conhecido por unidade (kg)
const PESO_PADRAO = { tonelada: 1000 }
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
  const [novo, setNovo]               = useState({ nome: '', unidade: 'kg', peso_por_unidade: '' })
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
    if (novo.unidade !== 'kg' && !novo.peso_por_unidade) {
      alert(`Informe quantos kg tem cada ${novo.unidade}`)
      return
    }
    await api.post('/produtos', novo)
    setNovo({ nome: '', unidade: 'kg', peso_por_unidade: '' })
    setMostraNovo(false)
    carregar()
  }

  const salvarEdicao = async (p) => {
    if (p.unidade !== 'kg' && !p.peso_por_unidade) {
      alert(`Informe quantos kg tem cada ${p.unidade}`)
      return
    }
    await api.put(`/produtos/${p.id}`, { nome: p.nome, unidade: p.unidade, peso_por_unidade: p.peso_por_unidade })
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
    const payload = { quantidade_por_unidade: parseFloat(novoComp.quantidade_por_unidade) }
    if (tipoComp === 'insumo') {
      const insumoId = novoComp.insumo_id || insumos[0]?.id
      if (!insumoId) return
      payload.insumo_id = insumoId
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <div style={{ fontSize: '22px', fontWeight: '700', color: '#111827' }}>Produtos</div>
          <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '3px' }}>O que a fazenda fabrica e vende</div>
        </div>
        <button onClick={() => setMostraNovo(!mostraNovo)} style={{ ...S.btnGreen, marginTop: '4px' }}>+ Novo</button>
      </div>

      {mostraNovo && (
        <div style={{ background: '#fff', borderRadius: '14px', padding: '16px', marginBottom: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', border: '1.5px solid #E5E7EB' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '12px' }}>Novo produto</div>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', display: 'block', marginBottom: '5px' }}>Nome</label>
            <input value={novo.nome} onChange={e => setNovo({ ...novo, nome: e.target.value })}
              placeholder="Ex: Ração mista" style={S.input} />
          </div>
          <div style={{ marginBottom: novo.unidade !== 'kg' ? '10px' : '14px' }}>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', display: 'block', marginBottom: '5px' }}>Unidade</label>
            <select value={novo.unidade} onChange={e => {
              const u = e.target.value
              setNovo({ ...novo, unidade: u, peso_por_unidade: PESO_PADRAO[u] || '' })
            }} style={S.select}>
              {unidades.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          {novo.unidade !== 'kg' && !PESO_PADRAO[novo.unidade] && (
            <div style={{ background: '#FFFBEB', border: '1.5px solid #FDE68A', borderRadius: '10px', padding: '12px', marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#92400E', display: 'block', marginBottom: '5px' }}>
                Quantos kg tem cada {novo.unidade}? *
              </label>
              <input
                type="number"
                value={novo.peso_por_unidade}
                onChange={e => setNovo({ ...novo, peso_por_unidade: e.target.value })}
                placeholder={`Ex: 50 (se cada ${novo.unidade} tem 50 kg)`}
                style={{ ...S.input, borderColor: '#FCD34D' }}
              />
              <div style={{ fontSize: '11px', color: '#92400E', marginTop: '4px' }}>
                Necessário para calcular corretamente a ficha técnica
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={salvarNovo} style={S.btnGreen}>Salvar</button>
            <button onClick={() => setMostraNovo(false)} style={S.btnGhost}>Cancelar</button>
          </div>
        </div>
      )}

      {produtos.length === 0 && !mostraNovo && (
        <div style={{ background: '#fff', borderRadius: '14px', padding: '40px 20px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: '15px', color: '#374151', fontWeight: '600', marginBottom: '8px' }}>Nenhum produto cadastrado</div>
          <div style={{ fontSize: '13px', color: '#9CA3AF', lineHeight: 1.5 }}>
            Aqui você cadastra a ração, os sacos e tudo que produz.<br />
            Depois cadastra a receita (ficha técnica) de cada produto.
          </div>
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
                    <select value={p.unidade} onChange={e => {
                      const u = e.target.value
                      setProdutos(produtos.map(x => x.id === p.id ? { ...x, unidade: u, peso_por_unidade: PESO_PADRAO[u] || '' } : x))
                    }} style={{ ...S.select, width: 'auto' }}>
                      {unidades.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  {p.unidade !== 'kg' && !PESO_PADRAO[p.unidade] && (
                    <div style={{ background: '#FFFBEB', border: '1.5px solid #FDE68A', borderRadius: '10px', padding: '10px', marginBottom: '10px' }}>
                      <label style={{ fontSize: '12px', fontWeight: '600', color: '#92400E', display: 'block', marginBottom: '4px' }}>
                        Quantos kg tem cada {p.unidade}? *
                      </label>
                      <input
                        type="number"
                        value={p.peso_por_unidade || ''}
                        onChange={e => setProdutos(produtos.map(x => x.id === p.id ? { ...x, peso_por_unidade: e.target.value } : x))}
                        placeholder="Ex: 50"
                        style={{ ...S.input, borderColor: '#FCD34D' }}
                      />
                    </div>
                  )}
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
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '2px' }}>
                    Receita — ingredientes por {p.unidade} de {p.nome}
                  </div>
                  <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                    Quanto de cada ingrediente é usado para fabricar 1 {p.unidade}
                  </div>
                </div>

                {ficha.length === 0 ? (
                  <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '10px', padding: '12px', marginBottom: '12px', fontSize: '13px', color: '#92400E' }}>
                    Receita vazia — adicione os ingredientes abaixo para o sistema calcular o custo e controlar o estoque.
                  </div>
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
                            {(() => {
                              const peso = parseFloat(item.peso_por_unidade) || 1
                              const qtdNativa = item.quantidade_por_unidade / peso
                              const isKg = item.componente_unidade === 'kg'
                              return isKg
                                ? `${fmt(item.quantidade_por_unidade)} kg/${p.unidade}`
                                : `${fmt(qtdNativa)} ${item.componente_unidade}/${p.unidade} (${fmt(item.quantidade_por_unidade)} kg)`
                            })()}
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
                <div style={{ border: '1px dashed #D1D5DB', borderRadius: '12px', padding: '12px 14px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#6B7280', marginBottom: '10px' }}>+ Adicionar ingrediente à receita</div>
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
                        <select value={novoComp.insumo_id || insumos[0]?.id || ''}
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
                      <label style={{ fontSize: '11px', fontWeight: '600', color: '#9CA3AF', display: 'block', marginBottom: '4px' }}>
                        kg por {p.unidade}
                      </label>
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
