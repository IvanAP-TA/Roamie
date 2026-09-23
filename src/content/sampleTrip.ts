/**
 * The sample trip a new user can create to try Roamie with something already in it: four places from the guides
 * (with their photos), a few points and a reason so the wheel and the compare sheet have something to show, a
 * three-day plan for Lisbon, a checklist and a period to pick dates in. Everything is theirs to change or delete.
 */
import type { LanguageCode } from '@/i18n'

type Localized = Record<LanguageCode, string>

export const SAMPLE_PLACES = ['lisbon', 'valencia', 'budapest', 'krakow'] as const

/** Points the user starts with on each place, so the ranking and the wheel aren't flat. */
export const SAMPLE_POINTS: Partial<Record<(typeof SAMPLE_PLACES)[number], number>> = { lisbon: 4, budapest: 3, valencia: 2 }

export const SAMPLE_TRIP = {
  name: { it: 'Esempio · Weekend lungo in Europa', en: 'Sample · A long weekend in Europe', es: 'Ejemplo · Puente en Europa' } satisfies Localized,
  description: {
    it: 'Un viaggio di prova: dai i tuoi punti, gira la ruota, sfoglia l’itinerario. Puoi cambiarlo o eliminarlo quando vuoi.',
    en: 'A trip to play with: hand out your points, spin the wheel, browse the itinerary. Change it or delete it whenever you like.',
    es: 'Un viaje de prueba: reparte tus puntos, gira la ruleta, mira el itinerario. Cámbialo o elimínalo cuando quieras.',
  } satisfies Localized,
  reason: { it: 'Voli economici e tramonti dai miradouros', en: 'Cheap flights and sunsets from the miradouros', es: 'Vuelos baratos y atardeceres desde los miradouros' } satisfies Localized,
  length: 3,
}

interface SampleStop {
  time: string
  title: Localized
  description: Localized
  place: { name: string; lat: number; lng: number } | null
}

export const SAMPLE_DAYS: { title: Localized; stops: SampleStop[] }[] = [
  {
    title: { it: 'Alfama e i miradouros', en: 'Alfama and the viewpoints', es: 'Alfama y los miradores' },
    stops: [
      {
        time: '10:00',
        title: { it: 'Castello di São Jorge', en: 'São Jorge Castle', es: 'Castillo de San Jorge' },
        description: { it: 'Arrivate all’apertura per evitare la coda.', en: 'Get there at opening time to skip the queue.', es: 'Llegad a la apertura para evitar la cola.' },
        place: { name: 'Castelo de São Jorge', lat: 38.7139, lng: -9.1334 },
      },
      {
        time: '13:00',
        title: { it: 'Pranzo ad Alfama', en: 'Lunch in Alfama', es: 'Comida en Alfama' },
        description: { it: 'Sardine alla griglia in una tasca del quartiere.', en: 'Grilled sardines in a tiny tasca.', es: 'Sardinas a la brasa en una tasca del barrio.' },
        place: null,
      },
      {
        time: '19:30',
        title: { it: 'Tramonto al Miradouro da Senhora do Monte', en: 'Sunset at Senhora do Monte', es: 'Atardecer en Senhora do Monte' },
        description: { it: 'Il punto panoramico più alto della città.', en: 'The highest viewpoint in the city.', es: 'El mirador más alto de la ciudad.' },
        place: { name: 'Miradouro da Senhora do Monte', lat: 38.7194, lng: -9.1327 },
      },
    ],
  },
  {
    title: { it: 'Belém e i pastéis', en: 'Belém and pastéis', es: 'Belém y los pastéis' },
    stops: [
      {
        time: '09:30',
        title: { it: 'Monastero dos Jerónimos', en: 'Jerónimos Monastery', es: 'Monasterio de los Jerónimos' },
        description: { it: 'Biglietti online: si entra prima.', en: 'Buy tickets online to get in sooner.', es: 'Entradas online para entrar antes.' },
        place: { name: 'Mosteiro dos Jerónimos', lat: 38.6979, lng: -9.2068 },
      },
      {
        time: '11:30',
        title: { it: 'Pastéis de Belém', en: 'Pastéis de Belém', es: 'Pastéis de Belém' },
        description: { it: 'La fila scorre veloce, meglio mangiarli caldi.', en: 'The queue moves fast; eat them warm.', es: 'La cola avanza rápido; mejor comerlos calientes.' },
        place: { name: 'Pastéis de Belém', lat: 38.6975, lng: -9.2032 },
      },
      {
        time: '15:00',
        title: { it: 'Torre di Belém', en: 'Belém Tower', es: 'Torre de Belém' },
        description: { it: 'Passeggiata sul lungofiume fino al faro.', en: 'Walk along the river to the lighthouse.', es: 'Paseo junto al río hasta el faro.' },
        place: { name: 'Torre de Belém', lat: 38.6916, lng: -9.216 },
      },
    ],
  },
  {
    title: { it: 'Sintra in giornata', en: 'A day in Sintra', es: 'Un día en Sintra' },
    stops: [
      {
        time: '09:00',
        title: { it: 'Treno per Sintra dal Rossio', en: 'Train to Sintra from Rossio', es: 'Tren a Sintra desde Rossio' },
        description: { it: 'Circa 40 minuti, partenze ogni 20.', en: 'About 40 minutes, one every 20.', es: 'Unos 40 minutos, uno cada 20.' },
        place: { name: 'Estação do Rossio', lat: 38.7142, lng: -9.1409 },
      },
      {
        time: '11:00',
        title: { it: 'Palazzo da Pena', en: 'Pena Palace', es: 'Palacio da Pena' },
        description: { it: 'Prenotate l’orario d’ingresso.', en: 'Book an entry time.', es: 'Reservad la hora de entrada.' },
        place: { name: 'Palácio da Pena', lat: 38.7876, lng: -9.3906 },
      },
    ],
  },
]

export const SAMPLE_CHECKLIST: { kind: 'book' | 'pack'; title: Localized }[] = [
  { kind: 'book', title: { it: 'Voli per Lisbona', en: 'Flights to Lisbon', es: 'Vuelos a Lisboa' } },
  { kind: 'book', title: { it: 'Biglietti per il Palazzo da Pena', en: 'Tickets for Pena Palace', es: 'Entradas del Palacio da Pena' } },
  { kind: 'pack', title: { it: 'Scarpe comode per le salite', en: 'Comfy shoes for the hills', es: 'Zapatos cómodos para las cuestas' } },
]
