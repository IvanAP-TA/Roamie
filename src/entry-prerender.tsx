/**
 * Build-time renderer for the public pages, run by scripts/prerender.mjs. Not part of the client bundle.
 * Crawlers and link previews get real content and per-page meta tags; the client then renders normally.
 */
import type { ReactElement } from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'framer-motion'
import i18n, { type LanguageCode } from '@/i18n'
import { AuthProvider } from '@/hooks/useAuth'
import { headTags, LANDING_PATHS, pageMeta, type SeoPage } from '@/lib/seo'
import LandingPage from '@/pages/LandingPage'
import LegalPage from '@/pages/LegalPage'
import NotFoundPage from '@/pages/NotFoundPage'

export interface PrerenderRoute {
  path: string
  /** Output file in dist/. Cloudflare Pages and Netlify serve `en.html` at `/en`. */
  file: string
  page: SeoPage
  lang: LanguageCode
}

// Legal pages and the 404 are prerendered in Italian; the client re-renders them in the visitor's language.
export const ROUTES: PrerenderRoute[] = [
  { path: LANDING_PATHS.it, file: 'index.html', page: 'landing', lang: 'it' },
  { path: LANDING_PATHS.en, file: 'en.html', page: 'landing', lang: 'en' },
  { path: LANDING_PATHS.es, file: 'es.html', page: 'landing', lang: 'es' },
  { path: '/privacy', file: 'privacy.html', page: 'privacy', lang: 'it' },
  { path: '/terms', file: 'terms.html', page: 'terms', lang: 'it' },
  { path: '/404', file: '404.html', page: 'notFound', lang: 'it' },
]

const PAGES: Partial<Record<SeoPage, (lang: LanguageCode) => ReactElement>> = {
  landing: (lang) => <LandingPage lang={lang} />,
  privacy: () => <LegalPage doc="privacy" />,
  terms: () => <LegalPage doc="terms" />,
  notFound: () => <NotFoundPage />,
}

export async function render(route: PrerenderRoute): Promise<{ html: string; head: string }> {
  await i18n.changeLanguage(route.lang)
  const html = renderToString(
    <QueryClientProvider client={new QueryClient()}>
      <MotionConfig reducedMotion="user">
        <StaticRouter location={route.path}>
          <AuthProvider>{PAGES[route.page]!(route.lang)}</AuthProvider>
        </StaticRouter>
      </MotionConfig>
    </QueryClientProvider>,
  )
  return { html, head: headTags(pageMeta(route.page, route.lang, i18n.getFixedT(route.lang))) }
}
