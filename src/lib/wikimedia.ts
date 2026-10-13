import { createLocalCache } from './cache'
import { appUrl } from './utils'
import type { ImageAttribution } from './types'

/**
 * Destination photos from Wikimedia Commons (free, no API key).
 *
 * Strategy, most relevant first:
 *  1. the article about the place, found in the Wikipedia of whichever app language the name is written in
 *     ("Lisbona", "Lisboa", "Lisbon"): its lead image, the place's own photo on Wikidata (P18, the same in every
 *     language) and, through its interlanguage link, the English article's lead image. All of them are resolved on
 *     Commons, so only freely-licensed Commons files are used
 *  2. Commons file search with the name as typed and with the English name, keeping only files whose title contains
 *     it (Commons titles are mostly English or in the local language, rarely Italian or Spanish)
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
  /\b(map|maps|mapa|mappa|karte|carte|flag|bandiera|bandera|drapeau|logo|coat of arms|stemma|escudo|blason|wappen|seal|locator|location map|diagram|chart|plan|icon|symbol|signature|firma|poster|stamp|btv1b\w*|esa\d+|satellite|futbol|football|fc)\b/i
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
  phrase(q)
    .replace(GEO_PREFIX, '')
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

/**
 * "Isola di Skye", "Lago di Garda", "Isle of Skye": the kind of place in front of its name. Wikipedia often titles the
 * article with the bare name ("Skye") and Commons files rarely repeat the prefix, so matching uses the name alone.
 */
const GEO_PREFIX = /^(isola|isole|isla|islas|isle|island|islands|lago|lake|laguna|monte|mount|mont|valle|val|costa|citta|ciudad|city)( (di|de|del|della|dei|de la|of|d))? /

/** Title begins with the place name ("Lisbona 7.jpg", "Oaxaca de Juárez") rather than merely mentioning it ("Trattato di Lisbona"). */
const startsWithPlace = (title: string, query: string) => {
  const t = phrase(title)
  const q = phrase(query)
  const bare = q.replace(GEO_PREFIX, '')
  return t.startsWith(q) || (bare !== q && bare.length >= 3 && t.startsWith(bare))
}

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
  // TIFFs on Commons are almost always archival scans (manuscripts, engravings, old maps), not travel photos.
  if (!/^image\/(jpeg|webp)$/.test(info.mime)) return null
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

/** The languages a name may be written in: the app's own (the user's first) and English. */
const SEARCH_LANGS = ['it', 'es', 'en']

interface Article {
  lang: string
  /** Lead image of the article ("File:…") */
  file?: string
  /** Title of the same article on the English Wikipedia */
  enTitle?: string
  /** Wikidata item, e.g. Q597 */
  item?: string
}

/** The Wikipedia article about the place, if this language's Wikipedia has one under the typed name. */
async function wikipediaArticle(query: string, lang: string): Promise<Article | null> {
  const data = await api(`${lang}.wikipedia.org`, {
    generator: 'search',
    gsrsearch: query,
    gsrlimit: '3',
    prop: 'pageimages|langlinks|pageprops',
    piprop: 'name',
    lllang: 'en',
    ppprop: 'wikibase_item',
  })
  const pages = (data.query?.pages ?? []) as {
    title: string
    index: number
    pageimage?: string
    langlinks?: { title: string }[]
    pageprops?: { wikibase_item?: string }
  }[]
  // Only the article about the place itself — not "Treaty of Lisbon" or "Lisbon Airport".
  const article = pages.sort((a, b) => a.index - b.index).find((p) => startsWithPlace(p.title, query))
  if (!article) return null
  return {
    lang,
    file: article.pageimage ? `File:${article.pageimage.replace(/_/g, ' ')}` : undefined,
    enTitle: lang === 'en' ? article.title : article.langlinks?.[0]?.title,
    item: article.pageprops?.wikibase_item,
  }
}

/**
 * What Wikidata says about an item: whether it is somewhere on the map (coordinates, P625), which tells the city of
 * Porto from the Italian article about harbours, and its image (P18), a representative photo chosen once for every
 * language.
 */
async function wikidataPlace(item: string): Promise<{ located: boolean; file: string | null }> {
  const claim = async (property: 'P18' | 'P625') => {
    const url = new URL('https://www.wikidata.org/w/api.php')
    for (const [k, v] of Object.entries({ action: 'wbgetclaims', entity: item, property, format: 'json', origin: '*' })) url.searchParams.set(k, v)
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Wikidata ${res.status}`)
    const data = (await res.json()) as { claims?: Record<string, { mainsnak?: { datavalue?: { value?: unknown } } }[]> }
    return data.claims?.[property]?.[0]?.mainsnak?.datavalue?.value
  }
  const [coordinates, image] = await Promise.all([claim('P625'), claim('P18')])
  return { located: Boolean(coordinates), file: typeof image === 'string' ? `File:${image}` : null }
}

/** Lead image of an English Wikipedia article, by its exact title. */
async function englishLeadFile(title: string): Promise<string | null> {
  const data = await api('en.wikipedia.org', { titles: title, prop: 'pageimages', piprop: 'name', redirects: '1' })
  const page = (data.query?.pages ?? [])[0] as { pageimage?: string } | undefined
  return page?.pageimage ? `File:${page.pageimage.replace(/_/g, ' ')}` : null
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

// US states and Canadian provinces as they appear in Commons titles ("Lisbon, ON", "Lisbon NH town hall"): namesakes in
// North America, not the place in the guides. Case-sensitive on purpose.
const NORTH_AMERICA =
  /(^|[ ,(])(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|ON|QC|BC|AB|MB|SK|NS|NB|NL|PE)([ ,).]|$)/

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
    .filter((p) => isRelevant(p.title, qt) && (NORTH_AMERICA.test(query) || !NORTH_AMERICA.test(p.title)))
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
  const settled = <T>(results: PromiseSettledResult<T>[]) => results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : ((failed = true), [])))

  // The article in each language the name might be written in; the user's language first.
  const langs = [...new Set([lang, ...SEARCH_LANGS])]
  const candidates = settled(await Promise.allSettled(langs.map((l) => wikipediaArticle(query, l)))).filter((a): a is Article => a !== null)
  // Only articles about a place on the map: the same name can be a concept in another language ("porto" = harbour).
  const items = [...new Set(candidates.map((a) => a.item).filter((i): i is string => Boolean(i)))]
  const facts = new Map(
    settled(await Promise.allSettled(items.map(async (i) => [i, await wikidataPlace(i)] as const))),
  )
  const articles = candidates.filter((a) => a.item && facts.get(a.item)?.located)
  const enTitle = articles.find((a) => a.enTitle)?.enTitle
  const item = articles.find((a) => a.item)?.item
  const wikidata = item ? (facts.get(item)?.file ?? null) : null
  const [english] = settled(
    await Promise.allSettled([
      // The English article's lead image, unless the English Wikipedia was searched directly and already gave it.
      enTitle && !articles.some((a) => a.lang === 'en') ? englishLeadFile(enTitle) : null,
    ]),
  )
  const leadTitles = [...new Set([...articles.map((a) => a.file), wikidata, english].filter((t): t is string => Boolean(t)))]

  const found: WikiImage[] = []
  try {
    found.push(...(await commonsFiles(leadTitles.slice(0, 6))))
  } catch {
    failed = true
  }
  // Commons titles are mostly in English or the local language: the English name first, the typed one if still short.
  for (const name of [...new Set([enTitle, query].filter((n): n is string => Boolean(n)))]) {
    if (found.length >= 4) break
    try {
      found.push(...(await commonsSearch(name)))
    } catch {
      failed = true
    }
  }

  const unique = found.filter((img, i) => found.findIndex((o) => o.title === img.title) === i).slice(0, 8)
  // Don't cache an empty result caused by a network failure.
  if (!failed || unique.length > 0) cache.set(key, unique)
  return unique
}

/**
 * Smaller rendition of a Commons thumbnail for grids ("…/1280px-File.jpg" → "…/330px-File.jpg").
 * Wikimedia only serves standard widths (e.g. 250, 330, 500, 960, 1280); originals are returned as-is.
 */
export function sizedThumb(url: string, width: 250 | 330 | 500 | 960): string {
  return url.includes('/thumb/') ? url.replace(/\/\d+px-([^/]+)$/, `/${width}px-$1`) : url
}

const SRCSET_WIDTHS = [330, 500, 960, 1280]

/**
 * `srcset` for a Commons thumbnail ("…/960px-File.jpg"): the standard widths up to the one in the URL, so phones get a
 * smaller file and nothing is requested larger than what Commons already rendered. Undefined for anything else.
 */
export function commonsSrcSet(url: string): string | undefined {
  const match = /^https:\/\/(upload|thumb)\.wikimedia\.org\/.+\/thumb\/.+\/(\d+)px-[^/]+$/.exec(url)
  if (!match) return undefined
  const widths = SRCSET_WIDTHS.filter((width) => width <= Number(match[2]))
  if (widths.length < 2) return undefined
  return widths.map((width) => `${url.replace(/\/\d+px-([^/]+)$/, `/${width}px-$1`)} ${width}w`).join(', ')
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
