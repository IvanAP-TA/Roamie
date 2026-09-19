/**
 * "Trova la meta": what the model is asked and how its answers are checked, apart from the HTTP handler so tests can
 * run it. Everything the user picks is a button (moods, continent, budget…), so the prompt is built only from known
 * values: nothing typed reaches the model except place names it suggested itself.
 */

export const LANGS = ['it', 'en', 'es'] as const
export type Lang = (typeof LANGS)[number]

// Same moods as a trip's destinations (src/lib/types.ts).
export const MOODS = ['adventure', 'relax', 'nightlife', 'culture', 'nature', 'food_wine', 'family', 'romantic'] as const
export type Mood = (typeof MOODS)[number]

export const CONTINENTS = ['europe', 'asia', 'africa', 'northAmerica', 'southAmerica', 'oceania'] as const
export const LENGTHS = ['weekend', 'week', 'long'] as const
export const FAME = ['famous', 'balanced', 'niche'] as const
export const DISTANCES = ['near', 'medium', 'far'] as const
export const PACES = ['relaxed', 'balanced', 'intense'] as const

/** The longest itinerary the AI writes in one go: three weeks. */
export const MAX_DAYS = 21

export interface Criteria {
  moods: Mood[]
  continent: (typeof CONTINENTS)[number] | null
  /** 1 cheap, 2 mid-range, 3 expensive */
  budget: 1 | 2 | 3 | null
  month: number | null
  length: (typeof LENGTHS)[number] | null
  fame: (typeof FAME)[number] | null
  distance: (typeof DISTANCES)[number] | null
  pace: (typeof PACES)[number] | null
}

export interface SuggestInput {
  criteria: Criteria
  lang: Lang
  /** ISO code of the country flights leave from */
  origin: string | null
  /** Places already suggested, for "more ideas" */
  exclude: string[]
}

export interface Idea {
  name: string
  country: string
  countryCode: string
  why: string
  highlights: string[]
  moods: Mood[]
  budget: 1 | 2 | 3
}

export interface ItineraryInput {
  place: { name: string; country: string | null }
  days: number
  criteria: Pick<Criteria, 'moods' | 'budget' | 'month' | 'pace'>
  lang: Lang
}

export interface Stop {
  /** "HH:MM", or null */
  time: string | null
  title: string
  description: string
  /** A specific spot to find on the map ("Belém Tower"), or null */
  place: string | null
}

export interface Itinerary {
  days: { title: string; items: Stop[] }[]
}

export const clean = (text: string, max: number) => text.replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max)

const oneOf = <T extends string | number>(list: readonly T[], value: unknown): T | null => (list.includes(value as T) ? (value as T) : null)

function readCriteria(value: unknown): Criteria {
  const c = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
  const moods = Array.isArray(c.moods) ? [...new Set(c.moods.filter((m): m is Mood => oneOf(MOODS, m) !== null))].slice(0, 3) : []
  const month = typeof c.month === 'number' && Number.isInteger(c.month) && c.month >= 1 && c.month <= 12 ? c.month : null
  return {
    moods,
    continent: oneOf(CONTINENTS, c.continent),
    budget: oneOf([1, 2, 3] as const, c.budget),
    month,
    length: oneOf(LENGTHS, c.length),
    fame: oneOf(FAME, c.fame),
    distance: oneOf(DISTANCES, c.distance),
    pace: oneOf(PACES, c.pace),
  }
}

const readLang = (value: unknown): Lang => oneOf(LANGS, value) ?? 'en'

export function readSuggest(body: Record<string, unknown>): SuggestInput {
  const exclude = Array.isArray(body.exclude)
    ? body.exclude.filter((x): x is string => typeof x === 'string').map((x) => clean(x, 60)).filter(Boolean).slice(0, 12)
    : []
  return {
    criteria: readCriteria(body.criteria),
    lang: readLang(body.lang),
    origin: typeof body.origin === 'string' && /^[A-Z]{2}$/.test(body.origin) ? body.origin : null,
    exclude,
  }
}

export function readItinerary(body: Record<string, unknown>): ItineraryInput | null {
  const place = (body.place && typeof body.place === 'object' ? body.place : {}) as Record<string, unknown>
  const name = typeof place.name === 'string' ? clean(place.name, 80) : ''
  const days = typeof body.days === 'number' && Number.isInteger(body.days) && body.days >= 1 && body.days <= MAX_DAYS ? body.days : null
  if (!name || !days) return null
  const { moods, budget, month, pace } = readCriteria(body.criteria)
  return {
    place: { name, country: typeof place.country === 'string' && clean(place.country, 60) ? clean(place.country, 60) : null },
    days,
    criteria: { moods, budget, month, pace },
    lang: readLang(body.lang),
  }
}

export function suggestKey(input: SuggestInput): string {
  const c = input.criteria
  return [
    'suggest',
    input.lang,
    input.origin ?? '',
    [...c.moods].sort().join('+'),
    c.continent ?? '',
    c.budget ?? '',
    c.month ?? '',
    c.length ?? '',
    c.fame ?? '',
    c.distance ?? '',
    c.pace ?? '',
    ...input.exclude.map((x) => x.toLowerCase()).sort(),
  ].join('~')
}

export function itineraryKey(input: ItineraryInput): string {
  const c = input.criteria
  return [
    'itinerary',
    input.lang,
    `${input.place.name}|${input.place.country ?? ''}`.toLowerCase(),
    input.days,
    [...c.moods].sort().join('+'),
    c.budget ?? '',
    c.month ?? '',
    c.pace ?? '',
  ].join('~')
}

const LANGUAGE_NAME: Record<Lang, string> = { it: 'Italian', en: 'English', es: 'Spanish' }
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const MOOD_TEXT: Record<Mood, string> = {
  adventure: 'adventure and outdoor activities',
  relax: 'relaxing',
  nightlife: 'nightlife',
  culture: 'culture, history and art',
  nature: 'nature and landscapes',
  food_wine: 'food and wine',
  family: 'family-friendly',
  romantic: 'romantic',
}
const CONTINENT_TEXT = { europe: 'Europe', asia: 'Asia', africa: 'Africa', northAmerica: 'North or Central America and the Caribbean', southAmerica: 'South America', oceania: 'Oceania' }
const BUDGET_TEXT = { 1: 'cheap (low daily costs)', 2: 'mid-range', 3: 'upmarket, money is not the main concern' }
const LENGTH_TEXT = { weekend: 'a long weekend (2–3 days)', week: 'about a week', long: 'two weeks or more' }
const FAME_TEXT = {
  famous: 'well-known classics',
  balanced: 'a mix of known and less obvious places',
  niche: 'off the beaten track: little-known places most tourists skip, no obvious capitals or famous hotspots',
}
const DISTANCE_TEXT = { near: 'close to home (short flight or reachable overland)', medium: 'a medium-haul flight away', far: 'far away (long-haul)' }
const PACE_TEXT = { relaxed: 'relaxed, few things a day', balanced: 'balanced', intense: 'packed, see as much as possible' }

function describe(c: Partial<Criteria>, origin?: string | null): string[] {
  return [
    c.moods?.length ? `Mood: ${c.moods.map((m) => MOOD_TEXT[m]).join(', ')}.` : null,
    c.continent ? `Continent: ${CONTINENT_TEXT[c.continent]}.` : null,
    c.budget ? `Budget: ${BUDGET_TEXT[c.budget]}.` : null,
    c.month ? `Travel month: ${MONTHS[c.month - 1]}.` : null,
    c.length ? `Trip length: ${LENGTH_TEXT[c.length]}.` : null,
    c.fame ? `Kind of places: ${FAME_TEXT[c.fame]}.` : null,
    c.distance ? `Distance: ${DISTANCE_TEXT[c.distance]}.` : null,
    c.pace ? `Pace: ${PACE_TEXT[c.pace]}.` : null,
    origin ? `They travel from the country with ISO code ${origin}.` : null,
  ].filter((line): line is string => Boolean(line))
}

export function suggestMessages(input: SuggestInput) {
  const system = [
    'You suggest travel destinations to a group of friends planning a trip together.',
    `Write every text in ${LANGUAGE_NAME[input.lang]}.`,
    'Suggest exactly 3 destinations that fit what they asked for, as different from each other as possible (not three cities of the same country).',
    'A destination is a city, an island or a small region people travel to, never a whole country.',
    'name: the usual name of the place in the output language. country: the country name in the output language. countryCode: its ISO 3166-1 alpha-2 code.',
    'why: one or two sentences (at most 35 words) on why it fits them, concrete and specific. highlights: exactly 3 short things to do or see there (at most 6 words each).',
    `moods: 1 to 3 of ${MOODS.join(', ')}. budget: 1 cheap, 2 mid-range, 3 expensive.`,
    'Only suggest real places you are sure about. Reply with JSON only.',
  ].join('\n')
  const wishes = describe(input.criteria, input.origin)
  const user = [
    wishes.length ? wishes.join('\n') : 'No preferences: surprise them with great group destinations.',
    input.exclude.length ? `Do not suggest these again: ${input.exclude.join(', ')}.` : null,
  ]
    .filter(Boolean)
    .join('\n\n')
  return [
    { role: 'system' as const, content: system },
    { role: 'user' as const, content: user },
  ]
}

export function itineraryMessages(input: ItineraryInput) {
  const system = [
    'You plan day-by-day itineraries for groups of friends.',
    `Write every text in ${LANGUAGE_NAME[input.lang]}.`,
    // Long trips get fewer stops a day, so the whole plan fits in one answer.
    `Plan exactly ${input.days} day${input.days === 1 ? '' : 's'}, each with 3 to ${input.days > 10 ? 4 : 5} stops in a sensible order (nearby places together, meals included).`,
    input.days > 7 ? 'On a trip this long, include a few day trips to nearby places and some slower days.' : null,
    'Day title: at most 6 words, the theme of the day. Stop title: at most 8 words. description: one sentence, at most 20 words, with a practical tip.',
    'time: a 24-hour start time like "09:30", or an empty string when it does not matter.',
    'place: the exact name of the specific spot to find on a map (a monument, museum, beach, square, market, viewpoint), or an empty string for generic stops like "dinner in the old town".',
    'Only use real places you are sure exist. Reply with JSON only.',
  ]
    .filter(Boolean)
    .join('\n')
  const where = `${input.place.name}${input.place.country ? ` (${input.place.country})` : ''}`
  const user = [`Destination: ${where}.`, ...describe(input.criteria)].join('\n')
  return [
    { role: 'system' as const, content: system },
    { role: 'user' as const, content: user },
  ]
}

const text = (value: unknown, max: number) => (typeof value === 'string' && clean(value, max) ? clean(value, max) : null)

export const suggestSchema = {
  type: 'object',
  properties: {
    places: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          country: { type: 'string' },
          countryCode: { type: 'string' },
          why: { type: 'string' },
          highlights: { type: 'array', items: { type: 'string' } },
          moods: { type: 'array', items: { type: 'string', enum: [...MOODS] } },
          budget: { type: 'integer', enum: [1, 2, 3] },
        },
        required: ['name', 'country', 'countryCode', 'why', 'highlights', 'moods', 'budget'],
        additionalProperties: false,
      },
    },
  },
  required: ['places'],
  additionalProperties: false,
}

export const itinerarySchema = {
  type: 'object',
  properties: {
    days: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: { time: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' }, place: { type: 'string' } },
              required: ['time', 'title', 'description', 'place'],
              additionalProperties: false,
            },
          },
        },
        required: ['title', 'items'],
        additionalProperties: false,
      },
    },
  },
  required: ['days'],
  additionalProperties: false,
}

/** The model's suggestions as the app shows them; null unless there are at least 2 usable ones. */
export function parseIdeas(data: unknown): Idea[] | null {
  const places = (data as { places?: unknown } | null)?.places
  if (!Array.isArray(places)) return null
  const ideas: Idea[] = []
  for (const p of places.slice(0, 3)) {
    const v = (p ?? {}) as Record<string, unknown>
    const name = text(v.name, 80)
    const country = text(v.country, 60)
    const code = typeof v.countryCode === 'string' ? v.countryCode.trim().toUpperCase() : ''
    const why = text(v.why, 300)
    const highlights = (Array.isArray(v.highlights) ? v.highlights : []).map((h) => text(h, 60)).filter((h): h is string => Boolean(h)).slice(0, 3)
    if (!name || !country || !/^[A-Z]{2}$/.test(code) || !why) continue
    const moods = (Array.isArray(v.moods) ? v.moods : []).filter((m): m is Mood => oneOf(MOODS, m) !== null).slice(0, 3)
    ideas.push({ name, country, countryCode: code, why, highlights, moods: [...new Set(moods)], budget: oneOf([1, 2, 3] as const, v.budget) ?? 2 })
  }
  return ideas.length >= 2 ? ideas : null
}

/** The model's itinerary as the app shows it; null unless it has the days asked for, each with stops. */
export function parseItinerary(data: unknown, days: number): Itinerary | null {
  const list = (data as { days?: unknown } | null)?.days
  if (!Array.isArray(list) || list.length < days) return null
  const result: Itinerary['days'] = []
  for (const d of list.slice(0, days)) {
    const v = (d ?? {}) as Record<string, unknown>
    const items = (Array.isArray(v.items) ? v.items : [])
      .map((item): Stop | null => {
        const s = (item ?? {}) as Record<string, unknown>
        const title = text(s.title, 100)
        if (!title) return null
        const time = typeof s.time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s.time.trim()) ? s.time.trim() : null
        return { time, title, description: text(s.description, 240) ?? '', place: text(s.place, 100) }
      })
      .filter((s): s is Stop => s !== null)
      .slice(0, 8)
    if (items.length === 0) return null
    result.push({ title: text(v.title, 80) ?? '', items })
  }
  return { days: result }
}
