/**
 * Intl formatters, made once per language and options. Building one costs far more than using it (a fraction of a
 * millisecond each, several on a slow phone), and lists build one per item on every render: an activity feed of
 * twenty "2 hours ago" took ~40 ms on a mid-range phone.
 */
const cache = new Map<string, unknown>()

function cached<T>(key: string, make: () => T): T {
  let value = cache.get(key) as T | undefined
  if (value === undefined) {
    value = make()
    cache.set(key, value)
  }
  return value
}

type Locale = string | undefined

export const dateFormat = (locale: Locale, options?: Intl.DateTimeFormatOptions) =>
  cached(`date|${locale}|${JSON.stringify(options)}`, () => new Intl.DateTimeFormat(locale, options))

export const numberFormat = (locale: Locale, options?: Intl.NumberFormatOptions) =>
  cached(`number|${locale}|${JSON.stringify(options)}`, () => new Intl.NumberFormat(locale, options))

export const relativeTimeFormat = (locale: Locale, options?: Intl.RelativeTimeFormatOptions) =>
  cached(`relative|${locale}|${JSON.stringify(options)}`, () => new Intl.RelativeTimeFormat(locale, options))

/** For sorting by name: a.localeCompare(b, lang) may set up a collator for every comparison of the sort. */
export const collator = (locale: Locale, options?: Intl.CollatorOptions) =>
  cached(`collator|${locale}|${JSON.stringify(options)}`, () => new Intl.Collator(locale, options))
