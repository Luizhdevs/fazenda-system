import { GoogleLogin } from '@react-oauth/google'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const verde = '#1D9E75'

export default function Login() {
  const { entrar, usuario, fazenda } = useAuth()
  const navigate = useNavigate()

  const [modo, setModo] = useState('login') // 'login' | 'cadastro' | 'setup'
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [nomeFazenda, setNomeFazenda] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [googleHabilitado, setGoogleHabilitado] = useState(false)
  const [verificando, setVerificando] = useState(true)

  useEffect(() => {
    if (usuario) {
      navigate(fazenda ? '/painel' : '/selecionar-fazenda', { replace: true })
      return
    }
    api.get('/auth/status').then(res => {
      if (res.data.precisaSetup) setModo('setup')
      setGoogleHabilitado(res.data.googleHabilitado)
    }).catch(() => {}).finally(() => setVerificando(false))
  }, [usuario, fazenda, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    try {
      let res
      if (modo === 'setup') {
        res = await api.post('/auth/setup', { nome, email, senha, nome_fazenda: nomeFazenda || nome })
      } else if (modo === 'cadastro') {
        res = await api.post('/auth/register', { nome, email, senha })
      } else {
        res = await api.post('/auth/login', { email, senha })
      }
      entrar(res.data.token, res.data.usuario, res.data.fazendas)

      // setup retorna token já com fazenda_id → vai direto pro painel
      // login/cadastro → vai pro seletor (AuthContext já cuida do redirect via useEffect)
      if (res.data.fazenda) {
        navigate('/painel', { replace: true })
      } else {
        navigate('/selecionar-fazenda', { replace: true })
      }
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao conectar com o servidor')
    } finally {
      setCarregando(false)
    }
  }

  async function handleGoogle(credentialResponse) {
    setErro('')
    setCarregando(true)
    try {
      const res = await api.post('/auth/google', { credential: credentialResponse.credential })
      entrar(res.data.token, res.data.usuario, res.data.fazendas)
      navigate('/selecionar-fazenda', { replace: true })
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao autenticar com Google')
    } finally {
      setCarregando(false)
    }
  }

  if (verificando) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100svh', background: '#F4F6F4' }}>
        <div style={{ color: verde, fontSize: '14px' }}>Carregando...</div>
      </div>
    )
  }

  const titulo = modo === 'setup' ? 'Configuração Inicial' : modo === 'cadastro' ? 'Criar Conta' : 'Entrar'
  const subtitulo = {
    setup: 'Crie a conta e o nome da sua fazenda',
    cadastro: 'Preencha os dados para criar sua conta',
    login: 'Acesse sua conta para continuar',
  }[modo]

  return (
    <div style={{ minHeight: '100svh', background: '#F4F6F4', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: verde, margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '28px' }}>🌾</span>
          </div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#111827' }}>Sistema Fazenda</h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6B7280' }}>{subtitulo}</p>
        </div>

        <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 8px rgba(0,0,0,0.08)' }}>
          <h2 style={{ margin: '0 0 20px', fontSize: '17px', fontWeight: '600', color: '#111827' }}>{titulo}</h2>

          {googleHabilitado && modo !== 'setup' && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <GoogleLogin
                  onSuccess={handleGoogle}
                  onError={() => setErro('Falha no login com Google')}
                  text={modo === 'login' ? 'signin_with' : 'signup_with'}
                  shape="rectangular"
                  width="352"
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', margin: '16px 0', gap: '8px' }}>
                <div style={{ flex: 1, height: '1px', background: '#E5E7EB' }} />
                <span style={{ fontSize: '12px', color: '#9CA3AF' }}>ou</span>
                <div style={{ flex: 1, height: '1px', background: '#E5E7EB' }} />
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(modo === 'cadastro' || modo === 'setup') && (
              <div>
                <label style={labelStyle}>Nome</label>
                <input style={inputStyle} type="text" placeholder="Seu nome completo" value={nome} onChange={e => setNome(e.target.value)} required autoComplete="name" />
              </div>
            )}

            <div>
              <label style={labelStyle}>E-mail</label>
              <input style={inputStyle} type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
            </div>

            <div>
              <label style={labelStyle}>Senha</label>
              <input style={inputStyle} type="password" placeholder={modo === 'login' ? '••••••' : 'Mínimo 6 caracteres'} value={senha} onChange={e => setSenha(e.target.value)} required autoComplete={modo === 'login' ? 'current-password' : 'new-password'} />
            </div>

            {modo === 'setup' && (
              <div>
                <label style={labelStyle}>Nome da Fazenda</label>
                <input style={inputStyle} type="text" placeholder="Ex: Fazenda São João" value={nomeFazenda} onChange={e => setNomeFazenda(e.target.value)} autoComplete="off" />
                <span style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '3px', display: 'block' }}>Pode alterar depois. Se vazio, usa seu nome.</span>
              </div>
            )}

            {erro && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: '#DC2626' }}>
                {erro}
              </div>
            )}

            <button type="submit" disabled={carregando} style={{ padding: '12px', background: verde, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', marginTop: '4px', opacity: carregando ? 0.7 : 1, cursor: carregando ? 'not-allowed' : 'pointer' }}>
              {carregando ? 'Aguarde...' : titulo}
            </button>
          </form>

          {modo !== 'setup' && (
            <p style={{ textAlign: 'center', margin: '16px 0 0', fontSize: '13px', color: '#6B7280' }}>
              {modo === 'login' ? 'Não tem conta?' : 'Já tem conta?'}{' '}
              <button onClick={() => { setModo(modo === 'login' ? 'cadastro' : 'login'); setErro('') }} style={{ background: 'none', border: 'none', color: verde, fontWeight: '600', cursor: 'pointer', fontSize: '13px', padding: 0 }}>
                {modo === 'login' ? 'Criar conta' : 'Entrar'}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

const labelStyle = { display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '4px', letterSpacing: '0.01em' }
const inputStyle = { width: '100%', padding: '10px 12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '14px', color: '#111827', background: '#F9FAFB', outline: 'none', boxSizing: 'border-box' }
