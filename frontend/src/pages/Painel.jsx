import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function Painel() {
  const hoje = new Date()
  const [dados, setDados] = useState(null)
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [ano] = useState(hoje.getFullYear())
  const navigate = useNavigate()

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

  const saldo = dados.resultado || 0
  const totalSaiu = (dados.totalCompras || 0) + (dados.totalDespesas || 0) + (dados.totalFuncionarios || 0)

  return (
    <div style={{ padding: '20px 16px' }}>

      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <div style={{ fontSize: '22px', fontWeight: '700', color: '#111827', lineHeight: 1.2 }}>Como está a fazenda</div>
          <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '3px' }}>
            Mostrando {MESES[mes - 1]} de {ano}
          </div>
        </div>
        <select value={mes} onChange={e => setMes(Number(e.target.value))}
          style={{ padding: '8px 10px', border: '1.5px solid #E5E7EB', borderRadius: '10px', fontSize: '13px', background: '#fff', color: '#374151', cursor: 'pointer' }}>
          {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
      </div>

      {/* Resultado do mês — card grande */}
      <div style={{ background: saldo >= 0 ? '#1D9E75' : '#E24B4A', borderRadius: '18px', padding: '22px 20px', marginBottom: '10px' }}>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.85)', marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {saldo >= 0 ? 'Sobrou no bolso esse mês' : 'A fazenda gastou mais do que ganhou'}
        </div>
        <div style={{ fontSize: '36px', fontWeight: '700', color: '#fff', letterSpacing: '-0.5px', lineHeight: 1.1 }}>
          {fmt(Math.abs(saldo))}
        </div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', marginTop: '8px' }}>
          {saldo >= 0
            ? `Entrou ${fmt(dados.totalEntradas)} e saiu ${fmt(totalSaiu)}`
            : `Saiu ${fmt(totalSaiu)} mas entrou só ${fmt(dados.totalEntradas)}`
          }
        </div>
      </div>

      {/* Botão rápido de registrar */}
      <button onClick={() => navigate('/novo')}
        style={{ width: '100%', padding: '13px', background: '#fff', border: '1.5px dashed #D1D5DB', borderRadius: '12px', fontSize: '14px', fontWeight: '600', color: '#6B7280', cursor: 'pointer', marginBottom: '20px' }}>
        + Registrar venda, compra ou despesa
      </button>

      {/* A receber (fiado pendente) */}
      {dados.totalAReceber > 0 && (
        <div onClick={() => navigate('/clientes')}
          style={{ background: '#FFFBEB', border: '1.5px solid #FDE68A', borderRadius: '14px', padding: '14px 16px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '3px' }}>A receber (fiado)</div>
            <div style={{ fontSize: '12px', color: '#B45309' }}>Clientes que ainda não pagaram</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#D97706' }}>{fmt(dados.totalAReceber)}</div>
            <div style={{ fontSize: '10px', color: '#D97706' }}>toque para ver ›</div>
          </div>
        </div>
      )}

      {/* Cards — Entradas */}
      <div style={{ fontSize: '12px', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px', paddingLeft: '2px' }}>
        Dinheiro que entrou na fazenda
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '20px' }}>
        <div style={{ background: '#fff', borderRadius: '14px', padding: '16px 14px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderLeft: '4px solid #1D9E75' }}>
          <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '6px', fontWeight: '500' }}>Venda de produtos</div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#1D9E75' }}>{fmt(dados.totalVendas)}</div>
          <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '3px' }}>à vista + fiado recebido</div>
        </div>
        <div style={{ background: '#fff', borderRadius: '14px', padding: '16px 14px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderLeft: '4px solid #10B981' }}>
          <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '6px', fontWeight: '500' }}>Outras entradas</div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#10B981' }}>{fmt(dados.totalReceitas)}</div>
          <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '3px' }}>leite, subsídios, fiado pago</div>
        </div>
      </div>

      {/* Cards — Saídas */}
      <div style={{ fontSize: '12px', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px', paddingLeft: '2px' }}>
        Dinheiro que saiu da fazenda
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
        <div style={{ background: '#fff', borderRadius: '14px', padding: '16px 14px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderLeft: '4px solid #F59E0B' }}>
          <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '6px', fontWeight: '500' }}>Compra de ingredientes</div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#D97706' }}>{fmt(dados.totalCompras)}</div>
          <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '3px' }}>milho, farelo, etc.</div>
        </div>
        <div style={{ background: '#fff', borderRadius: '14px', padding: '16px 14px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderLeft: '4px solid #E24B4A' }}>
          <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '6px', fontWeight: '500' }}>Despesas gerais</div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#E24B4A' }}>{fmt(dados.totalDespesas)}</div>
          <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '3px' }}>luz, combustível, etc.</div>
        </div>
      </div>

      {/* Funcionários */}
      <div onClick={() => navigate('/funcionarios')}
        style={{ background: '#fff', borderRadius: '14px', padding: '16px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', cursor: 'pointer', border: '1.5px solid #FDE68A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '11px', color: '#92400E', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
            Gasto com funcionários
          </div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#D97706' }}>{fmt(dados.totalFuncionarios)}</div>
          <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '3px' }}>
            {dados.qtdFuncionarios > 0
              ? `${dados.qtdFuncionarios} ${dados.qtdFuncionarios === 1 ? 'funcionário' : 'funcionários'} · descontado todo mês automaticamente`
              : 'Toque para cadastrar funcionários'
            }
          </div>
        </div>
        <span style={{ fontSize: '22px', color: '#FCD34D' }}>›</span>
      </div>

      {/* Vendas por produto */}
      {dados.vendasPorProduto?.length > 0 && (
        <>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px', paddingLeft: '2px' }}>
            O que foi mais vendido esse mês
          </div>
          {dados.vendasPorProduto.map(v => (
            <div key={v.produto} style={{ background: '#fff', borderRadius: '14px', padding: '14px 16px', marginBottom: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '15px', color: '#111827' }}>{v.produto}</div>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>{Number(v.quantidade).toLocaleString('pt-BR')} unidades vendidas</div>
                </div>
                <div style={{ fontSize: '17px', fontWeight: '700', color: '#1D9E75' }}>{fmt(v.total)}</div>
              </div>
            </div>
          ))}
        </>
      )}

      {!dados.vendasPorProduto?.length && (
        <div style={{ background: '#fff', borderRadius: '14px', padding: '32px 20px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: '15px', color: '#9CA3AF', marginBottom: '6px' }}>Nenhuma venda em {MESES[mes - 1]}</div>
          <div style={{ fontSize: '13px', color: '#D1D5DB' }}>Registre uma venda tocando em "+ Registrar"</div>
        </div>
      )}
    </div>
  )
}
