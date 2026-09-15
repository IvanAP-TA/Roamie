import '@fontsource-variable/fraunces/full.css'
import '@fontsource-variable/fraunces/full-italic.css'
import '@fontsource-variable/instrument-sans/index.css'
import './index.css'
import i18n, { i18nReady } from './i18n'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { AuthProvider } from '@/hooks/useAuth'
import { startAnalytics } from '@/lib/analytics'
import { OfflineBanner } from '@/components/layout/OfflineBanner'
import { Toaster } from '@/components/ui/toaster'
import { CACHE_BUSTER, OFFLINE_MAX_AGE, offlinePersister, shouldPersistQuery } from '@/lib/offline'
import { pathLanguage } from '@/content/guides/meta'
import { hasStoredSession } from '@/lib/supabaseEnv'
// Registers the install-prompt listener before anything renders: the browser fires it early.
import '@/lib/install'
import App from './App'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Kept as long as the offline copy, or saved trips would be dropped from it.
      gcTime: OFFLINE_MAX_AGE,
      refetchOnWindowFocus: true,
      retry: (count, error) => count < 2 && !String((error as Error)?.message).includes('JWT'),
    },
  },
})

/** The service worker (offline copy and updates), loaded on demand so its library isn't part of the first download. */
function startServiceWorker() {
  void import('virtual:pwa-register').then(({ registerSW }) =>
    registerSW({
      immediate: true,
      // An installed app is mostly resumed from the background rather than loaded, so the browser rarely looks for a
      // new version by itself: check when the app comes back into view, and hourly while it stays open.
      onRegisteredSW(_url, registration) {
        if (!registration) return
        const check = () => {
          if (navigator.onLine) void registration.update()
        }
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') check()
        })
        setInterval(check, 60 * 60 * 1000)
      },
    }),
  )
}

// After the page has loaded: neither the service worker nor analytics should compete with the first paint.
const afterLoad = () => {
  startServiceWorker()
  startAnalytics()
}
if (document.readyState === 'complete') afterLoad()
else window.addEventListener('load', afterLoad, { once: true })

// Landing and guide URLs have a fixed language: render in it from the first frame, like the prerendered HTML.
const urlLanguage = pathLanguage(window.location.pathname)
const languageReady = urlLanguage && !hasStoredSession() ? i18n.changeLanguage(urlLanguage) : i18nReady

// Prerendered pages already contain markup in #root, shown until the strings arrive; React then replaces it.
void languageReady.finally(() => {
  const root = document.getElementById('root')!
  // The landing intro has already played on the prerendered markup: the copy React renders shouldn't play it again.
  if (root.firstElementChild) document.documentElement.classList.add('no-intro')

  createRoot(root).render(
    <StrictMode>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister: offlinePersister,
          maxAge: OFFLINE_MAX_AGE,
          buster: CACHE_BUSTER,
          dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
        }}
      >
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
        <OfflineBanner />
        <Toaster />
      </PersistQueryClientProvider>
    </StrictMode>,
  )
})
