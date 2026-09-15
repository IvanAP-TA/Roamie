import { describe, expect, it } from 'vitest'
import { distanceKm, estimatedBudgetLevel, estimateTripCost, flightFromItaly, ITALY_DAILY, localCosts, tripDays } from './tripCost'

const PARIS = { lat: 48.8566, lng: 2.3522 }
const TOKYO = { lat: 35.6762, lng: 139.6503 }
const SYDNEY = { lat: -33.8688, lng: 151.2093 }
const FLORENCE = { lat: 43.7696, lng: 11.2558 }

describe('flight from Italy', () => {
  it('measures great-circle distances from Rome', () => {
    expect(distanceKm({ lat: 41.8003, lng: 12.2389 }, PARIS)).toBeGreaterThan(1050)
    expect(distanceKm({ lat: 41.8003, lng: 12.2389 }, PARIS)).toBeLessThan(1150)
  })

  it('prices longer flights higher, and has nothing to price next door', () => {
    const paris = flightFromItaly(PARIS.lat, PARIS.lng)
    const tokyo = flightFromItaly(TOKYO.lat, TOKYO.lng)
    const sydney = flightFromItaly(SYDNEY.lat, SYDNEY.lng)
    expect(paris).toEqual({ low: expect.any(Number), high: expect.any(Number) })
    if (paris === 'near' || tokyo === 'near' || sydney === 'near') throw new Error('unexpected near')
    expect(paris.low).toBeGreaterThanOrEqual(50)
    expect(paris.high).toBeLessThanOrEqual(200)
    expect(tokyo.low).toBeGreaterThan(550)
    expect(tokyo.high).toBeLessThan(1300)
    expect(sydney.low).toBeGreaterThan(tokyo.low)
    expect(sydney.high).toBeLessThanOrEqual(1800)
    expect(flightFromItaly(FLORENCE.lat, FLORENCE.lng)).toBe('near')
  })
})

describe('local costs', () => {
  it('starts from Italian prices and scales with the country, within limits', () => {
    expect(localCosts('IT')).toEqual(ITALY_DAILY)
    expect(localCosts('no')!.night).toBeGreaterThan(ITALY_DAILY.night)
    expect(localCosts('VN')!.day).toBeLessThan(ITALY_DAILY.day)
    // Egypt's price level is far below the cap: holidays there don't get that cheap.
    expect(localCosts('EG')).toEqual({ night: 20, day: 20 })
    expect(localCosts('TW')).toBeNull()
    expect(localCosts(null)).toBeNull()
  })
})

describe('trip estimate', () => {
  it('uses the fixed dates, then the wanted length, then a week', () => {
    expect(tripDays({ start_date: '2027-07-10', end_date: '2027-07-14', trip_length: 7 })).toEqual({ days: 5, source: 'dates' })
    expect(tripDays({ start_date: null, end_date: null, trip_length: 4 })).toEqual({ days: 4, source: 'length' })
    expect(tripDays({ start_date: null, end_date: null, trip_length: null })).toEqual({ days: 7, source: 'default' })
  })

  it('adds the flight to the nights and days, as a range', () => {
    const estimate = estimateTripCost({ ...PARIS, country_code: 'FR' }, 5)
    const flight = estimate.flight as { low: number; high: number }
    const local = estimate.local!
    const stay = local.night * 4 + local.day * 5
    expect(estimate.total!.low).toBe(Math.round((flight.low + stay * 0.8) / 10) * 10)
    expect(estimate.total!.high).toBe(Math.round((flight.high + stay * 1.25) / 10) * 10)
  })

  it('rates a week there from € to €€€, flight included', () => {
    expect(estimatedBudgetLevel({ ...FLORENCE, country_code: 'IT' })).toBe(1)
    expect(estimatedBudgetLevel({ ...PARIS, country_code: 'FR' })).toBe(2)
    expect(estimatedBudgetLevel({ ...TOKYO, country_code: 'JP' })).toBe(3)
    // Cheap to stay, but the long flight makes it anything but a budget trip from Italy.
    expect(estimatedBudgetLevel({ lat: 13.7563, lng: 100.5018, country_code: 'TH' })).toBeGreaterThan(1)
    expect(estimatedBudgetLevel({ lat: null, lng: null, country_code: 'FR' })).toBeNull()
  })

  it('gives no total when a part is unknown', () => {
    expect(estimateTripCost({ lat: null, lng: null, country_code: 'FR' }, 5)).toMatchObject({ flight: null, total: null })
    expect(estimateTripCost({ ...TOKYO, country_code: null }, 5)).toMatchObject({ local: null, total: null })
    // Close by: 2 nights × €40 + 3 days × €45 = €215, and no fare.
    expect(estimateTripCost({ ...FLORENCE, country_code: 'IT' }, 3).total).toEqual({ low: 170, high: 270 })
  })
})
