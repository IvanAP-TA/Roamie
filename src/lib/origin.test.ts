import { describe, expect, it } from 'vitest'
import { guessOrigin, ORIGIN_HUBS } from './origin'
import { estimatedBudgetLevel, flightFrom, flightFromItaly, type Range } from './tripCost'

const PARIS = { lat: 48.8566, lng: 2.3522 }
const TOKYO = { lat: 35.6762, lng: 139.6503 }

describe('departure country', () => {
  it('guesses it from the device languages', () => {
    expect(guessOrigin(['en-GB', 'en'])).toBe('GB')
    expect(guessOrigin(['es'])).toBe('ES')
    expect(guessOrigin(['it'])).toBe('IT')
    expect(guessOrigin(['en'])).toBe('US')
    expect(guessOrigin(['fr-CA', 'fr'])).toBe('CA')
    expect(guessOrigin(['not a tag', 'pt-BR'])).toBe('BR')
    expect(guessOrigin([])).toBe('IT')
  })

  it('knows where flights start in most countries', () => {
    expect(Object.keys(ORIGIN_HUBS).length).toBeGreaterThan(200)
    // Italy keeps the airport the fares were tuned on.
    expect(ORIGIN_HUBS.IT).toEqual([41.8003, 12.2389])
  })

  it('estimates flights from the main airport of that country', () => {
    expect(flightFrom('IT', PARIS.lat, PARIS.lng)).toEqual(flightFromItaly(PARIS.lat, PARIS.lng))
    expect(flightFrom('FR', PARIS.lat, PARIS.lng)).toBe('near')
    const fromItaly = flightFromItaly(PARIS.lat, PARIS.lng) as Range
    const fromNewYork = flightFrom('US', PARIS.lat, PARIS.lng) as Range
    expect(fromNewYork.low).toBeGreaterThan(fromItaly.high)
    // Tokyo is much closer from Sydney than from Rome.
    expect((flightFrom('AU', TOKYO.lat, TOKYO.lng) as Range).low).toBeLessThan((flightFromItaly(TOKYO.lat, TOKYO.lng) as Range).low)
    // An unknown country counts as Italy.
    expect(flightFrom('XX', PARIS.lat, PARIS.lng)).toEqual(fromItaly)
  })

  it('makes the budget level depend on where you travel from', () => {
    expect(estimatedBudgetLevel({ ...PARIS, country_code: 'FR' }, 'IT')).toBe(2)
    expect(estimatedBudgetLevel({ ...TOKYO, country_code: 'JP' }, 'KR')).toBeLessThan(estimatedBudgetLevel({ ...TOKYO, country_code: 'JP' }, 'IT')!)
  })
})
