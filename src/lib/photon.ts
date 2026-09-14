import { createLocalCache } from './cache'
import type { Place } from './nominatim'

/**
 * Search-as-you-type suggestions from Photon (komoot's public OpenStreetMap geocoder: free, no key).
 * Nominatim's usage policy forbids autocomplete, so typing goes to Photon, while Nominatim handles
 * explicit searches and the localized name of a picked place (see nominatim.ts).
 * Fair use: callers debounce and abort superseded requests; results are cached.
 */

// Only actual places: no shops, restaurants, bus stops, streets or buildings.
const LAYERS = ['city', 'locality', 'district', 'county', 'state', 'country', 'other']

interface PhotonFeature {
  geometry: { coordinates: [number, number] }
  properties: {
    osm_type: 'N' | 'W' | 'R'
    osm_id: number
    osm_value: string
    name?: string
    country?: string
    countrycode?: string
    state?: string
    county?: string
  }
}

const cache = createLocalCache<Place[]>('photon', { max: 200, ttlMs: 7 * 24 * 60 * 60 * 1000 })

export async function suggestPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  const q = query.trim().replace(/\s+/g, ' ')
  if (q.length < 3) return []

  const key = q.toLowerCase()
  const cached = cache.get(key)
  if (cached) return cached

  const url = new URL('https://photon.komoot.io/api/')
  url.searchParams.set('q', q)
  url.searchParams.set('limit', '8')
  // Photon only offers default/en/de/fr. English keeps non-Latin names readable ("Beijing", not "北京市");
  // the picked place is then renamed in the UI language through Nominatim.
  url.searchParams.set('lang', 'en')
  for (const layer of LAYERS) url.searchParams.append('layer', layer)

  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Photon ${res.status}`)
  const { features } = (await res.json()) as { features: PhotonFeature[] }

  const places = features
    .filter((f) => f.properties.name)
    .map((f): Place => {
      const p = f.properties
      const region = p.county ?? p.state
      return {
        id: `${p.osm_type}${p.osm_id}`,
        osmId: `${p.osm_type}${p.osm_id}`,
        name: p.name!,
        displayName: [p.name, region !== p.name ? region : null, p.country].filter(Boolean).join(', '),
        country: p.country ?? null,
        countryCode: p.countrycode?.toUpperCase() ?? null,
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
        kind: p.osm_value,
      }
    })
    // OSM often has the same place twice (city node + boundary): keep the first, best-ranked one.
    .filter((place, i, all) => all.findIndex((o) => o.name === place.name && o.country === place.country) === i)
    .slice(0, 6)

  cache.set(key, places)
  return places
}
