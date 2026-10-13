import { describe, expect, it } from 'vitest'
import { LANGUAGES } from '@/i18n'
import { EXPLORE_PLACES, findExplore, MONTHS, monthSlug, PAIRS, pairSlug, placesForMonth, verdict } from './explore'
import { bestMonthsLabel } from './format'
import { GUIDES } from './meta'

describe('month and comparison pages', () => {
  it('gives every month and pair a unique slug per language, never a guide’s', () => {
    for (const { code } of LANGUAGES) {
      const slugs = [...MONTHS.map((m) => monthSlug(m, code)), ...PAIRS.map((p) => pairSlug(p, code))]
      expect(new Set(slugs).size).toBe(slugs.length)
      for (const guide of GUIDES) expect(slugs).not.toContain(guide.slug[code])
      for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    }
  })

  it('resolves its own slugs back', () => {
    expect(findExplore('it', 'dove-andare-a-novembre')).toEqual({ kind: 'month', month: 11 })
    expect(findExplore('en', 'where-to-go-in-november')).toEqual({ kind: 'month', month: 11 })
    expect(findExplore('es', 'donde-ir-en-noviembre')).toEqual({ kind: 'month', month: 11 })
    const pair = PAIRS[0]
    expect(findExplore('es', pairSlug(pair, 'es'))).toEqual({ kind: 'pair', pair })
    expect(findExplore('it', 'not-a-page')).toBeNull()
  })

  it('has places for every month and pairs from the guides', () => {
    expect(EXPLORE_PLACES.length).toBeGreaterThan(40)
    for (const m of MONTHS) expect(placesForMonth(m).length).toBeGreaterThanOrEqual(5)
    expect(PAIRS.length).toBeGreaterThan(100)
  })

  it('writes a verdict from the facts', () => {
    const pair = PAIRS.find((p) => p.a.budget !== p.b.budget)!
    const cheaper = pair.a.budget < pair.b.budget ? pair.a : pair.b
    const other = cheaper === pair.a ? pair.b : pair.a
    const line = verdict(cheaper, other, 'it', (months) => bestMonthsLabel(months, 'it'))
    expect(line).toContain(cheaper.name.it)
    expect(line).toContain('spendere meno')
    expect(verdict(other, cheaper, 'en', (months) => bestMonthsLabel(months, 'en'))).not.toContain('spend less')
  })
})
