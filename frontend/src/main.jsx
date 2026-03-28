import { GoogleOAuthProvider } from '@react-oauth/google'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import './index.css'

// GOOGLE_CLIENT_ID: configure no arquivo frontend/.env como VITE_GOOGLE_CLIENT_ID=seu_client_id
// Se não configurado, o botão do Google simplesmente não aparece
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

// Bloqueia zoom por pinça e duplo-toque no iOS (Safari ignora user-scalable desde iOS 10)
document.addEventListener('touchmove', (e) => {
  if (e.touches.length > 1) e.preventDefault()
}, { passive: false })
let _lastTap = 0
document.addEventListener('touchend', (e) => {
  const now = Date.now()
  if (now - _lastTap < 300) e.preventDefault()
  _lastTap = now
}, { passive: false })

// Ping keepalive: evita que o servidor gratuito do Render adormeça
// Faz um GET a cada 5 minutos enquanto a aba estiver aberta
const _apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/api$/, '')
setInterval(() => {
  fetch(`${_apiBase}/`).catch(() => {})
}, 5 * 60 * 1000)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  </StrictMode>,
)
