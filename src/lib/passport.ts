import type { Destination, Trip, VisitedPlace } from './types'

/** A destination the group marked as visited, as returned by the passport query. */
export type TripVisit = Destination & { trip: Pick<Trip, 'id' | 'name'> | null }

/** One entry of the passport: a group visit or a personal place, normalised. */
export interface Stamp {
  key: string
  kind: 'trip' | 'personal'
  id: string
  name: string
  country: string | null
  countryCode: string | null
  lat: number | null
  lng: number | null
  /** ISO date or timestamp */
  date: string | null
  /** Group average for trip visits, the user's own rating for personal places */
  rating: number | null
  imageUrl: string | null
  trip: Pick<Trip, 'id' | 'name'> | null
}

const byDateDesc = (a: Stamp, b: Stamp) => (b.date ?? '').localeCompare(a.date ?? '')

export function buildStamps(visits: TripVisit[], places: VisitedPlace[], hiddenIds: ReadonlySet<string>) {
  const fromTrips = visits.map(
    (d): Stamp => ({
      key: `trip:${d.id}`,
      kind: 'trip',
      id: d.id,
      name: d.name,
      country: d.country,
      countryCode: d.country_code,
      lat: d.lat,
      lng: d.lng,
      date: d.visited_at,
      rating: d.reviews.length ? d.reviews.reduce((sum, r) => sum + r.rating, 0) / d.reviews.length : null,
      imageUrl: d.image_url,
      trip: d.trip,
    }),
  )
  const personal = places.map(
    (p): Stamp => ({
      key: `personal:${p.id}`,
      kind: 'personal',
      id: p.id,
      name: p.name,
      country: p.country,
      countryCode: p.country_code,
      lat: p.lat,
      lng: p.lng,
      date: p.visited_on,
      rating: p.rating,
      imageUrl: null,
      trip: null,
    }),
  )
  return {
    stamps: [...fromTrips.filter((s) => !hiddenIds.has(s.id)), ...personal].sort(byDateDesc),
    hidden: fromTrips.filter((s) => hiddenIds.has(s.id)),
  }
}

// ─── Continents ─────────────────────────────────────────────────────────────
// ISO 3166-1 alpha-2 codes by continent (transcontinental countries where most people place them).
const CONTINENT_CODES = {
  europe:
    'AD AL AT AX BA BE BG BY CH CY CZ DE DK EE ES FI FO FR GB GG GI GR HR HU IE IM IS IT JE LI LT LU LV MC MD ME MK MT NL NO PL PT RO RS RU SE SI SJ SK SM UA VA XK',
  asia: 'AE AF AM AZ BD BH BN BT CN GE HK ID IL IN IQ IR JO JP KG KH KP KR KW KZ LA LB LK MM MN MO MV MY NP OM PH PK PS QA SA SG SY TH TJ TL TM TR TW UZ VN YE',
  africa:
    'AO BF BI BJ BW CD CF CG CI CM CV DJ DZ EG EH ER ET GA GH GM GN GQ GW KE KM LR LS LY MA MG ML MR MU MW MZ NA NE NG RE RW SC SD SH SL SN SO SS ST SZ TD TG TN TZ UG YT ZA ZM ZW',
  northAmerica:
    'AG AI AW BB BL BM BQ BS BZ CA CR CU CW DM DO GD GL GP GT HN HT JM KN KY LC MF MQ MS MX NI PA PM PR SV SX TC TT US VC VG VI',
  southAmerica: 'AR BO BR CL CO EC FK GF GY PE PY SR UY VE',
  oceania: 'AS AU CK FJ FM GU KI MH MP NC NF NR NU NZ PF PG PN PW SB TK TO TV UM VU WF WS',
  antarctica: 'AQ',
} as const

export type Continent = keyof typeof CONTINENT_CODES

const CONTINENT_BY_CODE = new Map(
  (Object.entries(CONTINENT_CODES) as [Continent, string][]).flatMap(([continent, codes]) =>
    codes.split(' ').map((code) => [code, continent] as const),
  ),
)

export const continentOf = (countryCode: string | null | undefined): Continent | null =>
  (countryCode && CONTINENT_BY_CODE.get(countryCode.toUpperCase())) || null

// ─── Stats ──────────────────────────────────────────────────────────────────
export interface CountryCount {
  code: string | null
  name: string
  count: number
}

export interface PassportStats {
  places: number
  countries: CountryCount[]
  continents: Continent[]
  trips: number
  /** First and last year with a dated stamp */
  years: [number, number] | null
  favorite: Stamp | null
  latest: Stamp | null
}

export function passportStats(stamps: Stamp[], countryName: (stamp: Stamp) => string, locale: string): PassportStats {
  // Grouped by ISO code when known, otherwise by the typed country name.
  const countries = new Map<string, CountryCount>()
  for (const stamp of stamps) {
    const key = stamp.countryCode ?? stamp.country?.trim().toLowerCase()
    if (!key) continue
    const entry = countries.get(key)
    if (entry) entry.count++
    else countries.set(key, { code: stamp.countryCode, name: countryName(stamp), count: 1 })
  }

  const years = stamps
    .map((s) => (s.date ? new Date(s.date).getUTCFullYear() : NaN))
    .filter((year) => Number.isFinite(year))

  const rated = stamps.filter((s) => s.rating != null)
  const favorite = rated.length ? rated.reduce((best, s) => (s.rating! > best.rating! ? s : best)) : null

  return {
    places: stamps.length,
    countries: [...countries.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, locale)),
    continents: [...new Set(stamps.map((s) => continentOf(s.countryCode)).filter((c): c is Continent => c !== null))],
    trips: new Set(stamps.flatMap((s) => (s.trip ? [s.trip.id] : []))).size,
    years: years.length ? [Math.min(...years), Math.max(...years)] : null,
    favorite,
    latest: stamps.find((s) => s.date) ?? null,
  }
}
