import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const path = (relative: string) => fileURLToPath(new URL(relative, import.meta.url))

// Rewritten by scripts/prerender.mjs after the build, so the service worker must not precache the
// template version. Offline navigations fall back to the app shell instead.
const PRERENDERED = ['index.html', 'en.html', 'es.html', 'privacy.html', 'terms.html', '404.html']

/** The site-wide headers from vercel.json, so `vite preview` runs with the production CSP. */
function productionHeaders(): Record<string, string> {
  const config = JSON.parse(readFileSync(path('./vercel.json'), 'utf8')) as {
    headers: { source: string; headers: { key: string; value: string }[] }[]
  }
  const global = config.headers.find((rule) => rule.source === '/(.*)')
  return Object.fromEntries((global?.headers ?? []).map(({ key, value }) => [key, value]))
}

export default defineConfig(({ isSsrBuild }) => ({
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
          // Files opened directly (sitemap.xml, robots.txt, icons…) and the serverless functions must come from
          // the network: the app shell doesn't know them and would render its 404 page.
          navigateFallbackDenylist: [/^\/api\//, /\/[^/?]+\.[a-z0-9]+$/i],
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
  preview: { headers: productionHeaders() },
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
}))
