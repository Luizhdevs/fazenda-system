import { createContext, useContext, useEffect, useState } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [fazenda, setFazenda] = useState(null)   // fazenda atualmente selecionada
  const [fazendas, setFazendas] = useState([])   // lista de fazendas do usuário
  const [superadmin, setSuperadmin] = useState(false)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('fazenda_token')
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      api.get('/auth/me')
        .then(res => {
          setUsuario(res.data)
          setFazendas(res.data.fazendas || [])
          setSuperadmin(!!res.data.superadmin)
          // Se o token já tem fazenda_id, recupera do payload
          const payload = parseJwt(token)
          if (payload?.fazenda_id) {
            setFazenda({ id: payload.fazenda_id, nome: payload.fazenda_nome, papel: payload.papel })
          }
        })
        .catch(() => {
          localStorage.removeItem('fazenda_token')
          delete api.defaults.headers.common['Authorization']
        })
        .finally(() => setCarregando(false))
    } else {
      setCarregando(false)
    }
  }, [])

  function entrar(token, dadosUsuario, listaDeFazendas) {
    localStorage.setItem('fazenda_token', token)
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    setUsuario(dadosUsuario)
    setFazendas(listaDeFazendas || [])
    setSuperadmin(!!dadosUsuario.superadmin)
    // Se o token já inclui fazenda_id (ex: setup retorna direto com fazenda)
    const payload = parseJwt(token)
    if (payload?.fazenda_id) {
      setFazenda({ id: payload.fazenda_id, nome: payload.fazenda_nome, papel: payload.papel })
    }
  }

  async function selecionarFazenda(fazenda_id) {
    const res = await api.post('/auth/selecionar-fazenda', { fazenda_id })
    const { token, fazenda: f } = res.data
    localStorage.setItem('fazenda_token', token)
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    setFazenda(f)
    return f
  }

  function trocarFazenda() {
    // Volta para token base (sem fazenda_id) para mostrar o seletor
    // O usuário precisará re-selecionar, então só limpamos o estado de fazenda
    setFazenda(null)
    // Busca token base (sem fazenda_id) — re-loga com o token atual sem o fazenda_id
    const payload = parseJwt(localStorage.getItem('fazenda_token'))
    if (payload) {
      // Como não guardamos o token base separado, vamos chamar /auth/me para pegar as fazendas
      api.get('/auth/me').then(res => {
        setFazendas(res.data.fazendas || [])
      })
    }
  }

  function sair() {
    localStorage.removeItem('fazenda_token')
    delete api.defaults.headers.common['Authorization']
    setUsuario(null)
    setFazenda(null)
    setFazendas([])
    setSuperadmin(false)
  }

  return (
    <AuthContext.Provider value={{ usuario, fazenda, fazendas, superadmin, entrar, selecionarFazenda, trocarFazenda, sair, carregando }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]))
  } catch {
    return null
  }
}
