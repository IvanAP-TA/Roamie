import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const path = (relative: string) => fileURLToPath(new URL(relative, import.meta.url))

// Rewritten by scripts/prerender.mjs after the build, so the service worker must not precache the
// template version. Offline navigations fall back to the app shell instead.
const PRERENDERED = ['index.html', 'en.html', 'es.html', 'privacy.html', 'terms.html', '404.html']

/** The `/*` block of public/_headers, so `vite preview` runs with the production CSP. */
function productionHeaders(supabaseHost: string): Record<string, string> {
  const headers: Record<string, string> = {}
  let global = false
  for (const line of readFileSync(path('./public/_headers'), 'utf8').split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue
    if (!/^\s/.test(line)) {
      global = line.trim() === '/*'
      continue
    }
    const colon = line.indexOf(':')
    if (global && colon > 0) {
      headers[line.slice(0, colon).trim()] = line.slice(colon + 1).trim().split('__SUPABASE_HOST__').join(supabaseHost)
    }
  }
  return headers
}

export default defineConfig(({ mode, isSsrBuild }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const supabaseHost = env.VITE_SUPABASE_URL ? new URL(env.VITE_SUPABASE_URL).host : 'localhost:54321'

  return {
    plugins: [
      react(),
      tailwindcss(),
      !isSsrBuild &&
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
          manifest: {
            name: 'Roamie — Group travel bucket list',
            short_name: 'Roamie',
            description: 'Propose destinations with your friends, vote, and spin the wheel to pick the next trip.',
            lang: 'en',
            theme_color: '#fbf4ec',
            background_color: '#fbf4ec',
            display: 'standalone',
            orientation: 'portrait',
            start_url: '/trips',
            scope: '/',
            categories: ['travel', 'social', 'lifestyle'],
            icons: [
              { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
              { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
              { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
              { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
            ],
          },
          workbox: {
            navigateFallback: '/shell.html',
            globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
            // Font subsets the UI languages never need (still loaded on demand via unicode-range),
            // social preview images, and the prerendered pages.
            globIgnores: ['**/*vietnamese*', '**/*cyrillic*', '**/*greek*', 'og/**', ...PRERENDERED],
            // Supabase API/auth traffic is never cached. Only public map tiles and photos are.
            runtimeCaching: [
              {
                urlPattern: ({ url }) => url.hostname.endsWith('tile.openstreetmap.org'),
                handler: 'StaleWhileRevalidate',
                options: {
                  cacheName: 'osm-tiles',
                  expiration: { maxEntries: 400, maxAgeSeconds: 7 * 24 * 60 * 60 },
                  cacheableResponse: { statuses: [200] },
                },
              },
              {
                urlPattern: ({ url }) => url.hostname === 'upload.wikimedia.org' || url.hostname === 'thumb.wikimedia.org',
                handler: 'CacheFirst',
                options: {
                  cacheName: 'wikimedia-images',
                  expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
                  cacheableResponse: { statuses: [200] },
                },
              },
            ],
          },
        }),
    ],
    resolve: { alias: { '@': path('./src') } },
    server: { port: 5173 },
    preview: { headers: productionHeaders(supabaseHost) },
    build: isSsrBuild
      ? {}
      : {
          chunkSizeWarningLimit: 600,
          rollupOptions: {
            input: { main: path('./index.html'), shell: path('./shell.html') },
            output: {
              // Long-lived vendor chunks: app deploys don't invalidate the (large, rarely changing) libraries.
              manualChunks(id: string) {
                if (!id.includes('node_modules')) return
                if (/[\\/]node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom)[\\/]/.test(id)) return 'react'
                if (id.includes('@supabase')) return 'supabase'
                if (/[\\/]node_modules[\\/](framer-motion|motion-dom|motion-utils)[\\/]/.test(id)) return 'motion'
                if (id.includes('i18next')) return 'i18n'
              },
            },
          },
        },
  }
})
