import { describe, expect, it } from 'vitest'
import { ASPECTS, buildMessages, cacheKey, parseComparison, readInput } from '../functions/compare-destinations/compare.ts'

const scores = (score: number) => Object.fromEntries(ASPECTS.map((a) => [a, { score, note: `nota ${a}` }]))
const place = (score: number) => ({ headline: 'Titolo', bestFor: 'Chi ama il mare.', watchOut: 'Affollata in agosto.', scores: scores(score) })

describe('compare-destinations input', () => {
  it('accepts 2–3 places and drops what it does not recognise', () => {
    const input = readInput({
      places: [{ name: ' Lisbona ', country: 'Portogallo' }, { name: 'Oslo<script>', country: 7 }],
      lang: 'fr',
      month: 13,
      days: 5,
      travellers: 4,
      origin: 'it',
      extra: 'x',
    })
    expect(input).toEqual({
      places: [
        { name: 'Lisbona', country: 'Portogallo' },
        { name: 'Oslo script', country: null },
      ],
      lang: 'en',
      month: null,
      days: 5,
      travellers: 4,
      origin: null,
    })
    // Only control characters and angle brackets go: digits, letters and punctuation stay.
    expect(readInput({ places: [{ name: 'Ísola 10, f-01.' }, { name: 'a\u0000b\nc' }] })?.places.map((p) => p.name)).toEqual(['Ísola 10, f-01.', 'a b c'])
    expect(readInput({ places: [{ name: 'Solo' }] })).toBeNull()
    expect(readInput({ places: [{ name: 'a' }, { name: 'b' }, { name: 'c' }, { name: 'd' }] })).toBeNull()
    expect(readInput({ places: [{ name: 'a' }, { name: '   ' }] })).toBeNull()
  })

  it('shares one cache entry whatever the order and exact group size', () => {
    const a = readInput({ places: [{ name: 'Lisbona', country: 'Portogallo' }, { name: 'Oslo', country: 'Norvegia' }], lang: 'it', travellers: 4 })!
    const b = readInput({ places: [{ name: 'oslo', country: 'Norvegia' }, { name: 'Lisbona', country: 'Portogallo' }], lang: 'it', travellers: 5 })!
    const c = readInput({ places: [{ name: 'Oslo', country: 'Norvegia' }, { name: 'Lisbona', country: 'Portogallo' }], lang: 'es', travellers: 5 })!
    expect(cacheKey(a)).toBe(cacheKey(b))
    expect(cacheKey(a)).not.toBe(cacheKey(c))
  })

  it('tells the model the language, the month and where they fly from', () => {
    const input = readInput({ places: [{ name: 'Lisbona', country: 'Portogallo' }, { name: 'Oslo' }], lang: 'it', month: 8, origin: 'ES' })!
    const [system, user] = buildMessages(input)
    expect(system.content).toContain('Italian')
    expect(user.content).toContain('1. Lisbona (Portogallo)\n2. Oslo')
    expect(user.content).toContain('August')
    expect(user.content).toContain('ES')
  })
})

describe('compare-destinations answer', () => {
  it('keeps a well-formed answer and drops picks that point nowhere', () => {
    const raw = JSON.stringify({
      summary: 'Lisbona costa meno, Oslo è più verde.',
      places: [place(4), place(2)],
      picks: [
        { if: 'Se volete spendere poco', place: 1 },
        { if: 'Se volete la natura', place: 2 },
        { if: 'Fuori scala', place: 0 },
      ],
    })
    const parsed = parseComparison(`\`\`\`json\n${raw}\n\`\`\``, 2)
    expect(parsed?.places[0].scores.cost).toEqual({ score: 4, note: 'nota cost' })
    expect(parsed?.picks).toEqual([
      { if: 'Se volete spendere poco', place: 0 },
      { if: 'Se volete la natura', place: 1 },
    ])
  })

  it('rejects answers that do not match the places or miss a score', () => {
    const ok = { summary: 'x', places: [place(3), place(3)], picks: [] }
    expect(parseComparison(JSON.stringify(ok), 3)).toBeNull()
    const missing = { ...ok, places: [place(3), { ...place(3), scores: { cost: { score: 3, note: 'n' } } }] }
    expect(parseComparison(JSON.stringify(missing), 2)).toBeNull()
    const outOfRange = { ...ok, places: [place(3), place(9)] }
    expect(parseComparison(JSON.stringify(outOfRange), 2)).toBeNull()
    expect(parseComparison('not json', 2)).toBeNull()
  })
})
