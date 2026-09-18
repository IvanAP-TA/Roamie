import type { LanguageCode } from '@/i18n'

/** Country facts from scripts/countries.mjs (Wikidata, Unicode CLDR, countries-and-timezones). */
export interface CountryFacts {
  /** ISO 3166-1 numeric, as used by the world map */
  num?: string
  /** [lat, lng] */
  capital: [number, number]
  capitalName?: Record<LanguageCode, string>
  currencies: string[]
  languages: string[]
  /** Reference IANA time zone */
  tz?: string
  /** Standard UTC offsets in minutes, lowest and highest across the country */
  utc?: [number, number]
  drive?: 'left' | 'right'
}

export type CountryTable = Record<string, CountryFacts>

/** Loaded with the pages that need it (about 50 KB), not with the app. */
export const loadCountries = () => import('@/data/countries.json').then((module) => module.default.countries as unknown as CountryTable)

function displayNames(lang: string, type: Intl.DisplayNamesType): Intl.DisplayNames | null {
  try {
    return new Intl.DisplayNames([lang], { type })
  } catch {
    return null
  }
}

export const countryName = (code: string, lang: string) => displayNames(lang, 'region')?.of(code) ?? code
export const currencyName = (code: string, lang: string) => displayNames(lang, 'currency')?.of(code) ?? code
export const languageName = (code: string, lang: string) => {
  const name = displayNames(lang, 'language')?.of(code) ?? code
  return name.charAt(0).toLocaleUpperCase(lang) + name.slice(1)
}

/** "UTC+1", "UTC+5:30", "UTC−10 … UTC−5". */
export function utcLabel([low, high]: [number, number]): string {
  const one = (minutes: number) => {
    const sign = minutes < 0 ? '−' : '+'
    const abs = Math.abs(minutes)
    return `UTC${sign}${Math.floor(abs / 60)}${abs % 60 ? `:${String(abs % 60).padStart(2, '0')}` : ''}`
  }
  return low === high ? one(low) : `${one(low)} … ${one(high)}`
}

/** A zone's current offset from UTC in minutes, daylight saving included. */
export function zoneOffset(timeZone: string, at = new Date()): number | null {
  try {
    const part = new Intl.DateTimeFormat('en', { timeZone, timeZoneName: 'shortOffset' })
      .formatToParts(at)
      .find((p) => p.type === 'timeZoneName')?.value
    const match = part && /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(part)
    if (part === 'GMT') return 0
    if (!match) return null
    return (match[1] === '-' ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3] ?? 0))
  } catch {
    return null
  }
}

/** Hours ahead of (positive) or behind the user right now; null when unknown. */
export function hoursFromUser(timeZone: string, at = new Date()): number | null {
  const there = zoneOffset(timeZone, at)
  return there == null ? null : (there + at.getTimezoneOffset()) / 60
}
