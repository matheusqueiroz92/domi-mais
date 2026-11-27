/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // PWA: o jogo inteiro (código, fontes, imagens) fica guardado no aparelho
    // depois da primeira visita e passa a abrir sem internet.
    VitePWA({
      // A versão nova só entra quando a pessoa aceita o aviso "Atualizar"
      // (src/pwa), para nunca recarregar a página no meio de uma jogada.
      registerType: 'prompt',
      injectRegister: null,
      includeAssets: ['favicon.ico', 'favicon-64.png', 'apple-touch-icon.png', 'logo-domi-mais.jpeg'],
      manifest: {
        name: 'DomiMais',
        short_name: 'DomiMais',
        description:
          'Dominó com blefe em que o verso de cada peça mostra a soma dos dois lados.',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#111724',
        theme_color: '#111724',
        categories: ['games', 'education'],
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpeg,webp,ico,woff2}'],
        // Fontes: só os arquivos woff2 entram no pacote offline.
        globIgnores: ['**/*.woff'],
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
        // O servidor do modo online não é página do jogo.
        navigateFallbackDenylist: [/^\/socket\//, /^\/api\//, /^\/health$/],
      },
    }),
  ],
  // Modo online: em desenvolvimento, /socket/ vai para o servidor local
  // (npm run dev:server, porta 3001). Em produção, o Traefik faz esse papel.
  server: {
    proxy: {
      '/socket': { target: 'http://localhost:3001', ws: true },
      '/api': { target: 'http://localhost:3001' },
    },
  },
  preview: {
    proxy: {
      '/socket': { target: 'http://localhost:3001', ws: true },
      '/api': { target: 'http://localhost:3001' },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    restoreMocks: true,
  },
})
