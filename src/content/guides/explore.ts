import type { LanguageCode } from '@/i18n'
import type { Mood } from '@/lib/types'
import { GUIDE_CONTENT, type GuidePlace } from './content'
import { GUIDE_BASE, GUIDES, type Localized } from './meta'
import { MONTHS, monthName, monthPath, monthSlug, slugify } from './months'

export { MONTHS, monthName, monthPath, monthSlug, slugify }

/**
 * Pages built from the guides' places, for the searches people actually make: "where to go in November with friends"
 * (one page per month) and "Lisbon or Porto?" (one page per pair of places from the same guide). They live under the
 * guides' URLs (/guide/dove-andare-a-novembre, /guide/lisbona-o-porto), so the guide route resolves them too.
 * Imported only by the guide pages (their lazy chunk) and the prerenderer: it pulls in the guides' content.
 */

/** A place as it appears across the guides: its first guide's text, and every guide it is in. */
export interface ExplorePlace extends GuidePlace {
  guides: string[]
}

export const EXPLORE_PLACES: ExplorePlace[] = (() => {
  const byKey = new Map<string, ExplorePlace>()
  for (const guide of GUIDES) {
    for (const place of GUIDE_CONTENT[guide.id]?.places ?? []) {
      const known = byKey.get(place.key)
      if (known) known.guides.push(guide.id)
      else byKey.set(place.key, { ...place, guides: [guide.id] })
    }
  }
  return [...byKey.values()]
})()

/** The places at their best in a month: the most seasonal first (a short season is the better tip), then by name. */
export function placesForMonth(month: number): ExplorePlace[] {
  return EXPLORE_PLACES.filter((p) => p.months.includes(month)).sort((a, b) => a.months.length - b.months.length || a.name.en.localeCompare(b.name.en))
}

export interface Pair {
  a: ExplorePlace
  b: ExplorePlace
  /** The guide both places come from */
  guide: string
}

/** Every pair of places from the same guide, each once, in a stable order (by key). */
export const PAIRS: Pair[] = (() => {
  const seen = new Map<string, Pair>()
  const byKey = new Map(EXPLORE_PLACES.map((p) => [p.key, p]))
  for (const guide of GUIDES) {
    const keys = (GUIDE_CONTENT[guide.id]?.places ?? []).map((p) => p.key)
    for (let i = 0; i < keys.length; i++) {
      for (let j = i + 1; j < keys.length; j++) {
        const [first, second] = [keys[i], keys[j]].sort()
        const id = `${first}+${second}`
        if (!seen.has(id)) seen.set(id, { a: byKey.get(first)!, b: byKey.get(second)!, guide: guide.id })
      }
    }
  }
  return [...seen.values()]
})()

const OR: Localized = { it: 'o', en: 'or', es: 'o' }

export const pairSlug = (pair: Pair, lang: LanguageCode) => `${slugify(pair.a.name[lang])}-${OR[lang]}-${slugify(pair.b.name[lang])}`
export const pairPath = (pair: Pair, lang: LanguageCode) => `${GUIDE_BASE[lang]}/${pairSlug(pair, lang)}`

/** Other pairs with one of these two places, for the "more comparisons" links. */
export const relatedPairs = (pair: Pair, limit = 6) =>
  PAIRS.filter((p) => p !== pair && [p.a.key, p.b.key].some((k) => k === pair.a.key || k === pair.b.key)).slice(0, limit)

/** The pairs from one guide, for the links at the end of that guide. */
export const guidePairs = (guideId: string) => PAIRS.filter((p) => p.guide === guideId)

export type ExploreTarget = { kind: 'month'; month: number } | { kind: 'pair'; pair: Pair }

const SLUGS: Localized<Map<string, ExploreTarget>> = { it: new Map(), en: new Map(), es: new Map() }
for (const lang of Object.keys(SLUGS) as LanguageCode[]) {
  for (const month of MONTHS) SLUGS[lang].set(monthSlug(month, lang), { kind: 'month', month })
  for (const pair of PAIRS) SLUGS[lang].set(pairSlug(pair, lang), { kind: 'pair', pair })
}

/** The month or comparison page behind a slug under the guides, if any. */
export const findExplore = (lang: LanguageCode, slug: string | undefined): ExploreTarget | null => (slug ? (SLUGS[lang].get(slug) ?? null) : null)

export const explorePath = (target: ExploreTarget, lang: LanguageCode) => (target.kind === 'month' ? monthPath(target.month, lang) : pairPath(target.pair, lang))

// ── Words for the pages ─────────────────────────────────────────────────────────────────────────────────────────

type Season = 'winter' | 'spring' | 'summer' | 'autumn'
const SEASON: Record<number, Season> = { 12: 'winter', 1: 'winter', 2: 'winter', 3: 'spring', 4: 'spring', 5: 'spring', 6: 'summer', 7: 'summer', 8: 'summer', 9: 'autumn', 10: 'autumn', 11: 'autumn' }

const SEASON_TEXT: Record<Season, Localized> = {
  winter: {
    it: 'In inverno il gruppo ha due strade: inseguire il sole dove il freddo non arriva, oppure abbracciarlo tra mercatini, terme, neve e cene lunghe. Sono anche i mesi in cui voli e alloggi costano meno, fuori dalle feste.',
    en: 'In winter a group has two options: chase the sun where the cold never arrives, or embrace it with markets, thermal baths, snow and long dinners. Outside the holidays, these are also the months when flights and stays cost less.',
    es: 'En invierno el grupo tiene dos caminos: perseguir el sol donde el frío no llega, o abrazarlo entre mercadillos, termas, nieve y cenas largas. Fuera de las fiestas, también son los meses en que vuelos y alojamientos cuestan menos.',
  },
  spring: {
    it: 'La primavera è il momento migliore per le città e per camminare: giornate lunghe, temperature gentili e meno folla che d’estate. È anche la stagione dei ponti, perfetta per un weekend lungo tutti insieme.',
    en: 'Spring is the best time for cities and for walking: long days, mild temperatures and fewer crowds than in summer. It is also the season of long weekends, made for a trip all together.',
    es: 'La primavera es el mejor momento para las ciudades y para caminar: días largos, temperaturas suaves y menos gente que en verano. También es la temporada de puentes, perfecta para una escapada todos juntos.',
  },
  summer: {
    it: 'D’estate si cercano mare, natura e serate all’aperto. Conviene decidere presto: in alta stagione i prezzi salgono e gli alloggi per gruppi finiscono prima, quindi meglio scegliere la meta con qualche mese d’anticipo.',
    en: 'In summer it is all about the sea, nature and evenings outdoors. Decide early: in high season prices go up and group-sized stays sell out first, so pick the destination a few months ahead.',
    es: 'En verano se busca mar, naturaleza y noches al aire libre. Conviene decidir pronto: en temporada alta los precios suben y los alojamientos para grupos se acaban antes, así que mejor elegir el destino con unos meses de antelación.',
  },
  autumn: {
    it: 'L’autunno è la stagione più sottovalutata: il caldo cala, i turisti diminuiscono e tornano vendemmie, foliage e città vivibili. Molte mete estive danno il meglio proprio adesso, a prezzi più bassi.',
    en: 'Autumn is the most underrated season: the heat eases, the crowds thin out and harvests, autumn colours and liveable cities return. Many summer destinations are at their best right now, for less.',
    es: 'El otoño es la temporada más infravalorada: baja el calor, hay menos turistas y vuelven las vendimias, los colores del otoño y las ciudades tranquilas. Muchos destinos de verano dan lo mejor justo ahora, a precios más bajos.',
  },
}

export const EXPLORE_COPY = {
  monthTitle: { it: (m: string) => `Dove andare a ${m} con gli amici`, en: (m: string) => `Where to go in ${m} with friends`, es: (m: string) => `Dónde ir en ${m} con amigos` } satisfies Localized<(m: string) => string>,
  monthEyebrow: { it: 'Mete per mese', en: 'Places by month', es: 'Destinos por mes' } satisfies Localized,
  monthLead: {
    it: (m: string, n: number) => `${n} mete che a ${m} danno il meglio, scelte dalle nostre guide per i viaggi di gruppo.`,
    en: (m: string, n: number) => `${n} places at their best in ${m}, picked from our guides for group trips.`,
    es: (m: string, n: number) => `${n} destinos que en ${m} dan lo mejor de sí, elegidos de nuestras guías para viajes en grupo.`,
  } satisfies Localized<(m: string, n: number) => string>,
  monthDescription: {
    it: (m: string, n: number) => `${n} idee per un viaggio con gli amici a ${m}: periodo giusto, budget e cosa fare. Proponetele al gruppo e decidete insieme su Roamie.`,
    en: (m: string, n: number) => `${n} ideas for a trip with friends in ${m}: the right season, budget and what to do. Put them to your group and decide together on Roamie.`,
    es: (m: string, n: number) => `${n} ideas para un viaje con amigos en ${m}: la época adecuada, presupuesto y qué hacer. Proponedlas al grupo y decidid juntos en Roamie.`,
  } satisfies Localized<(m: string, n: number) => string>,
  otherMonths: { it: 'Altri mesi', en: 'Other months', es: 'Otros meses' } satisfies Localized,
  season: (month: number, lang: LanguageCode) => SEASON_TEXT[SEASON[month]][lang],

  pairTitle: {
    it: (a: string, b: string) => `${a} o ${b}? Quale scegliere per un viaggio di gruppo`,
    en: (a: string, b: string) => `${a} or ${b}? Which to choose for a group trip`,
    es: (a: string, b: string) => `¿${a} o ${b}? Cuál elegir para un viaje en grupo`,
  } satisfies Localized<(a: string, b: string) => string>,
  pairEyebrow: { it: 'Confronto', en: 'Comparison', es: 'Comparación' } satisfies Localized,
  pairDescription: {
    it: (a: string, b: string) => `${a} o ${b}: budget, periodo migliore e atmosfera a confronto, per decidere con il gruppo dove andare.`,
    en: (a: string, b: string) => `${a} or ${b}: budget, best time and vibe side by side, to decide with your group where to go.`,
    es: (a: string, b: string) => `${a} o ${b}: presupuesto, mejor época y ambiente frente a frente, para decidir con el grupo adónde ir.`,
  } satisfies Localized<(a: string, b: string) => string>,
  rows: {
    country: { it: 'Paese', en: 'Country', es: 'País' },
    budget: { it: 'Budget', en: 'Budget', es: 'Presupuesto' },
    when: { it: 'Periodo migliore', en: 'Best time', es: 'Mejor época' },
    vibe: { it: 'Atmosfera', en: 'Vibe', es: 'Ambiente' },
  } satisfies Record<string, Localized>,
  verdictTitle: { it: 'Quale scegliere?', en: 'Which one?', es: '¿Cuál elegir?' } satisfies Localized,
  stillUndecided: {
    it: 'Ancora divisi? Mettete entrambe in un viaggio su Roamie: ognuno dà i suoi punti e, se serve, decide la ruota.',
    en: 'Still split? Put both in a trip on Roamie: everyone gives their points and, if needed, the wheel decides.',
    es: '¿Seguís divididos? Poned los dos en un viaje en Roamie: cada uno da sus puntos y, si hace falta, decide la ruleta.',
  } satisfies Localized,
  moreComparisons: { it: 'Altri confronti', en: 'More comparisons', es: 'Más comparaciones' } satisfies Localized,
  inGuide: { it: 'Dalla guida', en: 'From the guide', es: 'De la guía' } satisfies Localized,
}

const MOOD_WORD: Localized<Partial<Record<Mood, string>>> = {
  it: { culture: 'arte e cultura', food_wine: 'buon cibo e vino', nightlife: 'la vita notturna', relax: 'il relax', adventure: "l'avventura", nature: 'la natura', family: 'una vacanza in famiglia', romantic: 'un viaggio romantico' },
  en: { culture: 'art and culture', food_wine: 'good food and wine', nightlife: 'nightlife', relax: 'relaxing', adventure: 'adventure', nature: 'nature', family: 'a family holiday', romantic: 'a romantic trip' },
  es: { culture: 'el arte y la cultura', food_wine: 'la buena comida y el vino', nightlife: 'la vida nocturna', relax: 'el relax', adventure: 'la aventura', nature: 'la naturaleza', family: 'unas vacaciones en familia', romantic: 'un viaje romántico' },
}

const AND: Localized = { it: ' e ', en: ' and ', es: ' y ' }
const CHEAPER: Localized = { it: ' e volete spendere meno', en: ' and want to spend less', es: ' y queréis gastar menos' }

/**
 * One line per place: when it's the better pick, from what sets it apart from the other one (its own moods, a lower
 * budget) and its season. Built only from the guides' facts.
 */
export function verdict(place: ExplorePlace, other: ExplorePlace, lang: LanguageCode, monthLabel: (months: number[]) => string): string {
  const own = place.moods.filter((m) => !other.moods.includes(m))
  const moods = (own.length ? own : place.moods).slice(0, 2).map((m) => MOOD_WORD[lang][m]).filter(Boolean).join(AND[lang])
  const cheaper = place.budget < other.budget ? CHEAPER[lang] : ''
  const when = monthLabel(place.months)
  const name = place.name[lang]
  if (lang === 'it') return `Scegliete ${name} se il gruppo cerca ${moods}${cheaper}. Il periodo migliore è ${when}.`
  if (lang === 'es') return `Elegid ${name} si el grupo busca ${moods}${cheaper}. La mejor época es ${when}.`
  return `Pick ${name} if your group is after ${moods}${cheaper}. The best time to go is ${when}.`
}
