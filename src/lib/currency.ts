/** Money input and display for shared expenses. */

const COMMON = ['EUR', 'USD', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'RON', 'TRY', 'MAD', 'THB', 'MXN', 'BRL', 'CNY', 'INR']

export interface CurrencyOption {
  code: string
  label: string
}

/** Common travel currencies first, then every currency the browser knows, with localized names. */
export function currencyOptions(lang: string): { common: CurrencyOption[]; rest: CurrencyOption[] } {
  let all: string[]
  try {
    all = Intl.supportedValuesOf('currency')
  } catch {
    all = COMMON
  }
  let names: Intl.DisplayNames | null = null
  try {
    names = new Intl.DisplayNames([lang], { type: 'currency' })
  } catch {
    names = null
  }
  const option = (code: string): CurrencyOption => {
    const name = names?.of(code)
    return { code, label: name && name !== code ? `${code} · ${name}` : code }
  }
  return {
    common: COMMON.filter((code) => all.includes(code)).map(option),
    rest: all.filter((code) => !COMMON.includes(code)).map(option),
  }
}

/** "12,50", "12.5" or "1200" → number; null for anything else, zero, negatives or more than 2 decimals. */
export function parseAmount(text: string): number | null {
  const cleaned = text.trim().replace(/\s/g, '')
  if (!/^\d+([.,]\d{1,2})?$/.test(cleaned)) return null
  const value = Number(cleaned.replace(',', '.'))
  return value > 0 && value < 1e10 ? value : null
}

/** Exchange rates can have many decimals. */
export function parseRate(text: string): number | null {
  const cleaned = text.trim().replace(/\s/g, '')
  if (!/^\d+([.,]\d{1,10})?$/.test(cleaned)) return null
  const value = Number(cleaned.replace(',', '.'))
  return value > 0 && value < 1e6 ? value : null
}

/** For editing: 12.5 → "12,50" in locales with a decimal comma. */
export function amountInput(value: number, lang: string): string {
  const comma = (1.5).toLocaleString(lang).includes(',')
  const fixed = (Math.round(value * 100) / 100).toFixed(2).replace(/\.00$/, '')
  return comma ? fixed.replace('.', ',') : fixed
}

export const formatMoney = (cents: number, currency: string, lang: string) =>
  new Intl.NumberFormat(lang, { style: 'currency', currency }).format(cents / 100)
