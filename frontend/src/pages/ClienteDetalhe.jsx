import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../services/api'

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtData = (d) => {
  if (!d) return '—'
  const s = String(d).substring(0, 10) + 'T12:00:00'
  const dt = new Date(s)
  return isNaN(dt) ? '—' : dt.toLocaleDateString('pt-BR')
}

const S = {
  input:     { width: '100%', padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: '10px', fontSize: '14px', background: '#fff', color: '#111827' },
  btnGreen:  { padding: '8px 16px', background: '#1D9E75', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  btnGhost:  { padding: '8px 16px', background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', color: '#374151' },
  btnDanger: { padding: '8px 16px', background: '#fff', border: '1.5px solid #FECACA', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', color: '#E24B4A' },
  btnRed:    { padding: '8px 16px', background: '#E24B4A', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  label:     { fontSize: '12px', fontWeight: '600', color: '#6B7280', display: 'block', marginBottom: '5px' },
}

export default function ClienteDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [cliente, setCliente] = useState(null)
  const [mostraDebito, setMostraDebito] = useState(false)
  const [editando, setEditando] = useState(false)
  const [novoDebito, setNovoDebito] = useState({ descricao: '', valor: '', data_debito: new Date().toISOString().split('T')[0], observacao: '' })
  const [dadosEdicao, setDadosEdicao] = useState({})

  const carregar = () => {
    api.get(`/clientes/${id}`).then(r => {
      setCliente(r.data)
      setDadosEdicao({ nome: r.data.nome, telefone: r.data.telefone || '', observacao: r.data.observacao || '' })
    })
  }

  useEffect(() => { carregar() }, [id])

  const salvarEdicao = async () => {
    await api.put(`/clientes/${id}`, dadosEdicao)
    setEditando(false)
    carregar()
  }

  const salvarDebito = async () => {
    if (!novoDebito.descricao || !novoDebito.valor) return
    await api.post(`/clientes/${id}/debitos`, novoDebito)
    setNovoDebito({ descricao: '', valor: '', data_debito: new Date().toISOString().split('T')[0], observacao: '' })
    setMostraDebito(false)
    carregar()
  }

  const pagar = async (debitoId) => {
    if (!confirm('Marcar como pago?')) return
    await api.patch(`/clientes/debitos/${debitoId}/pagar`)
    carregar()
  }

  const excluirCliente = async () => {
    if (!confirm(`Excluir o cliente ${cliente.nome}?`)) return
    await api.delete(`/clientes/${id}`)
    navigate('/clientes')
  }

  if (!cliente) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh', color: '#9CA3AF', fontSize: '14px' }}>
      Carregando...
    </div>
  )

  const pendentes = cliente.debitos?.filter(d => !d.pago) || []
  const pagos     = cliente.debitos?.filter(d => d.pago) || []

  return (
    <div style={{ padding: '20px 16px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <button onClick={() => navigate('/clientes')} style={S.btnGhost}>← Voltar</button>
        <div style={{ fontSize: '20px', fontWeight: '700', color: '#111827', flex: 1 }}>{cliente.nome}</div>
        <button onClick={() => setEditando(!editando)} style={S.btnGhost}>Editar</button>
      </div>

      {/* Edição */}
      {editando && (
        <div style={{ background: '#fff', borderRadius: '14px', padding: '16px', marginBottom: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', border: '1.5px solid #E5E7EB' }}>
          {[['nome','Nome'],['telefone','Telefone'],['observacao','Observação']].map(([k, l]) => (
            <div key={k} style={{ marginBottom: '10px' }}>
              <label style={S.label}>{l}</label>
              <input value={dadosEdicao[k] || ''} onChange={e => setDadosEdicao({ ...dadosEdicao, [k]: e.target.value })} style={S.input} />
            </div>
          ))}
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button onClick={salvarEdicao} style={S.btnGreen}>Salvar</button>
            <button onClick={() => setEditando(false)} style={S.btnGhost}>Cancelar</button>
            <button onClick={excluirCliente} style={{ ...S.btnDanger, marginLeft: 'auto' }}>Excluir cliente</button>
          </div>
        </div>
      )}

      {/* Totais */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '20px' }}>
        <div style={{ background: Number(cliente.total_devido) > 0 ? '#FEF2F2' : '#ECFDF5', borderRadius: '14px', padding: '16px' }}>
          <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '6px', fontWeight: '500' }}>Total devido</div>
          <div style={{ fontSize: '22px', fontWeight: '700', color: Number(cliente.total_devido) > 0 ? '#E24B4A' : '#1D9E75' }}>{fmt(cliente.total_devido)}</div>
        </div>
        <div style={{ background: '#ECFDF5', borderRadius: '14px', padding: '16px' }}>
          <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '6px', fontWeight: '500' }}>Total pago</div>
          <div style={{ fontSize: '22px', fontWeight: '700', color: '#1D9E75' }}>{fmt(cliente.total_pago)}</div>
        </div>
      </div>

      {/* Débitos pendentes */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ fontSize: '11px', fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Pendentes ({pendentes.length})
        </div>
        <button onClick={() => setMostraDebito(!mostraDebito)} style={S.btnRed}>+ Débito</button>
      </div>

      {mostraDebito && (
        <div style={{ background: '#fff', borderRadius: '14px', padding: '16px', marginBottom: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', border: '1.5px solid #FECACA' }}>
          <div style={{ marginBottom: '10px' }}>
            <label style={S.label}>Descrição</label>
            <input value={novoDebito.descricao} onChange={e => setNovoDebito({ ...novoDebito, descricao: e.target.value })}
              placeholder="Ex: 3 sacos de ração" style={S.input} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div>
              <label style={S.label}>Valor</label>
              <input type="number" value={novoDebito.valor} onChange={e => setNovoDebito({ ...novoDebito, valor: e.target.value })} placeholder="0,00" style={S.input} />
            </div>
            <div>
              <label style={S.label}>Data</label>
              <input type="date" value={novoDebito.data_debito} onChange={e => setNovoDebito({ ...novoDebito, data_debito: e.target.value })} style={S.input} />
            </div>
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label style={S.label}>Observação</label>
            <input value={novoDebito.observacao} onChange={e => setNovoDebito({ ...novoDebito, observacao: e.target.value })} placeholder="Opcional" style={S.input} />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={salvarDebito} style={S.btnRed}>Registrar débito</button>
            <button onClick={() => setMostraDebito(false)} style={S.btnGhost}>Cancelar</button>
          </div>
        </div>
      )}

      {pendentes.length === 0 && (
        <div style={{ background: '#fff', borderRadius: '14px', padding: '24px 20px', textAlign: 'center', color: '#9CA3AF', fontSize: '14px', marginBottom: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          Nenhum débito pendente
        </div>
      )}

      {pendentes.map(d => (
        <div key={d.id} style={{ background: '#fff', borderRadius: '14px', padding: '14px', marginBottom: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderLeft: '3px solid #E24B4A' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '600', fontSize: '14px', color: '#111827' }}>{d.descricao}</div>
              <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>{fmtData(d.data_debito)}</div>
              {d.observacao && <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>{d.observacao}</div>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#E24B4A' }}>{fmt(d.valor)}</div>
              <button onClick={() => pagar(d.id)}
                style={{ marginTop: '6px', padding: '4px 12px', background: '#1D9E75', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                Marcar pago
              </button>
            </div>
          </div>
        </div>
      ))}

      {pagos.length > 0 && (
        <>
          <div style={{ fontSize: '11px', fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '20px 0 10px' }}>
            Histórico pago ({pagos.length})
          </div>
          {pagos.map(d => (
            <div key={d.id} style={{ background: '#fff', borderRadius: '14px', padding: '14px', marginBottom: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', opacity: 0.65 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '14px', color: '#374151' }}>{d.descricao}</div>
                  <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>
                    {fmtData(d.data_debito)} · Pago {fmtData(d.data_pagamento)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#1D9E75' }}>{fmt(d.valor)}</div>
                  <div style={{ fontSize: '11px', color: '#1D9E75', fontWeight: '600' }}>Pago</div>
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
