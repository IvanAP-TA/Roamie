/**
 * Picks a freely licensed photo for every place in the guides and writes src/content/guides/images.json,
 * with author and licence for the attribution.
 *
 * First choice: the lead image of the place's English Wikipedia article, taken from Wikimedia Commons. The article
 * must be about the right place: its coordinates have to be within MAX_KM of the guide's (no "Lagos" in Nigeria
 * for the Algarve). Otherwise a Commons photo whose title names the place. Airports, stations and the like never
 * stand in for a destination. Run again when places change:
 *
 *   node scripts/guide-images.mjs
 */
import { writeFile } from 'node:fs/promises'
import { createServer } from 'vite'

const OUT = new URL('../src/content/guides/images.json', import.meta.url)
const USER_AGENT = 'Roamie/1.0 (https://roamie.org; nk1530htu@mozmail.com)'
const MAX_KM = 150
const NOT_THE_PLACE = /\b(airport|aeroporto|aeropuerto|station|railway|stadium|arena|university|metro|port authority|bus|map|flag|logo|coat of arms|plan|diagram|locator)\b/i

async function api(host, params) {
  const url = new URL(`https://${host}/w/api.php`)
  for (const [key, value] of Object.entries({ action: 'query', format: 'json', formatversion: '2', ...params })) {
    url.searchParams.set(key, value)
  }
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT, 'Api-User-Agent': USER_AGENT } })
  if (!response.ok) throw new Error(`${host}: HTTP ${response.status}`)
  return response.json()
}

function distanceKm(a, b) {
  const rad = (deg) => (deg * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

const text = (html = '') =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()

const plain = (s) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
const byIndex = (a, b) => (a.index ?? 0) - (b.index ?? 0)
const near = (point, place) => distanceKm({ lat: point.lat, lng: point.lon }, place) <= MAX_KM

/** A Commons photo with its licence, or null for anything that isn't a free, large enough JPEG/WebP. */
async function commonsPhoto(file) {
  const name = file.replace(/^File:/, '').replace(/_/g, ' ')
  if (NOT_THE_PLACE.test(name)) return null
  const data = await api('commons.wikimedia.org', {
    titles: `File:${name}`,
    prop: 'imageinfo',
    iiprop: 'url|size|mime|extmetadata',
    iiurlwidth: '960',
    iiextmetadatafilter: 'Artist|Credit|LicenseShortName|UsageTerms|LicenseUrl',
  })
  const page = data.query?.pages?.[0]
  const info = page?.imageinfo?.[0]
  if (!info || page.missing || !/^image\/(jpeg|webp)$/.test(info.mime) || info.width < 640) return null
  const ratio = info.width / info.height
  if (ratio < 0.6 || ratio > 2.5) return null
  const meta = info.extmetadata ?? {}
  const license = text(meta.LicenseShortName?.value) || text(meta.UsageTerms?.value)
  if (!license || /fair use|non-free/i.test(license)) return null
  return {
    url: (info.thumburl ?? info.url).split('?')[0],
    width: info.thumbwidth ?? info.width,
    height: info.thumbheight ?? info.height,
    attribution: {
      author: (text(meta.Artist?.value) || text(meta.Credit?.value) || 'Wikimedia Commons').slice(0, 120),
      license,
      ...(meta.LicenseUrl?.value && { licenseUrl: meta.LicenseUrl.value }),
      sourceUrl: info.descriptionurl,
    },
  }
}

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' })

/** Lead image of the Wikipedia article about the place. */
async function articlePhoto(place) {
  const lookups = [
    // The article with exactly this name…
    { titles: place.name.en, redirects: '1' },
    // …or the best search results naming the country too ("Lagos Portugal").
    { generator: 'search', gsrsearch: `${place.name.en} ${regionNames.of(place.countryCode)}`, gsrlimit: '5' },
  ]
  for (const lookup of lookups) {
    const data = await api('en.wikipedia.org', { ...lookup, prop: 'pageimages|coordinates', piprop: 'name' })
    for (const page of [...(data.query?.pages ?? [])].sort(byIndex)) {
      const point = page.coordinates?.[0]
      if (!page.pageimage || !point || NOT_THE_PLACE.test(page.title) || !near(point, place)) continue
      const photo = await commonsPhoto(page.pageimage)
      if (photo) return { photo, source: page.title }
    }
  }
  return null
}

/** A Commons photo whose title names the place, taken nearby when the file says where. */
async function commonsSearchPhoto(place) {
  const words = plain(place.name.en)
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 3)
  if (words.length === 0) return null
  const data = await api('commons.wikimedia.org', {
    generator: 'search',
    gsrsearch: `${place.name.en} filetype:bitmap`,
    gsrnamespace: '6',
    gsrlimit: '20',
    prop: 'coordinates',
  })
  for (const page of [...(data.query?.pages ?? [])].sort(byIndex)) {
    const point = page.coordinates?.[0]
    if (!words.every((word) => plain(page.title).includes(word)) || (point && !near(point, place))) continue
    const photo = await commonsPhoto(page.title)
    if (photo) return { photo, source: page.title }
  }
  return null
}

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
try {
  const { GUIDE_CONTENT } = await vite.ssrLoadModule('/src/content/guides/content.ts')
  const places = [...new Map(Object.values(GUIDE_CONTENT).flatMap((guide) => guide.places).map((p) => [p.key, p])).values()]

  const images = {}
  const missing = []
  for (const place of places) {
    try {
      const found = (await articlePhoto(place)) ?? (await commonsSearchPhoto(place))
      if (found) {
        images[place.key] = found.photo
        console.log(`${place.key.padEnd(16)} ← ${found.source} (${found.photo.attribution.license})`)
      } else {
        missing.push(place.key)
      }
    } catch (error) {
      missing.push(place.key)
      console.warn(`${place.key}: ${error.message}`)
    }
  }

  const sorted = Object.fromEntries(Object.entries(images).sort(([a], [b]) => a.localeCompare(b)))
  await writeFile(OUT, `${JSON.stringify(sorted, null, 2)}\n`)
  console.log(`\n${Object.keys(images).length}/${places.length} places have a photo${missing.length ? `; none for: ${missing.join(', ')}` : ''}`)
} finally {
  await vite.close()
}
