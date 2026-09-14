import '@fontsource-variable/fraunces/full.css'
import '@fontsource-variable/fraunces/full-italic.css'
import '@fontsource-variable/instrument-sans/index.css'
import './index.css'
import i18n from './i18n'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { MotionConfig } from 'framer-motion'
import { registerSW } from 'virtual:pwa-register'
import { AuthProvider } from '@/hooks/useAuth'
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

registerSW({ immediate: true })

// Landing and guide URLs have a fixed language: render in it from the first frame, like the prerendered HTML.
const urlLanguage = pathLanguage(window.location.pathname)
if (urlLanguage && !hasStoredSession()) void i18n.changeLanguage(urlLanguage)

// Prerendered pages already contain markup in #root; React replaces it on the first render.
createRoot(document.getElementById('root')!).render(
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
      <MotionConfig reducedMotion="user">
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
        <OfflineBanner />
        <Toaster />
      </MotionConfig>
    </PersistQueryClientProvider>
  </StrictMode>,
)
