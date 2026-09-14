import { createLocalCache } from './cache'
import { appUrl } from './utils'
import type { ImageAttribution } from './types'

/**
 * Destination photos from Wikimedia Commons (free, no API key).
 *
 * Strategy, most relevant first:
 *  1. lead image of the matching Wikipedia article (user language, then English),
 *     resolved on Commons so only freely-licensed Commons files are used
 *  2. Commons file search, keeping only files whose title contains the place name
 * Maps, flags, coats of arms, logos and tiny images are discarded. When nothing
 * relevant is left we return [] and the UI shows an illustrated fallback — never a random photo.
 */

export interface WikiImage {
  title: string
  url: string
  thumbUrl: string
  width: number
  height: number
  attribution: ImageAttribution
}

interface ImageInfo {
  url: string
  thumburl?: string
  thumbwidth?: number
  thumbheight?: number
  width: number
  height: number
  mime: string
  descriptionurl: string
  extmetadata?: Record<string, { value: string } | undefined>
}

interface ImagePage {
  title: string
  index?: number
  missing?: boolean
  imageinfo?: ImageInfo[]
}

const cache = createLocalCache<WikiImage[]>('wikimedia', { max: 120, ttlMs: 14 * 24 * 60 * 60 * 1000 })

const EXCLUDE =
  /\b(map|maps|mapa|mappa|karte|carte|flag|bandiera|bandera|drapeau|logo|coat of arms|stemma|escudo|blason|wappen|seal|locator|location map|diagram|chart|plan|icon|symbol|signature|firma|poster|stamp)\b/i
const STOPWORDS = new Set(['del', 'della', 'delle', 'dei', 'degli', 'the', 'and', 'los', 'las', 'les', 'des', 'von', 'van'])

const IMAGEINFO_PARAMS = {
  prop: 'imageinfo',
  iiprop: 'url|size|mime|extmetadata',
  iiurlwidth: '1280',
  iiextmetadatafilter: 'Artist|Credit|LicenseShortName|UsageTerms|LicenseUrl',
}

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/_/g, ' ')

const tokens = (q: string) =>
  normalize(q)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t))

/** Every meaningful word of the place name must appear in the title. */
function isRelevant(title: string, queryTokens: string[]) {
  if (queryTokens.length === 0) return false
  const normalized = normalize(title)
  return queryTokens.every((tok) => normalized.includes(tok))
}

const phrase = (s: string) =>
  normalize(s)
    .replace(/^file:/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

/** Title begins with the place name ("Lisbona 7.jpg", "Oaxaca de Juárez") rather than merely mentioning it ("Trattato di Lisbona"). */
const startsWithPlace = (title: string, query: string) => phrase(title).startsWith(phrase(query))

function stripHtml(html: string | undefined): string {
  if (!html) return ''
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim()
}

async function api(host: string, params: Record<string, string>) {
  const url = new URL(`https://${host}/w/api.php`)
  const all = { action: 'query', format: 'json', formatversion: '2', origin: '*', ...params }
  for (const [k, v] of Object.entries(all)) url.searchParams.set(k, v)
  const contact = import.meta.env.VITE_CONTACT_EMAIL as string | undefined
  const res = await fetch(url, {
    headers: { 'Api-User-Agent': `Roamie/0.1 (${appUrl()}${contact ? `; ${contact}` : ''})` },
  })
  if (!res.ok) throw new Error(`Wikimedia ${res.status}`)
  return res.json() as Promise<{ query?: { pages?: ImagePage[] & { pageimage?: string }[] } }>
}

function toWikiImage(page: ImagePage): WikiImage | null {
  const info = page.imageinfo?.[0]
  if (!info || page.missing) return null
  if (!/^image\/(jpeg|webp|tiff)$/.test(info.mime)) return null
  if (EXCLUDE.test(normalize(page.title))) return null
  // Very long titles are almost always archival scans (engravings, documents), not travel photos.
  if (page.title.length > 100) return null
  if (info.width < 640) return null
  const ratio = info.width / info.height
  if (ratio < 0.5 || ratio > 3) return null

  const meta = info.extmetadata ?? {}
  const license = stripHtml(meta.LicenseShortName?.value) || stripHtml(meta.UsageTerms?.value)
  if (!license || /fair use|non-free/i.test(license)) return null

  return {
    title: page.title,
    url: info.url,
    thumbUrl: info.thumburl ?? info.url,
    width: info.thumbwidth ?? info.width,
    height: info.thumbheight ?? info.height,
    attribution: {
      author: (stripHtml(meta.Artist?.value) || stripHtml(meta.Credit?.value) || 'Wikimedia Commons').slice(0, 120),
      license,
      licenseUrl: meta.LicenseUrl?.value,
      sourceUrl: info.descriptionurl,
    },
  }
}

async function wikipediaLeadFiles(query: string, lang: string): Promise<string[]> {
  const data = await api(`${lang}.wikipedia.org`, {
    generator: 'search',
    gsrsearch: query,
    gsrlimit: '3',
    prop: 'pageimages',
    piprop: 'name',
  })
  const pages = (data.query?.pages ?? []) as { title: string; index: number; pageimage?: string }[]
  // Only the article about the place itself — not "Treaty of Lisbon" or "Lisbon Airport".
  const article = pages.sort((a, b) => a.index - b.index).find((p) => startsWithPlace(p.title, query))
  return article?.pageimage ? [`File:${article.pageimage.replace(/_/g, ' ')}`] : []
}

async function commonsFiles(titles: string[]): Promise<WikiImage[]> {
  if (titles.length === 0) return []
  const data = await api('commons.wikimedia.org', { titles: titles.join('|'), ...IMAGEINFO_PARAMS })
  const pages = data.query?.pages ?? []
  return titles
    .map((title) => pages.find((p) => p.title === title))
    .map((p) => (p ? toWikiImage(p) : null))
    .filter((img): img is WikiImage => img !== null)
}

async function commonsSearch(query: string): Promise<WikiImage[]> {
  const data = await api('commons.wikimedia.org', {
    generator: 'search',
    gsrsearch: `${query} filetype:bitmap`,
    gsrnamespace: '6',
    gsrlimit: '15',
    ...IMAGEINFO_PARAMS,
  })
  const qt = tokens(query)
  const rank = (p: ImagePage) => (startsWithPlace(p.title, query) ? 0 : 1)
  return [...(data.query?.pages ?? [])]
    .filter((p) => isRelevant(p.title, qt))
    .sort((a, b) => rank(a) - rank(b) || (a.index ?? 0) - (b.index ?? 0))
    .map(toWikiImage)
    .filter((img): img is WikiImage => img !== null)
}

export async function findPlaceImages(name: string, lang: string): Promise<WikiImage[]> {
  const query = name.trim()
  if (tokens(query).length === 0) return []
  const key = `${lang}|${normalize(query)}`
  const cached = cache.get(key)
  if (cached) return cached

  let failed = false
  const langs = [...new Set([lang, 'en'])]
  const leads = await Promise.allSettled(langs.map((l) => wikipediaLeadFiles(query, l)))
  const leadTitles = [...new Set(leads.flatMap((r) => (r.status === 'fulfilled' ? r.value : ((failed = true), []))))]

  const found: WikiImage[] = []
  try {
    found.push(...(await commonsFiles(leadTitles.slice(0, 6))))
  } catch {
    failed = true
  }
  if (found.length < 4) {
    try {
      found.push(...(await commonsSearch(query)))
    } catch {
      failed = true
    }
  }

  const unique = found.filter((img, i) => found.findIndex((o) => o.title === img.title) === i).slice(0, 8)
  // Don't cache an empty result caused by a network failure.
  if (!failed || unique.length > 0) cache.set(key, unique)
  return unique
}

export function serializeAttribution(a: ImageAttribution): string {
  return JSON.stringify(a)
}

/** Attribution JSON is written by group members, so its link targets are never trusted: https only. */
function httpsOnly(url: unknown): string | undefined {
  try {
    return typeof url === 'string' && new URL(url).protocol === 'https:' ? url : undefined
  } catch {
    return undefined
  }
}

export function parseAttribution(raw: string | null | undefined): ImageAttribution | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as ImageAttribution
    if (parsed && typeof parsed.author === 'string') {
      return { ...parsed, licenseUrl: httpsOnly(parsed.licenseUrl), sourceUrl: httpsOnly(parsed.sourceUrl) ?? '' }
    }
  } catch {
    // legacy/plain-text attribution
  }
  return { author: raw, license: '', sourceUrl: '' }
}
