import { createLocalCache } from './cache'

/**
 * Average climate of a place from Open-Meteo's historical weather API (free for non-commercial
 * use, CC BY 4.0, attribution shown next to the data). Daily values for the last 5 full years are
 * reduced to 12 months client-side and cached, so each place is fetched rarely.
 */

export interface MonthClimate {
  /** 0 = January */
  month: number
  /** Average daily high and low, °C */
  tempMax: number
  tempMin: number
  /** Days with at least 1 mm of rain, per year */
  rainDays: number
  /** Average daily sunshine, hours */
  sunHours: number
  /** Travel comfort estimate, 0..1 (see comfortScore) */
  score: number
}

export interface Climate {
  months: MonthClimate[]
  /** Indices of the best months (see bestMonths) */
  best: number[]
  years: [number, number]
}

interface Daily {
  time: string[]
  temperature_2m_max: (number | null)[]
  temperature_2m_min: (number | null)[]
  precipitation_sum: (number | null)[]
  sunshine_duration: (number | null)[]
}

const YEARS = 5
const RAIN_DAY_MM = 1
const cache = createLocalCache<Climate>('climate', { max: 80, ttlMs: 180 * 24 * 60 * 60 * 1000 })

/**
 * 0..1: pleasant daytime highs weigh 60% (full marks for 18–28 °C, fading to 0 at 3 °C and 43 °C),
 * few rainy days 40% (0 at 15 or more). A rough guide, always presented as an estimate.
 */
export function comfortScore(tempMax: number, rainDays: number): number {
  const comfort = 1 - Math.min(Math.max(Math.abs(tempMax - 23) - 5, 0), 15) / 15
  const dryness = 1 - Math.min(rainDays / 15, 1)
  return 0.6 * comfort + 0.4 * dryness
}

/** Months within 0.12 of the top score (and at least 0.5). Empty when no month is pleasant. */
export function bestMonths(months: Pick<MonthClimate, 'score'>[]): number[] {
  const top = Math.max(...months.map((m) => m.score))
  if (!Number.isFinite(top) || top < 0.5) return []
  const threshold = Math.max(0.5, top - 0.12)
  return months.flatMap((m, i) => (m.score >= threshold ? [i] : []))
}

export function summarizeDaily(daily: Daily): MonthClimate[] {
  const acc = Array.from({ length: 12 }, () => ({ days: 0, tmax: 0, tmin: 0, rain: 0, sun: 0, years: new Set<string>() }))

  daily.time.forEach((date, i) => {
    const tmax = daily.temperature_2m_max[i]
    const tmin = daily.temperature_2m_min[i]
    if (tmax == null || tmin == null) return
    const month = acc[Number(date.slice(5, 7)) - 1]
    month.days++
    month.tmax += tmax
    month.tmin += tmin
    if ((daily.precipitation_sum[i] ?? 0) >= RAIN_DAY_MM) month.rain++
    month.sun += (daily.sunshine_duration[i] ?? 0) / 3600
    month.years.add(date.slice(0, 4))
  })

  return acc.map((a, month) => {
    const days = Math.max(a.days, 1)
    const tempMax = a.tmax / days
    const rainDays = a.years.size ? a.rain / a.years.size : 0
    return { month, tempMax, tempMin: a.tmin / days, rainDays, sunHours: a.sun / days, score: comfortScore(tempMax, rainDays) }
  })
}

/** Consecutive runs of months, wrapping around the year: [11, 0, 1] → [[11, 1]]. */
export function monthRanges(months: number[]): [number, number][] {
  const set = new Set(months)
  if (set.size === 0) return []
  if (set.size === 12) return [[0, 11]]
  const ranges: [number, number][] = []
  for (let start = 0; start < 12; start++) {
    if (!set.has(start) || set.has((start + 11) % 12)) continue
    let end = start
    while (set.has((end + 1) % 12)) end = (end + 1) % 12
    ranges.push([start, end])
  }
  return ranges
}

export async function fetchClimate(lat: number, lng: number, signal?: AbortSignal): Promise<Climate> {
  // A ~25 km grid: nearby places share a cache entry and the API only sees an approximate location.
  const gridLat = Math.round(lat * 4) / 4
  const gridLng = Math.round(lng * 4) / 4
  const endYear = new Date().getUTCFullYear() - 1
  const startYear = endYear - YEARS + 1
  const key = `${gridLat},${gridLng},${endYear}`
  const cached = cache.get(key)
  if (cached) return cached

  const url = new URL('https://archive-api.open-meteo.com/v1/archive')
  url.searchParams.set('latitude', String(gridLat))
  url.searchParams.set('longitude', String(gridLng))
  url.searchParams.set('start_date', `${startYear}-01-01`)
  url.searchParams.set('end_date', `${endYear}-12-31`)
  url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,precipitation_sum,sunshine_duration')
  url.searchParams.set('timezone', 'UTC')

  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`)
  const { daily } = (await res.json()) as { daily: Daily }
  const months = summarizeDaily(daily)
  const climate: Climate = { months, best: bestMonths(months), years: [startYear, endYear] }
  cache.set(key, climate)
  return climate
}
