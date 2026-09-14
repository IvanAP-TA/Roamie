import { describe, expect, it } from 'vitest'
import i18n, { LANGUAGES } from '@/i18n'
import { guideMeta, guidesIndexMeta } from '@/lib/guideSeo'
import { GUIDE_CONTENT } from './content'
import { bestMonthsLabel } from './format'
import { findGuide, GUIDES, localizedPath, pathLanguage } from './meta'

const langs = LANGUAGES.map((l) => l.code)

describe('guide content', () => {
  it('has a body, localized texts and unique URL slugs for every guide', () => {
    expect(GUIDES).toHaveLength(8)
    for (const lang of langs) {
      const slugs = GUIDES.map((g) => g.slug[lang])
      expect(new Set(slugs).size).toBe(slugs.length)
      for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    }
    for (const guide of GUIDES) {
      const content = GUIDE_CONTENT[guide.id]
      expect(content, guide.id).toBeDefined()
      for (const lang of langs) {
        expect(guide.title[lang].length).toBeGreaterThan(10)
        expect(guide.description[lang].length).toBeLessThanOrEqual(160)
        expect(content.intro[lang].length).toBeGreaterThan(40)
      }
      expect(content.places.length > 0 || content.steps.length > 0).toBe(true)
    }
  })

  it('describes places with valid coordinates, months and texts', () => {
    const places = Object.values(GUIDE_CONTENT).flatMap((c) => c.places)
    expect(new Set(places.map((p) => p.key)).size).toBe(places.length)
    for (const place of places) {
      expect(place.countryCode).toMatch(/^[A-Z]{2}$/)
      expect(Math.abs(place.lat)).toBeLessThanOrEqual(90)
      expect(Math.abs(place.lng)).toBeLessThanOrEqual(180)
      expect(place.months).toEqual([...new Set(place.months)].sort((a, b) => a - b))
      expect(place.months.every((m) => m >= 1 && m <= 12)).toBe(true)
      expect(place.moods.length).toBeGreaterThan(0)
      for (const lang of langs) {
        expect(place.name[lang]).toBeTruthy()
        expect(place.text[lang].length).toBeGreaterThan(60)
      }
    }
  })
})

describe('guide URLs', () => {
  const weekends = GUIDES.find((g) => g.id === 'long-weekends')!

  it('maps a page to its other languages', () => {
    expect(localizedPath('/', 'en')).toBe('/en')
    expect(localizedPath('/es/guias', 'it')).toBe('/guide')
    expect(localizedPath(`/guide/${weekends.slug.it}`, 'es')).toBe(`/es/guias/${weekends.slug.es}`)
    expect(localizedPath('/en/guides/unknown', 'it')).toBe('/guide')
    expect(localizedPath('/trips', 'en')).toBeNull()
  })

  it('knows which URLs fix the language', () => {
    expect(pathLanguage(`/en/guides/${weekends.slug.en}`)).toBe('en')
    expect(pathLanguage('/guide')).toBe('it')
    expect(pathLanguage('/guides')).toBeNull()
    expect(pathLanguage('/profile')).toBeNull()
    expect(findGuide('it', weekends.slug.en)).toBeNull()
  })
})

describe('bestMonthsLabel', () => {
  it('joins consecutive months, across the new year too', () => {
    expect(bestMonthsLabel([1, 2, 3, 11, 12], 'en')).toBe('Nov–Mar')
    expect(bestMonthsLabel([6, 7, 9], 'en')).toBe('Jun–Jul, September')
  })
})

describe('guide preview images', () => {
  it('exist for every guide and language (run npm run og-image after adding one)', () => {
    const images = new Set(Object.keys(import.meta.glob('/public/og/guides/*.png')))
    const missing = GUIDES.flatMap((guide) => langs.map((lang) => `/public/og/guides/${guide.id}-${lang}.png`)).filter((file) => !images.has(file))
    expect(missing).toEqual([])
  })
})

describe('guide SEO', () => {
  it('links every language and describes the article', () => {
    const t = i18n.getFixedT('es')
    const howTo = guideMeta(GUIDES[0], 'es', t)
    expect(howTo.canonical).toBe(`https://roamie.org/es/guias/${GUIDES[0].slug.es}`)
    expect(howTo.alternates.map((a) => a.hreflang)).toEqual(['it', 'en', 'es', 'x-default'])
    expect(howTo.jsonLd.map((d) => (d as { '@type': string })['@type'])).toEqual(['Article', 'HowTo', 'BreadcrumbList'])
    expect(howTo.ogImage).toBe(`https://roamie.org/og/guides/${GUIDES[0].id}-es.png`)
    expect(howTo.ogImageAlt).toBe(GUIDES[0].title.es)

    const index = guidesIndexMeta('it', i18n.getFixedT('it'))
    expect(index.title).not.toContain('seo.')
    expect(index.canonical).toBe('https://roamie.org/guide')
  })
})
