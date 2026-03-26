import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../services/api'

const S = {
  input:     { width: '100%', padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: '10px', fontSize: '14px', background: '#fff', color: '#111827' },
  btnGreen:  { padding: '8px 16px', background: '#1D9E75', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  btnGhost:  { padding: '8px 16px', background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', color: '#374151' },
  btnDanger: { padding: '8px 16px', background: '#fff', border: '1.5px solid #FECACA', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', color: '#E24B4A' },
  label:     { fontSize: '12px', fontWeight: '600', color: '#6B7280', display: 'block', marginBottom: '5px' },
}

export default function FornecedorDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [fornecedor, setFornecedor] = useState(null)
  const [editando, setEditando] = useState(false)
  const [dadosEdicao, setDadosEdicao] = useState({})

  const carregar = () => {
    api.get(`/fornecedores/${id}`).then(r => {
      setFornecedor(r.data)
      setDadosEdicao({ nome: r.data.nome, telefone: r.data.telefone || '', observacao: r.data.observacao || '' })
    })
  }

  useEffect(() => { carregar() }, [id])

  const salvarEdicao = async () => {
    await api.put(`/fornecedores/${id}`, dadosEdicao)
    setEditando(false)
    carregar()
  }

  const excluir = async () => {
    if (!confirm(`Excluir o fornecedor ${fornecedor.nome}?`)) return
    await api.delete(`/fornecedores/${id}`)
    navigate('/fornecedores')
  }

  if (!fornecedor) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh', color: '#9CA3AF', fontSize: '14px' }}>
      Carregando...
    </div>
  )

  const infos = [
    { key: 'telefone', label: 'Telefone' },
    { key: 'observacao', label: 'Observação' },
  ].filter(({ key }) => fornecedor[key])

  return (
    <div style={{ padding: '20px 16px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <button onClick={() => navigate('/fornecedores')} style={S.btnGhost}>← Voltar</button>
        <div style={{ fontSize: '20px', fontWeight: '700', color: '#111827', flex: 1 }}>{fornecedor.nome}</div>
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
            <button onClick={excluir} style={{ ...S.btnDanger, marginLeft: 'auto' }}>Excluir fornecedor</button>
          </div>
        </div>
      )}

      {/* Informações */}
      <div style={{ background: '#fff', borderRadius: '14px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        {infos.length === 0 ? (
          <div style={{ color: '#9CA3AF', fontSize: '14px', textAlign: 'center', padding: '8px 0' }}>Nenhuma informação adicional</div>
        ) : infos.map(({ key, label }) => (
          <div key={key} style={{ marginBottom: key !== infos[infos.length - 1].key ? '14px' : 0 }}>
            <div style={{ fontSize: '11px', fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '3px' }}>{label}</div>
            <div style={{ fontSize: '15px', color: '#111827' }}>{fornecedor[key]}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
