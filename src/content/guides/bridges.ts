/**
 * Italy's long weekends ("ponti"), for the searches Italians make every year: "dove andare per il ponte del 25
 * aprile". Italian only: the holidays are Italian. Each page lists the guides' places at their best that month and
 * close enough for three or four days (explore.ts), and says how this year's ponte falls.
 */

export interface Bridge {
  id: string
  slug: string
  /** "del 25 aprile", "dell'Immacolata": what follows "il ponte" */
  of: string
  /** The day off itself, in a given year (month 1–12) */
  date: (year: number) => { month: number; day: number }
  intro: string
}

/** Easter Sunday (anonymous Gregorian algorithm). */
export function easter(year: number): { month: number; day: number } {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  return { month, day: ((h + l - 7 * m + 114) % 31) + 1 }
}

const fixed = (month: number, day: number) => () => ({ month, day })

export const BRIDGES: Bridge[] = [
  {
    id: 'epifania',
    slug: 'ponte-dell-epifania',
    of: "dell'Epifania",
    date: fixed(1, 6),
    intro:
      "L'ultimo respiro delle feste: pochi giorni, prezzi che scendono dopo Capodanno e città ancora illuminate. Bene per una capitale vicina o per la neve.",
  },
  {
    id: 'pasqua',
    slug: 'ponte-di-pasqua',
    of: 'di Pasqua',
    date: (year) => {
      const sunday = easter(year)
      const monday = new Date(Date.UTC(year, sunday.month - 1, sunday.day + 1))
      return { month: monday.getUTCMonth() + 1, day: monday.getUTCDate() }
    },
    intro:
      'Pasqua e Pasquetta fanno un weekend lungo senza ferie. È la prima vera fuga di primavera: giornate lunghe, temperature gentili, ma anche tanti italiani in viaggio, quindi meglio prenotare presto.',
  },
  {
    id: '25-aprile',
    slug: 'ponte-del-25-aprile',
    of: 'del 25 aprile',
    date: fixed(4, 25),
    intro:
      'Il primo ponte di primavera, spesso vicino a Pasqua o al 1° maggio: con qualche giorno di ferie messo bene si arriva a una settimana. Ideale per le città e per camminare prima del caldo.',
  },
  {
    id: '1-maggio',
    slug: 'ponte-del-1-maggio',
    of: 'del 1° maggio',
    date: fixed(5, 1),
    intro: 'Maggio è il mese migliore per molte mete del Mediterraneo: mare che inizia a scaldarsi, città vivibili e prezzi più bassi di giugno.',
  },
  {
    id: '2-giugno',
    slug: 'ponte-del-2-giugno',
    of: 'del 2 giugno',
    date: fixed(6, 2),
    intro: "Il ponte che apre l'estate: prime giornate di mare, isole prima della folla di luglio e serate all'aperto.",
  },
  {
    id: 'ferragosto',
    slug: 'ponte-di-ferragosto',
    of: 'di Ferragosto',
    date: fixed(8, 15),
    intro:
      "La settimana più piena e più cara dell'anno. Per un gruppo conviene decidere con mesi d'anticipo, o cercare mete meno ovvie dove agosto è ancora tranquillo.",
  },
  {
    id: 'ognissanti',
    slug: 'ponte-di-ognissanti',
    of: 'di Ognissanti',
    date: fixed(11, 1),
    intro: "Il ponte d'autunno: foliage, vendemmie finite, città senza turisti e ultimi giorni di sole al sud. Voli e alloggi costano meno che in primavera.",
  },
  {
    id: 'immacolata',
    slug: 'ponte-dell-immacolata',
    of: "dell'Immacolata",
    date: fixed(12, 8),
    intro:
      "Mercatini di Natale, terme e cene lunghe, oppure il sole dove l'inverno non arriva. Uno dei ponti più amati: i voli del weekend si riempiono presto.",
  },
]

const WEEKDAYS = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato']
const MONTH_NAMES = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre']

/** The next time this holiday comes (today counts), with the weekday it falls on. */
export function nextBridgeDate(bridge: Bridge, today: Date): { year: number; month: number; day: number; weekday: number } {
  const startOfToday = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  for (const year of [today.getFullYear(), today.getFullYear() + 1]) {
    const { month, day } = bridge.date(year)
    const time = Date.UTC(year, month - 1, day)
    if (time >= startOfToday) return { year, month, day, weekday: new Date(time).getUTCDay() }
  }
  throw new Error('unreachable')
}

/** "Nel 2027 il 25 aprile cade di domenica: …". Plain Italian, from the weekday alone. */
export function bridgeTip(bridge: Bridge, today: Date): string {
  const { year, month, day, weekday } = nextBridgeDate(bridge, today)
  const when = `Nel ${year} ${bridge.id === 'pasqua' ? 'Pasquetta' : `${day === 8 || day === 11 ? "l'" : 'il '}${day === 1 ? '1°' : day} ${MONTH_NAMES[month - 1]}`} cade di ${WEEKDAYS[weekday]}`
  if (bridge.id === 'pasqua') return `${when} (${day} ${MONTH_NAMES[month - 1]}): da sabato a lunedì sono tre giorni senza ferie.`
  switch (weekday) {
    case 1:
    case 5:
      return `${when}: weekend lungo di tre giorni senza ferie.`
    case 2:
      return `${when}: con un giorno di ferie il lunedì fate quattro giorni, da sabato a martedì.`
    case 4:
      return `${when}: con un giorno di ferie il venerdì fate quattro giorni, da giovedì a domenica.`
    case 3:
      return `${when}: con due giorni di ferie (lunedì e martedì, o giovedì e venerdì) fate cinque giorni.`
    default:
      return `${when}: niente ponte, ma resta un weekend con un motivo in più per partire.`
  }
}

export const BRIDGE_COPY = {
  title: (bridge: Bridge) => `Dove andare per il ponte ${bridge.of} con gli amici`,
  eyebrow: 'Ponti e weekend lunghi',
  lead: (n: number) => `${n} mete raggiungibili in poche ore dall'Italia e al meglio in quel periodo, scelte dalle nostre guide per i viaggi di gruppo.`,
  description: (bridge: Bridge, n: number) =>
    `${n} idee per il ponte ${bridge.of} con gli amici: mete vicine, periodo giusto e budget. Come cade quest'anno e come decidere insieme su Roamie.`,
  others: 'Gli altri ponti',
}
