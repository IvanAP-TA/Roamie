/**
 * What the model is asked and how its answer is checked, kept apart from the HTTP handler so tests can run it.
 * Only public facts go in: place names and countries, the month, the trip's length, how many travel and the country
 * flights leave from. Nothing a member wrote.
 */

export const LANGS = ['it', 'en', 'es'] as const
export type Lang = (typeof LANGS)[number]

export const ASPECTS = ['cost', 'weather', 'food', 'nightlife', 'culture', 'nature', 'relax', 'gettingThere'] as const
export type Aspect = (typeof ASPECTS)[number]

export interface ComparePlace {
  name: string
  country: string | null
}

export interface CompareInput {
  places: ComparePlace[]
  lang: Lang
  /** 1–12, or null when the group hasn't picked a period */
  month: number | null
  days: number | null
  travellers: number | null
  /** ISO code of the country flights leave from */
  origin: string | null
}

export interface Score {
  score: number
  note: string
}

export interface PlaceVerdict {
  headline: string
  bestFor: string
  watchOut: string
  scores: Record<Aspect, Score>
}

export interface Comparison {
  summary: string
  places: PlaceVerdict[]
  picks: { if: string; place: number }[]
}

// Control characters are exactly what this strips, from text that ends up in a prompt.
// oxlint-disable-next-line no-control-regex
const clean = (text: string, max: number) => text.replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max)

/** Validates and trims the request body; null when it isn't a usable comparison. */
export function readInput(body: unknown): CompareInput | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  if (!Array.isArray(b.places) || b.places.length < 2 || b.places.length > 3) return null
  const places: ComparePlace[] = []
  for (const p of b.places as unknown[]) {
    if (!p || typeof p !== 'object') return null
    const { name, country } = p as Record<string, unknown>
    if (typeof name !== 'string' || !clean(name, 80)) return null
    places.push({ name: clean(name, 80), country: typeof country === 'string' && clean(country, 60) ? clean(country, 60) : null })
  }
  const lang = LANGS.includes(b.lang as Lang) ? (b.lang as Lang) : 'en'
  const int = (value: unknown, min: number, max: number) =>
    typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max ? value : null
  return {
    places,
    lang,
    month: int(b.month, 1, 12),
    days: int(b.days, 1, 60),
    travellers: int(b.travellers, 1, 50),
    origin: typeof b.origin === 'string' && /^[A-Z]{2}$/.test(b.origin) ? b.origin : null,
  }
}

/** Same places (in any order), month, length, group size, origin and language → same answer. */
export function cacheKey(input: CompareInput): string {
  const places = input.places.map((p) => `${p.name}|${p.country ?? ''}`.toLowerCase()).sort()
  const size = input.travellers == null ? '' : input.travellers <= 2 ? '2' : input.travellers <= 6 ? '6' : 'many'
  const length = input.days == null ? '' : input.days <= 3 ? 'weekend' : input.days <= 8 ? 'week' : 'long'
  return [input.lang, input.month ?? '', length, size, input.origin ?? '', ...places].join('~')
}

const LANGUAGE_NAME: Record<Lang, string> = { it: 'Italian', en: 'English', es: 'Spanish' }
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export function buildMessages(input: CompareInput): { role: 'system' | 'user'; content: string }[] {
  const letters = input.places.map((p, i) => `${i + 1}. ${p.name}${p.country ? ` (${p.country})` : ''}`)
  const context = [
    input.month ? `Travel month: ${MONTHS[input.month - 1]}.` : 'Travel month: not decided yet (judge the weather on the best season).',
    input.days ? `Trip length: ${input.days} days.` : null,
    input.travellers ? `Group of ${input.travellers} friends.` : 'A group of friends.',
    input.origin ? `They fly from the country with ISO code ${input.origin}.` : null,
  ].filter(Boolean)

  const system = [
    'You help a group of friends choose between travel destinations. Compare them honestly and concretely, as a well-travelled friend would.',
    `Write every text in ${LANGUAGE_NAME[input.lang]}.`,
    'Scores go from 1 (poor) to 5 (excellent) and are relative to the other places in the comparison: use the whole range, do not give the same score to all.',
    'For "cost" a high score means cheap (daily spend plus flights from their country); for "gettingThere" a high score means easy and fast to reach from their country.',
    'For "weather" judge the travel month if given. For "relax" judge how easy it is to slow down (beaches, spas, calm).',
    'Each note is at most 12 words and says something specific to that place (a dish, a neighbourhood, a price, a temperature), never generic praise.',
    'headline: at most 8 words. bestFor and watchOut: one short sentence each. summary: 2 or 3 sentences on the real trade-off, without declaring a single winner.',
    'picks: 2 or 3 entries of the form "if you want X" with the place number (1-based) that fits best; different places where it makes sense.',
    'If you do not know a place, say so in its notes rather than inventing facts.',
    'Reply with JSON only.',
  ].join('\n')

  return [
    { role: 'system', content: system },
    { role: 'user', content: `Places:\n${letters.join('\n')}\n\n${context.join('\n')}` },
  ]
}

const scoreSchema = {
  type: 'object',
  properties: { score: { type: 'integer', minimum: 1, maximum: 5 }, note: { type: 'string' } },
  required: ['score', 'note'],
  additionalProperties: false,
}

export const responseSchema = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    places: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          headline: { type: 'string' },
          bestFor: { type: 'string' },
          watchOut: { type: 'string' },
          scores: {
            type: 'object',
            properties: Object.fromEntries(ASPECTS.map((a) => [a, scoreSchema])),
            required: [...ASPECTS],
            additionalProperties: false,
          },
        },
        required: ['headline', 'bestFor', 'watchOut', 'scores'],
        additionalProperties: false,
      },
    },
    picks: {
      type: 'array',
      items: {
        type: 'object',
        properties: { if: { type: 'string' }, place: { type: 'integer' } },
        required: ['if', 'place'],
        additionalProperties: false,
      },
    },
  },
  required: ['summary', 'places', 'picks'],
  additionalProperties: false,
}

/** Checks the model's JSON against what the app shows; null when it doesn't fit (wrong count, missing scores…). */
export function parseComparison(raw: string, count: number): Comparison | null {
  let data: unknown
  try {
    data = JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, ''))
  } catch {
    return null
  }
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  const text = (value: unknown, max: number) => (typeof value === 'string' && clean(value, max) ? clean(value, max) : null)
  const summary = text(d.summary, 600)
  if (!summary || !Array.isArray(d.places) || d.places.length !== count) return null

  const places: PlaceVerdict[] = []
  for (const p of d.places as unknown[]) {
    if (!p || typeof p !== 'object') return null
    const v = p as Record<string, unknown>
    const headline = text(v.headline, 90)
    const bestFor = text(v.bestFor, 200)
    const watchOut = text(v.watchOut, 200)
    if (!headline || !bestFor || !watchOut || !v.scores || typeof v.scores !== 'object') return null
    const scores = {} as Record<Aspect, Score>
    for (const aspect of ASPECTS) {
      const s = (v.scores as Record<string, unknown>)[aspect] as Record<string, unknown> | undefined
      const score = typeof s?.score === 'number' ? Math.round(s.score) : NaN
      const note = text(s?.note, 140)
      if (!(score >= 1 && score <= 5) || !note) return null
      scores[aspect] = { score, note }
    }
    places.push({ headline, bestFor, watchOut, scores })
  }

  const picks = (Array.isArray(d.picks) ? (d.picks as unknown[]) : [])
    .map((p) => {
      const v = (p ?? {}) as Record<string, unknown>
      // Models sometimes count from 0: anything outside 1..count is dropped rather than guessed.
      return { if: text(v.if, 120), place: typeof v.place === 'number' ? v.place - 1 : -1 }
    })
    .filter((p): p is { if: string; place: number } => Boolean(p.if) && Number.isInteger(p.place) && p.place >= 0 && p.place < count)
    .slice(0, 3)

  return { summary, places, picks }
}
