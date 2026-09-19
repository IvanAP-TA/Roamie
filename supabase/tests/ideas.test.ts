import { describe, expect, it } from 'vitest'
import {
  itineraryKey,
  itineraryMessages,
  parseIdeas,
  parseItinerary,
  readItinerary,
  readSuggest,
  suggestKey,
  suggestMessages,
} from '../functions/trip-ideas/ideas.ts'

describe('trip ideas input', () => {
  it('keeps only known choices, whatever the client sends', () => {
    const input = readSuggest({
      criteria: { moods: ['relax', 'relax', 'poetry', 'food_wine', 'nature', 'culture'], continent: 'atlantis', budget: 2, month: 13, fame: 'niche' },
      lang: 'de',
      origin: 'IT',
      exclude: ['Lisbona', 42, '  ', 'x'.repeat(200)],
    })
    expect(input.criteria).toEqual({
      moods: ['relax', 'food_wine', 'nature'],
      continent: null,
      budget: 2,
      month: null,
      length: null,
      fame: 'niche',
      distance: null,
      pace: null,
    })
    expect(input.lang).toBe('en')
    expect(input.exclude).toEqual(['Lisbona', 'x'.repeat(60)])
  })

  it('builds the prompt only from those choices', () => {
    const [system, user] = suggestMessages(
      readSuggest({ criteria: { moods: ['nightlife'], continent: 'europe', month: 7, distance: 'near' }, lang: 'it', origin: 'IT', exclude: ['Ibiza'] }),
    )
    expect(system.content).toContain('Italian')
    expect(user.content).toContain('nightlife')
    expect(user.content).toContain('Europe')
    expect(user.content).toContain('July')
    expect(user.content).toContain('close to home')
    expect(user.content).toContain('Do not suggest these again: Ibiza')
    const [, empty] = suggestMessages(readSuggest({ lang: 'en' }))
    expect(empty.content).toContain('No preferences')
  })

  it('shares cache entries whatever the order of moods and exclusions', () => {
    const a = readSuggest({ criteria: { moods: ['relax', 'culture'] }, lang: 'it', exclude: ['Oslo', 'Bergen'] })
    const b = readSuggest({ criteria: { moods: ['culture', 'relax'] }, lang: 'it', exclude: ['bergen', 'OSLO'] })
    expect(suggestKey(a)).toBe(suggestKey(b))
    expect(suggestKey(a)).not.toBe(suggestKey({ ...a, lang: 'es' }))
  })

  it('needs a place and 1–10 days for an itinerary', () => {
    expect(readItinerary({ place: { name: 'Porto' }, days: 0 })).toBeNull()
    expect(readItinerary({ place: { name: ' ' }, days: 3 })).toBeNull()
    const input = readItinerary({ place: { name: 'Porto', country: 'Portogallo' }, days: 3, criteria: { pace: 'relaxed', fame: 'niche' }, lang: 'it' })!
    expect(input.criteria).toEqual({ moods: [], budget: null, month: null, pace: 'relaxed' })
    expect(itineraryKey(input)).toContain('porto|portogallo')
    const [system, user] = itineraryMessages(input)
    expect(system.content).toContain('exactly 3 days')
    expect(user.content).toContain('Porto (Portogallo)')
  })
})

describe('trip ideas answers', () => {
  const idea = (name: string, code = 'PT') => ({
    name,
    country: 'Portogallo',
    countryCode: code,
    why: 'Mare e fado.',
    highlights: ['Tram 28', 'Pastéis de nata', 'Belém', 'extra'],
    moods: ['culture', 'poetry'],
    budget: 5,
  })

  it('keeps usable suggestions and fixes what it can', () => {
    const ideas = parseIdeas({ places: [idea('Lisbona', 'pt'), idea('Porto'), idea('Nowhere', 'P1')] })
    expect(ideas).toHaveLength(2)
    expect(ideas![0]).toEqual({
      name: 'Lisbona',
      country: 'Portogallo',
      countryCode: 'PT',
      why: 'Mare e fado.',
      highlights: ['Tram 28', 'Pastéis de nata', 'Belém'],
      moods: ['culture'],
      budget: 2,
    })
    expect(parseIdeas({ places: [idea('Solo')] })).toBeNull()
    expect(parseIdeas(null)).toBeNull()
  })

  it('keeps an itinerary only with the days asked for, each with stops', () => {
    const day = (title: string) => ({
      title,
      items: [
        { time: '09:30', title: 'Torre di Belém', description: 'Arrivate presto.', place: 'Torre de Belém' },
        { time: 'mattina', title: 'Pranzo', description: '', place: '' },
      ],
    })
    const plan = parseItinerary({ days: [day('Belém'), day('Alfama'), day('Extra')] }, 2)
    expect(plan?.days).toHaveLength(2)
    expect(plan!.days[0].items[1]).toEqual({ time: null, title: 'Pranzo', description: '', place: null })
    expect(parseItinerary({ days: [day('Belém')] }, 2)).toBeNull()
    expect(parseItinerary({ days: [{ title: 'Vuoto', items: [] }] }, 1)).toBeNull()
  })
})
