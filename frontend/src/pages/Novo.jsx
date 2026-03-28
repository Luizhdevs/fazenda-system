import { useEffect, useState } from 'react'
import api from '../services/api'

const S = {
  input:    { width: '100%', padding: '12px 14px', border: '1.5px solid #E5E7EB', borderRadius: '12px', fontSize: '15px', background: '#fff', color: '#111827', boxSizing: 'border-box' },
  select:   { width: '100%', padding: '12px 14px', border: '1.5px solid #E5E7EB', borderRadius: '12px', fontSize: '15px', background: '#fff', color: '#111827', cursor: 'pointer', boxSizing: 'border-box' },
  label:    { fontSize: '13px', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '6px' },
  dica:     { fontSize: '11px', color: '#9CA3AF', marginTop: '4px' },
  field:    { marginBottom: '16px' },
  btnSave:  { width: '100%', padding: '15px', background: '#1D9E75', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: '700', color: '#fff', cursor: 'pointer', marginTop: '4px' },
}

const TIPOS = [
  {
    id: 'produzir',
    titulo: 'Produzi um produto',
    descricao: 'Ração, mix, concentrado...',
    cor: '#065F46', bg: '#F0FDF4', borda: '#BBF7D0', iconBg: '#059669', icon: '🏭',
  },
  {
    id: 'venda',
    titulo: 'Vendi um produto',
    descricao: 'Ração, sacos, animais...',
    cor: '#065F46', bg: '#ECFDF5', borda: '#6EE7B7', iconBg: '#1D9E75', icon: '💰',
  },
  {
    id: 'compra',
    titulo: 'Comprei ingredientes',
    descricao: 'Milho, farelo, minerais...',
    cor: '#1E3A8A', bg: '#EFF6FF', borda: '#93C5FD', iconBg: '#2563EB', icon: '🛒',
  },
  {
    id: 'receita',
    titulo: 'Entrou dinheiro',
    descricao: 'Leite, subsídios, outros...',
    cor: '#4C1D95', bg: '#F5F3FF', borda: '#C4B5FD', iconBg: '#7C3AED', icon: '📥',
  },
  {
    id: 'despesa',
    titulo: 'Saiu dinheiro',
    descricao: 'Luz, combustível, veterinário...',
    cor: '#7F1D1D', bg: '#FEF2F2', borda: '#FCA5A5', iconBg: '#E24B4A', icon: '📤',
  },
]

const fmt    = (v) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtInt = (v) => Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 0 })

export default function Novo() {
  const [tipo, setTipo]           = useState(null)
  const [insumos, setInsumos]     = useState([])
  const [produtos, setProdutos]   = useState([])
  const [clientes, setClientes]   = useState([])
  const [fornecedores, setFornecedores] = useState([])
  const [fiado, setFiado]         = useState(false)
  const [sucesso, setSucesso]     = useState(false)
  const [producao, setProducao]   = useState({ produto_id: '', quantidade: '' })
  const [fichaProducao, setFichaProducao] = useState([])
  const hoje = new Date().toISOString().split('T')[0]

  const [venda,   setVenda]   = useState({ produto: '', produto_id: '', quantidade: '', preco_unitario: '', cliente_id: '', data_venda: hoje })
  const [compra,  setCompra]  = useState({ insumo_id: '', fornecedor: '', fornecedor_id: '', quantidade: '', preco_unitario: '', data_compra: hoje })
  const [receita, setReceita] = useState({ categoria: 'leite', valor: '', descricao: '', origem: '', data_receita: hoje })
  const [despesa, setDespesa] = useState({ categoria: 'energia', valor: '', descricao: '', data_despesa: hoje })

  useEffect(() => {
    api.get('/insumos').then(r => {
      setInsumos(r.data)
      if (r.data.length > 0) setCompra(c => ({ ...c, insumo_id: r.data[0].id }))
    })
    api.get('/produtos').then(r => {
      setProdutos(r.data)
      if (r.data.length > 0) setVenda(v => ({ ...v, produto: r.data[0].nome, produto_id: r.data[0].id }))
    })
    api.get('/clientes').then(r => setClientes(r.data))
    api.get('/fornecedores').then(r => setFornecedores(r.data))
  }, [])

  const salvar = async () => {
    try {
      if (tipo === 'produzir') {
        if (!producao.produto_id || !producao.quantidade) { alert('Escolha o produto e informe a quantidade.'); return }
        await api.post('/estoques/produtos/produzir', {
          produto_id:     producao.produto_id,
          quantidade:     parseFloat(producao.quantidade),
          custo_unitario: 0,
          motivo:         '',
        })
        setProducao({ produto_id: '', quantidade: '' })
        setFichaProducao([])
      } else if (tipo === 'venda') {
        await api.post('/lancamentos/venda', { ...venda, fiado })
        if (fiado && venda.cliente_id && venda.quantidade && venda.preco_unitario) {
          await api.post(`/clientes/${venda.cliente_id}/debitos`, {
            descricao: `${venda.produto} — ${venda.quantidade} un.`,
            valor: venda.quantidade * venda.preco_unitario,
            data_debito: venda.data_venda,
          })
        }
        setFiado(false)
        setVenda(v => ({ ...v, quantidade: '', preco_unitario: '', cliente_id: '' }))
      } else if (tipo === 'compra') {
        await api.post('/lancamentos/compra', compra)
        setCompra(c => ({ ...c, quantidade: '', preco_unitario: '', fornecedor: '', fornecedor_id: '' }))
      } else if (tipo === 'receita') {
        await api.post('/lancamentos/receita', receita)
        setReceita(r => ({ ...r, valor: '', descricao: '' }))
      } else if (tipo === 'despesa') {
        await api.post('/lancamentos/despesa', despesa)
        setDespesa(d => ({ ...d, valor: '', descricao: '' }))
      }
      setSucesso(true)
      setTimeout(() => setSucesso(false), 3500)
      setTipo(null)
    } catch (err) {
      alert('Erro ao salvar: ' + (err.response?.data?.error || err.message))
    }
  }

  const selecionarProdutoProducao = async (id) => {
    setProducao({ produto_id: id, quantidade: '' })
    if (id) {
      const r = await api.get(`/produtos/${id}/insumos`)
      setFichaProducao(r.data)
    } else {
      setFichaProducao([])
    }
  }

  const totalVenda  = (venda.quantidade * venda.preco_unitario) || 0
  const totalCompra = (compra.quantidade * compra.preco_unitario) || 0
  const tipoInfo    = TIPOS.find(t => t.id === tipo)

  return (
    <div style={{ padding: '20px 16px' }}>

      <div style={{ fontSize: '22px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>O que aconteceu?</div>
      <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '20px' }}>Escolha o que você quer anotar</div>

      {/* Mensagem de sucesso */}
      {sucesso && (
        <div style={{ background: '#ECFDF5', border: '1.5px solid #6EE7B7', borderRadius: '12px', padding: '16px', fontSize: '15px', fontWeight: '600', color: '#065F46', marginBottom: '16px', textAlign: 'center' }}>
          ✓ Anotado com sucesso!
        </div>
      )}

      {/* Seleção de tipo — cartões grandes */}
      {!tipo && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '4px' }}>
          {TIPOS.map(t => (
            <button key={t.id} onClick={() => setTipo(t.id)}
              style={{ background: t.bg, border: `2px solid ${t.borda}`, borderRadius: '16px', padding: '18px 14px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
              <div style={{ fontSize: '26px', marginBottom: '8px' }}>{t.icon}</div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: t.cor, lineHeight: 1.3, marginBottom: '4px' }}>{t.titulo}</div>
              <div style={{ fontSize: '11px', color: '#6B7280' }}>{t.descricao}</div>
            </button>
          ))}
        </div>
      )}

      {/* Formulário após seleção */}
      {tipo && (
        <>
          {/* Botão de voltar */}
          <button onClick={() => setTipo(null)}
            style={{ background: 'none', border: 'none', fontSize: '14px', color: '#6B7280', cursor: 'pointer', padding: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}>
            ← Voltar
          </button>

          {/* Título do tipo selecionado */}
          <div style={{ background: tipoInfo.bg, border: `1.5px solid ${tipoInfo.borda}`, borderRadius: '14px', padding: '14px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>{tipoInfo.icon}</span>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: tipoInfo.cor }}>{tipoInfo.titulo}</div>
              <div style={{ fontSize: '12px', color: '#6B7280' }}>Preencha os dados abaixo</div>
            </div>
          </div>

          {/* ── PRODUZIR ── */}
          {tipo === 'produzir' && (
            <>
              <div style={S.field}>
                <label style={S.label}>Qual produto você fabricou?</label>
                <select value={producao.produto_id} onChange={e => selecionarProdutoProducao(e.target.value)} style={S.select}>
                  <option value="">Escolha o produto...</option>
                  {produtos.map(p => <option key={p.id} value={p.id}>{p.nome} ({p.unidade})</option>)}
                </select>
                <div style={S.dica}>Se não aparece, cadastre em "Produtos" e configure a ficha técnica</div>
              </div>

              {producao.produto_id && (
                <div style={S.field}>
                  <label style={S.label}>Quantas unidades você fabricou?</label>
                  <input type="number" min="0" step="0.01" value={producao.quantidade}
                    onChange={e => setProducao({ ...producao, quantidade: e.target.value })}
                    placeholder="0" style={S.input} />
                </div>
              )}

              {fichaProducao.length > 0 && producao.produto_id && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#6B7280', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Ingredientes que vão ser descontados
                  </div>
                  {fichaProducao.map(item => {
                    const qtdProd        = parseFloat(producao.quantidade) || 0
                    const peso           = parseFloat(item.peso_por_unidade) || 1
                    const consumo_kg     = item.quantidade_por_unidade * qtdProd
                    const disp_nativo    = parseFloat(item.estoque_atual)
                    const disp_kg        = disp_nativo * peso
                    const suficiente     = disp_kg >= consumo_kg
                    const semQtd         = qtdProd === 0
                    const unidade        = item.componente_unidade || 'kg'
                    const isKg           = unidade === 'kg'
                    const consumo_nativo = consumo_kg / peso
                    return (
                      <div key={item.id || item.componente_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: '10px', marginBottom: '6px', background: semQtd ? '#F9FAFB' : (suficiente ? '#F0FDF4' : '#FEF2F2'), border: `1px solid ${semQtd ? '#E5E7EB' : (suficiente ? '#BBF7D0' : '#FECACA')}` }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: '#111827' }}>{item.componente_nome}</div>
                          <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>
                            Tem no estoque: {fmt(disp_nativo)} {unidade}{!isKg && <span> ({fmt(disp_kg)} kg)</span>}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '10px' }}>
                          {semQtd ? <span style={{ fontSize: '12px', color: '#9CA3AF' }}>—</span> : (
                            <>
                              <div style={{ fontSize: '14px', fontWeight: '700', color: suficiente ? '#166534' : '#B91C1C' }}>
                                {!isKg ? `${fmt(consumo_nativo)} ${unidade}` : `${fmt(consumo_kg)} kg`}
                              </div>
                              {!isKg && <div style={{ fontSize: '11px', color: suficiente ? '#166534' : '#B91C1C' }}>{fmt(consumo_kg)} kg</div>}
                              {!suficiente && <div style={{ fontSize: '11px', color: '#B91C1C', fontWeight: '600' }}>FALTA {fmt((consumo_kg - disp_kg) / peso)} {unidade}</div>}
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {fichaProducao.length === 0 && producao.produto_id && (
                <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '10px', padding: '12px', marginBottom: '16px', fontSize: '13px', color: '#92400E' }}>
                  Este produto ainda não tem receita cadastrada. Vá em <strong>Produtos → Ficha técnica</strong> para adicionar os ingredientes.
                </div>
              )}
            </>
          )}

          {/* ── VENDA ── */}
          {tipo === 'venda' && (
            <>
              <div style={S.field}>
                <label style={S.label}>Qual produto você vendeu?</label>
                <select value={venda.produto_id} onChange={e => {
                  const p = produtos.find(x => x.id === e.target.value)
                  setVenda({...venda, produto_id: e.target.value, produto: p?.nome || ''})
                }} style={S.select}>
                  {produtos.length === 0
                    ? <option>Nenhum produto cadastrado</option>
                    : produtos.map(p => <option key={p.id} value={p.id}>{p.nome} ({p.unidade})</option>)
                  }
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={S.field}>
                  <label style={S.label}>Quantidade vendida</label>
                  <input type="number" value={venda.quantidade}
                    onChange={e => setVenda({...venda, quantidade: e.target.value})}
                    placeholder="Ex: 10" style={S.input} />
                  <div style={S.dica}>Quantas unidades?</div>
                </div>
                <div style={S.field}>
                  <label style={S.label}>Preço por unidade</label>
                  <input type="number" value={venda.preco_unitario}
                    onChange={e => setVenda({...venda, preco_unitario: e.target.value})}
                    placeholder="Ex: 120,00" style={S.input} />
                  <div style={S.dica}>Valor de cada um</div>
                </div>
              </div>

              {totalVenda > 0 && (
                <div style={{ background: '#ECFDF5', border: '1.5px solid #6EE7B7', borderRadius: '12px', padding: '14px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', color: '#065F46', fontWeight: '600' }}>Total desta venda</span>
                  <span style={{ fontSize: '22px', fontWeight: '700', color: '#1D9E75' }}>
                    {totalVenda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              )}

              <div style={S.field}>
                <label style={S.label}>Para quem vendeu? (opcional)</label>
                <select value={venda.cliente_id || ''} onChange={e => setVenda({...venda, cliente_id: e.target.value})} style={S.select}>
                  <option value=''>Não precisa informar</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>

              {venda.cliente_id && (
                <div onClick={() => setFiado(!fiado)}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', border: `2px solid ${fiado ? '#E24B4A' : '#E5E7EB'}`, borderRadius: '12px', marginBottom: '16px', cursor: 'pointer', background: fiado ? '#FEF2F2' : '#fff' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '6px', border: `2px solid ${fiado ? '#E24B4A' : '#D1D5DB'}`, background: fiado ? '#E24B4A' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {fiado && <span style={{ color: '#fff', fontSize: '13px', fontWeight: '700' }}>✓</span>}
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: fiado ? '#E24B4A' : '#374151' }}>Vendeu fiado?</div>
                    <div style={{ fontSize: '12px', color: '#9CA3AF' }}>Marque aqui se o cliente vai pagar depois</div>
                  </div>
                </div>
              )}

              <div style={S.field}>
                <label style={S.label}>Quando foi a venda?</label>
                <input type="date" value={venda.data_venda}
                  onChange={e => setVenda({...venda, data_venda: e.target.value})} style={S.input} />
              </div>
            </>
          )}

          {/* ── COMPRA ── */}
          {tipo === 'compra' && (
            <>
              <div style={S.field}>
                <label style={S.label}>O que você comprou?</label>
                <select value={compra.insumo_id}
                  onChange={e => setCompra({...compra, insumo_id: e.target.value})} style={S.select}>
                  {insumos.length === 0
                    ? <option>Nenhum ingrediente cadastrado</option>
                    : insumos.map(i => <option key={i.id} value={i.id}>{i.nome} ({i.unidade})</option>)
                  }
                </select>
                <div style={S.dica}>Se não aparece aqui, cadastre em "Ingredientes" primeiro</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={S.field}>
                  <label style={S.label}>Quantidade comprada</label>
                  <input type="number" value={compra.quantidade}
                    onChange={e => setCompra({...compra, quantidade: e.target.value})}
                    placeholder="Ex: 5" style={S.input} />
                </div>
                <div style={S.field}>
                  <label style={S.label}>Preço por unidade</label>
                  <input type="number" value={compra.preco_unitario}
                    onChange={e => setCompra({...compra, preco_unitario: e.target.value})}
                    placeholder="Ex: 85,00" style={S.input} />
                  <div style={S.dica}>Valor de cada saco/kg</div>
                </div>
              </div>

              {totalCompra > 0 && (
                <div style={{ background: '#EFF6FF', border: '1.5px solid #93C5FD', borderRadius: '12px', padding: '14px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', color: '#1E3A8A', fontWeight: '600' }}>Total gasto nessa compra</span>
                  <span style={{ fontSize: '22px', fontWeight: '700', color: '#2563EB' }}>
                    {totalCompra.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              )}

              <div style={S.field}>
                <label style={S.label}>Comprou de quem? (opcional)</label>
                <select value={compra.fornecedor_id}
                  onChange={e => {
                    const f = fornecedores.find(x => x.id === e.target.value)
                    setCompra({...compra, fornecedor_id: e.target.value, fornecedor: f?.nome || ''})
                  }} style={S.select}>
                  <option value=''>Não precisa informar</option>
                  {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                </select>
              </div>

              <div style={S.field}>
                <label style={S.label}>Quando foi a compra?</label>
                <input type="date" value={compra.data_compra}
                  onChange={e => setCompra({...compra, data_compra: e.target.value})} style={S.input} />
              </div>
            </>
          )}

          {/* ── RECEITA ── */}
          {tipo === 'receita' && (
            <>
              <div style={S.field}>
                <label style={S.label}>De onde veio esse dinheiro?</label>
                <select value={receita.categoria}
                  onChange={e => setReceita({...receita, categoria: e.target.value})} style={S.select}>
                  <option value="leite">Folha do leite (cooperativa)</option>
                  <option value="animal">Venda de animal (boi, vaca...)</option>
                  <option value="outro">Outro (subsidio, aluguel...)</option>
                </select>
              </div>
              <div style={S.field}>
                <label style={S.label}>Quanto entrou?</label>
                <input type="number" value={receita.valor}
                  onChange={e => setReceita({...receita, valor: e.target.value})}
                  placeholder="R$ 0,00" style={S.input} />
              </div>
              <div style={S.field}>
                <label style={S.label}>Descrição (opcional)</label>
                <input value={receita.descricao}
                  onChange={e => setReceita({...receita, descricao: e.target.value})}
                  placeholder="Ex: Leite — segunda quinzena de março" style={S.input} />
                <div style={S.dica}>Escreva alguma coisa para lembrar depois o que foi</div>
              </div>
              <div style={S.field}>
                <label style={S.label}>Quando foi?</label>
                <input type="date" value={receita.data_receita}
                  onChange={e => setReceita({...receita, data_receita: e.target.value})} style={S.input} />
              </div>
            </>
          )}

          {/* ── DESPESA ── */}
          {tipo === 'despesa' && (
            <>
              <div style={S.field}>
                <label style={S.label}>Com o que foi o gasto?</label>
                <select value={despesa.categoria}
                  onChange={e => setDespesa({...despesa, categoria: e.target.value})} style={S.select}>
                  <option value="energia">Conta de energia elétrica</option>
                  <option value="combustivel">Combustível (gasolina, diesel...)</option>
                  <option value="manutencao">Manutenção ou conserto de máquina</option>
                  <option value="veterinario">Veterinário ou remédio para animal</option>
                  <option value="impostos">Imposto ou taxa</option>
                  <option value="outro">Outro gasto</option>
                </select>
              </div>
              <div style={S.field}>
                <label style={S.label}>Quanto foi o gasto?</label>
                <input type="number" value={despesa.valor}
                  onChange={e => setDespesa({...despesa, valor: e.target.value})}
                  placeholder="R$ 0,00" style={S.input} />
              </div>
              <div style={S.field}>
                <label style={S.label}>Descrição (opcional)</label>
                <input value={despesa.descricao}
                  onChange={e => setDespesa({...despesa, descricao: e.target.value})}
                  placeholder="Ex: Conta de luz de março" style={S.input} />
                <div style={S.dica}>Escreva alguma coisa para lembrar depois o que foi</div>
              </div>
              <div style={S.field}>
                <label style={S.label}>Quando foi?</label>
                <input type="date" value={despesa.data_despesa}
                  onChange={e => setDespesa({...despesa, data_despesa: e.target.value})} style={S.input} />
              </div>
            </>
          )}

          <button onClick={salvar} style={S.btnSave}>
            {tipo === 'produzir' ? 'Confirmar produção'
            : tipo === 'venda'   ? 'Confirmar venda'
            : tipo === 'compra'  ? 'Confirmar compra'
            : tipo === 'receita' ? 'Confirmar entrada'
            :                      'Confirmar gasto'}
          </button>
        </>
      )}
    </div>
  )
}
