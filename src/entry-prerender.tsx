/**
 * Build-time renderer for the public pages, run by scripts/prerender.mjs. Not part of the client bundle.
 * Crawlers and link previews get real content and per-page meta tags; the client then renders normally.
 */
import type { ReactElement } from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'framer-motion'
import { MONTHS, monthPath, PAIRS, pairPath, type Pair } from '@/content/guides/explore'
import { GUIDE_BASE, GUIDES, guidePath, type GuideMeta } from '@/content/guides/meta'
import i18n, { LANGUAGES, type LanguageCode } from '@/i18n'
import { AuthProvider } from '@/hooks/useAuth'
import { guideMeta, guidesIndexMeta, monthMeta, pairMeta } from '@/lib/guideSeo'
import { headTags, LANDING_PATHS, pageMeta, SITE_URL, type SeoPage } from '@/lib/seo'
import LandingPage from '@/pages/LandingPage'
import LegalPage from '@/pages/LegalPage'
import NotFoundPage from '@/pages/NotFoundPage'
import GuidesIndexPage from '@/pages/guides/GuidesIndexPage'
import { GuideArticle } from '@/pages/guides/GuidePage'
import { MonthArticle, PairArticle } from '@/pages/guides/ExplorePages'

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

const PAGES: Partial<Record<PrerenderRoute['page'], (route: PrerenderRoute) => ReactElement>> = {
  landing: (route) => <LandingPage lang={route.lang} />,
  privacy: () => <LegalPage doc="privacy" />,
  terms: () => <LegalPage doc="terms" />,
  notFound: () => <NotFoundPage />,
  guides: (route) => <GuidesIndexPage lang={route.lang} />,
  guide: (route) => <GuideArticle guide={route.guide!} lang={route.lang} />,
  month: (route) => <MonthArticle month={route.month!} lang={route.lang} />,
  pair: (route) => <PairArticle pair={route.pair!} lang={route.lang} />,
}

export async function render(route: PrerenderRoute): Promise<{ html: string; head: string }> {
  await i18n.changeLanguage(route.lang)
  const html = renderToString(
    <QueryClientProvider client={new QueryClient()}>
      <MotionConfig reducedMotion="user">
        <StaticRouter location={route.path}>
          <AuthProvider>{PAGES[route.page]!(route)}</AuthProvider>
        </StaticRouter>
      </MotionConfig>
    </QueryClientProvider>,
  )
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
