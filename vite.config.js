import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const isGitHubPages = mode === 'github-pages'
  const base = isGitHubPages ? '/creditBook/' : '/'
  return {
    base,
    plugins: [
      react(),
      VitePWA({
        registerType: 'prompt',
        includeAssets: ['favicon.svg', 'pwa-192x192.png'],
        manifest: {
          name: 'CreditBook',
          short_name: 'CreditBook',
          description: 'Offline-first credit and customer management.',
          theme_color: '#15803d',
          background_color: '#ffffff',
          display: 'standalone',
          scope: base,
          start_url: base,
          icons: [
            { src: 'pwa-192x192.png', sizes: '400x400', type: 'image/png' }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          cleanupOutdatedCaches: true,
        }
      })
    ],
    server: {
      host: '0.0.0.0',
      port: 5173,
      allowedHosts: true
    },
    preview: {
      host: '0.0.0.0',
      port: 4173,
      allowedHosts: true
    }
  }
})
