import { describe, expect, it } from 'vitest'
import places from '../../public/data/chat-places.json'
import { findPlaces, normalizePlace, type PlaceIndex } from './chatPlaces'

const index = places as unknown as PlaceIndex
const names = (chat: string, extras = []) => findPlaces(chat, index, extras).map((p) => `${p.name}/${p.countryCode}×${p.mentions}`)

describe('places in a pasted group chat', () => {
  it('finds the places an Italian WhatsApp chat proposes, in its own words, most mentioned first', () => {
    const chat = `[20/10/26, 18:01] Marco Rossi: ragazzi allora quest'estate dove andiamo? io direi Lisbona o Porto
[20/10/26, 18:02] Giulia: lisbona sì!! però anche Budapest costa poco
[20/10/26, 18:03] Luca: basta che ci sia il mare. Valencia? oppure Spalato
[20/10/26, 18:05] Sara: io non posso a luglio. Che ne dite di Cracovia? Anche New York sarebbe un sogno
[20/10/26, 18:07] Giulia: casa mia è libera venerdì, tanto alla fine si va a Lisbona https://roamie.org/join/ABCD1234`
    expect(names(chat)).toEqual(['Lisbona/PT×3', 'Porto/PT×1', 'Budapest/HU×1', 'Valencia/ES×1', 'Spalato/HR×1', 'Cracovia/PL×1', 'New York/US×1'])
  })

  it('reads English and Spanish chats, and skips everyday words that are also place names', () => {
    expect(names('Emma: Lisbon or Seville? Kraków is nice in June. Reading the guide, Porto looks cool')).toEqual([
      'Lisbon/PT×1',
      'Seville/ES×1',
      'Kraków/PL×1',
      'Porto/PT×1',
    ])
    expect(names('Ana: ¿Lisboa o Oporto? a mí me gustaría algo de playa como Málaga, pero no Madrid')).toEqual([
      'Lisboa/PT×1',
      'Oporto/PT×1',
      'Málaga/ES×1',
      'Madrid/ES×1',
    ])
  })

  it("never reads the sender's name as a place", () => {
    expect(names('[20/10/26, 18:01] Florence: andiamo a Oslo?\n20/10/26, 18:02 - Sydney Lee: sì Oslo')).toEqual(['Oslo/NO×2'])
  })

  it('also knows the places it is given (guides, countries), before the cities', () => {
    const extras = [{ names: ['giappone', 'japan'], countryCode: 'JP', lat: null, lng: null }]
    expect(names('Giappone o Japan? Comunque Tokyo', extras as never)).toEqual(['Giappone/JP×2', 'Tokyo/JP×1'])
  })

  it('normalizes like the build script', () => {
    expect(normalizePlace('  Kraków ')).toBe('krakow')
    expect(normalizePlace("L'Avana")).toBe('l avana')
  })
})
