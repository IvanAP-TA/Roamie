import type { LanguageCode } from '@/i18n'
import { GUIDE_BASE, type Localized } from './meta'

/**
 * The month pages' URLs and names, without the guides' content: small enough for the landing, which links the
 * coming months (explore.ts has the pages themselves).
 */

export const slugify = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const

export const monthName = (month: number, lang: LanguageCode) =>
  new Intl.DateTimeFormat(lang, { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2021, month - 1, 15)))

const MONTH_SLUG: Localized<(month: string) => string> = {
  it: (m) => `dove-andare-a-${m}`,
  en: (m) => `where-to-go-in-${m}`,
  es: (m) => `donde-ir-en-${m}`,
}

export const monthSlug = (month: number, lang: LanguageCode) => MONTH_SLUG[lang](slugify(monthName(month, lang)))
export const monthPath = (month: number, lang: LanguageCode) => `${GUIDE_BASE[lang]}/${monthSlug(month, lang)}`

/** "Dove andare a novembre": the landing's link to a month page. */
export const MONTH_LINK: Localized<(month: string) => string> = {
  it: (m) => `Dove andare a ${m}`,
  en: (m) => `Where to go in ${m}`,
  es: (m) => `Dónde ir en ${m}`,
}

/** The next `count` months after `from` (1–12), wrapping around the year: people plan a few weeks ahead. */
export const comingMonths = (from: number, count: number) => Array.from({ length: count }, (_, i) => ((from + i) % 12) + 1)
