import { useState, useRef, useEffect } from 'react'
import api from '../services/api'

const TIPO_LABEL = {
  venda: 'Venda',
  compra: 'Compra',
  receita: 'Receita',
  despesa: 'Despesa',
  producao: 'Produção',
}

const TIPO_COR = {
  venda: '#1D9E75',
  compra: '#3B82F6',
  receita: '#10B981',
  despesa: '#EF4444',
  producao: '#8B5CF6',
}

const CAT_DESPESA = {
  energia: 'Energia',
  combustivel: 'Combustível',
  manutencao: 'Manutenção',
  veterinario: 'Veterinário',
  impostos: 'Impostos',
  outro: 'Outro',
}

const CAT_RECEITA = {
  leite: 'Leite',
  animal: 'Animal',
  outro: 'Outro',
}

function formatMoeda(v) {
  if (!v && v !== 0) return '—'
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function ResumoCard({ resultado, onConfirmar, onCancelar, confirmando }) {
  const { tipo, mensagem, dados, confianca } = resultado
  if (tipo === 'desconhecido') {
    return (
      <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', padding: '16px' }}>
        <p style={{ margin: 0, color: '#DC2626', fontSize: '14px' }}>{mensagem}</p>
      </div>
    )
  }

  const cor = TIPO_COR[tipo] || '#6B7280'

  return (
    <div style={{ background: '#fff', border: `2px solid ${cor}`, borderRadius: '12px', overflow: 'hidden' }}>
      <div style={{ background: cor, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#fff', fontWeight: '700', fontSize: '14px' }}>{TIPO_LABEL[tipo] || tipo}</span>
        {confianca === 'baixa' && (
          <span style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: '11px', padding: '2px 8px', borderRadius: '999px' }}>
            verificar
          </span>
        )}
      </div>
      <div style={{ padding: '14px 16px' }}>
        <p style={{ margin: '0 0 12px', color: '#374151', fontSize: '14px', fontStyle: 'italic' }}>{mensagem}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
          {dados.produto_nome && <Campo label="Produto" valor={dados.produto_nome} />}
          {dados.insumo_nome && <Campo label="Insumo" valor={dados.insumo_nome} />}
          {dados.quantidade && <Campo label="Quantidade" valor={`${dados.quantidade}`} />}
          {dados.preco_unitario && <Campo label="Preço unitário" valor={formatMoeda(dados.preco_unitario)} />}
          {dados.preco_total && <Campo label="Total" valor={formatMoeda(dados.preco_total)} destaque />}
          {dados.valor && <Campo label="Valor" valor={formatMoeda(dados.valor)} destaque />}
          {dados.cliente_nome && <Campo label="Cliente" valor={dados.cliente_nome} />}
          {dados.fornecedor_nome && <Campo label="Fornecedor" valor={dados.fornecedor_nome} />}
          {dados.fiado && <Campo label="Fiado" valor="Sim" />}
          {dados.categoria && <Campo label="Categoria" valor={CAT_DESPESA[dados.categoria] || CAT_RECEITA[dados.categoria] || dados.categoria} />}
          {dados.descricao && <Campo label="Descrição" valor={dados.descricao} />}
          {dados.data && <Campo label="Data" valor={new Date(dados.data + 'T12:00:00').toLocaleDateString('pt-BR')} />}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onConfirmar}
            disabled={confirmando}
            style={{
              flex: 1, background: cor, color: '#fff', border: 'none',
              borderRadius: '8px', padding: '10px', fontSize: '14px',
              fontWeight: '700', cursor: confirmando ? 'not-allowed' : 'pointer',
              opacity: confirmando ? 0.7 : 1,
            }}
          >
            {confirmando ? 'Salvando...' : 'Confirmar'}
          </button>
          <button
            onClick={onCancelar}
            disabled={confirmando}
            style={{
              flex: 1, background: '#F3F4F6', color: '#374151', border: 'none',
              borderRadius: '8px', padding: '10px', fontSize: '14px',
              fontWeight: '600', cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

function Campo({ label, valor, destaque }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <span style={{ fontSize: '13px', color: '#9CA3AF' }}>{label}</span>
      <span style={{ fontSize: destaque ? '15px' : '13px', fontWeight: destaque ? '700' : '500', color: '#1F2937' }}>{valor}</span>
    </div>
  )
}

async function confirmarRegistro(tipo, dados) {
  switch (tipo) {
    case 'venda':
      return api.post('/lancamentos/venda', {
        produto_id: dados.produto_id || null,
        produto: dados.produto_nome,
        quantidade: dados.quantidade,
        preco_unitario: dados.preco_unitario,
        cliente_id: dados.cliente_id || null,
        cliente: dados.cliente_nome || null,
        fiado: dados.fiado || false,
        data_venda: dados.data,
        observacao: dados.observacao || null,
      })
    case 'compra':
      return api.post('/lancamentos/compra', {
        insumo_id: dados.insumo_id,
        fornecedor_id: dados.fornecedor_id || null,
        fornecedor: dados.fornecedor_nome || null,
        quantidade: dados.quantidade,
        preco_unitario: dados.preco_unitario,
        data_compra: dados.data,
        observacao: dados.observacao || null,
      })
    case 'receita':
      return api.post('/lancamentos/receita', {
        categoria: dados.categoria,
        valor: dados.valor,
        descricao: dados.descricao,
        data_receita: dados.data,
      })
    case 'despesa':
      return api.post('/lancamentos/despesa', {
        categoria: dados.categoria,
        valor: dados.valor,
        descricao: dados.descricao,
        data_despesa: dados.data,
      })
    case 'producao':
      return api.post('/estoques/produtos/produzir', {
        produto_id: dados.produto_id,
        quantidade: dados.quantidade,
      })
    default:
      throw new Error('Tipo desconhecido')
  }
}

export default function Assistente() {
  const [texto, setTexto] = useState('')
  const [mensagens, setMensagens] = useState([])
  const [interpretando, setInterpretando] = useState(false)
  const [confirmandoIdx, setConfirmandoIdx] = useState(null)
  const inputRef = useRef(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  async function enviar() {
    const txt = texto.trim()
    if (!txt || interpretando) return

    setTexto('')
    setMensagens(prev => [...prev, { tipo: 'usuario', texto: txt }])
    setInterpretando(true)

    try {
      const res = await api.post('/ia/interpretar', { texto: txt })
      setMensagens(prev => [...prev, { tipo: 'ia', resultado: res.data, id: Date.now() }])
    } catch {
      setMensagens(prev => [...prev, {
        tipo: 'ia',
        resultado: { tipo: 'desconhecido', mensagem: 'Erro ao processar. Tente novamente.', dados: {} },
        id: Date.now(),
      }])
    } finally {
      setInterpretando(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  async function handleConfirmar(idx, resultado) {
    setConfirmandoIdx(idx)
    try {
      await confirmarRegistro(resultado.tipo, resultado.dados)
      setMensagens(prev => prev.map((m, i) =>
        i === idx ? { ...m, confirmado: true } : m
      ))
    } catch (err) {
      const msg = err.response?.data?.erro || 'Erro ao salvar'
      setMensagens(prev => prev.map((m, i) =>
        i === idx ? { ...m, erroConfirmar: msg } : m
      ))
    } finally {
      setConfirmandoIdx(null)
    }
  }

  function handleCancelar(idx) {
    setMensagens(prev => prev.map((m, i) =>
      i === idx ? { ...m, cancelado: true } : m
    ))
  }

  const exemplos = [
    'Vendi 50kg de feijão por R$200',
    'Comprei 2 sacos de ração por R$180',
    'Recebi R$500 de leite hoje',
    'Paguei R$150 de conta de luz',
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100svh - 120px)', padding: '0' }}>

      {/* Cabeçalho */}
      <div style={{ padding: '16px 16px 8px', background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#111827' }}>Assistente</h2>
        <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#9CA3AF' }}>
          Descreva o que aconteceu e eu registro para você
        </p>
      </div>

      {/* Conversa */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {mensagens.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: '24px' }}>
            <div style={{ fontSize: '40px', marginBottom: '8px' }}>🤖</div>
            <p style={{ color: '#6B7280', fontSize: '14px', margin: '0 0 16px' }}>
              Olá! Fale o que aconteceu na fazenda e eu registro.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'stretch' }}>
              {exemplos.map(ex => (
                <button
                  key={ex}
                  onClick={() => { setTexto(ex); inputRef.current?.focus() }}
                  style={{
                    background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '8px',
                    padding: '10px 14px', fontSize: '13px', color: '#374151',
                    cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {mensagens.map((msg, idx) => (
          <div key={idx}>
            {msg.tipo === 'usuario' && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{
                  background: '#1D9E75', color: '#fff', borderRadius: '16px 16px 4px 16px',
                  padding: '10px 14px', maxWidth: '85%', fontSize: '14px',
                }}>
                  {msg.texto}
                </div>
              </div>
            )}

            {msg.tipo === 'ia' && (
              <div style={{ maxWidth: '95%' }}>
                {msg.confirmado ? (
                  <div style={{ background: '#ECFDF5', border: '1px solid #6EE7B7', borderRadius: '12px', padding: '12px 16px' }}>
                    <p style={{ margin: 0, color: '#065F46', fontSize: '14px', fontWeight: '600' }}>
                      ✓ Registrado com sucesso!
                    </p>
                  </div>
                ) : msg.cancelado ? (
                  <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '12px 16px' }}>
                    <p style={{ margin: 0, color: '#9CA3AF', fontSize: '13px' }}>Cancelado.</p>
                  </div>
                ) : (
                  <>
                    <ResumoCard
                      resultado={msg.resultado}
                      onConfirmar={() => handleConfirmar(idx, msg.resultado)}
                      onCancelar={() => handleCancelar(idx)}
                      confirmando={confirmandoIdx === idx}
                    />
                    {msg.erroConfirmar && (
                      <p style={{ margin: '6px 0 0', color: '#DC2626', fontSize: '12px' }}>
                        Erro: {msg.erroConfirmar}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ))}

        {interpretando && (
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center', padding: '4px 0' }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: '8px', height: '8px', borderRadius: '50%', background: '#9CA3AF',
                animation: 'bounce 1s infinite',
                animationDelay: `${i * 0.2}s`,
              }} />
            ))}
            <style>{`@keyframes bounce { 0%,80%,100%{transform:scale(0.8);opacity:0.5} 40%{transform:scale(1.2);opacity:1} }`}</style>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '10px 12px',
        background: '#fff',
        borderTop: '1px solid #E5E7EB',
        display: 'flex',
        gap: '8px',
        alignItems: 'flex-end',
      }}>
        <textarea
          ref={inputRef}
          value={texto}
          onChange={e => setTexto(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              enviar()
            }
          }}
          placeholder="O que aconteceu hoje? Ex: vendi 10kg de milho por R$50..."
          rows={1}
          style={{
            flex: 1, resize: 'none', border: '1px solid #D1D5DB', borderRadius: '12px',
            padding: '10px 14px', fontSize: '14px', outline: 'none', fontFamily: 'inherit',
            lineHeight: '1.4', maxHeight: '100px', overflowY: 'auto',
          }}
        />
        <button
          onClick={enviar}
          disabled={!texto.trim() || interpretando}
          style={{
            background: '#1D9E75', color: '#fff', border: 'none', borderRadius: '12px',
            width: '44px', height: '44px', fontSize: '20px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: (!texto.trim() || interpretando) ? 0.5 : 1,
            flexShrink: 0,
          }}
        >
          ↑
        </button>
      </div>
    </div>
  )
}
