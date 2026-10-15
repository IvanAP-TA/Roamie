/**
 * Build-time renderer for the public pages, run by scripts/prerender.mjs. Not part of the client bundle.
 * Crawlers and link previews get real content and per-page meta tags. It renders the very tree main.tsx renders
 * (the whole app, routed to the page), so the browser can adopt this markup as it is (hydration) instead of
 * drawing the page again once the scripts have loaded.
 */
import { StrictMode } from 'react'
import { prerender } from 'react-dom/static'
import { StaticRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from '@/App'
import { OfflineBanner } from '@/components/layout/OfflineBanner'
import { Toaster } from '@/components/ui/toaster'
import { MONTHS, monthPath, PAIRS, pairPath, type Pair } from '@/content/guides/explore'
import { GUIDE_BASE, GUIDES, guidePath, type GuideMeta } from '@/content/guides/meta'
import i18n, { LANGUAGES, type LanguageCode } from '@/i18n'
import { AuthProvider } from '@/hooks/useAuth'
import { guideMeta, guidesIndexMeta, monthMeta, pairMeta } from '@/lib/guideSeo'
import { headTags, LANDING_PATHS, pageMeta, SITE_URL, type SeoPage } from '@/lib/seo'

export interface PrerenderRoute {
  path: string
  /** Output file in dist/. Vercel's cleanUrls serves `en/guides.html` at `/en/guides`. */
  file: string
  page: SeoPage | 'guides' | 'guide' | 'month' | 'pair'
  lang: LanguageCode
  guide?: GuideMeta
  month?: number
  pair?: Pair
  /** hreflang → path of the same page, for the sitemap */
  alternates?: Record<string, string>
}

const htmlFile = (path: string) => `${path.slice(1)}.html`

const everyLanguage = (pathFor: (lang: LanguageCode) => string) => ({
  ...Object.fromEntries(LANGUAGES.map(({ code }) => [code, pathFor(code)])),
  'x-default': pathFor('en'),
})

const landingAlternates = everyLanguage((l) => LANDING_PATHS[l])

// Legal pages and the 404 are prerendered in Italian; the client re-renders them in the visitor's language.
export const ROUTES: PrerenderRoute[] = [
  { path: LANDING_PATHS.it, file: 'index.html', page: 'landing', lang: 'it', alternates: landingAlternates },
  { path: LANDING_PATHS.en, file: 'en.html', page: 'landing', lang: 'en', alternates: landingAlternates },
  { path: LANDING_PATHS.es, file: 'es.html', page: 'landing', lang: 'es', alternates: landingAlternates },
  { path: '/privacy', file: 'privacy.html', page: 'privacy', lang: 'it' },
  { path: '/terms', file: 'terms.html', page: 'terms', lang: 'it' },
  { path: '/404', file: '404.html', page: 'notFound', lang: 'it' },
  ...LANGUAGES.map(({ code }): PrerenderRoute => ({
    path: GUIDE_BASE[code],
    file: htmlFile(GUIDE_BASE[code]),
    page: 'guides',
    lang: code,
    alternates: everyLanguage((l) => GUIDE_BASE[l]),
  })),
  ...GUIDES.flatMap((guide) =>
    LANGUAGES.map(({ code }): PrerenderRoute => ({
      path: guidePath(guide, code),
      file: htmlFile(guidePath(guide, code)),
      page: 'guide',
      lang: code,
      guide,
      alternates: everyLanguage((l) => guidePath(guide, l)),
    })),
  ),
  ...MONTHS.flatMap((month) =>
    LANGUAGES.map(({ code }): PrerenderRoute => ({
      path: monthPath(month, code),
      file: htmlFile(monthPath(month, code)),
      page: 'month',
      lang: code,
      month,
      alternates: everyLanguage((l) => monthPath(month, l)),
    })),
  ),
  ...PAIRS.flatMap((pair) =>
    LANGUAGES.map(({ code }): PrerenderRoute => ({
      path: pairPath(pair, code),
      file: htmlFile(pairPath(pair, code)),
      page: 'pair',
      lang: code,
      pair,
      alternates: everyLanguage((l) => pairPath(pair, l)),
    })),
  ),
]

/**
 * The page's markup. The static renderer waits for the lazily loaded routes; the tree mirrors main.tsx's, with a
 * fixed location instead of the browser's.
 */
async function renderPage(path: string): Promise<string> {
  const { prelude } = await prerender(
    <StrictMode>
      <QueryClientProvider client={new QueryClient()}>
        <StaticRouter location={path}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </StaticRouter>
        <OfflineBanner />
        <Toaster />
      </QueryClientProvider>
    </StrictMode>,
  )
  return new Response(prelude).text()
}

export async function render(route: PrerenderRoute): Promise<{ html: string; head: string }> {
  await i18n.changeLanguage(route.lang)
  const html = await renderPage(route.path)
  const t = i18n.getFixedT(route.lang)
  const meta =
    route.page === 'guide'
      ? guideMeta(route.guide!, route.lang, t)
      : route.page === 'month'
        ? monthMeta(route.month!, route.lang, t)
        : route.page === 'pair'
          ? pairMeta(route.pair!, route.lang, t)
          : route.page === 'guides'
            ? guidesIndexMeta(route.lang, t)
            : pageMeta(route.page, route.lang, t)
  return { html, head: headTags(meta) }
}

/** Every indexable prerendered page, with its language alternates. */
export function sitemap(): string {
  const urls = ROUTES.filter((route) => route.page !== 'notFound').map((route) =>
    [
      '  <url>',
      `    <loc>${SITE_URL}${route.path}</loc>`,
      ...Object.entries(route.alternates ?? {}).map(
        ([hreflang, path]) => `    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${SITE_URL}${path}" />`,
      ),
      '  </url>',
    ].join('\n'),
  )
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n')
}
