import { monthRanges } from '@/lib/climate'

/** [1, 2, 3, 11, 12] → "nov–mar"; single months are spelled out. Months are 1–12. */
export function bestMonthsLabel(months: number[], lang: string): string {
  const short = new Intl.DateTimeFormat(lang, { month: 'short', timeZone: 'UTC' })
  const long = new Intl.DateTimeFormat(lang, { month: 'long', timeZone: 'UTC' })
  const at = (month: number) => new Date(Date.UTC(2021, month, 15))
  const abbr = (month: number) => short.format(at(month)).replace('.', '')
  return monthRanges(months.map((m) => m - 1))
    .map(([from, to]) => (from === to ? long.format(at(from)) : `${abbr(from)}–${abbr(to)}`))
    .join(', ')
}
