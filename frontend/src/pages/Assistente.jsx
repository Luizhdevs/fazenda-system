import { useState, useRef, useEffect } from 'react'
import api from '../services/api'

async function executarPassos(passos) {
  const vars = {}

  function resolverDados(dados) {
    const resolvido = {}
    for (const [k, v] of Object.entries(dados)) {
      if (typeof v === 'string' && v.startsWith('$')) {
        resolvido[k] = vars[v.slice(1)] ?? v
      } else {
        resolvido[k] = v
      }
    }
    return resolvido
  }

  for (const passo of passos) {
    const dados = resolverDados(passo.dados || {})
    const endpoint = passo.endpoint.replace(/\$(\w+)/g, (_, nome) => vars[nome] ?? _)

    let res
    if (passo.metodo === 'POST') {
      res = await api.post(endpoint, dados)
    } else if (passo.metodo === 'PUT') {
      res = await api.put(endpoint, dados)
    } else if (passo.metodo === 'DELETE') {
      res = await api.delete(endpoint)
    }

    if (passo.salvar_como && res?.data?.id) {
      vars[passo.salvar_como] = res.data.id
    }
  }
}

function BotMsg({ children }) {
  return (
    <div style={{ maxWidth: '92%' }}>
      <div style={{
        background: '#fff', border: '1px solid #E5E7EB', borderRadius: '4px 16px 16px 16px',
        padding: '10px 14px', fontSize: '14px', color: '#1F2937', lineHeight: '1.5',
        whiteSpace: 'pre-wrap',
      }}>
        {children}
      </div>
    </div>
  )
}

function ConfirmacaoCard({ resposta, onConfirmar, onCancelar, executando }) {
  return (
    <div style={{ maxWidth: '95%' }}>
      <div style={{ background: '#fff', border: '2px solid #1D9E75', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ background: '#1D9E75', padding: '10px 14px' }}>
          <span style={{ color: '#fff', fontWeight: '700', fontSize: '13px' }}>Confirmar ação</span>
        </div>
        <div style={{ padding: '12px 14px' }}>
          <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#374151' }}>{resposta.texto}</p>
          <ul style={{ margin: '0 0 14px', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {(resposta.itens || []).map((item, i) => (
              <li key={i} style={{ fontSize: '13px', color: '#4B5563' }}>{item}</li>
            ))}
          </ul>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={onConfirmar}
              disabled={executando}
              style={{
                flex: 1, background: '#1D9E75', color: '#fff', border: 'none',
                borderRadius: '8px', padding: '10px', fontSize: '14px',
                fontWeight: '700', cursor: executando ? 'not-allowed' : 'pointer',
                opacity: executando ? 0.7 : 1,
              }}
            >
              {executando ? 'Salvando...' : 'Confirmar'}
            </button>
            <button
              onClick={onCancelar}
              disabled={executando}
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
    </div>
  )
}

export default function Assistente() {
  const [texto, setTexto] = useState('')
  const [mensagens, setMensagens] = useState([])
  const [historico, setHistorico] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [executandoIdx, setExecutandoIdx] = useState(null)
  const inputRef = useRef(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens, carregando])

  async function enviar() {
    const txt = texto.trim()
    if (!txt || carregando) return

    setTexto('')
    const novaMensagemUsuario = { tipo: 'usuario', texto: txt }
    setMensagens(prev => [...prev, novaMensagemUsuario])
    setCarregando(true)

    try {
      const res = await api.post('/ia/chat', { mensagem: txt, historico })
      const { resposta, historico_atualizado } = res.data
      setHistorico(historico_atualizado)
      setMensagens(prev => [...prev, { tipo: 'ia', resposta, id: Date.now() }])
    } catch (err) {
      const erro = err.response?.data?.erro || 'Erro ao conectar com o assistente.'
      setMensagens(prev => [...prev, {
        tipo: 'ia',
        resposta: { acao: 'mensagem', texto: erro },
        id: Date.now(),
      }])
    } finally {
      setCarregando(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  async function handleConfirmar(idx, resposta) {
    setExecutandoIdx(idx)
    try {
      await executarPassos(resposta.passos || [])
      setMensagens(prev => prev.map((m, i) => i === idx ? { ...m, confirmado: true } : m))
      // Adiciona mensagem de sucesso no chat
      setMensagens(prev => [...prev, {
        tipo: 'ia',
        resposta: { acao: 'mensagem', texto: 'Tudo registrado com sucesso!' },
        id: Date.now(),
      }])
    } catch (err) {
      const msg = err.response?.data?.erro || 'Erro ao salvar. Tente novamente.'
      setMensagens(prev => prev.map((m, i) => i === idx ? { ...m, erro: msg } : m))
    } finally {
      setExecutandoIdx(null)
    }
  }

  function handleCancelar(idx) {
    setMensagens(prev => prev.map((m, i) => i === idx ? { ...m, cancelado: true } : m))
    setMensagens(prev => [...prev, {
      tipo: 'ia',
      resposta: { acao: 'mensagem', texto: 'Ok, cancelei. Pode me dizer outra coisa.' },
      id: Date.now(),
    }])
  }

  const exemplos = [
    'Quero registrar uma venda',
    'Comprei insumos hoje',
    'Recebi dinheiro de leite',
    'Tive uma despesa',
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100svh - 120px)' }}>

      <div style={{ padding: '12px 16px 8px', background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#111827' }}>Assistente</h2>
        <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#9CA3AF' }}>
          Me diga o que aconteceu e eu registro tudo passo a passo
        </p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {mensagens.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: '24px' }}>
            <div style={{ fontSize: '40px', marginBottom: '8px' }}>🤖</div>
            <p style={{ color: '#6B7280', fontSize: '14px', margin: '0 0 16px' }}>
              Olá! Fale o que aconteceu na fazenda e eu cuido do registro.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
              <>
                {msg.resposta.acao === 'mensagem' && (
                  <BotMsg>{msg.resposta.texto}</BotMsg>
                )}

                {msg.resposta.acao === 'confirmacao' && (
                  <>
                    {msg.confirmado ? (
                      <div style={{ background: '#ECFDF5', border: '1px solid #6EE7B7', borderRadius: '12px', padding: '12px 14px' }}>
                        <p style={{ margin: 0, color: '#065F46', fontSize: '14px', fontWeight: '600' }}>✓ Confirmado!</p>
                      </div>
                    ) : msg.cancelado ? (
                      <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '12px 14px' }}>
                        <p style={{ margin: 0, color: '#9CA3AF', fontSize: '13px' }}>Cancelado.</p>
                      </div>
                    ) : (
                      <ConfirmacaoCard
                        resposta={msg.resposta}
                        onConfirmar={() => handleConfirmar(idx, msg.resposta)}
                        onCancelar={() => handleCancelar(idx)}
                        executando={executandoIdx === idx}
                      />
                    )}
                    {msg.erro && (
                      <p style={{ margin: '6px 0 0', color: '#DC2626', fontSize: '12px' }}>
                        Erro: {msg.erro}
                      </p>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        ))}

        {carregando && (
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center', padding: '4px 0' }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: '8px', height: '8px', borderRadius: '50%', background: '#9CA3AF',
                animation: 'pulse 1s infinite',
                animationDelay: `${i * 0.2}s`,
              }} />
            ))}
            <style>{`@keyframes pulse { 0%,80%,100%{transform:scale(0.8);opacity:0.5} 40%{transform:scale(1.2);opacity:1} }`}</style>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div style={{
        padding: '10px 12px', background: '#fff', borderTop: '1px solid #E5E7EB',
        display: 'flex', gap: '8px', alignItems: 'flex-end',
      }}>
        <textarea
          ref={inputRef}
          value={texto}
          onChange={e => setTexto(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() }
          }}
          placeholder="Ex: vendi 10kg de feijão por R$50..."
          rows={1}
          style={{
            flex: 1, resize: 'none', border: '1px solid #D1D5DB', borderRadius: '12px',
            padding: '10px 14px', fontSize: '14px', outline: 'none', fontFamily: 'inherit',
            lineHeight: '1.4', maxHeight: '100px', overflowY: 'auto',
          }}
        />
        <button
          onClick={enviar}
          disabled={!texto.trim() || carregando}
          style={{
            background: '#1D9E75', color: '#fff', border: 'none', borderRadius: '12px',
            width: '44px', height: '44px', fontSize: '20px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: (!texto.trim() || carregando) ? 0.5 : 1, flexShrink: 0,
          }}
        >
          ↑
        </button>
      </div>
    </div>
  )
}
