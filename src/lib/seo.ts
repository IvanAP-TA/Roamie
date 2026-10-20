import type { TFunction } from 'i18next'
import { LANGUAGES, type LanguageCode } from '@/i18n'
import { escapeHtml } from '@/lib/utils'
import { SOCIAL_PROFILES, SOURCE_REPOSITORY } from './social'

/**
 * Search/social metadata for every page. Used at build time (scripts/prerender.mjs writes it into the
 * static HTML) and at runtime (useSeo keeps it in sync on client-side navigation).
 */

export const SITE_URL = (import.meta.env.VITE_PUBLIC_APP_URL as string | undefined)?.replace(/\/$/, '') || 'https://roamie.org'

export type SeoPage = 'landing' | 'privacy' | 'terms' | 'notFound' | 'app'

/** Each language of the landing has its own URL, so all three can be indexed and linked with hreflang. */
export const LANDING_PATHS: Record<LanguageCode, string> = { it: '/', en: '/en', es: '/es' }

/** hreflang x-default: visitors whose language Roamie doesn't offer. */
const DEFAULT_LANDING: LanguageCode = 'en'

export const FAQ_KEYS = ['q1', 'q2', 'q3', 'q4', 'q5'] as const

export const landingLanguage = (pathname: string): LanguageCode | null =>
  (Object.keys(LANDING_PATHS) as LanguageCode[]).find((code) => LANDING_PATHS[code] === pathname) ?? null

const PAGE_PATHS: Partial<Record<SeoPage, string>> = { privacy: '/privacy', terms: '/terms' }
export const OG_LOCALES: Record<LanguageCode, string> = { it: 'it_IT', en: 'en_GB', es: 'es_ES' }

export interface PageMeta {
  lang: LanguageCode
  title: string
  description: string
  robots: string
  canonical?: string
  alternates: { hreflang: string; href: string }[]
  ogImage: string
  ogImageAlt: string
  ogLocale: string
  ogLocaleAlternates: string[]
  jsonLd: object[]
}

const absolute = (path: string) => SITE_URL + path

export function pageMeta(page: SeoPage, lang: LanguageCode, t: TFunction): PageMeta {
  const indexable = page === 'landing' || page === 'privacy' || page === 'terms'
  const path = page === 'landing' ? LANDING_PATHS[lang] : PAGE_PATHS[page]
  const canonical = indexable && path ? absolute(path) : undefined
  const title = t(`seo.${page}.title`)
  const description = t(`seo.${page}.description`)
  const ogImage = absolute(`/og/${lang}.png`)

  return {
    lang,
    title,
    description,
    robots: indexable ? 'index, follow, max-image-preview:large' : 'noindex, follow',
    canonical,
    alternates:
      page === 'landing'
        ? [
            ...LANGUAGES.map(({ code }) => ({ hreflang: code, href: absolute(LANDING_PATHS[code]) })),
            { hreflang: 'x-default', href: absolute(LANDING_PATHS[DEFAULT_LANDING]) },
          ]
        : [],
    ogImage,
    ogImageAlt: t('seo.ogImageAlt'),
    ogLocale: OG_LOCALES[lang],
    ogLocaleAlternates: page === 'landing' ? LANGUAGES.filter((l) => l.code !== lang).map((l) => OG_LOCALES[l.code]) : [],
    jsonLd: page === 'landing' && canonical ? landingJsonLd(lang, t, canonical, description, ogImage) : [],
  }
}

function landingJsonLd(lang: LanguageCode, t: TFunction, url: string, description: string, image: string): object[] {
  const home = absolute('/')
  return [
    { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Roamie', url: home, inLanguage: LANGUAGES.map((l) => l.code) },
    // sameAs: the profiles that are this Roamie's, among the many apps and companies with the same name.
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Roamie',
      alternateName: ['roamie.org', 'Roamie group trip planner'],
      url: home,
      logo: absolute('/pwa-512x512.png'),
      sameAs: [...Object.values(SOCIAL_PROFILES), SOURCE_REPOSITORY],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Roamie',
      url,
      description,
      image,
      inLanguage: lang,
      applicationCategory: 'TravelApplication',
      operatingSystem: 'Web, Android, iOS',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      inLanguage: lang,
      mainEntity: FAQ_KEYS.map((key) => ({
        '@type': 'Question',
        name: t(`landing.faq.${key}.q`),
        acceptedAnswer: { '@type': 'Answer', text: t(`landing.faq.${key}.a`) },
      })),
    },
  ]
}

/** Static <head> markup for a prerendered page. */
export function headTags(meta: PageMeta): string {
  const e = escapeHtml
  return [
    `<title>${e(meta.title)}</title>`,
    `<meta name="description" content="${e(meta.description)}" />`,
    `<meta name="robots" content="${meta.robots}" />`,
    meta.canonical && `<link rel="canonical" href="${e(meta.canonical)}" />`,
    ...meta.alternates.map((alt) => `<link rel="alternate" hreflang="${alt.hreflang}" href="${e(alt.href)}" />`),
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Roamie" />`,
    `<meta property="og:title" content="${e(meta.title)}" />`,
    `<meta property="og:description" content="${e(meta.description)}" />`,
    meta.canonical && `<meta property="og:url" content="${e(meta.canonical)}" />`,
    `<meta property="og:locale" content="${meta.ogLocale}" />`,
    ...meta.ogLocaleAlternates.map((locale) => `<meta property="og:locale:alternate" content="${locale}" />`),
    `<meta property="og:image" content="${e(meta.ogImage)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${e(meta.ogImageAlt)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    // Escape "<" so no string inside the JSON can close the script element.
    ...meta.jsonLd.map((data) => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`),
  ]
    .filter(Boolean)
    .join('\n    ')
}
