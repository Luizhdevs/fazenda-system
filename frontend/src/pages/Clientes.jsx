import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const S = {
  input:    { width: '100%', padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: '10px', fontSize: '14px', background: '#fff', color: '#111827' },
  btnGreen: { padding: '8px 16px', background: '#1D9E75', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  btnGhost: { padding: '8px 16px', background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', color: '#374151' },
}

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [mostraNovo, setMostraNovo] = useState(false)
  const [novo, setNovo] = useState({ nome: '', telefone: '', observacao: '' })
  const navigate = useNavigate()

  const carregar = () => api.get('/clientes').then(r => setClientes(r.data))
  useEffect(() => { carregar() }, [])

  const salvar = async () => {
    if (!novo.nome) return
    await api.post('/clientes', novo)
    setNovo({ nome: '', telefone: '', observacao: '' })
    setMostraNovo(false)
    carregar()
  }

  const campos = [
    { key: 'nome',       label: 'Nome',       placeholder: 'Nome completo' },
    { key: 'telefone',   label: 'Telefone',   placeholder: '(00) 00000-0000' },
    { key: 'observacao', label: 'Observação', placeholder: 'Opcional' },
  ]

  return (
    <div style={{ padding: '20px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ fontSize: '22px', fontWeight: '700', color: '#111827' }}>Clientes</div>
        <button onClick={() => setMostraNovo(!mostraNovo)} style={S.btnGreen}>+ Novo</button>
      </div>

      {mostraNovo && (
        <div style={{ background: '#fff', borderRadius: '14px', padding: '16px', marginBottom: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', border: '1.5px solid #E5E7EB' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '12px' }}>Novo cliente</div>
          {campos.map(({ key, label, placeholder }) => (
            <div key={key} style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', display: 'block', marginBottom: '5px' }}>{label}</label>
              <input value={novo[key]} onChange={e => setNovo({ ...novo, [key]: e.target.value })}
                placeholder={placeholder} style={S.input} />
            </div>
          ))}
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button onClick={salvar} style={S.btnGreen}>Salvar</button>
            <button onClick={() => setMostraNovo(false)} style={S.btnGhost}>Cancelar</button>
          </div>
        </div>
      )}

      {clientes.length === 0 && !mostraNovo && (
        <div style={{ background: '#fff', borderRadius: '14px', padding: '40px 20px', textAlign: 'center', color: '#9CA3AF', fontSize: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          Nenhum cliente cadastrado ainda
        </div>
      )}

      {clientes.map(c => (
        <div key={c.id} onClick={() => navigate(`/clientes/${c.id}`)}
          style={{ background: '#fff', borderRadius: '14px', padding: '14px', marginBottom: '8px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', transition: 'box-shadow 0.15s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: '600', fontSize: '15px', color: '#111827' }}>{c.nome}</div>
              {c.telefone && <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>{c.telefone}</div>}
            </div>
            <div style={{ textAlign: 'right' }}>
              {Number(c.total_devido) > 0 ? (
                <>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#E24B4A' }}>{fmt(c.total_devido)}</div>
                  <div style={{ fontSize: '11px', color: '#E24B4A', marginTop: '1px' }}>{c.qtd_debitos} débito{c.qtd_debitos > 1 ? 's' : ''}</div>
                </>
              ) : (
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#1D9E75', background: '#ECFDF5', padding: '3px 10px', borderRadius: '20px' }}>Em dia</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
