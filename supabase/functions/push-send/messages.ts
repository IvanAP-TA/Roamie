/** The text of each notification, in the language the device was subscribed in. */

export type PushKind = 'destination' | 'roulette' | 'dates_open' | 'dates_fixed' | 'member' | 'comment'
export type PushLang = 'it' | 'en' | 'es'

export interface PushData {
  actor?: string | null
  destination?: string
  destination_id?: string
  start?: string
  end?: string | null
  excerpt?: string
}

export interface PushMessage {
  title: string
  body: string
  url: string
  /** Same tag, same notification: a newer one replaces it instead of piling up. */
  tag: string
  lang: PushLang
}

const TEXT: Record<
  PushLang,
  {
    someone: string
    destination: (actor: string, destination: string) => string
    roulette: (destination: string) => string
    datesOpen: (actor: string) => string
    datesFixed: (range: string) => string
    member: (actor: string) => string
    comment: (actor: string, destination: string, excerpt: string) => string
  }
> = {
  it: {
    someone: 'Qualcuno',
    destination: (actor, destination) => `${actor} ha proposto ${destination}`,
    roulette: (destination) => `La ruota ha scelto ${destination} 🎡`,
    datesOpen: (actor) => `${actor} ha aperto la scelta delle date: segna quando sei libero`,
    datesFixed: (range) => `Date fissate: ${range} ✈️`,
    member: (actor) => `${actor} è entrato nel gruppo`,
    comment: (actor, destination, excerpt) => `${actor} su ${destination}: “${excerpt}”`,
  },
  en: {
    someone: 'Someone',
    destination: (actor, destination) => `${actor} proposed ${destination}`,
    roulette: (destination) => `The wheel picked ${destination} 🎡`,
    datesOpen: (actor) => `${actor} opened the date poll: mark when you're free`,
    datesFixed: (range) => `Dates are set: ${range} ✈️`,
    member: (actor) => `${actor} joined the group`,
    comment: (actor, destination, excerpt) => `${actor} on ${destination}: “${excerpt}”`,
  },
  es: {
    someone: 'Alguien',
    destination: (actor, destination) => `${actor} ha propuesto ${destination}`,
    roulette: (destination) => `La ruleta ha elegido ${destination} 🎡`,
    datesOpen: (actor) => `${actor} ha abierto la elección de fechas: marca cuándo estás libre`,
    datesFixed: (range) => `Fechas decididas: ${range} ✈️`,
    member: (actor) => `${actor} se ha unido al grupo`,
    comment: (actor, destination, excerpt) => `${actor} en ${destination}: «${excerpt}»`,
  },
}

function dateRange(lang: PushLang, start: string, end: string | null | undefined): string {
  const format = new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short', timeZone: 'UTC' })
  const day = (iso: string) => format.format(new Date(`${iso.slice(0, 10)}T00:00:00Z`))
  return end && end !== start ? `${day(start)} – ${day(end)}` : day(start)
}

export function renderPush(kind: PushKind, lang: string, data: PushData, tripId: string | null, tripName: string | null): PushMessage {
  const l: PushLang = lang === 'en' || lang === 'es' ? lang : 'it'
  const text = TEXT[l]
  const actor = data.actor?.trim() || text.someone
  const destination = data.destination ?? ''
  const trip = tripId ? `/trips/${tripId}` : '/trips'
  const destinationUrl = data.destination_id ? `${trip}?d=${data.destination_id}` : trip

  const [body, url, tagKey] = ((): [string, string, string] => {
    switch (kind) {
      case 'destination':
        return [text.destination(actor, destination), destinationUrl, data.destination_id ?? trip]
      case 'roulette':
        return [text.roulette(destination), destinationUrl, trip]
      case 'dates_open':
        return [text.datesOpen(actor), `${trip}/itinerary?view=dates`, trip]
      case 'dates_fixed':
        return [text.datesFixed(data.start ? dateRange(l, data.start, data.end) : ''), `${trip}/itinerary?view=dates`, trip]
      case 'member':
        return [text.member(actor), `${trip}/group`, trip]
      case 'comment':
        return [text.comment(actor, destination, data.excerpt ?? ''), destinationUrl, data.destination_id ?? trip]
    }
  })()

  return { title: tripName ?? 'Roamie', body, url, tag: `${kind}:${tagKey}`, lang: l }
}
