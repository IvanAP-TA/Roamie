/**
 * Exchange rates for expenses in another currency: European Central Bank reference rates through
 * Frankfurter (free, no key). Cached in localStorage; null when the currency isn't covered, so the user
 * types the rate instead.
 */

const API = 'https://api.frankfurter.dev/v1'
const CACHE_KEY = 'roamie.fx'
const MAX_ENTRIES = 200

type Cache = Record<string, number>

function readCache(): Cache {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}') as Cache
  } catch {
    return {}
  }
}

function writeCache(cache: Cache) {
  try {
    const entries = Object.entries(cache)
    localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(entries.slice(-MAX_ENTRIES))))
  } catch {
    // Storage full or blocked: rates are just fetched again next time.
  }
}

/** Units of `to` for one unit of `from` on `date` (yyyy-mm-dd); future dates use the latest rate. */
export async function fetchRate(from: string, to: string, date: string, signal?: AbortSignal): Promise<number | null> {
  if (from === to) return 1
  const today = new Date().toISOString().slice(0, 10)
  const day = date && date < today ? date : 'latest'
  const key = `${day}|${from}|${to}`

  const cache = readCache()
  if (cache[key]) return cache[key]

  const response = await fetch(`${API}/${day}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { signal })
  if (!response.ok) return null
  const body = (await response.json()) as { rates?: Record<string, number> }
  const rate = body.rates?.[to]
  if (typeof rate !== 'number' || !(rate > 0)) return null

  // "latest" changes every working day, so only historical rates are cached.
  if (day !== 'latest') writeCache({ ...cache, [key]: rate })
  return rate
}
