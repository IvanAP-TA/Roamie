import { describe, expect, it } from 'vitest'
import { buildStamps, continentOf, passportStats, type TripVisit } from './passport'
import type { VisitedPlace } from './types'

const visit = (id: string, over: Partial<TripVisit>): TripVisit =>
  ({
    id,
    trip_id: 't1',
    name: id,
    country: null,
    country_code: null,
    lat: null,
    lng: null,
    image_url: null,
    visited_at: null,
    reviews: [],
    trip: { id: 't1', name: 'Estate' },
    ...over,
  }) as TripVisit

const place = (id: string, over: Partial<VisitedPlace>): VisitedPlace => ({
  id,
  user_id: 'u1',
  name: id,
  country: null,
  country_code: null,
  lat: null,
  lng: null,
  visited_on: null,
  rating: null,
  created_at: '2026-01-01T00:00:00Z',
  ...over,
})

describe('buildStamps', () => {
  it('merges group visits and personal places, newest first, without hidden visits', () => {
    const { stamps, hidden } = buildStamps(
      [
        visit('porto', { country_code: 'PT', visited_at: '2025-07-10T10:00:00Z', reviews: [{ id: 'r', user_id: 'u', rating: 4 }, { id: 's', user_id: 'v', rating: 5 }] }),
        visit('sevilla', { country_code: 'ES', visited_at: '2024-04-12T10:00:00Z' }),
      ],
      [place('tokyo', { country_code: 'JP', visited_on: '2026-03-01', rating: 5 })],
      new Set(['sevilla']),
    )
    expect(stamps.map((s) => s.key)).toEqual(['personal:tokyo', 'trip:porto'])
    expect(stamps[1].rating).toBe(4.5)
    expect(hidden.map((s) => s.id)).toEqual(['sevilla'])
  })
})

describe('continentOf', () => {
  it('places countries on one continent', () => {
    expect(continentOf('IT')).toBe('europe')
    expect(continentOf('jp')).toBe('asia')
    expect(continentOf('BR')).toBe('southAmerica')
    expect(continentOf('MX')).toBe('northAmerica')
    expect(continentOf(null)).toBeNull()
    expect(continentOf('ZZ')).toBeNull()
  })
})

describe('passportStats', () => {
  it('counts countries, continents, trips, years and the favourite place', () => {
    const { stamps } = buildStamps(
      [
        visit('porto', { country_code: 'PT', visited_at: '2025-07-10T10:00:00Z', reviews: [{ id: 'r', user_id: 'u', rating: 4 }] }),
        visit('lisbon', { country_code: 'PT', visited_at: '2022-05-01T10:00:00Z' }),
      ],
      [place('tokyo', { country_code: 'JP', visited_on: '2026-03-01', rating: 5 }), place('somewhere', { country: 'Atlantide' })],
      new Set(),
    )
    const stats = passportStats(stamps, (s) => s.countryCode ?? s.country ?? '', 'en')
    expect(stats.places).toBe(4)
    expect(stats.countries.map((c) => [c.name, c.count])).toEqual([
      ['PT', 2],
      ['Atlantide', 1],
      ['JP', 1],
    ])
    expect(stats.continents.sort()).toEqual(['asia', 'europe'])
    expect(stats.trips).toBe(1)
    expect(stats.years).toEqual([2022, 2026])
    expect(stats.favorite?.id).toBe('tokyo')
    expect(stats.latest?.id).toBe('tokyo')
  })

  it('handles an empty passport', () => {
    expect(passportStats([], () => '', 'en')).toMatchObject({ places: 0, countries: [], continents: [], years: null, favorite: null })
  })
})
