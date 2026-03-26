import { useEffect, useState } from 'react'
import api from '../services/api'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function Painel() {
  const hoje = new Date()
  const [dados, setDados] = useState(null)
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [ano] = useState(hoje.getFullYear())

  useEffect(() => {
    api.get(`/dashboard?mes=${mes}&ano=${ano}`)
      .then(r => setDados(r.data))
      .catch(err => console.error(err))
  }, [mes, ano])

  if (!dados) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh', color: '#9CA3AF', fontSize: '14px' }}>
      Carregando...
    </div>
  )

  const saldo = (dados.resultado || 0)

  return (
    <div style={{ padding: '20px 16px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <div style={{ fontSize: '22px', fontWeight: '700', color: '#111827', lineHeight: 1.2 }}>Painel</div>
          <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '2px' }}>{MESES[mes - 1]} {ano}</div>
        </div>
        <select value={mes} onChange={e => setMes(Number(e.target.value))}
          style={{ padding: '7px 10px', border: '1.5px solid #E5E7EB', borderRadius: '10px', fontSize: '13px', background: '#fff', color: '#374151', cursor: 'pointer' }}>
          {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
      </div>

      {/* Saldo destaque */}
      <div style={{ background: saldo >= 0 ? '#1D9E75' : '#E24B4A', borderRadius: '16px', padding: '20px', marginBottom: '12px' }}>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', marginBottom: '6px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Resultado do mês</div>
        <div style={{ fontSize: '32px', fontWeight: '700', color: '#fff', letterSpacing: '-0.5px' }}>{fmt(saldo)}</div>
      </div>

      {/* Cards secundários */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '20px' }}>
        {[
          { label: 'Entradas',  value: dados.totalEntradas, color: '#1D9E75' },
          { label: 'Vendas',    value: dados.totalVendas,   color: '#1D9E75' },
          { label: 'Despesas',  value: dados.totalDespesas, color: '#E24B4A' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: '#fff', borderRadius: '12px', padding: '12px 10px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '5px', fontWeight: '500' }}>{label}</div>
            <div style={{ fontSize: '14px', fontWeight: '700', color }}>{fmt(value)}</div>
          </div>
        ))}
      </div>

      {/* Vendas por produto */}
      <div style={{ fontSize: '11px', fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
        Vendas por produto
      </div>

      {(!dados.vendasPorProduto || dados.vendasPorProduto.length === 0) ? (
        <div style={{ background: '#fff', borderRadius: '14px', padding: '32px 20px', textAlign: 'center', color: '#9CA3AF', fontSize: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          Nenhuma venda neste mês
        </div>
      ) : (
        dados.vendasPorProduto.map(v => (
          <div key={v.produto} style={{ background: '#fff', borderRadius: '14px', padding: '14px', marginBottom: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: '600', fontSize: '14px', color: '#111827' }}>{v.produto}</div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>{Number(v.quantidade).toLocaleString('pt-BR')} unidades</div>
              </div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#1D9E75' }}>{fmt(v.total)}</div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
