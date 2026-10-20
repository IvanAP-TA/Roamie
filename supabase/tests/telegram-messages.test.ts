import { describe, expect, it } from 'vitest'
import { eventMessage, inviteCode, langOf, parseCommand, placesMessage } from '../functions/telegram-bot/messages.ts'

const LINK = 'https://roamie.org/join/K7PQ2MXA'

describe('the telegram bot words', () => {
  it('reads commands as groups type them', () => {
    expect(parseCommand('/collega@RoamieTripBot k7pq-2mxa')).toEqual({ command: 'collega', arg: 'k7pq-2mxa' })
    expect(parseCommand('/METE')).toEqual({ command: 'mete', arg: '' })
    expect(parseCommand('ciao a tutti')).toBeNull()
    expect(inviteCode('k7pq·2mxa')).toBe('K7PQ2MXA')
    expect(inviteCode('K7PQ')).toBeNull()
    expect(langOf('es-ES')).toBe('es')
    expect(langOf(undefined)).toBe('it')
  })

  it('tells the group what happened, safely, with the link to act', () => {
    const message = eventMessage('destination', { actor: 'Giulia <3', destination: 'Lisbona' }, 'Estate & mare', LINK, 'it')
    expect(message).toContain('Giulia &lt;3 ha proposto <b>Lisbona</b> per «Estate &amp; mare»')
    expect(message).toContain(`<a href="${LINK}">Vota qui</a>`)
    expect(eventMessage('dates_fixed', { start: '2027-08-03', end: '2027-08-10' }, 'Estate', LINK, 'en')).toContain('<b>3 August – 10 August</b>')
    expect(eventMessage('member', { actor: null }, 'Estate', LINK, 'es')).toContain('Alguien se ha unido')
  })

  it('ranks the places by points, and hides points during a secret vote', () => {
    const places = [
      { name: 'Oslo', points: 3 },
      { name: 'Lisbona', points: 9 },
    ]
    expect(placesMessage('Estate', places, false, LINK, 'it')).toMatch(/1\. <b>Lisbona<\/b> · 9 punti\n2\. <b>Oslo<\/b> · 3 punti/)
    const secret = placesMessage('Estate', places, true, LINK, 'it')
    expect(secret).not.toMatch(/punti\n/)
    expect(secret).toContain('Voto segreto')
  })
})
