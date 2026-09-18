/**
 * Builds the country facts used by the globe and by flight estimates, from open sources:
 *   - Wikidata (CC0): ISO numeric code, capital coordinates, driving side
 *   - Unicode CLDR (Unicode licence): currencies in use and official languages
 *   - countries-and-timezones (MIT): IANA time zones
 * Writes src/data/countries.json (the globe's country card) and src/data/country-hubs.json (a small file: where
 * flights from each country start). Run again to refresh:
 *
 *   node scripts/countries.mjs
 */
import { readFile, writeFile } from 'node:fs/promises'
import ct from 'countries-and-timezones'

const USER_AGENT = 'Roamie/1.0 (https://roamie.org; nk1530htu@mozmail.com)'
const OUT = new URL('../src/data/countries.json', import.meta.url)
const HUBS_OUT = new URL('../src/data/country-hubs.json', import.meta.url)

/**
 * Where flights from a country usually start, when that isn't the capital: the main international airport.
 * Italy keeps Rome Fiumicino, the reference the fares were tuned on.
 */
const HUBS = {
  IT: [41.8003, 12.2389],
  US: [40.6413, -73.7781],
  CA: [43.6777, -79.6248],
  AU: [-33.9399, 151.1753],
  NZ: [-37.0082, 174.785],
  BR: [-23.4356, -46.4731],
  CH: [47.4582, 8.5555],
  TR: [41.2753, 28.7519],
  ZA: [-26.1367, 28.2411],
  MA: [33.3675, -7.5898],
  NG: [6.5774, 3.3212],
  VN: [10.8185, 106.652],
  PK: [24.9065, 67.1608],
  CN: [31.1443, 121.8083],
  IN: [28.5562, 77.1],
  AE: [25.2532, 55.3657],
  SA: [21.6796, 39.1565],
  EC: [-2.1575, -79.8837],
  BO: [-17.6448, -63.1354],
  KZ: [43.3521, 77.0405],
  TZ: [-6.8781, 39.2026],
  CI: [5.2539, -3.9263],
  CM: [4.0061, 9.7195],
}

async function wikidata() {
  const query = `SELECT ?iso2 ?num ?coord ?capIt ?capEn ?capEs ?driveLabel WHERE {
    ?c wdt:P297 ?iso2 .
    FILTER NOT EXISTS { ?c wdt:P576 ?ended }
    OPTIONAL { ?c wdt:P299 ?num }
    OPTIONAL {
      ?c wdt:P36 ?capital . ?capital wdt:P625 ?coord .
      OPTIONAL { ?capital rdfs:label ?capIt FILTER(lang(?capIt) = 'it') }
      OPTIONAL { ?capital rdfs:label ?capEn FILTER(lang(?capEn) = 'en') }
      OPTIONAL { ?capital rdfs:label ?capEs FILTER(lang(?capEs) = 'es') }
    }
    OPTIONAL { ?c wdt:P1622 ?drive }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en". ?drive rdfs:label ?driveLabel }
  }`
  const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}`
  const response = await fetch(url, { headers: { Accept: 'application/sparql-results+json', 'User-Agent': USER_AGENT } })
  if (!response.ok) throw new Error(`Wikidata: HTTP ${response.status}`)
  const rows = (await response.json()).results.bindings
  const byCode = {}
  for (const row of rows) {
    const code = row.iso2.value
    const entry = (byCode[code] ??= { num: null, capitals: [], drive: null })
    if (row.num) entry.num = row.num.value
    const point = row.coord && /Point\(([-\d.]+) ([-\d.]+)\)/.exec(row.coord.value)
    if (point) {
      const names = { it: row.capIt?.value, en: row.capEn?.value, es: row.capEs?.value }
      entry.capitals.push({ at: [Number(point[2]), Number(point[1])], names })
    }
    if (row.driveLabel) entry.drive = row.driveLabel.value === 'left' ? 'left' : 'right'
  }
  return byCode
}

const cldr = async (file) => JSON.parse(await readFile(new URL(`../node_modules/cldr-core/supplemental/${file}`, import.meta.url), 'utf8'))

const round = (value) => Math.round(value * 100) / 100

/** The zone people mean by "the time there" in countries spanning several (the capital's, not the first listed). */
const MAIN_ZONE = {
  AR: 'America/Argentina/Buenos_Aires',
  AU: 'Australia/Sydney',
  BR: 'America/Sao_Paulo',
  CA: 'America/Toronto',
  CD: 'Africa/Kinshasa',
  CL: 'America/Santiago',
  CN: 'Asia/Shanghai',
  EC: 'America/Guayaquil',
  ES: 'Europe/Madrid',
  ID: 'Asia/Jakarta',
  KZ: 'Asia/Almaty',
  MN: 'Asia/Ulaanbaatar',
  MX: 'America/Mexico_City',
  NZ: 'Pacific/Auckland',
  PT: 'Europe/Lisbon',
  RU: 'Europe/Moscow',
  UA: 'Europe/Kyiv',
  US: 'America/New_York',
  XK: 'Europe/Belgrade',
}

/**
 * A reference IANA zone (for live offsets, DST included) and the range of standard UTC offsets in minutes. Zones owned
 * by another country are left out when the country has its own (the library lists Tokyo under Australia too), but kept
 * otherwise: in recent tz data Stockholm is an alias of Berlin.
 */
function zones(code) {
  const all = (ct.getCountry(code)?.timezones ?? []).map((name) => ct.getTimezone(name)).filter(Boolean)
  const own = all.filter((zone) => zone.countries?.[0] === code)
  const usable = own.length > 0 ? own : all
  if (usable.length === 0) {
    const zone = MAIN_ZONE[code] && ct.getTimezone(MAIN_ZONE[code])
    return zone ? { tz: zone.name, utc: [zone.utcOffset, zone.utcOffset] } : {}
  }
  const offsets = usable.map((zone) => zone.utcOffset)
  return { tz: MAIN_ZONE[code] ?? usable[0].name, utc: [Math.min(...offsets), Math.max(...offsets)] }
}

const territories = (await cldr('territoryInfo.json')).supplemental.territoryInfo
const currencyRegions = (await cldr('currencyData.json')).supplemental.currencyData.region
const wd = await wikidata()

const countries = {}
for (const [code, entry] of Object.entries(wd).sort(([a], [b]) => a.localeCompare(b))) {
  if (!/^[A-Z]{2}$/.test(code) || entry.capitals.length === 0) continue
  // Several capitals (South Africa, Bolivia…): the one closest to where flights start, else the first.
  const hub = HUBS[code]
  const near = (c) => (hub ? Math.hypot(c.at[0] - hub[0], c.at[1] - hub[1]) : 0)
  const [first] = [...entry.capitals].sort((a, b) => near(a) - near(b))
  const capital = first.at.map(round)
  const english = first.names.en
  const capitalName = english && { it: first.names.it ?? english, en: english, es: first.names.es ?? english }

  const languages = Object.entries(territories[code]?.languagePopulation ?? {})
    // Official nationwide, not regionally (French in Aosta Valley isn't an Italian language here).
    .filter(([, info]) => info._officialStatus === 'official' || info._officialStatus === 'de_facto_official')
    .sort(([, a], [, b]) => Number(b._populationPercent) - Number(a._populationPercent))
    .map(([lang]) => lang.replace(/_.*/, ''))
  const currencies = (currencyRegions[code] ?? [])
    .flatMap((item) => Object.entries(item))
    .filter(([, info]) => !info._to && info._tender !== 'false')
    .map(([currency]) => currency)

  countries[code] = {
    ...(entry.num && { num: entry.num }),
    capital,
    ...(capitalName && { capitalName }),
    ...(hub && { hub }),
    currencies: [...new Set(currencies)].slice(0, 2),
    languages: [...new Set(languages)].slice(0, 3),
    ...zones(code),
    ...(entry.drive && { drive: entry.drive }),
  }
}

await writeFile(
  OUT,
  `${JSON.stringify(
    {
      sources: 'Wikidata (CC0): codes, capitals, driving side · Unicode CLDR (Unicode licence): currencies, languages · countries-and-timezones (MIT): time zones',
      countries,
    },
    null,
    1,
  )}\n`,
)
const hubs = Object.fromEntries(Object.entries(countries).map(([code, c]) => [code, c.hub ?? c.capital]))
await writeFile(HUBS_OUT, `${JSON.stringify(hubs)}\n`)
console.log(`${Object.keys(countries).length} countries → src/data/countries.json, src/data/country-hubs.json`)
