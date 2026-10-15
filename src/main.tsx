import '@fontsource-variable/fraunces/full.css'
import '@fontsource-variable/fraunces/full-italic.css'
import '@fontsource-variable/instrument-sans/index.css'
import './index.css'
import i18n, { i18nReady } from './i18n'

import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { AuthProvider } from '@/hooks/useAuth'
import { startAnalytics } from '@/lib/analytics'
import { OfflineBanner } from '@/components/layout/OfflineBanner'
import { preloadSheet } from '@/components/ui/sheet'
import { preloadLanguageMenu } from '@/components/layout/LanguageSwitcher'
import { Toaster } from '@/components/ui/toaster'
import { CACHE_BUSTER, OFFLINE_MAX_AGE, offlinePersister, shouldPersistQuery } from '@/lib/offline'
import { pathLanguage } from '@/content/guides/meta'
import { loadPagesFor } from '@/lib/pages'
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

/** Typing something or looking at a sheet: a reload now would throw that away. */
function isBusy() {
  const el = document.activeElement
  return (
    el instanceof HTMLTextAreaElement ||
    (el instanceof HTMLInputElement && el.value !== '') ||
    (el instanceof HTMLElement && el.isContentEditable) ||
    document.querySelector('[role="dialog"]') !== null
  )
}

/**
 * A new version is running in the service worker: load it. Right away when nobody would notice (app in the
 * background, or idle); otherwise as soon as the app goes to the background, or when the user taps "Update".
 */
function applyUpdate() {
  if (document.visibilityState === 'hidden' || !isBusy()) {
    window.location.reload()
    return
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') window.location.reload()
  })
  toast(i18n.t('update.ready'), {
    id: 'app-update',
    duration: Infinity,
    action: { label: i18n.t('update.reload'), onClick: () => window.location.reload() },
  })
}

/** The service worker (offline copy and updates), loaded on demand so its library isn't part of the first download. */
function startServiceWorker() {
  void import('virtual:pwa-register').then(({ registerSW }) =>
    registerSW({
      immediate: true,
      onNeedReload: applyUpdate,
      // An installed app is mostly resumed from the background rather than loaded, so the browser rarely looks for a
      // new version by itself: check when the app comes back into view or online, and every few minutes while open
      // (a small request for sw.js, which is never cached).
      onRegisteredSW(_url, registration) {
        if (!registration) return
        const check = () => {
          if (navigator.onLine) void registration.update()
        }
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') check()
        })
        window.addEventListener('online', check)
        setInterval(check, 5 * 60 * 1000)
      },
    }),
  )
}

// After the page has loaded: neither the service worker nor analytics should compete with the first paint.
const afterLoad = () => {
  startServiceWorker()
  startAnalytics()
  // The code of the sheets and of the language menu, so that the first one opened shows at once.
  const preload = () => {
    preloadSheet()
    preloadLanguageMenu()
  }
  if ('requestIdleCallback' in window) requestIdleCallback(preload, { timeout: 5000 })
  else setTimeout(preload, 2000)
}
if (document.readyState === 'complete') afterLoad()
else window.addEventListener('load', afterLoad, { once: true })

// A tab still running the previous version can ask for files a new deployment removed: load the new version, once.
window.addEventListener('vite:preloadError', (event) => {
  const key = 'roamie.reloadedForUpdate'
  try {
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
  } catch {
    return
  }
  event.preventDefault()
  window.location.reload()
})

// Landing and guide URLs have a fixed language: render in it from the first frame, like the prerendered HTML.
const urlLanguage = pathLanguage(window.location.pathname)
const languageReady = urlLanguage && !hasStoredSession() ? i18n.changeLanguage(urlLanguage) : i18nReady

/** Resolves once the browser has painted a frame: the next task after the next animation frame. */
const afterFirstPaint = () => new Promise<void>((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)))

// Prerendered pages already contain markup in #root (scripts/prerender.mjs renders this same tree), shown until the
// strings arrive. React adopts it as it is (hydration) when its first render will match: the page's language, and no
// saved session (a signed-in visitor is sent into the app instead). Otherwise it draws the page anew, as for the app
// shell, whose #root is empty.
void languageReady.finally(() => {
  const root = document.getElementById('root')!
  const prerendered = root.firstElementChild !== null
  const adopt = prerendered && !hasStoredSession() && i18n.resolvedLanguage === document.documentElement.dataset.markupLang
  // The landing intro has already played on the prerendered markup: a copy drawn anew shouldn't play it again.
  if (prerendered && !adopt) document.documentElement.classList.add('no-intro')

  const app = (
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
    </StrictMode>
  )
  if (!adopt) createRoot(root).render(app)
  // Once the markup is on screen: with the scripts already at hand (a later visit, the installed app), adopting it
  // would otherwise run before the browser had painted anything.
  else void Promise.all([loadPagesFor(window.location.pathname), afterFirstPaint()]).then(() => hydrateRoot(root, app), () => createRoot(root).render(app))
})
