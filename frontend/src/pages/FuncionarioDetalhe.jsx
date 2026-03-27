import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../services/api'

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtData = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—'

const S = {
  input:     { width: '100%', padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: '10px', fontSize: '14px', background: '#fff', color: '#111827', boxSizing: 'border-box' },
  btnGreen:  { padding: '10px 20px', background: '#1D9E75', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  btnGhost:  { padding: '10px 20px', background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: '10px', fontSize: '14px', cursor: 'pointer', color: '#374151' },
  btnDanger: { padding: '10px 20px', background: '#fff', border: '1.5px solid #FECACA', borderRadius: '10px', fontSize: '14px', cursor: 'pointer', color: '#E24B4A' },
  label:     { fontSize: '13px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '5px' },
  dica:      { fontSize: '11px', color: '#9CA3AF', marginTop: '3px' },
}

export default function FuncionarioDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [func, setFunc] = useState(null)
  const [editando, setEditando] = useState(false)
  const [edicao, setEdicao] = useState({})
  const [salvando, setSalvando] = useState(false)

  const carregar = () => {
    api.get(`/funcionarios/${id}`).then(r => {
      setFunc(r.data)
      setEdicao({
        nome: r.data.nome,
        cargo: r.data.cargo || '',
        salario: r.data.salario,
        vale_transporte: r.data.vale_transporte || 0,
        vale_alimentacao: r.data.vale_alimentacao || 0,
        encargos_patronais: r.data.encargos_patronais || 0,
        data_admissao: r.data.data_admissao?.split('T')[0] || '',
        observacao: r.data.observacao || '',
      })
    })
  }

  useEffect(() => { carregar() }, [id])

  const salvarEdicao = async () => {
    setSalvando(true)
    try {
      await api.put(`/funcionarios/${id}`, edicao)
      setEditando(false)
      carregar()
    } finally {
      setSalvando(false)
    }
  }

  const desativar = async () => {
    if (!confirm(`Desativar o funcionário ${func.nome}?\n\nEle vai sair da lista e não vai mais ser contado nos gastos da fazenda.`)) return
    await api.delete(`/funcionarios/${id}`)
    navigate('/funcionarios')
  }

  if (!func) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh', color: '#9CA3AF', fontSize: '14px' }}>
      Carregando...
    </div>
  )

  const custoPreviewEdicao = editando
    ? (parseFloat(edicao.salario || 0) + parseFloat(edicao.vale_transporte || 0) + parseFloat(edicao.vale_alimentacao || 0) + parseFloat(edicao.encargos_patronais || 0))
    : 0

  const totalEncargos = Number(func.vale_transporte || 0) + Number(func.vale_alimentacao || 0) + Number(func.encargos_patronais || 0)

  return (
    <div style={{ padding: '20px 16px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <button onClick={() => navigate('/funcionarios')} style={S.btnGhost}>← Voltar</button>
        <div style={{ fontSize: '20px', fontWeight: '700', color: '#111827', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{func.nome}</div>
        <button onClick={() => setEditando(!editando)} style={S.btnGhost}>Editar</button>
      </div>

      {/* Formulário de edição */}
      {editando && (
        <div style={{ background: '#fff', borderRadius: '14px', padding: '18px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', border: '1.5px solid #E5E7EB' }}>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#111827', marginBottom: '16px' }}>Editar dados</div>

          <div style={{ marginBottom: '14px' }}>
            <label style={S.label}>Nome completo</label>
            <input value={edicao.nome} onChange={e => setEdicao({ ...edicao, nome: e.target.value })} style={S.input} />
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label style={S.label}>Cargo / Função</label>
            <input value={edicao.cargo} onChange={e => setEdicao({ ...edicao, cargo: e.target.value })} placeholder="Ex: Peão, Tratorista" style={S.input} />
          </div>

          <div style={{ fontSize: '12px', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '18px 0 12px', paddingBottom: '8px', borderBottom: '1px solid #F3F4F6' }}>
            Valores mensais
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={S.label}>Salário (o que ele recebe)</label>
            <input type="number" value={edicao.salario} onChange={e => setEdicao({ ...edicao, salario: e.target.value })} placeholder="0,00" style={S.input} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
            <div>
              <label style={S.label}>Vale Transporte</label>
              <input type="number" value={edicao.vale_transporte} onChange={e => setEdicao({ ...edicao, vale_transporte: e.target.value })} placeholder="0,00" style={S.input} />
            </div>
            <div>
              <label style={S.label}>Vale Alimentação</label>
              <input type="number" value={edicao.vale_alimentacao} onChange={e => setEdicao({ ...edicao, vale_alimentacao: e.target.value })} placeholder="0,00" style={S.input} />
            </div>
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label style={S.label}>Encargos (FGTS, INSS, etc.)</label>
            <input type="number" value={edicao.encargos_patronais} onChange={e => setEdicao({ ...edicao, encargos_patronais: e.target.value })} placeholder="0,00" style={S.input} />
            <div style={S.dica}>Quanto a mais você paga por cima do salário para o governo</div>
          </div>

          {custoPreviewEdicao > 0 && (
            <div style={{ background: '#FFFBEB', border: '1.5px solid #FDE68A', borderRadius: '10px', padding: '12px 14px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: '#92400E', fontWeight: '500' }}>Custo total por mês</span>
              <span style={{ fontSize: '18px', fontWeight: '700', color: '#D97706' }}>{fmt(custoPreviewEdicao)}</span>
            </div>
          )}

          <div style={{ marginBottom: '14px' }}>
            <label style={S.label}>Data que começou a trabalhar</label>
            <input type="date" value={edicao.data_admissao} onChange={e => setEdicao({ ...edicao, data_admissao: e.target.value })} style={S.input} />
          </div>
          <div style={{ marginBottom: '18px' }}>
            <label style={S.label}>Observação</label>
            <input value={edicao.observacao} onChange={e => setEdicao({ ...edicao, observacao: e.target.value })} placeholder="Opcional" style={S.input} />
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={salvarEdicao} disabled={salvando} style={{ ...S.btnGreen, opacity: salvando ? 0.7 : 1 }}>
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
            <button onClick={() => setEditando(false)} style={S.btnGhost}>Cancelar</button>
            <button onClick={desativar} style={{ ...S.btnDanger, marginLeft: 'auto' }}>Desativar funcionário</button>
          </div>
        </div>
      )}

      {/* Card de custo total — destaque */}
      <div style={{ background: '#FEF3C7', border: '1.5px solid #FDE68A', borderRadius: '14px', padding: '18px', marginBottom: '16px' }}>
        <div style={{ fontSize: '12px', color: '#92400E', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Custo total por mês com este funcionário
        </div>
        <div style={{ fontSize: '32px', fontWeight: '700', color: '#D97706', marginBottom: '16px' }}>
          {fmt(func.custo_mensal)}
        </div>

        {/* Breakdown — estilo recibo */}
        <div style={{ borderTop: '1px dashed #FCD34D', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#78350F' }}>
            <span>Salário</span>
            <span style={{ fontWeight: '600' }}>{fmt(func.salario)}</span>
          </div>
          {Number(func.vale_transporte) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#78350F' }}>
              <span>Vale Transporte</span>
              <span style={{ fontWeight: '600' }}>{fmt(func.vale_transporte)}</span>
            </div>
          )}
          {Number(func.vale_alimentacao) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#78350F' }}>
              <span>Vale Alimentação</span>
              <span style={{ fontWeight: '600' }}>{fmt(func.vale_alimentacao)}</span>
            </div>
          )}
          {Number(func.encargos_patronais) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#78350F' }}>
              <span>Encargos (FGTS/INSS)</span>
              <span style={{ fontWeight: '600' }}>{fmt(func.encargos_patronais)}</span>
            </div>
          )}
          {totalEncargos > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: '700', color: '#D97706', borderTop: '1px dashed #FCD34D', paddingTop: '8px', marginTop: '2px' }}>
              <span>= TOTAL</span>
              <span>{fmt(func.custo_mensal)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Informações gerais */}
      <div style={{ background: '#fff', borderRadius: '14px', padding: '14px 16px', marginBottom: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        {func.cargo && (
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', marginBottom: '10px', borderBottom: '1px solid #F3F4F6' }}>
            <span style={{ fontSize: '13px', color: '#6B7280' }}>Cargo</span>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>{func.cargo}</span>
          </div>
        )}
        {func.data_admissao && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', color: '#6B7280' }}>Trabalhando desde</span>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>{fmtData(func.data_admissao)}</span>
          </div>
        )}
        {func.observacao && (
          <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #F3F4F6', fontSize: '13px', color: '#6B7280' }}>
            {func.observacao}
          </div>
        )}
      </div>

    </div>
  )
}
