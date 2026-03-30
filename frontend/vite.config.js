import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
            return 'vendor-react'
          }
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Sistema Fazenda',
        short_name: 'Fazenda',
        description: 'Sistema de gestão para fazendas',
        theme_color: '#1D9E75',
        background_color: '#F4F6F4',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        orientation: 'portrait',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // Arquivos estáticos que o SW vai pré-cachear
        globPatterns: ['**/*.{js,css,html,svg,ico,woff,woff2}'],
        // Caching de respostas da API (offline queries)
        runtimeCaching: [
          {
            // Qualquer chamada GET para /api/
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 150,
                maxAgeSeconds: 60 * 60 * 24, // 24h
              },
              networkTimeoutSeconds: 8,
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // API em domínio externo (Render)
            urlPattern: ({ url }) =>
              url.hostname !== location.hostname && url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache-remote',
              expiration: {
                maxEntries: 150,
                maxAgeSeconds: 60 * 60 * 24,
              },
              networkTimeoutSeconds: 8,
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false, // Não ativa SW em dev para não atrapalhar hot reload
      },
    }),
  ],
})
