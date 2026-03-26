import { useEffect, useState } from 'react'
import api from '../services/api'

const S = {
  field:    { marginBottom: '14px' },
  label:    { fontSize: '12px', fontWeight: '600', color: '#6B7280', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' },
  input:    { width: '100%', padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: '10px', fontSize: '14px', background: '#fff', color: '#111827' },
  select:   { width: '100%', padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: '10px', fontSize: '14px', background: '#fff', color: '#111827', cursor: 'pointer' },
  btnGreen: { width: '100%', padding: '13px', background: '#1D9E75', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '700', color: '#fff', cursor: 'pointer', marginTop: '4px' },
}

const field = (label, children) => (
  <div style={S.field}>
    <label style={S.label}>{label}</label>
    {children}
  </div>
)

export default function Novo() {
  const [tipo, setTipo] = useState('venda')
  const [insumos, setInsumos] = useState([])
  const [produtos, setProdutos] = useState([])
  const [clientes, setClientes] = useState([])
  const [fornecedores, setFornecedores] = useState([])
  const [fiado, setFiado] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const hoje = new Date().toISOString().split('T')[0]

  const [venda,   setVenda]   = useState({ produto: '', produto_id: '', quantidade: '', preco_unitario: '', cliente_id: '', data_venda: hoje })
  const [compra,  setCompra]  = useState({ insumo_id: '', fornecedor: '', quantidade: '', preco_unitario: '', data_compra: hoje })
  const [receita, setReceita] = useState({ categoria: 'leite', valor: '', descricao: '', origem: '', data_receita: hoje })
  const [despesa, setDespesa] = useState({ categoria: 'funcionario', valor: '', descricao: '', data_despesa: hoje })

  useEffect(() => {
    api.get('/estoques/insumos').then(r => {
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
      if (tipo === 'venda') {
        await api.post('/lancamentos/venda', venda)
        if (fiado && venda.cliente_id && venda.quantidade && venda.preco_unitario) {
          await api.post(`/clientes/${venda.cliente_id}/debitos`, {
            descricao: `${venda.produto} — ${venda.quantidade} un.`,
            valor: venda.quantidade * venda.preco_unitario,
            data_debito: venda.data_venda,
          })
        }
        setFiado(false)
        setVenda(v => ({ ...v, quantidade: '', preco_unitario: '', cliente_id: '' }))
        setSucesso(true)
        setTimeout(() => setSucesso(false), 3000)
        return
      }
      if (tipo === 'compra')  await api.post('/lancamentos/compra', compra)
      if (tipo === 'receita') await api.post('/lancamentos/receita', receita)
      if (tipo === 'despesa') await api.post('/lancamentos/despesa', despesa)

      setSucesso(true)
      setVenda(v  => ({ ...v,  quantidade: '', preco_unitario: '', cliente_id: '' }))
      setCompra(c => ({ ...c,  quantidade: '', preco_unitario: '', fornecedor: '' }))
      setReceita(r => ({ ...r, valor: '', descricao: '' }))
      setDespesa(d => ({ ...d, valor: '', descricao: '' }))
      setTimeout(() => setSucesso(false), 3000)
    } catch (err) {
      const msg = err.response?.data?.error || err.message
      alert('Erro: ' + msg)
    }
  }

  const TABS = [['venda','Venda'],['compra','Compra'],['receita','Receita'],['despesa','Despesa']]
  const total = tipo === 'venda'
    ? (venda.quantidade * venda.preco_unitario) || 0
    : tipo === 'compra'
    ? (compra.quantidade * compra.preco_unitario) || 0
    : 0

  return (
    <div style={{ padding: '20px 16px' }}>
      <div style={{ fontSize: '22px', fontWeight: '700', color: '#111827', marginBottom: '20px' }}>Novo lançamento</div>

      {sucesso && (
        <div style={{ background: '#ECFDF5', border: '1.5px solid #6EE7B7', borderRadius: '10px', padding: '12px 14px', fontSize: '13px', fontWeight: '500', color: '#065F46', marginBottom: '16px' }}>
          ✓ Lançamento registrado com sucesso!
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', background: '#E5E7EB', borderRadius: '12px', padding: '3px', marginBottom: '20px', gap: '2px' }}>
        {TABS.map(([v, l]) => (
          <button key={v} onClick={() => setTipo(v)}
            style={{ flex: 1, padding: '8px 4px', fontSize: '13px', fontWeight: tipo === v ? '700' : '400', borderRadius: '9px', cursor: 'pointer', border: 'none', background: tipo === v ? '#fff' : 'transparent', color: tipo === v ? '#111827' : '#6B7280', boxShadow: tipo === v ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>
            {l}
          </button>
        ))}
      </div>

      {/* Venda */}
      {tipo === 'venda' && <>
        {field('Produto',
          <select value={venda.produto_id} onChange={e => {
            const p = produtos.find(x => x.id === e.target.value)
            setVenda({...venda, produto_id: e.target.value, produto: p?.nome || ''})
          }} style={S.select}>
            {produtos.map(p => <option key={p.id} value={p.id}>{p.nome} ({p.unidade})</option>)}
          </select>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {field('Quantidade', <input type="number" value={venda.quantidade} onChange={e => setVenda({...venda, quantidade: e.target.value})} placeholder="0" style={S.input} />)}
          {field('Preço unitário', <input type="number" value={venda.preco_unitario} onChange={e => setVenda({...venda, preco_unitario: e.target.value})} placeholder="0,00" style={S.input} />)}
        </div>
        {field('Cliente',
          <select value={venda.cliente_id || ''} onChange={e => setVenda({...venda, cliente_id: e.target.value})} style={S.select}>
            <option value=''>Sem cliente</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        )}
        {venda.cliente_id && (
          <div onClick={() => setFiado(!fiado)}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', border: `1.5px solid ${fiado ? '#E24B4A' : '#E5E7EB'}`, borderRadius: '10px', marginBottom: '14px', cursor: 'pointer', background: fiado ? '#FEF2F2' : '#fff', transition: 'all 0.15s' }}>
            <div style={{ width: '18px', height: '18px', borderRadius: '5px', border: `2px solid ${fiado ? '#E24B4A' : '#D1D5DB'}`, background: fiado ? '#E24B4A' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
              {fiado && <span style={{ color: '#fff', fontSize: '11px', fontWeight: '700', lineHeight: 1 }}>✓</span>}
            </div>
            <span style={{ fontSize: '14px', color: fiado ? '#E24B4A' : '#374151', fontWeight: fiado ? '500' : '400' }}>Registrar como fiado (débito)</span>
          </div>
        )}
        {field('Data', <input type="date" value={venda.data_venda} onChange={e => setVenda({...venda, data_venda: e.target.value})} style={S.input} />)}
      </>}

      {/* Compra */}
      {tipo === 'compra' && <>
        {field('Insumo',
          <select value={compra.insumo_id} onChange={e => setCompra({...compra, insumo_id: e.target.value})} style={S.select}>
            {insumos.map(i => <option key={i.id} value={i.id}>{i.nome} ({i.unidade})</option>)}
          </select>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {field('Quantidade', <input type="number" value={compra.quantidade} onChange={e => setCompra({...compra, quantidade: e.target.value})} placeholder="0" style={S.input} />)}
          {field('Preço por unidade', <input type="number" value={compra.preco_unitario} onChange={e => setCompra({...compra, preco_unitario: e.target.value})} placeholder="0,00" style={S.input} />)}
        </div>
        {field('Fornecedor',
          <select value={compra.fornecedor} onChange={e => setCompra({...compra, fornecedor: e.target.value})} style={S.select}>
            <option value=''>Sem fornecedor</option>
            {fornecedores.map(f => <option key={f.id} value={f.nome}>{f.nome}</option>)}
          </select>
        )}
        {field('Data', <input type="date" value={compra.data_compra} onChange={e => setCompra({...compra, data_compra: e.target.value})} style={S.input} />)}
      </>}

      {/* Receita */}
      {tipo === 'receita' && <>
        {field('Origem',
          <select value={receita.categoria} onChange={e => setReceita({...receita, categoria: e.target.value})} style={S.select}>
            <option value="leite">Folha do leite</option>
            <option value="animal">Venda de animal</option>
            <option value="outro">Outro</option>
          </select>
        )}
        {field('Valor', <input type="number" value={receita.valor} onChange={e => setReceita({...receita, valor: e.target.value})} placeholder="R$ 0,00" style={S.input} />)}
        {field('Descrição', <input value={receita.descricao} onChange={e => setReceita({...receita, descricao: e.target.value})} placeholder="Ex: Leite — segunda quinzena" style={S.input} />)}
        {field('Data', <input type="date" value={receita.data_receita} onChange={e => setReceita({...receita, data_receita: e.target.value})} style={S.input} />)}
      </>}

      {/* Despesa */}
      {tipo === 'despesa' && <>
        {field('Categoria',
          <select value={despesa.categoria} onChange={e => setDespesa({...despesa, categoria: e.target.value})} style={S.select}>
            <option value="funcionario">Funcionário</option>
            <option value="energia">Energia elétrica</option>
            <option value="combustivel">Combustível</option>
            <option value="manutencao">Manutenção</option>
            <option value="outro">Outro</option>
          </select>
        )}
        {field('Valor', <input type="number" value={despesa.valor} onChange={e => setDespesa({...despesa, valor: e.target.value})} placeholder="R$ 0,00" style={S.input} />)}
        {field('Descrição', <input value={despesa.descricao} onChange={e => setDespesa({...despesa, descricao: e.target.value})} placeholder="Ex: Salário março" style={S.input} />)}
        {field('Data', <input type="date" value={despesa.data_despesa} onChange={e => setDespesa({...despesa, data_despesa: e.target.value})} style={S.input} />)}
      </>}

      {/* Total */}
      {(tipo === 'venda' || tipo === 'compra') && total > 0 && (
        <div style={{ background: '#F9FAFB', border: '1.5px solid #E5E7EB', borderRadius: '10px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>Total</span>
          <span style={{ fontSize: '18px', fontWeight: '700', color: '#1D9E75' }}>
            {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </div>
      )}

      <button onClick={salvar} style={S.btnGreen}>
        Registrar {tipo === 'venda' ? 'venda' : tipo === 'compra' ? 'compra' : tipo === 'receita' ? 'receita' : 'despesa'}
      </button>
    </div>
  )
}
