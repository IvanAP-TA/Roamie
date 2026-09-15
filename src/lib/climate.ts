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
  /** Average daily "feels like" high, °C: humidity makes heat worse, wind makes cold worse */
  feelsMax: number
  /** Average precipitation for the month, mm */
  rainMm: number
  /** Days with 20 mm of rain or more, per year */
  heavyRainDays: number
  /** Days with gusts of 62 km/h or more (gale force), per year */
  windyDays: number
  /** Average daily sunshine, hours */
  sunHours: number
  /** Travel comfort estimate, 0..1 (see comfortScore) */
  score: number
}

export type ClimateWarning = 'heat' | 'cold' | 'rain' | 'wind'

export interface Climate {
  months: MonthClimate[]
  /** Indices of the best months (see bestMonths) */
  best: number[]
  /** Months worth a warning, per kind (see climateWarnings) */
  warnings: Record<ClimateWarning, number[]>
  years: [number, number]
}

type MonthWeather = Pick<MonthClimate, 'feelsMax' | 'rainMm' | 'heavyRainDays' | 'windyDays'>

interface Daily {
  time: string[]
  temperature_2m_max: (number | null)[]
  temperature_2m_min: (number | null)[]
  apparent_temperature_max: (number | null)[]
  precipitation_sum: (number | null)[]
  wind_gusts_10m_max: (number | null)[]
  sunshine_duration: (number | null)[]
}

const YEARS = 5
const HEAVY_RAIN_MM = 20
const GALE_KMH = 62
// Bumped when the shape of Climate changes, so old cached entries are ignored.
const cache = createLocalCache<Climate>('climate-v3',{ max: 80, ttlMs: 180 * 24 * 60 * 60 * 1000 })

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1)

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

/**
 * 0..1. How the day feels weighs 60%: full marks for a "feels like" high of 18–28 °C, down to 0 at 4 °C and at
 * 40 °C (a cool day is easier to dress for than a sweltering one). How dry the month is weighs 40%: monthly rain up
 * to 250 mm and days of heavy rain up to 6. Rain is measured in millimetres rather than rainy days: in the tropics the
 * model data counts a drizzle almost every day. Gale-force days beyond the place's usual count take up to 30% off, so a
 * windy coast isn't marked down in every month. A rough guide, always presented as an estimate.
 */
export function comfortScore(feelsMax: number, rainMm: number, heavyRainDays: number, windyDays: number, usualWindyDays = 0): number {
  const comfort = feelsMax < 18 ? 1 - clamp01((18 - feelsMax) / 14) : 1 - clamp01((feelsMax - 28) / 12)
  const wetness = 0.6 * clamp01(rainMm / 250) + 0.4 * clamp01(heavyRainDays / 6)
  const storms = 0.3 * clamp01(Math.max(windyDays - usualWindyDays, 0) / 4)
  return (0.6 * comfort + 0.4 * (1 - wetness)) * (1 - storms)
}

/** Adds each month's comfort score, measuring its gale days against the place's usual (median) month. */
export function scoreMonths<T extends MonthWeather>(months: T[]): (T & { score: number })[] {
  const usualWindyDays = median(months.map((m) => m.windyDays))
  return months.map((m) => ({ ...m, score: comfortScore(m.feelsMax, m.rainMm, m.heavyRainDays, m.windyDays, usualWindyDays) }))
}

const MIN_BEST = 0.6

/** Months within 0.12 of the top score, and at least 0.6. Empty when no month is pleasant. */
export function bestMonths(months: Pick<MonthClimate, 'score'>[]): number[] {
  const top = Math.max(...months.map((m) => m.score))
  if (!Number.isFinite(top) || top < MIN_BEST) return []
  const threshold = Math.max(MIN_BEST, top - 0.12)
  return months.flatMap((m, i) => (m.score >= threshold ? [i] : []))
}

/**
 * Heat and cold by how the day feels, heavy rain by amount or downpours. Storms only where a month has clearly more
 * gale days than the place usually does (and at least 1.5): on a coast that is always windy, the stormiest season.
 */
export function climateWarnings(months: MonthWeather[]): Record<ClimateWarning, number[]> {
  const where = (test: (m: MonthWeather) => boolean) => months.flatMap((m, i) => (test(m) ? [i] : []))
  const stormy = Math.max(1.5, 1.6 * median(months.map((m) => m.windyDays)))
  return {
    heat: where((m) => m.feelsMax >= 35),
    cold: where((m) => m.feelsMax <= 5),
    rain: where((m) => m.rainMm >= 250 || m.heavyRainDays >= 5),
    wind: where((m) => m.windyDays >= stormy),
  }
}

export function summarizeDaily(daily: Daily): MonthClimate[] {
  const acc = Array.from({ length: 12 }, () => ({
    days: 0,
    tmax: 0,
    tmin: 0,
    feels: 0,
    rain: 0,
    heavy: 0,
    windy: 0,
    sun: 0,
    years: new Set<string>(),
  }))

  daily.time.forEach((date, i) => {
    const tmax = daily.temperature_2m_max[i]
    const tmin = daily.temperature_2m_min[i]
    if (tmax == null || tmin == null) return
    const month = acc[Number(date.slice(5, 7)) - 1]
    const rain = daily.precipitation_sum[i] ?? 0
    month.days++
    month.tmax += tmax
    month.tmin += tmin
    month.feels += daily.apparent_temperature_max[i] ?? tmax
    month.rain += rain
    if (rain >= HEAVY_RAIN_MM) month.heavy++
    if ((daily.wind_gusts_10m_max[i] ?? 0) >= GALE_KMH) month.windy++
    month.sun += (daily.sunshine_duration[i] ?? 0) / 3600
    month.years.add(date.slice(0, 4))
  })

  return scoreMonths(
    acc.map((a, month) => {
      const days = Math.max(a.days, 1)
      const years = Math.max(a.years.size, 1)
      return {
        month,
        tempMax: a.tmax / days,
        tempMin: a.tmin / days,
        feelsMax: a.feels / days,
        rainMm: a.rain / years,
        heavyRainDays: a.heavy / years,
        windyDays: a.windy / years,
        sunHours: a.sun / days,
      }
    }),
  )
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
  url.searchParams.set(
    'daily',
    'temperature_2m_max,temperature_2m_min,apparent_temperature_max,precipitation_sum,wind_gusts_10m_max,sunshine_duration',
  )
  url.searchParams.set('timezone', 'UTC')

  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`)
  const { daily } = (await res.json()) as { daily: Daily }
  const months = summarizeDaily(daily)
  const climate: Climate = { months, best: bestMonths(months), warnings: climateWarnings(months), years: [startYear, endYear] }
  cache.set(key, climate)
  return climate
}
