import type { LanguageCode } from '@/i18n'
import { LANDING_PATHS, landingLanguage } from '@/lib/seo'
import type { Mood } from '@/lib/types'

/**
 * Inspiration guides: ids, localized URLs, titles and descriptions. Small on purpose, because the landing
 * page, the footer and the language switcher import it. The guide bodies live in ./content.ts.
 */

export type Localized<T = string> = Record<LanguageCode, T>

export const GUIDE_BASE: Localized = { it: '/guide', en: '/en/guides', es: '/es/guias' }

/** Shown as the article date in JSON-LD. */
export const GUIDES_PUBLISHED = '2026-09-14'

export interface GuideMeta {
  id: string
  slug: Localized
  moods: Mood[]
  title: Localized
  description: Localized
}

export const GUIDES: GuideMeta[] = [
  {
    id: 'how-to',
    slug: { it: 'come-organizzare-viaggio-di-gruppo', en: 'how-to-plan-a-group-trip', es: 'como-organizar-viaje-en-grupo' },
    moods: [],
    title: {
      it: 'Come organizzare un viaggio di gruppo senza litigare',
      en: 'How to plan a group trip without falling out',
      es: 'Cómo organizar un viaje en grupo sin discutir',
    },
    description: {
      it: 'Budget, date, mete e compiti: un metodo in sei passi per decidere insieme il viaggio e arrivare alla partenza ancora amici.',
      en: 'Budget, dates, destinations and tasks: a six-step method to decide on a trip together and still be friends when you leave.',
      es: 'Presupuesto, fechas, destinos y tareas: un método en seis pasos para decidir el viaje juntos y seguir siendo amigos al salir.',
    },
  },
  {
    id: 'long-weekends',
    slug: { it: 'weekend-lunghi-europa-amici', en: 'long-weekends-europe-friends', es: 'escapadas-europa-amigos' },
    moods: ['culture', 'food_wine', 'nightlife'],
    title: {
      it: 'Weekend lunghi in Europa: 6 città da fare con gli amici',
      en: 'Long weekends in Europe: 6 cities to visit with friends',
      es: 'Puentes en Europa: 6 ciudades para ir con amigos',
    },
    description: {
      it: 'Voli brevi, centri da girare a piedi e serate insieme: sei città europee perfette per un ponte o un weekend lungo in gruppo.',
      en: 'Short flights, walkable centres and evenings out together: six European cities made for a long weekend with your group.',
      es: 'Vuelos cortos, centros para recorrer a pie y noches en grupo: seis ciudades europeas perfectas para un puente con amigos.',
    },
  },
  {
    id: 'budget',
    slug: { it: 'mete-economiche-viaggio-gruppo', en: 'cheap-group-trip-destinations', es: 'destinos-baratos-viaje-grupo' },
    moods: ['culture', 'food_wine', 'adventure'],
    title: {
      it: 'Viaggi di gruppo low cost: 6 mete dove il budget dura di più',
      en: 'Budget group trips: 6 destinations where your money goes further',
      es: 'Viajes en grupo low cost: 6 destinos donde el presupuesto rinde más',
    },
    description: {
      it: 'Dove dividere le spese conviene davvero: mete con alloggi, cibo e trasporti economici, ideali quando nel gruppo i budget sono diversi.',
      en: 'Places where splitting costs really pays off: affordable stays, food and transport, ideal when budgets in the group differ.',
      es: 'Lugares donde dividir gastos compensa de verdad: alojamiento, comida y transporte asequibles, ideales cuando en el grupo hay presupuestos distintos.',
    },
  },
  {
    id: 'summer-sea',
    slug: { it: 'mare-estate-gruppo-amici', en: 'summer-beach-trips-groups', es: 'playa-verano-grupo-amigos' },
    moods: ['relax', 'nature', 'nightlife'],
    title: {
      it: "Mare d'estate in gruppo: 6 mete tra spiagge e serate",
      en: 'Summer by the sea with friends: 6 beach destinations',
      es: 'Mar en verano con amigos: 6 destinos de playa',
    },
    description: {
      it: 'Isole, calette e paesi sul mare dove affittare una casa in tanti, tra giornate in spiaggia e cene all’aperto.',
      en: 'Islands, coves and seaside towns where a big group can rent a house, with beach days and dinners outdoors.',
      es: 'Islas, calas y pueblos costeros donde alquilar una casa entre muchos, con días de playa y cenas al aire libre.',
    },
  },
  {
    id: 'nature',
    slug: { it: 'trekking-natura-viaggio-gruppo', en: 'hiking-nature-group-trips', es: 'senderismo-naturaleza-viaje-grupo' },
    moods: ['nature', 'adventure'],
    title: {
      it: "Trekking e natura: 6 viaggi all'aria aperta per il gruppo",
      en: 'Hiking and nature: 6 outdoor trips for your group',
      es: 'Senderismo y naturaleza: 6 viajes al aire libre en grupo',
    },
    description: {
      it: 'Sentieri panoramici, fiordi e montagne da vivere insieme, con percorsi adatti anche a chi non è un escursionista esperto.',
      en: 'Scenic trails, fjords and mountains to enjoy together, with routes that suit less experienced hikers too.',
      es: 'Senderos panorámicos, fiordos y montañas para disfrutar juntos, con rutas aptas también para quien no es un gran senderista.',
    },
  },
  {
    id: 'food',
    slug: { it: 'viaggi-gastronomici-amici', en: 'food-trips-with-friends', es: 'viajes-gastronomicos-amigos' },
    moods: ['food_wine', 'culture'],
    title: {
      it: 'Viaggi gastronomici: 6 città da mangiare insieme',
      en: 'Food trips: 6 cities to eat your way through together',
      es: 'Viajes gastronómicos: 6 ciudades para comer juntos',
    },
    description: {
      it: 'Mercati, osterie e cucine da scoprire in compagnia: sei mete dove il programma della giornata ruota intorno alla tavola.',
      en: 'Markets, taverns and cuisines to discover as a group: six destinations where each day is planned around the table.',
      es: 'Mercados, tabernas y cocinas para descubrir en grupo: seis destinos donde el día gira en torno a la mesa.',
    },
  },
  {
    id: 'nightlife',
    slug: { it: 'citta-vita-notturna-europa', en: 'best-nightlife-cities-europe', es: 'ciudades-vida-nocturna-europa' },
    moods: ['nightlife', 'culture'],
    title: {
      it: 'Vita notturna: 6 città europee per fare festa con gli amici',
      en: 'Nightlife: 6 European cities to party in with friends',
      es: 'Vida nocturna: 6 ciudades europeas para salir de fiesta con amigos',
    },
    description: {
      it: "Club leggendari, bar sui tetti e quartieri che non dormono mai: le città giuste per un viaggio di gruppo che finisce all'alba.",
      en: 'Legendary clubs, rooftop bars and neighbourhoods that never sleep: the right cities for a group trip that ends at sunrise.',
      es: 'Clubes legendarios, bares en azoteas y barrios que nunca duermen: las ciudades ideales para un viaje en grupo que acaba al amanecer.',
    },
  },
  {
    id: 'winter',
    slug: { it: 'mete-invernali-gruppo-amici', en: 'winter-trips-for-groups', es: 'destinos-invierno-grupo-amigos' },
    moods: ['nature', 'relax', 'adventure'],
    title: {
      it: 'Mete invernali: 6 viaggi di gruppo tra neve, aurore e sole',
      en: 'Winter trips: 6 group getaways for snow, northern lights and sun',
      es: 'Destinos de invierno: 6 viajes en grupo entre nieve, auroras y sol',
    },
    description: {
      it: "Aurora boreale, piste, mercatini e isole dove l'inverno è mite: idee per un viaggio insieme nei mesi freddi.",
      en: 'Northern lights, ski slopes, Christmas markets and islands with mild winters: ideas for travelling together in the cold months.',
      es: 'Auroras boreales, pistas, mercadillos e islas con inviernos suaves: ideas para viajar juntos en los meses fríos.',
    },
  },
]

const LANGS = Object.keys(GUIDE_BASE) as LanguageCode[]

export const guidePath = (guide: GuideMeta, lang: LanguageCode) => `${GUIDE_BASE[lang]}/${guide.slug[lang]}`

export const findGuide = (lang: LanguageCode, slug: string | undefined) => GUIDES.find((g) => g.slug[lang] === slug) ?? null

/** Pages whose URL fixes the language: the landings, the guides index and the guides. */
export function pathLanguage(pathname: string): LanguageCode | null {
  return landingLanguage(pathname) ?? LANGS.find((l) => pathname === GUIDE_BASE[l] || pathname.startsWith(`${GUIDE_BASE[l]}/`)) ?? null
}

/** The same page in another language, or null when the page has one URL for every language. */
export function localizedPath(pathname: string, lang: LanguageCode): string | null {
  if (landingLanguage(pathname)) return LANDING_PATHS[lang]
  const from = pathLanguage(pathname)
  if (!from) return null
  const guide = findGuide(from, pathname.slice(GUIDE_BASE[from].length + 1))
  return guide ? guidePath(guide, lang) : GUIDE_BASE[lang]
}
