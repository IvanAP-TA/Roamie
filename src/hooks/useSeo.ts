import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { LanguageCode } from '@/i18n'
import { pageMeta, type SeoPage } from '@/lib/seo'

export function setHeadTag(selector: string, tag: 'meta' | 'link', attrs: Record<string, string> | null) {
  let el = document.head.querySelector(selector)
  if (!attrs) {
    el?.remove()
    return
  }
  if (!el) {
    el = document.createElement(tag)
    document.head.append(el)
  }
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value)
}

/**
 * Keeps title, description, robots, canonical and hreflang in sync with the current page.
 * Prerendered pages already ship these tags; this covers client-side navigation and JS-rendering crawlers.
 */
export function useSeo(page: SeoPage, lang?: LanguageCode) {
  const { i18n } = useTranslation()
  const language = lang ?? ((i18n.resolvedLanguage ?? 'en') as LanguageCode)
  const t = useMemo(() => i18n.getFixedT(language), [i18n, language])

  useEffect(() => {
    const meta = pageMeta(page, language, t)
    document.title = meta.title
    setHeadTag('meta[name="description"]', 'meta', { name: 'description', content: meta.description })
    setHeadTag('meta[name="robots"]', 'meta', { name: 'robots', content: meta.robots })
    setHeadTag('link[rel="canonical"]', 'link', meta.canonical ? { rel: 'canonical', href: meta.canonical } : null)
    document.head.querySelectorAll('link[rel="alternate"][hreflang]').forEach((el) => el.remove())
    for (const { hreflang, href } of meta.alternates) {
      const link = document.createElement('link')
      Object.assign(link, { rel: 'alternate', hreflang, href })
      document.head.append(link)
    }
  }, [page, language, t])
}
