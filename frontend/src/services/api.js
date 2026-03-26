import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:3001/api',
})

// Inclui token automaticamente em todas as requisições
api.interceptors.request.use(config => {
  const token = localStorage.getItem('fazenda_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Redireciona para login quando o token expirar
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('fazenda_token')
      // Redireciona sem usar o react-router para não depender do contexto
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export default api
