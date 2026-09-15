/**
 * Builds src/data/price-levels.json: how expensive everyday spending is in each country compared with Italy.
 *
 * Source: World Bank open data (CC BY 4.0). The price level is the PPP conversion factor for private consumption
 * (PA.NUS.PRVT.PP) divided by the official exchange rate (PA.NUS.FCRF), for the latest year that has both; the
 * GDP-wide PPP factor (PA.NUS.PPP) stands in where the consumption one is missing or years behind.
 *
 * Run: node scripts/price-levels.mjs
 */
import { writeFile } from 'node:fs/promises'

const API = 'https://api.worldbank.org/v2'
const OUT = new URL('../src/data/price-levels.json', import.meta.url)

async function get(path) {
  const url = `${API}/${path}${path.includes('?') ? '&' : '?'}format=json&per_page=20000`
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`)
  const body = await response.json()
  if (!Array.isArray(body[1])) throw new Error(`${url}: ${JSON.stringify(body[0])}`)
  return body[1]
}

/** ISO 3166 alpha-2 → { year: value } */
function byCountry(rows) {
  const map = new Map()
  for (const row of rows) {
    if (row.value == null) continue
    const years = map.get(row.country.id) ?? {}
    years[row.date] = row.value
    map.set(row.country.id, years)
  }
  return map
}

const thisYear = new Date().getFullYear()
const range = `date=${thisYear - 8}:${thisYear}`
const [countries, consumption, gdp, exchange] = await Promise.all([
  get('country'),
  get(`country/all/indicator/PA.NUS.PRVT.PP?${range}`).then(byCountry),
  get(`country/all/indicator/PA.NUS.PPP?${range}`).then(byCountry),
  get(`country/all/indicator/PA.NUS.FCRF?${range}`).then(byCountry),
])

function latest(ppp, code) {
  const factors = ppp.get(code)
  const rates = exchange.get(code)
  if (!factors || !rates) return null
  const year = Object.keys(factors)
    .filter((y) => rates[y] != null)
    .sort()
    .at(-1)
  return year ? { level: factors[year] / rates[year], year: Number(year) } : null
}

function priceLevel(code) {
  const fromConsumption = latest(consumption, code)
  const fromGdp = latest(gdp, code)
  if (fromConsumption && (!fromGdp || fromConsumption.year >= fromGdp.year - 1)) return fromConsumption
  return fromGdp
}

const italy = priceLevel('IT')
if (!italy) throw new Error('No price level for Italy')

const levels = {}
const years = []
for (const country of countries.filter((c) => c.region.value.trim() !== 'Aggregates').sort((a, b) => a.iso2Code.localeCompare(b.iso2Code))) {
  const found = priceLevel(country.iso2Code)
  if (!found) continue
  levels[country.iso2Code] = Math.round((found.level / italy.level) * 1000) / 1000
  years.push(found.year)
}

await writeFile(
  OUT,
  `${JSON.stringify(
    {
      source: 'World Bank, PA.NUS.PRVT.PP (PA.NUS.PPP where missing) ÷ PA.NUS.FCRF',
      license: 'CC BY 4.0',
      reference: 'IT',
      years: [Math.min(...years), Math.max(...years)],
      levels,
    },
    null,
    2,
  )}\n`,
)
console.log(`price levels for ${Object.keys(levels).length} countries → ${OUT.pathname}`)
