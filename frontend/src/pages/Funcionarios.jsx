import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const S = {
  input:    { width: '100%', padding: '12px 14px', border: '1.5px solid #E5E7EB', borderRadius: '12px', fontSize: '15px', background: '#fff', color: '#111827', boxSizing: 'border-box' },
  label:    { fontSize: '13px', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '6px' },
  dica:     { fontSize: '11px', color: '#9CA3AF', marginTop: '4px', lineHeight: 1.4 },
  btnGreen: { padding: '12px 22px', background: '#1D9E75', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '15px', fontWeight: '700', cursor: 'pointer' },
  btnGhost: { padding: '12px 22px', background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: '12px', fontSize: '15px', cursor: 'pointer', color: '#374151' },
}

const VAZIO = { nome: '', cargo: '', salario: '', vale_transporte: '', vale_alimentacao: '', encargos_patronais: '', data_admissao: '', observacao: '' }

export default function Funcionarios() {
  const [funcionarios, setFuncionarios] = useState([])
  const [mostraNovo, setMostraNovo]     = useState(false)
  const [novo, setNovo]                 = useState(VAZIO)
  const [salvando, setSalvando]         = useState(false)
  const navigate = useNavigate()

  const carregar = () => api.get('/funcionarios').then(r => setFuncionarios(r.data))
  useEffect(() => { carregar() }, [])

  const totalFolha = funcionarios.reduce((s, f) => s + Number(f.custo_mensal || 0), 0)

  const salvar = async () => {
    if (!novo.nome.trim()) { alert('Coloque o nome do funcionário'); return }
    setSalvando(true)
    try {
      await api.post('/funcionarios', novo)
      setNovo(VAZIO)
      setMostraNovo(false)
      carregar()
    } finally {
      setSalvando(false)
    }
  }

  const custoPreview = (
    parseFloat(novo.salario || 0) +
    parseFloat(novo.vale_transporte || 0) +
    parseFloat(novo.vale_alimentacao || 0) +
    parseFloat(novo.encargos_patronais || 0)
  )

  return (
    <div style={{ padding: '20px 16px' }}>

      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
        <div>
          <div style={{ fontSize: '22px', fontWeight: '700', color: '#111827' }}>Funcionários</div>
          <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '3px' }}>Quem trabalha na fazenda</div>
        </div>
        <button onClick={() => setMostraNovo(!mostraNovo)} style={{ ...S.btnGreen, marginTop: '4px', padding: '10px 18px', fontSize: '14px' }}>
          + Adicionar
        </button>
      </div>

      {/* Card de resumo total */}
      {funcionarios.length > 0 && (
        <div style={{ background: '#FEF3C7', border: '1.5px solid #FDE68A', borderRadius: '16px', padding: '18px', marginTop: '16px', marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', color: '#92400E', fontWeight: '700', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Gasto total com funcionários todo mês
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#D97706' }}>{fmt(totalFolha)}</div>
          <div style={{ fontSize: '12px', color: '#92400E', marginTop: '4px' }}>
            {funcionarios.length} {funcionarios.length === 1 ? 'funcionário ativo' : 'funcionários ativos'} · esse valor já é descontado automaticamente todo mês
          </div>
        </div>
      )}

      {/* Formulário de novo funcionário */}
      {mostraNovo && (
        <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', marginTop: '16px', marginBottom: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', border: '1.5px solid #E5E7EB' }}>
          <div style={{ fontSize: '16px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>Novo funcionário</div>
          <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '18px' }}>Preencha os dados de quem vai ser cadastrado</div>

          <div style={{ marginBottom: '14px' }}>
            <label style={S.label}>Nome completo *</label>
            <input value={novo.nome} onChange={e => setNovo({ ...novo, nome: e.target.value })}
              placeholder="Ex: João da Silva" style={S.input} />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={S.label}>Cargo ou função</label>
            <input value={novo.cargo} onChange={e => setNovo({ ...novo, cargo: e.target.value })}
              placeholder="Ex: Peão, Tratorista, Ordenhador" style={S.input} />
            <div style={S.dica}>O que ele faz na fazenda</div>
          </div>

          <div style={{ height: '1px', background: '#F3F4F6', margin: '18px 0' }} />
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#374151', marginBottom: '14px' }}>
            Quanto custa este funcionário por mês?
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={S.label}>Salário — o que ele recebe *</label>
            <input type="number" value={novo.salario} onChange={e => setNovo({ ...novo, salario: e.target.value })}
              placeholder="Ex: 1.500,00" style={S.input} />
            <div style={S.dica}>O valor que vai para o bolso dele</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
            <div>
              <label style={S.label}>Vale Transporte</label>
              <input type="number" value={novo.vale_transporte} onChange={e => setNovo({ ...novo, vale_transporte: e.target.value })}
                placeholder="0,00" style={S.input} />
              <div style={S.dica}>Deixe 0 se não tiver</div>
            </div>
            <div>
              <label style={S.label}>Vale Alimentação</label>
              <input type="number" value={novo.vale_alimentacao} onChange={e => setNovo({ ...novo, vale_alimentacao: e.target.value })}
                placeholder="0,00" style={S.input} />
              <div style={S.dica}>Deixe 0 se não tiver</div>
            </div>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={S.label}>Encargos — FGTS, INSS, outros</label>
            <input type="number" value={novo.encargos_patronais} onChange={e => setNovo({ ...novo, encargos_patronais: e.target.value })}
              placeholder="0,00" style={S.input} />
            <div style={S.dica}>O que você paga ao governo por cima do salário (FGTS, parte do INSS do empregador, etc.)</div>
          </div>

          {/* Preview do custo total */}
          {custoPreview > 0 && (
            <div style={{ background: '#FFFBEB', border: '2px solid #FDE68A', borderRadius: '12px', padding: '14px 16px', marginBottom: '14px' }}>
              <div style={{ fontSize: '12px', color: '#92400E', fontWeight: '600', marginBottom: '4px' }}>CUSTO TOTAL POR MÊS COM ESTE FUNCIONÁRIO</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#D97706' }}>{fmt(custoPreview)}</div>
              <div style={{ fontSize: '11px', color: '#92400E', marginTop: '4px' }}>Esse valor vai ser descontado todo mês automaticamente</div>
            </div>
          )}

          <div style={{ height: '1px', background: '#F3F4F6', margin: '4px 0 14px' }} />

          <div style={{ marginBottom: '14px' }}>
            <label style={S.label}>Quando começou a trabalhar?</label>
            <input type="date" value={novo.data_admissao} onChange={e => setNovo({ ...novo, data_admissao: e.target.value })} style={S.input} />
            <div style={S.dica}>Data que entrou na fazenda (opcional)</div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={S.label}>Anotação (opcional)</label>
            <input value={novo.observacao} onChange={e => setNovo({ ...novo, observacao: e.target.value })}
              placeholder="Qualquer informação adicional..." style={S.input} />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={salvar} disabled={salvando} style={{ ...S.btnGreen, opacity: salvando ? 0.7 : 1 }}>
              {salvando ? 'Salvando...' : 'Cadastrar funcionário'}
            </button>
            <button onClick={() => { setMostraNovo(false); setNovo(VAZIO) }} style={S.btnGhost}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Lista vazia */}
      {funcionarios.length === 0 && !mostraNovo && (
        <div style={{ background: '#fff', borderRadius: '14px', padding: '40px 20px', marginTop: '16px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: '15px', color: '#374151', fontWeight: '600', marginBottom: '8px' }}>Nenhum funcionário cadastrado</div>
          <div style={{ fontSize: '13px', color: '#9CA3AF', lineHeight: 1.5 }}>
            Cadastre os funcionários para o sistema descontar o custo deles automaticamente todo mês.<br />
            Clique em <strong>+ Adicionar</strong> para começar.
          </div>
        </div>
      )}

      {/* Cards dos funcionários */}
      {funcionarios.map(f => (
        <div key={f.id} onClick={() => navigate(`/funcionarios/${f.id}`)}
          style={{ background: '#fff', borderRadius: '14px', padding: '18px', marginTop: '10px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderLeft: '4px solid #FCD34D' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: '700', fontSize: '17px', color: '#111827' }}>{f.nome}</div>
              {f.cargo && <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '3px' }}>{f.cargo}</div>}
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#D97706' }}>{fmt(f.custo_mensal)}</div>
              <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>por mês</div>
            </div>
          </div>
          {Number(f.custo_mensal) !== Number(f.salario) && (
            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #F3F4F6', fontSize: '12px', color: '#6B7280' }}>
              Salário {fmt(f.salario)} + encargos/benefícios {fmt(Number(f.custo_mensal) - Number(f.salario))}
            </div>
          )}
          <div style={{ marginTop: '8px', fontSize: '11px', color: '#9CA3AF' }}>Toque para ver detalhes ›</div>
        </div>
      ))}
    </div>
  )
}
