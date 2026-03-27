import { useEffect, useState } from 'react'
import api from '../services/api'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const TIPO = {
  venda:          { label: 'Venda',          cor: '#1D9E75', bg: '#ECFDF5', entrada: true  },
  venda_fiado:    { label: 'Fiado',          cor: '#D97706', bg: '#FEF3C7', entrada: false },
  venda_recebida: { label: 'Venda recebida', cor: '#1D9E75', bg: '#ECFDF5', entrada: true  },
  receita:        { label: 'Receita',        cor: '#1D9E75', bg: '#ECFDF5', entrada: true  },
  compra:         { label: 'Compra',         cor: '#E24B4A', bg: '#FEF2F2', entrada: false },
  despesa:        { label: 'Despesa',        cor: '#E24B4A', bg: '#FEF2F2', entrada: false },
}

const CAT = {
  leite: 'Folha do leite', animal: 'Venda de animal',
  funcionario: 'Funcionário', energia: 'Energia elétrica',
  combustivel: 'Combustível', manutencao: 'Manutenção',
  fiado_pago: 'Recebimento fiado',
}

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtData = (d) => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

export default function Lancamentos() {
  const hoje = new Date()
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [ano, setAno] = useState(hoje.getFullYear())
  const [lista, setLista] = useState([])
  const [filtro, setFiltro] = useState('todos')

  useEffect(() => {
    api.get(`/lancamentos?mes=${mes}&ano=${ano}`).then(r => setLista(r.data))
  }, [mes, ano])

  const navMes = (d) => {
    let m = mes + d, a = ano
    if (m > 12) { m = 1; a++ }
    if (m < 1)  { m = 12; a-- }
    setMes(m); setAno(a)
  }

  const tipoKey   = (l) => {
    if (l.tipo === 'venda' && l.fiado) return 'venda_fiado'
    if (l.tipo === 'receita' && l.descricao === 'fiado_pago') return 'venda_recebida'
    return l.tipo
  }
  const filtrados = filtro === 'todos' ? lista : lista.filter(l => l.tipo === filtro)
  const entradas  = lista.filter(l => TIPO[tipoKey(l)].entrada).reduce((s, l) => s + Number(l.valor), 0)
  const saidas    = lista.filter(l => !TIPO[tipoKey(l)].entrada).reduce((s, l) => s + Number(l.valor), 0)
  const saldo     = entradas - saidas

  return (
    <div style={{ padding: '20px 16px' }}>

      {/* Header navegação de mês */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <button onClick={() => navMes(-1)}
          style={{ width: '36px', height: '36px', background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: '10px', cursor: 'pointer', fontSize: '16px', color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          ‹
        </button>
        <div style={{ fontSize: '17px', fontWeight: '700', color: '#111827' }}>{MESES[mes - 1]} {ano}</div>
        <button onClick={() => navMes(1)}
          style={{ width: '36px', height: '36px', background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: '10px', cursor: 'pointer', fontSize: '16px', color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          ›
        </button>
      </div>

      {/* Resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '16px' }}>
        <div style={{ background: '#fff', borderRadius: '12px', padding: '12px 10px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: '10px', color: '#6B7280', marginBottom: '4px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Entradas</div>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#1D9E75' }}>{fmt(entradas)}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: '12px', padding: '12px 10px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: '10px', color: '#6B7280', marginBottom: '4px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Saídas</div>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#E24B4A' }}>{fmt(saidas)}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: '12px', padding: '12px 10px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: '10px', color: '#6B7280', marginBottom: '4px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Saldo</div>
          <div style={{ fontSize: '13px', fontWeight: '700', color: saldo >= 0 ? '#1D9E75' : '#E24B4A' }}>{fmt(saldo)}</div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: '2px' }}>
        {[['todos','Todos'],['venda','Vendas'],['compra','Compras'],['receita','Receitas'],['despesa','Despesas']].map(([v, l]) => (
          <button key={v} onClick={() => setFiltro(v)}
            style={{ flexShrink: 0, padding: '6px 14px', fontSize: '12px', fontWeight: filtro === v ? '600' : '400', borderRadius: '20px', cursor: 'pointer', border: '1.5px solid', borderColor: filtro === v ? '#1D9E75' : '#E5E7EB', background: filtro === v ? '#1D9E75' : '#fff', color: filtro === v ? '#fff' : '#6B7280', transition: 'all 0.15s' }}>
            {l}
          </button>
        ))}
      </div>

      {/* Lista */}
      {filtrados.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: '14px', padding: '40px 20px', textAlign: 'center', color: '#9CA3AF', fontSize: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          Nenhum lançamento neste período
        </div>
      ) : filtrados.map(l => {
        const cfg = TIPO[tipoKey(l)]
        return (
          <div key={`${l.tipo}-${l.id}`} style={{ background: '#fff', borderRadius: '14px', padding: '14px', marginBottom: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: cfg.cor, background: cfg.bg, padding: '2px 8px', borderRadius: '20px', flexShrink: 0 }}>
                    {cfg.label}
                  </span>
                  <span style={{ fontSize: '12px', color: '#9CA3AF' }}>{fmtData(l.data)}</span>
                  {l.fiado && <span style={{ fontSize: '11px', color: '#D97706' }}>a receber</span>}
                </div>
                <div style={{ fontWeight: '600', fontSize: '14px', color: '#111827', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {CAT[l.descricao] || l.descricao}
                </div>
                {l.cliente && (
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>
                    {l.tipo === 'compra' ? 'Fornec.: ' : l.tipo === 'receita' ? 'Origem: ' : 'Cliente: '}
                    <span style={{ color: '#374151' }}>{l.cliente}</span>
                  </div>
                )}
                {l.quantidade && l.preco_unitario && (
                  <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>
                    {Number(l.quantidade).toLocaleString('pt-BR')} × {fmt(l.preco_unitario)}
                  </div>
                )}
                {l.observacao && (
                  <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>{l.observacao}</div>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '16px', fontWeight: '700', color: cfg.cor, whiteSpace: 'nowrap' }}>
                  {cfg.entrada ? '+' : l.fiado ? '' : '−'}{fmt(l.valor)}
                </div>
                {l.fiado && <div style={{ fontSize: '10px', color: '#D97706', fontWeight: '600' }}>não recebido</div>}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
