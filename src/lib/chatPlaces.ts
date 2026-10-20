/**
 * "Paste the group chat": the places a group chat talks about, found on the device. The chat is read here and never
 * sent anywhere; only the places the user then picks become proposals, like when they're added by hand.
 *
 * The places come from public/data/chat-places.json (scripts/chat-places.py: GeoNames cities with their names in many
 * languages), plus the guides' places and the countries, passed in by the caller.
 */

/** public/data/chat-places.json */
export interface PlaceIndex {
  places: [name: string, countryCode: string, lat: number, lng: number][]
  /** normalized name → index in places */
  names: Record<string, number>
}

/** A place known by one or more normalized names, from the guides or the country list. */
export interface ExtraPlace {
  names: string[]
  countryCode: string
  lat: number | null
  lng: number | null
}

export interface FoundPlace {
  /** As the chat wrote it, capitalised: "lisbona" → "Lisbona" */
  name: string
  countryCode: string
  lat: number | null
  lng: number | null
  mentions: number
  /** Identifies the place, so two spellings of it ("Lisbona", "Lisboa") count as one */
  id: string
}

/** Lower case, no accents, letters and spaces only: the same rules as scripts/chat-places.py. */
export const normalizePlace = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    // Whatever isn't ASCII once the accents are apart (ø, ł, curly quotes) goes, as Python's encode('ascii', 'ignore').
    .replace(/[^\p{ASCII}]/gu, '')
    .replace(/[^a-z ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

// "[20/10/26, 18:01] Marco: …", "20/10/26, 18:01 - Marco: …" (WhatsApp exports and copies), "Marco, [20.10.26 18:01]"
// (Telegram): the sender's name could be a place ("Florence", "Sydney"), so it goes before reading.
const SENDER = /^\s*\[?\d{1,4}[/.-]\d{1,2}[/.-]\d{1,4},?\s+\d{1,2}[:.]\d{2}(?::\d{2})?\s*(?:[AP]M)?\]?\s*(?:-\s*)?[^:\n]{1,40}:\s*/gim
const TELEGRAM_SENDER = /^[^\n,]{1,40},\s*\[\d{1,2}[/.]\d{1,2}[/.]\d{2,4}\s+\d{1,2}[:.]\d{2}\]\s*$/gm
const LINK = /\b(?:https?:\/\/|www\.)\S+/gi

const MAX_WORDS = 4
const capitalise = (words: string[]) =>
  words.map((w) => (w === w.toLowerCase() ? w.charAt(0).toUpperCase() + w.slice(1) : w)).join(' ')

/** The places in a chat, most mentioned first (then in order of first mention), at most `limit`. */
export function findPlaces(chat: string, index: PlaceIndex, extras: ExtraPlace[] = [], limit = 15): FoundPlace[] {
  const extraByName = new Map<string, ExtraPlace>()
  for (const extra of extras) for (const name of extra.names) if (name.length >= 4) extraByName.set(name, extra)

  const text = chat.replace(SENDER, ' ').replace(TELEGRAM_SENDER, ' ').replace(LINK, ' ')
  const words = text.split(/[^\p{L}]+/u).filter(Boolean)
  const keys = words.map(normalizePlace)
  const found = new Map<string, FoundPlace & { first: number }>()

  for (let i = 0; i < words.length; ) {
    let matched = 0
    // Longest name first: "New York" before "York", "Costa Rica" before "Rica".
    for (let n = Math.min(MAX_WORDS, words.length - i); n >= 1 && !matched; n--) {
      const key = keys.slice(i, i + n).join(' ')
      if (key.length < 4) continue
      const extra = extraByName.get(key)
      const city = extra ? undefined : index.names[key]
      if (!extra && city === undefined) continue
      const place = extra
        ? { id: `x:${extra.countryCode}:${extra.names[0]}`, countryCode: extra.countryCode, lat: extra.lat, lng: extra.lng }
        : { id: `c:${city}`, countryCode: index.places[city!][1], lat: index.places[city!][2], lng: index.places[city!][3] }
      const seen = found.get(place.id)
      if (seen) seen.mentions++
      else found.set(place.id, { ...place, name: capitalise(words.slice(i, i + n)), mentions: 1, first: i })
      matched = n
    }
    i += matched || 1
  }

  return [...found.values()]
    .sort((a, b) => b.mentions - a.mentions || a.first - b.first)
    .slice(0, limit)
    .map(({ first: _first, ...place }) => place)
}
