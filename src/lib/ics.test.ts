import { describe, expect, it } from 'vitest'
import { buildItineraryIcs, escapeIcsText, fileSlug, foldIcsLine } from './ics'
import type { ItineraryDay, ItineraryItem } from './types'

const item = (id: string, over: Partial<ItineraryItem>): ItineraryItem => ({
  id,
  itinerary_day_id: 'd',
  time: null,
  title: 'Stop',
  description: null,
  order_index: 0,
  place_name: null,
  lat: null,
  lng: null,
  ...over,
})

const days: ItineraryDay[] = [
  {
    id: 'd1',
    trip_id: 't',
    day_number: 1,
    date: '2027-08-03',
    title: null,
    itinerary_items: [
      item('a', { time: '23:30', title: 'Cena, poi karaoke; tardi', place_name: 'Pontocho', lat: 35.005, lng: 135.7708, description: 'Prenotare!\nDue tavoli' }),
      item('b', { title: 'Museo' }),
    ],
  },
  { id: 'd2', trip_id: 't', day_number: 2, date: null, title: null, itinerary_items: [item('c', {})] },
]

describe('ics', () => {
  it('exports dated stops as timed or all-day events and skips undated days', () => {
    const { ics, events } = buildItineraryIcs({ name: 'Estate 2027' }, days, new Date('2026-09-14T09:00:00Z'))
    expect(events).toBe(2)
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(ics).toContain('DTSTAMP:20260914T090000Z')
    expect(ics).toContain('DTSTART:20270803T233000')
    expect(ics).toContain('DTEND:20270804T003000')
    expect(ics).toContain('DTSTART;VALUE=DATE:20270803')
    expect(ics).toContain('DTEND;VALUE=DATE:20270804')
    expect(ics).toContain('SUMMARY:Cena\\, poi karaoke\\; tardi')
    expect(ics).toContain('LOCATION:Pontocho')
    expect(ics).toContain('GEO:35.005000;135.770800')
    expect(ics).toContain('DESCRIPTION:Prenotare!\\nDue tavoli')
    expect(ics).toContain('UID:a@roamie.org')
    expect(ics).not.toContain('UID:c@roamie.org')
  })

  it('folds long lines at 75 octets, counting multi-byte characters', () => {
    const folded = foldIcsLine(`SUMMARY:${'è'.repeat(60)}`)
    const lines = folded.split('\r\n')
    expect(lines.length).toBeGreaterThan(1)
    for (const line of lines) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75)
    expect(lines.slice(1).every((line) => line.startsWith(' '))).toBe(true)
    expect(lines.map((line, i) => (i ? line.slice(1) : line)).join('')).toBe(`SUMMARY:${'è'.repeat(60)}`)
  })

  it('escapes text and builds safe file names', () => {
    expect(escapeIcsText('a\\b;c,d')).toBe('a\\\\b\\;c\\,d')
    expect(fileSlug('Estate 2027: Côte d’Azur!')).toBe('estate-2027-cote-d-azur')
    expect(fileSlug('北京')).toBe('roamie')
  })
})
