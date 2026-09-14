import '@fontsource-variable/fraunces/full.css'
import '@fontsource-variable/fraunces/full-italic.css'
import '@fontsource-variable/instrument-sans/index.css'
import './index.css'
import i18n from './i18n'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'framer-motion'
import { registerSW } from 'virtual:pwa-register'
import { AuthProvider } from '@/hooks/useAuth'
import { Toaster } from '@/components/ui/toaster'
import { pathLanguage } from '@/content/guides/meta'
import { hasStoredSession } from '@/lib/supabase'
import App from './App'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
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
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
        <Toaster />
      </MotionConfig>
    </QueryClientProvider>
  </StrictMode>,
)
