/**
 * The places the videos talk about: every place of Roamie's guides, with its photo (Wikimedia Commons, credited in
 * the video and in the caption), moods, budget, best months and the guide's own description. Facts come only from
 * here, never from the AI.
 */
import { GUIDE_CONTENT } from '../../src/content/guides/content.ts'
import { readFileSync } from 'node:fs'
import images from '../../src/content/guides/images.json' with { type: 'json' }

const countryName = (code, lang) => new Intl.DisplayNames([lang], { type: 'region' }).of(code) ?? code

/** First sentence of the guide text: a short, true line about the place. */
const firstSentence = (text) => (text.match(/^.*?[.!?](\s|$)/)?.[0] ?? text).trim()

export function loadPlaces() {
  const byKey = new Map()
  for (const [guideId, guide] of Object.entries(GUIDE_CONTENT)) {
    for (const place of guide.places) {
      const image = images[place.key]
      if (!image) continue
      const entry = byKey.get(place.key) ?? {
        key: place.key,
        name: place.name,
        country: { it: countryName(place.countryCode, 'it'), en: countryName(place.countryCode, 'en') },
        countryCode: place.countryCode,
        moods: place.moods,
        budget: place.budget,
        months: place.months,
        line: { it: firstSentence(place.text.it), en: firstSentence(place.text.en) },
        photo: { url: image.url, author: image.attribution.author, license: image.attribution.license },
        guides: [],
      }
      entry.guides.push(guideId)
      byKey.set(place.key, entry)
    }
  }
  return [...byKey.values()]
}

// meta.ts imports app code through the "@/" alias, which plain Node can't resolve: its slugs are read as text.
const META = readFileSync(new URL('../../src/content/guides/meta.ts', import.meta.url), 'utf8')
const SLUGS = Object.fromEntries(
  [...META.matchAll(/id: '([a-z-]+)',(?:\s*tripName: \{[^}]*\},)?\s*slug: \{ it: '([^']+)', en: '([^']+)'/g)].map(([, id, it, en]) => [id, { it, en }]),
)

/** The guide page about a place, for the caption ("link in bio" can't carry it, the caption can). */
export function guideUrl(place, lang) {
  const slug = SLUGS[place.guides[0]]
  if (!slug) return 'https://roamie.org'
  return lang === 'it' ? `https://roamie.org/guide/${slug.it}` : `https://roamie.org/en/guides/${slug.en}`
}

// The guides' short themes ("Viaggio low cost"), read from meta.ts the same way: the carousels' covers use them.
// Each guide's block runs from its id to the next one; the theme's strings may use either kind of quote.
const quoted = (lang, text) => text.match(new RegExp(`\\b${lang}: (['"])((?:(?!\\1).)*)\\1`))?.[2]
const THEMES = Object.fromEntries(
  META.split(/\n\s*id: '/)
    .slice(1)
    .map((block) => [block.slice(0, block.indexOf("'")), block.match(/tripName: \{[^}]*\}/)?.[0]])
    .filter(([, trip]) => trip)
    .map(([id, trip]) => [id, { it: quoted('it', trip), en: quoted('en', trip) }]),
)

/** A guide's theme in the post's language, or undefined for a guide without one. */
export const guideTheme = (guideId, lang) => THEMES[guideId]?.[lang]
