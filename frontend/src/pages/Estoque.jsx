import { useEffect, useState } from 'react'
import api from '../services/api'

const TIPO_COR = { graos: '#D97706', proteina: '#7C3AED', mineral: '#2563EB', outro: '#6B7280' }
const TIPO_BG  = { graos: '#FEF3C7', proteina: '#EDE9FE', mineral: '#DBEAFE', outro: '#F3F4F6' }

const S = {
  input:    { width: '100%', padding: '12px 14px', border: '1.5px solid #E5E7EB', borderRadius: '12px', fontSize: '15px', background: '#fff', color: '#111827', boxSizing: 'border-box' },
  select:   { width: '100%', padding: '12px 14px', border: '1.5px solid #E5E7EB', borderRadius: '12px', fontSize: '15px', background: '#fff', color: '#111827', cursor: 'pointer', boxSizing: 'border-box' },
  btnGreen: { padding: '11px 20px', background: '#1D9E75', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: 'pointer' },
  btnRed:   { padding: '11px 20px', background: '#E24B4A', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: 'pointer' },
  btnGhost: { padding: '11px 20px', background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: '10px', fontSize: '14px', cursor: 'pointer', color: '#374151' },
  label:    { fontSize: '13px', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '6px' },
  dica:     { fontSize: '11px', color: '#9CA3AF', marginTop: '4px' },
}

const fmt    = (v) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtInt = (v) => Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 0 })

const INSUMO_FORM = { insumo_id: '', tipo: 'entrada', quantidade: '', preco_unitario: '', observacao: '' }

export default function Estoque() {
  const [aba, setAba]             = useState('produtos')
  const [insumos, setInsumos]     = useState([])
  const [produtos, setProdutos]   = useState([])

  const [formInsumo, setFormInsumo]     = useState(INSUMO_FORM)
  const [mostraInsumo, setMostraInsumo] = useState(false)
  const [erroInsumo, setErroInsumo]     = useState('')

  const [formProd, setFormProd]     = useState({ produto_id: '', quantidade: '', motivo: '', custo_unitario: '' })
  const [acaoProd, setAcaoProd]     = useState(null)
  const [erroProd, setErroProd]     = useState('')
  const [salvando, setSalvando]     = useState(false)
  const [fichaProducao, setFichaProducao] = useState([])

  const carregarInsumos  = () => api.get('/estoques').then(r => setInsumos(r.data))
  const carregarProdutos = () => api.get('/estoques/produtos').then(r => setProdutos(r.data))

  useEffect(() => { carregarInsumos(); carregarProdutos() }, [])

  const insumoSelecionado = insumos.find(i => i.insumo_id === formInsumo.insumo_id)

  const salvarAjusteInsumo = async () => {
    setErroInsumo('')
    if (!formInsumo.insumo_id || !formInsumo.quantidade) { setErroInsumo('Escolha o ingrediente e informe a quantidade.'); return }
    if (formInsumo.tipo === 'entrada' && !formInsumo.preco_unitario) { setErroInsumo('Informe o preço que você pagou.'); return }
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

      <div style={{ fontSize: '22px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>Estoque da Fazenda</div>
      <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '16px' }}>Veja quanto você tem guardado</div>

      {/* Abas */}
      <div style={{ display: 'flex', background: '#E5E7EB', borderRadius: '12px', padding: '3px', marginBottom: '16px', gap: '2px' }}>
        {[
          ['produtos', 'Produtos fabricados'],
          ['insumos', 'Ingredientes comprados'],
        ].map(([v, l]) => (
          <button key={v} onClick={() => setAba(v)}
            style={{ flex: 1, padding: '10px 4px', fontSize: '13px', fontWeight: aba === v ? '700' : '400', borderRadius: '9px', cursor: 'pointer', border: 'none', background: aba === v ? '#fff' : 'transparent', color: aba === v ? '#111827' : '#6B7280', boxShadow: aba === v ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
            {l}
          </button>
        ))}
      </div>

      {/* ── ABA PRODUTOS ── */}
      {aba === 'produtos' && (
        <>
          {totalProdutos > 0 && (
            <div style={{ background: '#EFF6FF', border: '1.5px solid #BFDBFE', borderRadius: '14px', padding: '14px 16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#1E40AF', marginBottom: '2px' }}>Valor total dos seus produtos</div>
                <div style={{ fontSize: '11px', color: '#93C5FD' }}>somando tudo que tem em estoque</div>
              </div>
              <span style={{ fontSize: '20px', fontWeight: '700', color: '#1E40AF' }}>R$ {fmt(totalProdutos)}</span>
            </div>
          )}

          {/* Modal de ação */}
          {acaoProd && produtoAcao && (
            <div style={{ background: '#fff', borderRadius: '14px', padding: '18px', marginBottom: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', border: `2px solid ${acaoProd === 'usar' ? '#FECACA' : '#6EE7B7'}` }}>

              <div style={{ fontSize: '16px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>{produtoAcao.nome}</div>
              <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '4px' }}>
                Você tem agora: <strong style={{ color: '#111827' }}>{fmt(produtoAcao.quantidade_atual)} {produtoAcao.unidade}</strong>
              </div>
              {acaoProd === 'produzir' && parseFloat(produtoAcao.capacidade_producao) > 0 && (
                <div style={{ fontSize: '13px', color: '#1D9E75', fontWeight: '600', marginBottom: '12px' }}>
                  Você consegue produzir até {fmtInt(produtoAcao.capacidade_producao)} {produtoAcao.unidade} agora
                </div>
              )}

              {/* Explicação da ação */}
              <div style={{ background: acaoProd === 'usar' ? '#FEF2F2' : '#F0FDF4', borderRadius: '10px', padding: '10px 12px', marginBottom: '14px', fontSize: '12px', color: acaoProd === 'usar' ? '#B91C1C' : '#065F46' }}>
                {acaoProd === 'produzir' && 'Informe quantas unidades você vai fabricar agora. O sistema vai descontar os ingredientes do estoque automaticamente.'}
                {acaoProd === 'colheita' && 'Informe quanto você colheu ou recebeu. Isso vai aumentar o estoque desse produto.'}
                {acaoProd === 'usar' && 'Informe quanto vai sair do estoque. Use isso quando der o produto para os animais ou usar internamente.'}
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={S.label}>
                  {acaoProd === 'produzir' ? 'Quantas unidades vai produzir?'
                  : acaoProd === 'colheita' ? 'Quanto você colheu / recebeu?'
                  : 'Quanto vai sair do estoque?'}
                  {' '}({produtoAcao.unidade})
                </label>
                <input type="number" min="0" step="0.01"
                  value={formProd.quantidade}
                  onChange={e => setFormProd({ ...formProd, quantidade: e.target.value })}
                  placeholder="0"
                  style={S.input} autoFocus />
              </div>

              {acaoProd === 'colheita' && (
                <div style={{ marginBottom: '14px' }}>
                  <label style={S.label}>Custo por unidade (opcional)</label>
                  <input type="number" min="0" step="0.01"
                    value={formProd.custo_unitario}
                    onChange={e => setFormProd({ ...formProd, custo_unitario: e.target.value })}
                    placeholder="R$ 0,00 (deixe em branco se não sabe)"
                    style={S.input} />
                </div>
              )}

              {(acaoProd === 'usar' || acaoProd === 'colheita') && (
                <div style={{ marginBottom: '14px' }}>
                  <label style={S.label}>
                    {acaoProd === 'colheita' ? 'Observação (opcional)' : 'Para que vai usar? (opcional)'}
                  </label>
                  <input value={formProd.motivo}
                    onChange={e => setFormProd({ ...formProd, motivo: e.target.value })}
                    placeholder={acaoProd === 'colheita' ? 'Ex: Colheita de março' : 'Ex: Alimentação dos bois'}
                    style={S.input} />
                </div>
              )}

              {/* Preview de ingredientes consumidos */}
              {acaoProd === 'produzir' && fichaProducao.length > 0 && (
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#6B7280', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Ingredientes que vão ser usados
                  </div>
                  {fichaProducao.map(item => {
                    const qtdProd     = parseFloat(formProd.quantidade) || 0
                    const peso        = parseFloat(item.peso_por_unidade) || 1
                    const consumo_kg  = item.quantidade_por_unidade * qtdProd
                    const disp_nativo = parseFloat(item.estoque_atual)
                    const disp_kg     = disp_nativo * peso
                    const suficiente  = disp_kg >= consumo_kg
                    const semQtd      = qtdProd === 0
                    const unidade     = item.componente_unidade || 'kg'
                    const isKg        = unidade === 'kg'
                    const consumo_nativo = consumo_kg / peso

                    return (
                      <div key={item.id || item.componente_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: '10px', marginBottom: '6px', background: semQtd ? '#F9FAFB' : (suficiente ? '#F0FDF4' : '#FEF2F2'), border: `1px solid ${semQtd ? '#E5E7EB' : (suficiente ? '#BBF7D0' : '#FECACA')}` }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: '#111827' }}>{item.componente_nome}</div>
                          <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>
                            Tem no estoque: {fmt(disp_nativo)} {unidade}
                            {!isKg && <span> ({fmt(disp_kg)} kg)</span>}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '10px' }}>
                          {semQtd ? (
                            <span style={{ fontSize: '12px', color: '#9CA3AF' }}>—</span>
                          ) : (
                            <>
                              <div style={{ fontSize: '14px', fontWeight: '700', color: suficiente ? '#166534' : '#B91C1C' }}>
                                {!isKg ? `${fmt(consumo_nativo)} ${unidade}` : `${fmt(consumo_kg)} kg`}
                              </div>
                              {!isKg && (
                                <div style={{ fontSize: '11px', color: suficiente ? '#166534' : '#B91C1C' }}>
                                  {fmt(consumo_kg)} kg
                                </div>
                              )}
                              {!suficiente && (
                                <div style={{ fontSize: '11px', color: '#B91C1C', fontWeight: '600' }}>
                                  FALTA {fmt((consumo_kg - disp_kg) / peso)} {unidade}
                                </div>
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
                <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '10px', padding: '12px', marginBottom: '14px', fontSize: '13px', color: '#92400E' }}>
                  Este produto ainda não tem receita cadastrada. Vá em <strong>Produtos → Ficha técnica</strong> e adicione os ingredientes.
                </div>
              )}

              {erroProd && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '10px 12px', marginBottom: '14px', fontSize: '13px', color: '#B91C1C', fontWeight: '600' }}>
                  {erroProd}
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={salvarAcaoProd} disabled={salvando}
                  style={acaoProd === 'usar' ? S.btnRed : S.btnGreen}>
                  {salvando ? 'Salvando...'
                  : acaoProd === 'produzir' ? 'Confirmar produção'
                  : acaoProd === 'colheita' ? 'Confirmar entrada'
                  : 'Confirmar saída'}
                </button>
                <button onClick={() => setAcaoProd(null)} style={S.btnGhost}>Cancelar</button>
              </div>
            </div>
          )}

          {produtos.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: '14px', padding: '40px 20px', textAlign: 'center', color: '#9CA3AF', fontSize: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              Nenhum produto cadastrado ainda.<br />
              <span style={{ fontSize: '13px' }}>Cadastre seus produtos na aba "Produtos".</span>
            </div>
          ) : produtos.map(p => {
            const qtd = parseFloat(p.quantidade_atual)
            const semEstoque    = qtd === 0
            const podeProduzir  = parseFloat(p.capacidade_producao) > 0
            const temFicha      = p.tem_ficha

            return (
              <div key={p.produto_id} style={{ background: '#fff', borderRadius: '14px', marginBottom: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                <div style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '700', fontSize: '16px', color: semEstoque ? '#9CA3AF' : '#111827', marginBottom: '4px' }}>
                        {p.nome}
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: semEstoque ? '#D1D5DB' : '#111827' }}>
                        {fmt(qtd)} <span style={{ fontSize: '13px', fontWeight: '400', color: '#9CA3AF' }}>{p.unidade}</span>
                      </div>
                      {parseFloat(p.custo_unitario) > 0 && (
                        <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                          Custo: R$ {fmt(p.custo_unitario)}/{p.unidade}
                          {qtd > 0 && <span style={{ marginLeft: '6px', color: '#1D9E75', fontWeight: '600' }}>· R$ {fmt(qtd * p.custo_unitario)} em estoque</span>}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                      {temFicha ? (
                        <button onClick={() => abrirAcao(p, 'produzir')}
                          style={{ padding: '8px 14px', background: podeProduzir ? '#1D9E75' : '#E5E7EB', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: podeProduzir ? 'pointer' : 'not-allowed', color: podeProduzir ? '#fff' : '#9CA3AF' }}
                          disabled={!podeProduzir}>
                          + Produzir
                        </button>
                      ) : (
                        <button onClick={() => abrirAcao(p, 'colheita')}
                          style={{ padding: '8px 14px', background: '#1D9E75', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', color: '#fff' }}>
                          + Entrada
                        </button>
                      )}
                      {qtd > 0 && (
                        <button onClick={() => abrirAcao(p, 'usar')}
                          style={{ padding: '8px 14px', background: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', color: '#E24B4A' }}>
                          Dar saída
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {temFicha && !podeProduzir && semEstoque && (
                  <div style={{ borderTop: '1px solid #F3F4F6', padding: '10px 16px', background: '#FFFBEB', fontSize: '12px', color: '#92400E', fontWeight: '500' }}>
                    Sem ingredientes suficientes para produzir. Verifique o estoque de ingredientes.
                  </div>
                )}
                {temFicha && podeProduzir && semEstoque && (
                  <div style={{ borderTop: '1px solid #F3F4F6', padding: '10px 16px', background: '#F0FDF4', fontSize: '12px', color: '#166534', fontWeight: '600' }}>
                    Pronto para produzir! Você consegue fazer até <strong>{fmtInt(p.capacidade_producao)} {p.unidade}</strong>
                  </div>
                )}
                {temFicha && podeProduzir && !semEstoque && (
                  <div style={{ borderTop: '1px solid #F3F4F6', padding: '10px 16px', background: '#F0FDF4', fontSize: '12px', color: '#166534' }}>
                    Pode produzir mais <strong>{fmtInt(p.capacidade_producao)} {p.unidade}</strong> com os ingredientes disponíveis
                  </div>
                )}
                {!temFicha && (
                  <div style={{ borderTop: '1px solid #F3F4F6', padding: '10px 16px', background: '#F9FAFB', fontSize: '12px', color: '#6B7280' }}>
                    Produto da fazenda — use <strong>+ Entrada</strong> para registrar quando colher ou receber
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontSize: '13px', color: '#6B7280' }}>Ingredientes que você comprou e tem guardado</div>
            <button onClick={() => { setMostraInsumo(!mostraInsumo); setErroInsumo('') }} style={S.btnGreen}>
              + Ajustar
            </button>
          </div>

          {totalInsumos > 0 && (
            <div style={{ background: '#F0FDF4', border: '1.5px solid #BBF7D0', borderRadius: '14px', padding: '14px 16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#166534', marginBottom: '2px' }}>Valor total dos ingredientes</div>
                <div style={{ fontSize: '11px', color: '#86EFAC' }}>somando tudo que tem no galpão</div>
              </div>
              <span style={{ fontSize: '20px', fontWeight: '700', color: '#166534' }}>R$ {fmt(totalInsumos)}</span>
            </div>
          )}

          {mostraInsumo && (
            <div style={{ background: '#fff', borderRadius: '14px', padding: '18px', marginBottom: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', border: '1.5px solid #E5E7EB' }}>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>Ajustar estoque de ingrediente</div>
              <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '16px' }}>Use para registrar compras ou correções de quantidade</div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                {[['entrada', 'Comprei (entrou)'], ['saida', 'Usei (saiu)']].map(([t, l]) => (
                  <button key={t} onClick={() => setFormInsumo({ ...formInsumo, tipo: t, preco_unitario: '' })}
                    style={{ padding: '12px', borderRadius: '10px', border: formInsumo.tipo === t ? 'none' : '1.5px solid #E5E7EB', background: formInsumo.tipo === t ? (t === 'entrada' ? '#1D9E75' : '#E24B4A') : '#fff', color: formInsumo.tipo === t ? '#fff' : '#6B7280', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
                    {l}
                  </button>
                ))}
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={S.label}>Qual ingrediente?</label>
                <select value={formInsumo.insumo_id} onChange={e => setFormInsumo({ ...formInsumo, insumo_id: e.target.value })} style={S.select}>
                  <option value="">Escolha o ingrediente...</option>
                  {insumos.map(i => <option key={i.insumo_id} value={i.insumo_id}>{i.nome}</option>)}
                </select>
              </div>

              {insumoSelecionado && (
                <div style={{ background: '#F9FAFB', borderRadius: '10px', padding: '10px 12px', marginBottom: '12px', fontSize: '13px', color: '#6B7280' }}>
                  Você tem agora: <strong style={{ color: '#111827' }}>{fmt(insumoSelecionado.quantidade_atual)} {insumoSelecionado.unidade}</strong>
                  {parseFloat(insumoSelecionado.custo_medio) > 0 && <> · Custo médio: <strong style={{ color: '#111827' }}>R$ {fmt(insumoSelecionado.custo_medio)}/{insumoSelecionado.unidade}</strong></>}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: formInsumo.tipo === 'entrada' ? '1fr 1fr' : '1fr', gap: '8px', marginBottom: '12px' }}>
                <div>
                  <label style={S.label}>Quantidade</label>
                  <input type="number" min="0" step="0.01" value={formInsumo.quantidade}
                    onChange={e => setFormInsumo({ ...formInsumo, quantidade: e.target.value })}
                    placeholder="0,00" style={S.input} />
                </div>
                {formInsumo.tipo === 'entrada' && (
                  <div>
                    <label style={S.label}>Quanto pagou por unidade? (R$)</label>
                    <input type="number" min="0" step="0.01" value={formInsumo.preco_unitario}
                      onChange={e => setFormInsumo({ ...formInsumo, preco_unitario: e.target.value })}
                      placeholder="0,00" style={S.input} />
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={S.label}>Observação (opcional)</label>
                <input value={formInsumo.observacao} onChange={e => setFormInsumo({ ...formInsumo, observacao: e.target.value })}
                  placeholder="Ex: Compra de março no Agro Silva" style={S.input} />
              </div>

              {erroInsumo && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '10px 12px', marginBottom: '12px', fontSize: '13px', color: '#B91C1C', fontWeight: '600' }}>
                  {erroInsumo}
                </div>
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
              <div key={i.insumo_id} style={{ background: '#fff', borderRadius: '14px', padding: '16px', marginBottom: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderLeft: `4px solid ${semEstoque ? '#E5E7EB' : (TIPO_COR[i.tipo] || '#6B7280')}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '700', fontSize: '16px', color: semEstoque ? '#9CA3AF' : '#111827', marginBottom: '5px' }}>{i.nome}</div>
                    <span style={{ fontSize: '11px', fontWeight: '600', color: TIPO_COR[i.tipo] || '#6B7280', background: TIPO_BG[i.tipo] || '#F3F4F6', padding: '2px 10px', borderRadius: '20px' }}>{i.tipo}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '22px', fontWeight: '700', color: semEstoque ? '#9CA3AF' : '#111827' }}>
                      {fmt(qtd)} <span style={{ fontSize: '13px', fontWeight: '400', color: '#6B7280' }}>{i.unidade}</span>
                    </div>
                    {parseFloat(i.custo_medio) > 0 && <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>R$ {fmt(i.custo_medio)}/{i.unidade}</div>}
                  </div>
                </div>
                {parseFloat(i.valor_total) > 0 && (
                  <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', color: '#9CA3AF' }}>Valor total no estoque</span>
                    <span style={{ fontSize: '15px', fontWeight: '700', color: '#1D9E75' }}>R$ {fmt(i.valor_total)}</span>
                  </div>
                )}
                {semEstoque && <div style={{ marginTop: '8px', fontSize: '12px', color: '#F59E0B', fontWeight: '600' }}>Estoque zerado — hora de comprar!</div>}
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
