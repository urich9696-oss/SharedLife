import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['fonts/**/*', 'icons/**/*'],
      manifest: {
        name: 'SharedLife',
        short_name: 'SharedLife',
        description: 'Unser digitales Zuhause für gemeinsames Leben',
        theme_color: '#8FA18A',
        background_color: '#F6F2EC',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        lang: 'de-CH',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        importScripts: ['/sw-push.js'],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ request, url }) =>
              request.destination === 'font' || url.pathname.startsWith('/fonts/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'sharedlife-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
        // Private API/Storage responses must NOT be cached by Workbox.
        navigateFallbackDenylist: [/^\/api/, /^\/supabase/],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    host: true,
    allowedHosts: true,
    port: 5173,
  },
  preview: {
    host: true,
    allowedHosts: true,
    port: 4173,
  },
  test: {
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    css: true,
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/e2e/**'],
  },
})
