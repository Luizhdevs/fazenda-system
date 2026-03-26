import { useEffect, useState } from 'react'
import api from '../services/api'

const TIPO_COR = { graos: '#D97706', proteina: '#7C3AED', mineral: '#2563EB', outro: '#6B7280' }
const TIPO_BG  = { graos: '#FEF3C7', proteina: '#EDE9FE', mineral: '#DBEAFE', outro: '#F3F4F6' }

const S = {
  input:     { width: '100%', padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: '10px', fontSize: '14px', background: '#fff', color: '#111827', boxSizing: 'border-box' },
  select:    { width: '100%', padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: '10px', fontSize: '14px', background: '#fff', color: '#111827', cursor: 'pointer', boxSizing: 'border-box' },
  btnGreen:  { padding: '10px 18px', background: '#1D9E75', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  btnRed:    { padding: '10px 18px', background: '#E24B4A', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  btnBlue:   { padding: '10px 18px', background: '#2563EB', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  btnGhost:  { padding: '10px 18px', background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: '10px', fontSize: '14px', cursor: 'pointer', color: '#374151' },
}

const fmt    = (v) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtInt = (v) => Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 0 })

const INSUMO_FORM = { insumo_id: '', tipo: 'entrada', quantidade: '', preco_unitario: '', observacao: '' }

export default function Estoque() {
  const [aba, setAba]               = useState('produtos')  // 'insumos' | 'produtos'
  const [insumos, setInsumos]       = useState([])
  const [produtos, setProdutos]     = useState([])

  // form insumo
  const [formInsumo, setFormInsumo]   = useState(INSUMO_FORM)
  const [mostraInsumo, setMostraInsumo] = useState(false)
  const [erroInsumo, setErroInsumo]   = useState('')

  // form produto (produzir ou usar)
  const [formProd, setFormProd]       = useState({ produto_id: '', quantidade: '', motivo: '' })
  const [acaoProd, setAcaoProd]       = useState(null) // null | 'produzir' | 'usar'
  const [erroProd, setErroProd]       = useState('')
  const [salvando, setSalvando]       = useState(false)
  const [fichaProducao, setFichaProducao] = useState([]) // insumos da ficha do produto em produção

  const carregarInsumos  = () => api.get('/estoques').then(r => setInsumos(r.data))
  const carregarProdutos = () => api.get('/estoques/produtos').then(r => setProdutos(r.data))

  useEffect(() => { carregarInsumos(); carregarProdutos() }, [])

  // ── Insumos ──────────────────────────────────────────────────────────────────
  const insumoSelecionado = insumos.find(i => i.insumo_id === formInsumo.insumo_id)

  const salvarAjusteInsumo = async () => {
    setErroInsumo('')
    if (!formInsumo.insumo_id || !formInsumo.quantidade) { setErroInsumo('Preencha o insumo e a quantidade.'); return }
    if (formInsumo.tipo === 'entrada' && !formInsumo.preco_unitario) { setErroInsumo('Informe o preço unitário para entradas.'); return }
    setSalvando(true)
    try {
      await api.post('/estoques/ajuste', {
        insumo_id:      formInsumo.insumo_id,
        tipo:           formInsumo.tipo,
        quantidade:     parseFloat(formInsumo.quantidade),
        preco_unitario: formInsumo.preco_unitario ? parseFloat(formInsumo.preco_unitario) : 0,
        observacao:     formInsumo.observacao,
      })
      setFormInsumo(INSUMO_FORM)
      setMostraInsumo(false)
      carregarInsumos()
    } catch (e) {
      setErroInsumo(e.response?.data?.error || 'Erro ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  // ── Produtos ─────────────────────────────────────────────────────────────────
  // acao: 'produzir' | 'colheita' | 'usar'
  const abrirAcao = async (produto, acao) => {
    setAcaoProd(acao)
    setFormProd({ produto_id: produto.produto_id, quantidade: '', motivo: '', custo_unitario: '' })
    setErroProd('')
    if (acao === 'produzir') {
      const r = await api.get(`/produtos/${produto.produto_id}/insumos`)
      setFichaProducao(r.data)
    } else {
      setFichaProducao([])
    }
  }

  const salvarAcaoProd = async () => {
    setErroProd('')
    if (!formProd.quantidade) { setErroProd('Informe a quantidade.'); return }
    setSalvando(true)
    try {
      const rotas = { produzir: '/estoques/produtos/produzir', colheita: '/estoques/produtos/entrada', usar: '/estoques/produtos/usar' }
      await api.post(rotas[acaoProd], {
        produto_id:     formProd.produto_id,
        quantidade:     parseFloat(formProd.quantidade),
        custo_unitario: formProd.custo_unitario ? parseFloat(formProd.custo_unitario) : 0,
        motivo:         formProd.motivo,
      })
      setAcaoProd(null)
      carregarProdutos()
      carregarInsumos()
    } catch (e) {
      setErroProd(e.response?.data?.error || 'Erro ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  const totalInsumos  = insumos.reduce((a, i) => a + parseFloat(i.valor_total), 0)
  const totalProdutos = produtos.reduce((a, p) => a + parseFloat(p.quantidade_atual) * parseFloat(p.custo_unitario), 0)
  const produtoAcao   = produtos.find(p => p.produto_id === formProd.produto_id)

  return (
    <div style={{ padding: '20px 16px' }}>

      {/* Cabeçalho */}
      <div style={{ fontSize: '22px', fontWeight: '700', color: '#111827', marginBottom: '16px' }}>Estoque</div>

      {/* Abas */}
      <div style={{ display: 'flex', background: '#E5E7EB', borderRadius: '12px', padding: '3px', marginBottom: '16px', gap: '2px' }}>
        {[['produtos', 'Produtos'], ['insumos', 'Insumos']].map(([v, l]) => (
          <button key={v} onClick={() => setAba(v)}
            style={{ flex: 1, padding: '8px 4px', fontSize: '13px', fontWeight: aba === v ? '700' : '400', borderRadius: '9px', cursor: 'pointer', border: 'none', background: aba === v ? '#fff' : 'transparent', color: aba === v ? '#111827' : '#6B7280', boxShadow: aba === v ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>
            {l}
          </button>
        ))}
      </div>

      {/* ── ABA PRODUTOS ── */}
      {aba === 'produtos' && (
        <>
          {totalProdutos > 0 && (
            <div style={{ background: '#EFF6FF', border: '1.5px solid #BFDBFE', borderRadius: '14px', padding: '14px 16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#1E40AF' }}>Valor total em produtos</span>
              <span style={{ fontSize: '18px', fontWeight: '700', color: '#1E40AF' }}>R$ {fmt(totalProdutos)}</span>
            </div>
          )}

          {/* Modal de ação (produzir / colheita / usar) */}
          {acaoProd && produtoAcao && (
            <div style={{ background: '#fff', borderRadius: '14px', padding: '16px', marginBottom: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', border: `1.5px solid ${acaoProd === 'usar' ? '#FECACA' : '#6EE7B7'}` }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '12px' }}>
                {acaoProd === 'produzir' ? '+ Registrar produção' : acaoProd === 'colheita' ? '+ Registrar colheita / entrada' : '↓ Saída para gado / uso interno'}
              </div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>{produtoAcao.nome}</div>
              <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '14px' }}>
                Saldo atual: <strong style={{ color: '#111827' }}>{fmt(produtoAcao.quantidade_atual)} {produtoAcao.unidade}</strong>
                {acaoProd === 'produzir' && parseFloat(produtoAcao.capacidade_producao) > 0 && (
                  <span style={{ marginLeft: '8px', color: '#1D9E75' }}>· pode produzir até {fmtInt(produtoAcao.capacidade_producao)} {produtoAcao.unidade}</span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: acaoProd === 'colheita' ? '1fr 1fr' : '1fr', gap: '8px', marginBottom: acaoProd === 'produzir' ? '10px' : '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', display: 'block', marginBottom: '5px' }}>
                    Quantidade ({produtoAcao.unidade})
                  </label>
                  <input type="number" min="0" step="0.01"
                    value={formProd.quantidade}
                    onChange={e => setFormProd({ ...formProd, quantidade: e.target.value })}
                    placeholder="0"
                    style={S.input} autoFocus />
                </div>
                {acaoProd === 'colheita' && (
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', display: 'block', marginBottom: '5px' }}>
                      Custo/unidade (opcional)
                    </label>
                    <input type="number" min="0" step="0.01"
                      value={formProd.custo_unitario}
                      onChange={e => setFormProd({ ...formProd, custo_unitario: e.target.value })}
                      placeholder="R$ 0,00 (grátis)"
                      style={S.input} />
                  </div>
                )}
              </div>

              {/* Preview de consumo de insumos (só na produção) */}
              {acaoProd === 'produzir' && fichaProducao.length > 0 && (
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Insumos que serão consumidos
                  </div>
                  {fichaProducao.map(item => {
                    const qtdProd = parseFloat(formProd.quantidade) || 0
                    const consumo = item.quantidade_por_unidade * qtdProd
                    const disponivel = parseFloat(item.estoque_atual)
                    const suficiente = disponivel >= consumo
                    const semQtd = qtdProd === 0

                    return (
                      <div key={item.insumo_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: '10px', marginBottom: '6px', background: semQtd ? '#F9FAFB' : (suficiente ? '#F0FDF4' : '#FEF2F2'), border: `1px solid ${semQtd ? '#E5E7EB' : (suficiente ? '#BBF7D0' : '#FECACA')}` }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '500', color: '#111827' }}>{item.insumo_nome}</div>
                          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '1px' }}>
                            {fmt(item.quantidade_por_unidade)} {item.insumo_unidade}/{produtoAcao.unidade}
                            <span style={{ marginLeft: '6px', color: '#9CA3AF' }}>· estoque: {fmt(disponivel)} {item.insumo_unidade}</span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '10px' }}>
                          {semQtd ? (
                            <span style={{ fontSize: '12px', color: '#9CA3AF' }}>—</span>
                          ) : (
                            <>
                              <div style={{ fontSize: '14px', fontWeight: '700', color: suficiente ? '#166534' : '#B91C1C' }}>
                                {fmt(consumo)} {item.insumo_unidade}
                              </div>
                              {!suficiente && (
                                <div style={{ fontSize: '11px', color: '#B91C1C' }}>faltam {fmt(consumo - disponivel)}</div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {acaoProd === 'produzir' && fichaProducao.length === 0 && (
                <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', padding: '10px 12px', marginBottom: '12px', fontSize: '13px', color: '#92400E' }}>
                  Nenhum insumo na ficha técnica. Cadastre os ingredientes em <strong>Produtos → Ficha técnica</strong> antes de produzir.
                </div>
              )}

              {(acaoProd === 'usar' || acaoProd === 'colheita') && (
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', display: 'block', marginBottom: '5px' }}>
                    {acaoProd === 'colheita' ? 'Observação (opcional)' : 'Motivo (opcional)'}
                  </label>
                  <input value={formProd.motivo}
                    onChange={e => setFormProd({ ...formProd, motivo: e.target.value })}
                    placeholder={acaoProd === 'colheita' ? 'Ex: Colheita de março, lote 1' : 'Ex: Alimentação — lote bovinos'}
                    style={S.input} />
                </div>
              )}

              {erroProd && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '8px 12px', marginBottom: '12px', fontSize: '13px', color: '#B91C1C' }}>
                  {erroProd}
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={salvarAcaoProd} disabled={salvando}
                  style={acaoProd === 'usar' ? S.btnRed : S.btnGreen}>
                  {salvando ? 'Salvando...' : acaoProd === 'produzir' ? 'Confirmar produção' : acaoProd === 'colheita' ? 'Registrar colheita' : 'Confirmar saída'}
                </button>
                <button onClick={() => setAcaoProd(null)} style={S.btnGhost}>Cancelar</button>
              </div>
            </div>
          )}

          {produtos.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: '14px', padding: '40px 20px', textAlign: 'center', color: '#9CA3AF', fontSize: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              Nenhum produto cadastrado ainda
            </div>
          ) : produtos.map(p => {
            const qtd = parseFloat(p.quantidade_atual)
            const semEstoque = qtd === 0
            const podeProduzir = parseFloat(p.capacidade_producao) > 0
            const temFicha = p.tem_ficha

            return (
              <div key={p.produto_id} style={{ background: '#fff', borderRadius: '14px', marginBottom: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', fontSize: '15px', color: semEstoque ? '#9CA3AF' : '#111827', marginBottom: '4px' }}>
                        {p.nome}
                      </div>
                      <div style={{ fontSize: '13px', color: semEstoque ? '#D1D5DB' : '#374151', fontWeight: '600' }}>
                        {fmt(qtd)} <span style={{ fontWeight: '400', color: '#9CA3AF' }}>{p.unidade}</span>
                      </div>
                      {parseFloat(p.custo_unitario) > 0 && (
                        <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                          custo: R$ {fmt(p.custo_unitario)}/{p.unidade}
                          {qtd > 0 && <span style={{ marginLeft: '6px', color: '#1D9E75', fontWeight: '500' }}>· R$ {fmt(qtd * p.custo_unitario)} em estoque</span>}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                      {temFicha ? (
                        <button onClick={() => abrirAcao(p, 'produzir')}
                          style={{ padding: '6px 12px', background: podeProduzir ? '#1D9E75' : '#E5E7EB', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: podeProduzir ? 'pointer' : 'not-allowed', color: podeProduzir ? '#fff' : '#9CA3AF' }}
                          disabled={!podeProduzir}>
                          + Produzir
                        </button>
                      ) : (
                        <button onClick={() => abrirAcao(p, 'colheita')}
                          style={{ padding: '6px 12px', background: '#1D9E75', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', color: '#fff' }}>
                          + Colheita
                        </button>
                      )}
                      {qtd > 0 && (
                        <button onClick={() => abrirAcao(p, 'usar')}
                          style={{ padding: '6px 12px', background: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', color: '#E24B4A' }}>
                          Dar saída
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Capacidade de produção */}
                {temFicha && !podeProduzir && semEstoque && (
                  <div style={{ borderTop: '1px solid #F3F4F6', padding: '8px 16px', background: '#FFFBEB', fontSize: '12px', color: '#92400E' }}>
                    Insumos insuficientes para produzir. Verifique o estoque de insumos.
                  </div>
                )}
                {temFicha && podeProduzir && semEstoque && (
                  <div style={{ borderTop: '1px solid #F3F4F6', padding: '8px 16px', background: '#F0FDF4', fontSize: '12px', color: '#166534' }}>
                    Pode produzir até <strong>{fmtInt(p.capacidade_producao)} {p.unidade}</strong> com os insumos disponíveis
                  </div>
                )}
                {!temFicha && (
                  <div style={{ borderTop: '1px solid #F3F4F6', padding: '8px 16px', background: '#F9FAFB', fontSize: '12px', color: '#6B7280' }}>
                    Produto da fazenda — use <strong>+ Colheita</strong> para dar entrada no estoque
                  </div>
                )}
              </div>
            )
          })}
        </>
      )}

      {/* ── ABA INSUMOS ── */}
      {aba === 'insumos' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
            <button onClick={() => { setMostraInsumo(!mostraInsumo); setErroInsumo('') }} style={S.btnGreen}>
              + Ajuste
            </button>
          </div>

          {totalInsumos > 0 && (
            <div style={{ background: '#F0FDF4', border: '1.5px solid #BBF7D0', borderRadius: '14px', padding: '14px 16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#166534' }}>Valor total em insumos</span>
              <span style={{ fontSize: '18px', fontWeight: '700', color: '#166534' }}>R$ {fmt(totalInsumos)}</span>
            </div>
          )}

          {mostraInsumo && (
            <div style={{ background: '#fff', borderRadius: '14px', padding: '16px', marginBottom: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', border: '1.5px solid #E5E7EB' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '14px' }}>Ajuste de insumo</div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                {['entrada', 'saida'].map(t => (
                  <button key={t} onClick={() => setFormInsumo({ ...formInsumo, tipo: t, preco_unitario: '' })}
                    style={{ padding: '10px', borderRadius: '10px', border: formInsumo.tipo === t ? 'none' : '1.5px solid #E5E7EB', background: formInsumo.tipo === t ? (t === 'entrada' ? '#1D9E75' : '#E24B4A') : '#fff', color: formInsumo.tipo === t ? '#fff' : '#6B7280', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>
                    {t === 'entrada' ? '↑ Entrada' : '↓ Saída'}
                  </button>
                ))}
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', display: 'block', marginBottom: '5px' }}>Insumo</label>
                <select value={formInsumo.insumo_id} onChange={e => setFormInsumo({ ...formInsumo, insumo_id: e.target.value })} style={S.select}>
                  <option value="">Selecione...</option>
                  {insumos.map(i => <option key={i.insumo_id} value={i.insumo_id}>{i.nome}</option>)}
                </select>
              </div>

              {insumoSelecionado && (
                <div style={{ background: '#F9FAFB', borderRadius: '8px', padding: '8px 12px', marginBottom: '10px', fontSize: '13px', color: '#6B7280' }}>
                  Saldo: <strong style={{ color: '#111827' }}>{fmt(insumoSelecionado.quantidade_atual)} {insumoSelecionado.unidade}</strong>
                  {parseFloat(insumoSelecionado.custo_medio) > 0 && <> · Custo médio: <strong style={{ color: '#111827' }}>R$ {fmt(insumoSelecionado.custo_medio)}</strong></>}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: formInsumo.tipo === 'entrada' ? '1fr 1fr' : '1fr', gap: '8px', marginBottom: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', display: 'block', marginBottom: '5px' }}>Quantidade</label>
                  <input type="number" min="0" step="0.01" value={formInsumo.quantidade}
                    onChange={e => setFormInsumo({ ...formInsumo, quantidade: e.target.value })} placeholder="0,00" style={S.input} />
                </div>
                {formInsumo.tipo === 'entrada' && (
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', display: 'block', marginBottom: '5px' }}>Preço unitário (R$)</label>
                    <input type="number" min="0" step="0.01" value={formInsumo.preco_unitario}
                      onChange={e => setFormInsumo({ ...formInsumo, preco_unitario: e.target.value })} placeholder="0,00" style={S.input} />
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', display: 'block', marginBottom: '5px' }}>Observação (opcional)</label>
                <input value={formInsumo.observacao} onChange={e => setFormInsumo({ ...formInsumo, observacao: e.target.value })}
                  placeholder="Ex: Contagem física..." style={S.input} />
              </div>

              {erroInsumo && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '8px 12px', marginBottom: '12px', fontSize: '13px', color: '#B91C1C' }}>{erroInsumo}</div>
              )}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={salvarAjusteInsumo} disabled={salvando}
                  style={formInsumo.tipo === 'entrada' ? S.btnGreen : S.btnRed}>
                  {salvando ? 'Salvando...' : (formInsumo.tipo === 'entrada' ? 'Registrar entrada' : 'Registrar saída')}
                </button>
                <button onClick={() => { setMostraInsumo(false); setErroInsumo('') }} style={S.btnGhost}>Cancelar</button>
              </div>
            </div>
          )}

          {insumos.map(i => {
            const qtd = parseFloat(i.quantidade_atual)
            const semEstoque = qtd === 0
            return (
              <div key={i.insumo_id} style={{ background: '#fff', borderRadius: '14px', padding: '14px 16px', marginBottom: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderLeft: `3px solid ${semEstoque ? '#E5E7EB' : (TIPO_COR[i.tipo] || '#6B7280')}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: '15px', color: semEstoque ? '#9CA3AF' : '#111827', marginBottom: '5px' }}>{i.nome}</div>
                    <span style={{ fontSize: '11px', fontWeight: '600', color: TIPO_COR[i.tipo] || '#6B7280', background: TIPO_BG[i.tipo] || '#F3F4F6', padding: '2px 8px', borderRadius: '20px' }}>{i.tipo}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: semEstoque ? '#9CA3AF' : '#111827' }}>
                      {fmt(qtd)} <span style={{ fontSize: '12px', fontWeight: '400', color: '#6B7280' }}>{i.unidade}</span>
                    </div>
                    {parseFloat(i.custo_medio) > 0 && <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>R$ {fmt(i.custo_medio)}/{i.unidade}</div>}
                  </div>
                </div>
                {parseFloat(i.valor_total) > 0 && (
                  <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', color: '#9CA3AF' }}>Valor total</span>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#1D9E75' }}>R$ {fmt(i.valor_total)}</span>
                  </div>
                )}
                {semEstoque && <div style={{ marginTop: '8px', fontSize: '12px', color: '#F59E0B', fontWeight: '500' }}>Sem estoque</div>}
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
