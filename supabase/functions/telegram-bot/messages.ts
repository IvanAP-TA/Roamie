/** What the Roamie bot says in a Telegram group (index.ts), in the group's language. Telegram HTML. */

export type Lang = 'it' | 'en' | 'es'
export type EventKind = 'destination' | 'roulette' | 'member' | 'dates_fixed'

export const langOf = (code: string | undefined | null): Lang => {
  const two = (code ?? '').slice(0, 2).toLowerCase()
  return two === 'en' || two === 'es' ? two : 'it'
}

/** Telegram HTML: only these three characters need escaping. */
export const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const DATE: Record<Lang, string> = { it: 'it-IT', en: 'en-GB', es: 'es-ES' }
const day = (iso: string, lang: Lang) => new Intl.DateTimeFormat(DATE[lang], { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${iso}T12:00:00Z`))

const T = {
  it: {
    someone: 'Qualcuno',
    destination: (a: string, d: string, trip: string) => `📍 ${a} ha proposto <b>${d}</b> per «${trip}».`,
    roulette: (d: string, trip: string) => `🎡 La ruota ha scelto <b>${d}</b>! «${trip}» ha la sua meta.`,
    member: (a: string, trip: string) => `👋 ${a} è entrato in «${trip}».`,
    dates: (range: string, trip: string) => `✈️ Date fissate per «${trip}»: <b>${range}</b>.`,
    vote: 'Vota qui',
    open: 'Apri il viaggio',
    linked: (trip: string) =>
      `✅ Questo gruppo è collegato a «<b>${trip}</b>» su Roamie.\n\nVi scriverò qui quando qualcuno propone una meta, entra nel viaggio, quando la ruota sceglie e quando si fissano le date. /mete mostra la classifica.\n\nPer votare si entra dal link, anche solo con il nome:`,
    unlinked: 'Fatto: questo gruppo non è più collegato al viaggio.',
    notLinked: 'Questo gruppo non è collegato a nessun viaggio. Scrivete /collega seguito dal codice d’invito (8 caratteri) del viaggio su Roamie.',
    badCode: 'Questo codice non corrisponde a nessun viaggio. Controllate il codice d’invito su Roamie (Gruppo → Invita) e riprovate.',
    needCode: 'Scrivete /collega seguito dal codice d’invito del viaggio, per esempio: /collega K7PQ2MXA',
    groupsOnly: 'Questo comando funziona nei gruppi: aggiungetemi al gruppo del viaggio.',
    welcome:
      'Ciao! Sono Roamie: vi aiuto a decidere il prossimo viaggio senza perdere le idee nella chat.\n\nCollegatemi a un viaggio con /collega e il suo codice d’invito (lo trovate su Roamie, in Gruppo → Invita).',
    private:
      'Ciao! Sono il bot di Roamie per i gruppi.\n\nAggiungimi al gruppo Telegram dove organizzate il viaggio, poi scrivete /collega con il codice d’invito del viaggio (su roamie.org, in Gruppo → Invita). Da lì vi avviso delle nuove mete, di chi entra e di cosa sceglie la ruota.',
    places: (trip: string) => `🗳 Le mete di «${trip}»`,
    points: (n: number) => (n === 1 ? '1 punto' : `${n} punti`),
    secret: 'Voto segreto in corso: i punti si vedono alla fine.',
    noPlaces: 'Ancora nessuna meta proposta. Proponete la prima dal link:',
  },
  en: {
    someone: 'Someone',
    destination: (a: string, d: string, trip: string) => `📍 ${a} proposed <b>${d}</b> for “${trip}”.`,
    roulette: (d: string, trip: string) => `🎡 The wheel picked <b>${d}</b>! “${trip}” has its destination.`,
    member: (a: string, trip: string) => `👋 ${a} joined “${trip}”.`,
    dates: (range: string, trip: string) => `✈️ Dates are set for “${trip}”: <b>${range}</b>.`,
    vote: 'Vote here',
    open: 'Open the trip',
    linked: (trip: string) =>
      `✅ This group is linked to “<b>${trip}</b>” on Roamie.\n\nI'll post here when someone proposes a place, joins the trip, when the wheel picks and when dates are set. /places shows the ranking.\n\nTo vote, join from the link, even with just a name:`,
    unlinked: 'Done: this group is no longer linked to the trip.',
    notLinked: 'This group isn’t linked to a trip. Send /link followed by the trip’s invite code (8 characters) from Roamie.',
    badCode: 'That code doesn’t match any trip. Check the invite code on Roamie (Group → Invite) and try again.',
    needCode: 'Send /link followed by the trip’s invite code, for example: /link K7PQ2MXA',
    groupsOnly: 'This command works in groups: add me to the trip’s group.',
    welcome:
      'Hi! I’m Roamie: I help you decide your next trip without losing the ideas in the chat.\n\nLink me to a trip with /link and its invite code (on Roamie, in Group → Invite).',
    private:
      'Hi! I’m Roamie’s bot for groups.\n\nAdd me to the Telegram group where you plan the trip, then send /link with the trip’s invite code (on roamie.org, in Group → Invite). From then on I’ll tell you about new places, who joins and what the wheel picks.',
    places: (trip: string) => `🗳 The places for “${trip}”`,
    points: (n: number) => (n === 1 ? '1 point' : `${n} points`),
    secret: 'Secret vote in progress: points show at the end.',
    noPlaces: 'No places proposed yet. Propose the first one from the link:',
  },
  es: {
    someone: 'Alguien',
    destination: (a: string, d: string, trip: string) => `📍 ${a} ha propuesto <b>${d}</b> para «${trip}».`,
    roulette: (d: string, trip: string) => `🎡 ¡La ruleta ha elegido <b>${d}</b>! «${trip}» ya tiene destino.`,
    member: (a: string, trip: string) => `👋 ${a} se ha unido a «${trip}».`,
    dates: (range: string, trip: string) => `✈️ Fechas fijadas para «${trip}»: <b>${range}</b>.`,
    vote: 'Vota aquí',
    open: 'Abrir el viaje',
    linked: (trip: string) =>
      `✅ Este grupo está vinculado a «<b>${trip}</b>» en Roamie.\n\nOs escribiré aquí cuando alguien proponga un destino, se una al viaje, cuando la ruleta elija y cuando se fijen las fechas. /destinos muestra la clasificación.\n\nPara votar se entra desde el enlace, incluso solo con el nombre:`,
    unlinked: 'Hecho: este grupo ya no está vinculado al viaje.',
    notLinked: 'Este grupo no está vinculado a ningún viaje. Enviad /vincular seguido del código de invitación (8 caracteres) del viaje en Roamie.',
    badCode: 'Ese código no corresponde a ningún viaje. Revisad el código de invitación en Roamie (Grupo → Invitar) y probad de nuevo.',
    needCode: 'Enviad /vincular seguido del código de invitación del viaje, por ejemplo: /vincular K7PQ2MXA',
    groupsOnly: 'Este comando funciona en grupos: añadidme al grupo del viaje.',
    welcome:
      '¡Hola! Soy Roamie: os ayudo a decidir el próximo viaje sin perder las ideas en el chat.\n\nVinculadme a un viaje con /vincular y su código de invitación (en Roamie, en Grupo → Invitar).',
    private:
      '¡Hola! Soy el bot de Roamie para grupos.\n\nAñádeme al grupo de Telegram donde organizáis el viaje y enviad /vincular con el código de invitación del viaje (en roamie.org, en Grupo → Invitar). Desde entonces os aviso de nuevos destinos, de quién se une y de lo que elige la ruleta.',
    places: (trip: string) => `🗳 Los destinos de «${trip}»`,
    points: (n: number) => (n === 1 ? '1 punto' : `${n} puntos`),
    secret: 'Votación secreta en curso: los puntos se ven al final.',
    noPlaces: 'Aún no hay destinos propuestos. Proponed el primero desde el enlace:',
  },
} satisfies Record<Lang, Record<string, unknown>>

export const text = (lang: Lang) => T[lang]

/** The message for an event in the trip (telegram_outbox), with the link to act on it. */
export function eventMessage(kind: EventKind, data: Record<string, string | null | undefined>, trip: string, link: string, lang: Lang): string {
  const t = T[lang]
  const name = escape(trip)
  const actor = escape(data.actor || t.someone)
  const place = escape(data.destination ?? '')
  const body =
    kind === 'destination'
      ? t.destination(actor, place, name)
      : kind === 'roulette'
        ? t.roulette(place, name)
        : kind === 'member'
          ? t.member(actor, name)
          : t.dates(data.end && data.end !== data.start ? `${day(data.start!, lang)} – ${day(data.end, lang)}` : day(data.start!, lang), name)
  return `${body}\n<a href="${link}">${kind === 'destination' ? t.vote : t.open}</a>`
}

/** The ranking for /mete: places by points, or without points while a secret vote is on. */
export function placesMessage(trip: string, places: { name: string; points: number }[], secret: boolean, link: string, lang: Lang): string {
  const t = T[lang]
  if (!places.length) return `${t.places(escape(trip))}\n\n${t.noPlaces}\n${link}`
  const sorted = secret ? places : [...places].sort((a, b) => b.points - a.points)
  const lines = sorted.slice(0, 12).map((p, i) => (secret ? `• ${escape(p.name)}` : `${i + 1}. <b>${escape(p.name)}</b> · ${t.points(p.points)}`))
  return [t.places(escape(trip)), '', ...lines, ...(secret ? ['', t.secret] : []), '', `<a href="${link}">${t.vote}</a>`].join('\n')
}

/** "/collega@RoamieBot K7PQ 2MXA" → { command: 'collega', arg: 'K7PQ2MXA' }; null when it isn't a command. */
export function parseCommand(message: string): { command: string; arg: string } | null {
  const match = /^\/([a-z_]+)(?:@\w+)?(?:\s+(.*))?$/is.exec(message.trim())
  if (!match) return null
  return { command: match[1].toLowerCase(), arg: (match[2] ?? '').trim() }
}

/** An invite code as people type it ("k7pq-2mxa", "K7PQ·2MXA") → "K7PQ2MXA", or null. */
export function inviteCode(arg: string): string | null {
  const code = arg.toUpperCase().replace(/[^A-Z0-9]/g, '')
  return /^[A-Z0-9]{8}$/.test(code) ? code : null
}

export const COMMANDS = {
  link: ['collega', 'link', 'vincular', 'start'],
  unlink: ['scollega', 'unlink', 'desvincular'],
  places: ['mete', 'places', 'destinos'],
  help: ['aiuto', 'help', 'ayuda'],
}
