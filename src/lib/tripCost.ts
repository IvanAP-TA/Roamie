import priceLevels from '@/data/price-levels.json'
import { ORIGIN_HUBS } from '@/lib/origin'
import type { BudgetLevel } from '@/lib/types'

/**
 * Rough per-person costs of a destination, with no external calls:
 * - the return flight from the user's country (see lib/origin), from the distance to its main airport;
 * - a night's stay and a day's spending (food, local transport, activities), scaled from Italian prices by how
 *   expensive the country is (World Bank price levels, scripts/price-levels.mjs).
 */

export interface Range {
  low: number
  high: number
}

export interface TripCostEstimate {
  /** 'near': close enough to go by train or car */
  flight: Range | 'near' | null
  local: { night: number; day: number } | null
  days: number
  total: Range | null
}

/** Rome Fiumicino: the fares below were tuned on flights from Italy. */
const ROME = { lat: 41.8003, lng: 12.2389 }

/** Within this distance of the departure airport there's no flight to price. */
const NEAR_KM = 300

/** Return economy fares from Italy (€ per person), booked a few weeks ahead outside the peak season. */
const FARES: [km: number, low: number, high: number][] = [
  [NEAR_KM, 50, 150],
  [1500, 60, 200],
  [3000, 150, 350],
  [6000, 350, 700],
  [9000, 550, 1000],
  [12000, 750, 1300],
  [18000, 1000, 1800],
]

/** In Italy, per person: a night in shared accommodation and a day's spending. */
export const ITALY_DAILY = { night: 40, day: 45 }

// Holiday prices vary less than local ones (hotels in cheap countries are often priced in dollars or euros):
// the price level is dampened and capped.
const DAMPING = 0.7
const MIN_FACTOR = 0.45
const MAX_FACTOR = 1.8

const round = (value: number, step: number) => Math.round(value / step) * step

export function distanceKm(from: { lat: number; lng: number }, to: { lat: number; lng: number }): number {
  const rad = (deg: number) => (deg * Math.PI) / 180
  const dLat = rad(to.lat - from.lat)
  const dLng = rad(to.lng - from.lng)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(from.lat)) * Math.cos(rad(to.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(a))
}

/** Return fare from a country (ISO code, see lib/origin) to a place; an unknown country counts as Italy. */
export function flightFrom(origin: string, lat: number, lng: number): Range | 'near' {
  const hub = ORIGIN_HUBS[origin]
  const km = distanceKm(hub ? { lat: hub[0], lng: hub[1] } : ROME, { lat, lng })
  if (km < NEAR_KM) return 'near'
  const upper = FARES.findIndex(([limit]) => km <= limit)
  if (upper === -1) {
    const [, low, high] = FARES[FARES.length - 1]
    return { low, high }
  }
  const [toKm, toLow, toHigh] = FARES[upper]
  const [fromKm, fromLow, fromHigh] = FARES[Math.max(upper - 1, 0)]
  const share = toKm === fromKm ? 0 : (km - fromKm) / (toKm - fromKm)
  return {
    low: round(fromLow + (toLow - fromLow) * share, 10),
    high: round(fromHigh + (toHigh - fromHigh) * share, 10),
  }
}

export const flightFromItaly = (lat: number, lng: number) => flightFrom('IT', lat, lng)

export function localCosts(countryCode: string | null | undefined): { night: number; day: number } | null {
  const level = countryCode ? (priceLevels.levels as Record<string, number>)[countryCode.toUpperCase()] : undefined
  if (level == null) return null
  const factor = Math.min(MAX_FACTOR, Math.max(MIN_FACTOR, level ** DAMPING))
  return { night: round(ITALY_DAILY.night * factor, 5), day: round(ITALY_DAILY.day * factor, 5) }
}

/** Trip length in days: the fixed dates, else the length the group is looking for, else a week. */
export function tripDays(trip: { start_date: string | null; end_date: string | null; trip_length: number | null }): {
  days: number
  source: 'dates' | 'length' | 'default'
} {
  if (trip.start_date && trip.end_date) {
    const days = Math.round((Date.parse(trip.end_date) - Date.parse(trip.start_date)) / 86_400_000) + 1
    if (days >= 1) return { days, source: 'dates' }
  }
  if (trip.trip_length && trip.trip_length >= 1) return { days: trip.trip_length, source: 'length' }
  return { days: 7, source: 'default' }
}

export function estimateTripCost(
  destination: { lat: number | null; lng: number | null; country_code: string | null },
  days: number,
  origin = 'IT',
): TripCostEstimate {
  const flight = destination.lat != null && destination.lng != null ? flightFrom(origin, destination.lat, destination.lng) : null
  const local = localCosts(destination.country_code)

  // A total needs both parts: without the flight it would look far cheaper than the trip is.
  let total: Range | null = null
  if (flight && local) {
    const nights = Math.max(days - 1, 1)
    const stay = local.night * nights + local.day * days
    const fare = flight === 'near' ? { low: 0, high: 0 } : flight
    total = { low: round(fare.low + stay * 0.8, 10), high: round(fare.high + stay * 1.25, 10) }
  }
  return { flight, local, days, total }
}

/** Week-long trip per person, middle of the estimate, above which a destination counts as €€ and €€€. */
const BUDGET_BANDS = [700, 1200]

/** €, €€ or €€€ from the estimated cost of a week there, flight included; null when it can't be estimated. */
export function estimatedBudgetLevel(
  destination: { lat: number | null; lng: number | null; country_code: string | null },
  origin = 'IT',
): BudgetLevel | null {
  const { total } = estimateTripCost(destination, 7, origin)
  if (!total) return null
  const middle = (total.low + total.high) / 2
  return middle <= BUDGET_BANDS[0] ? 1 : middle <= BUDGET_BANDS[1] ? 2 : 3
}
