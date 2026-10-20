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
  /** Name of the trip created from the guide's places ("Crea il viaggio con queste mete") */
  tripName?: Localized
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
    tripName: { it: 'Weekend lungo in Europa', en: 'Long weekend in Europe', es: 'Puente en Europa' },
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
    tripName: { it: 'Viaggio low cost', en: 'Budget group trip', es: 'Viaje low cost' },
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
    tripName: { it: "Mare d'estate", en: 'Summer by the sea', es: 'Mar en verano' },
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
    tripName: { it: 'Trekking e natura', en: 'Hiking and nature', es: 'Senderismo y naturaleza' },
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
    tripName: { it: 'Viaggio gastronomico', en: 'Food trip', es: 'Viaje gastronómico' },
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
    tripName: { it: 'Viaggio di festa', en: 'Party trip', es: 'Viaje de fiesta' },
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
    tripName: { it: "Viaggio d'inverno", en: 'Winter trip', es: 'Viaje de invierno' },
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
  {
    id: 'bachelor',
    slug: { it: 'addio-al-celibato-nubilato-dove-andare', en: 'bachelor-bachelorette-party-destinations', es: 'despedida-de-soltero-destinos' },
    tripName: { it: 'Addio al celibato/nubilato', en: 'Bachelor/bachelorette party', es: 'Despedida de soltero/a' },
    moods: ['nightlife', 'relax', 'adventure'],
    title: {
      it: 'Addio al celibato e al nubilato: 6 mete per festeggiare in gruppo',
      en: 'Bachelor and bachelorette parties: 6 destinations to celebrate as a group',
      es: 'Despedidas de soltero y soltera: 6 destinos para celebrarlo en grupo',
    },
    description: {
      it: 'Città economiche per fare festa, isole con boat party e ville con piscina: mete per un addio al celibato o al nubilato che piaccia a tutti.',
      en: 'Cheap party cities, islands with boat parties and villas with pools: destinations for a bachelor or bachelorette party that everyone will enjoy.',
      es: 'Ciudades baratas para salir de fiesta, islas con fiestas en barco y villas con piscina: destinos para una despedida que guste a todos.',
    },
  },
  {
    id: 'graduation',
    slug: { it: 'viaggio-di-maturita-mete', en: 'graduation-trip-destinations', es: 'viaje-fin-de-curso-destinos' },
    tripName: { it: 'Viaggio di maturità', en: 'Graduation trip', es: 'Viaje de fin de curso' },
    moods: ['nightlife', 'relax'],
    title: {
      it: 'Viaggio di maturità: 6 mete per festeggiare il diploma',
      en: 'Graduation trips: 6 destinations to celebrate finishing school',
      es: 'Viaje de fin de curso: 6 destinos para celebrar la graduación',
    },
    description: {
      it: 'Isole greche, Costa Brava, Croazia e Baleari: le mete più amate per il viaggio dopo gli esami, con consigli su budget, periodo e documenti.',
      en: 'Greek islands, the Costa Brava, Croatia and the Balearics: favourite places for the trip after exams, with tips on budget, timing and documents.',
      es: 'Islas griegas, Costa Brava, Croacia y Baleares: los destinos favoritos para el viaje tras los exámenes, con consejos de presupuesto, fechas y papeles.',
    },
  },
  {
    id: 'students',
    slug: { it: 'weekend-low-cost-studenti-coinquilini', en: 'cheap-weekends-students-flatmates', es: 'escapadas-baratas-estudiantes' },
    tripName: { it: 'Weekend tra coinquilini', en: 'Flatmates’ weekend', es: 'Escapada entre compañeros' },
    moods: ['culture', 'food_wine', 'nightlife'],
    title: {
      it: 'Weekend low cost tra studenti e coinquilini: 6 città',
      en: 'Cheap weekends for students and flatmates: 6 cities',
      es: 'Escapadas baratas para estudiantes y compañeros de piso: 6 ciudades',
    },
    description: {
      it: 'Città universitarie con voli low cost, tapas gratis e birra economica: idee per un weekend tra coinquilini, compagni di corso o amici dell’Erasmus.',
      en: 'University cities with low-cost flights, free tapas and cheap beer: ideas for a weekend with flatmates, classmates or Erasmus friends.',
      es: 'Ciudades universitarias con vuelos low cost, tapas gratis y cerveza barata: ideas para una escapada con compañeros de piso, de clase o del Erasmus.',
    },
  },
  {
    id: 'couples',
    slug: { it: 'viaggio-tra-coppie-di-amici', en: 'trips-for-couples-with-friends', es: 'viaje-entre-parejas-de-amigos' },
    tripName: { it: 'Viaggio tra coppie', en: 'Couples’ trip', es: 'Viaje entre parejas' },
    moods: ['romantic', 'food_wine', 'relax'],
    title: {
      it: 'Viaggio tra coppie di amici: 6 mete da vivere insieme',
      en: 'Trips for couples travelling with friends: 6 destinations',
      es: 'Viaje entre parejas de amigos: 6 destinos para disfrutar juntos',
    },
    description: {
      it: 'Vigneti, laghi, isole e borghi dove affittare una casa in più coppie: mete con buona tavola, gite in giornata e spazio per tutti.',
      en: 'Vineyards, lakes, islands and villages where several couples can share a house: places with great food, day trips and room for everyone.',
      es: 'Viñedos, lagos, islas y pueblos donde alquilar una casa entre varias parejas: destinos con buena mesa, excursiones y espacio para todos.',
    },
  },
  {
    id: 'choose-together',
    slug: { it: 'come-decidere-meta-viaggio-gruppo', en: 'how-to-choose-group-trip-destination', es: 'como-decidir-destino-viaje-grupo' },
    moods: [],
    title: {
      it: 'Come decidere la meta in gruppo: 5 metodi a confronto',
      en: 'How to choose a destination as a group: 5 methods compared',
      es: 'Cómo decidir el destino en grupo: 5 métodos comparados',
    },
    description: {
      it: 'Sondaggio su WhatsApp, documento condiviso, app di itinerario, decide uno solo o voto a punti: pro e contro di ogni metodo e quando usarlo.',
      en: 'A WhatsApp poll, a shared doc, an itinerary app, one person decides or points voting: the pros and cons of each method and when to use it.',
      es: 'Encuesta de WhatsApp, documento compartido, app de itinerarios, decide uno solo o votación por puntos: pros y contras de cada método y cuándo usarlo.',
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
