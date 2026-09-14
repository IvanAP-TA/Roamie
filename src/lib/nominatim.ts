import { createLocalCache } from './cache'
import { sleep } from './utils'

/**
 * Geocoding through OpenStreetMap Nominatim (free, no key). Usage policy compliance:
 *  - at most 1 request/second, enforced by a global client-side queue
 *  - explicit requests only: a submitted search, or one lookup when the user picks a suggestion.
 *    Search-as-you-type is forbidden by the policy and handled by Photon instead (photon.ts)
 *  - results cached in localStorage, so the same query never hits the server twice
 *  - identification: browsers don't allow setting User-Agent from JS, so the app is identified
 *    by the Referer header (kept via referrerPolicy) plus the `email` parameter when configured
 */

export interface Place {
  id: string
  /** OSM object id ("N123", "W123", "R123"), when known, to fetch the localized name. */
  osmId?: string
  name: string
  displayName: string
  country: string | null
  countryCode: string | null
  lat: number
  lng: number
  kind: string
}

interface NominatimResult {
  place_id: number
  name?: string
  display_name: string
  lat: string
  lon: string
  type: string
  addresstype?: string
  address?: { country?: string; country_code?: string }
}

const MIN_INTERVAL_MS = 1100
const cache = createLocalCache<Place[]>('nominatim', { max: 150, ttlMs: 30 * 24 * 60 * 60 * 1000 })
const localizedNames = createLocalCache<{ name: string; country: string | null }>('nominatim-names', {
  max: 300,
  ttlMs: 30 * 24 * 60 * 60 * 1000,
})

let chain: Promise<unknown> = Promise.resolve()
let lastRequestAt = 0

function throttled<T>(task: () => Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now()
    if (wait > 0) await sleep(wait)
    lastRequestAt = Date.now()
    return task()
  })
  chain = run.catch(() => undefined)
  return run
}

export class NominatimError extends Error {
  constructor(public code: 'rate_limited' | 'network') {
    super(code)
  }
}

function request(path: 'search' | 'lookup', params: Record<string, string>, lang: string): Promise<NominatimResult[]> {
  return throttled(async () => {
    const url = new URL(`https://nominatim.openstreetmap.org/${path}`)
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
    url.searchParams.set('format', 'jsonv2')
    url.searchParams.set('addressdetails', '1')
    url.searchParams.set('accept-language', lang)
    const contact = import.meta.env.VITE_CONTACT_EMAIL as string | undefined
    if (contact) url.searchParams.set('email', contact)

    let res: Response
    try {
      res = await fetch(url, { referrerPolicy: 'strict-origin-when-cross-origin', headers: { Accept: 'application/json' } })
    } catch {
      throw new NominatimError('network')
    }
    if (res.status === 429) throw new NominatimError('rate_limited')
    if (!res.ok) throw new NominatimError('network')
    return (await res.json()) as NominatimResult[]
  })
}

export async function searchPlaces(query: string, lang: string): Promise<Place[]> {
  const q = query.trim().replace(/\s+/g, ' ')
  if (q.length < 2) return []

  const key = `${lang}|${q.toLowerCase()}`
  const cached = cache.get(key)
  if (cached) return cached

  const results = await request('search', { q, limit: '6' }, lang)
  const places: Place[] = results.map((r) => ({
    id: String(r.place_id),
    name: r.name || r.display_name.split(',')[0],
    displayName: r.display_name,
    country: r.address?.country ?? null,
    countryCode: r.address?.country_code?.toUpperCase() ?? null,
    lat: Number(r.lat),
    lng: Number(r.lon),
    kind: r.addresstype ?? r.type,
  }))

  cache.set(key, places)
  return places
}

/**
 * The place's name and country in the UI language ("Beijing, China" → "Pechino, Cina").
 * One request per picked suggestion; on any failure the place is returned unchanged.
 */
export async function localizePlace(place: Place, lang: string): Promise<Place> {
  if (!place.osmId) return place
  const key = `${lang}|${place.osmId}`
  let localized = localizedNames.get(key)
  if (!localized) {
    try {
      const [row] = await request('lookup', { osm_ids: place.osmId }, lang)
      if (!row?.name) return place
      localized = { name: row.name, country: row.address?.country ?? null }
      localizedNames.set(key, localized)
    } catch {
      return place
    }
  }
  return { ...place, name: localized.name, country: localized.country ?? place.country }
}
