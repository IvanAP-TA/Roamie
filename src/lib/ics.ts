import type { ItineraryDay, Trip } from './types'

const CRLF = '\r\n'
const encoder = new TextEncoder()

/** RFC 5545 §3.3.11 TEXT escaping. */
export const escapeIcsText = (value: string) => value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/([;,])/g, '\\$1')

/** RFC 5545 §3.1: lines longer than 75 octets are folded; continuation lines start with a space. */
export function foldIcsLine(line: string): string {
  if (encoder.encode(line).length <= 75) return line
  const chunks: string[] = []
  let chunk = ''
  let size = 0
  for (const char of line) {
    const bytes = encoder.encode(char).length
    const limit = chunks.length === 0 ? 75 : 74 // the leading space counts on continuation lines
    if (size + bytes > limit) {
      chunks.push(chunk)
      chunk = ''
      size = 0
    }
    chunk += char
    size += bytes
  }
  chunks.push(chunk)
  return chunks.join(`${CRLF} `)
}

const pad = (n: number) => String(n).padStart(2, '0')
const icsDate = (d: Date) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`
const icsLocalDateTime = (d: Date) => `${icsDate(d)}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00`
const icsStamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')

/**
 * Calendar file for the dated days of an itinerary. Stops with a time become 1-hour events in floating
 * local time (the time wherever the group is that day); stops without a time become all-day events.
 * Days without a date are skipped.
 */
export function buildItineraryIcs(trip: Pick<Trip, 'name'>, days: ItineraryDay[], now = new Date()): { ics: string; events: number } {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Roamie//Itinerary//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(trip.name)}`,
  ]
  let events = 0

  for (const day of days) {
    const date = day.date?.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (!date) continue
    const [year, month, dayOfMonth] = [Number(date[1]), Number(date[2]) - 1, Number(date[3])]

    for (const item of day.itinerary_items) {
      const time = item.time?.match(/^(\d{1,2}):(\d{2})/)
      lines.push('BEGIN:VEVENT', `UID:${item.id}@roamie.org`, `DTSTAMP:${icsStamp(now)}`)
      if (time) {
        // Date.UTC is only a calendar calculator here (e.g. 23:30 + 1h rolls over to the next day).
        const start = new Date(Date.UTC(year, month, dayOfMonth, Number(time[1]), Number(time[2])))
        const end = new Date(start.getTime() + 60 * 60 * 1000)
        lines.push(`DTSTART:${icsLocalDateTime(start)}`, `DTEND:${icsLocalDateTime(end)}`)
      } else {
        lines.push(
          `DTSTART;VALUE=DATE:${icsDate(new Date(Date.UTC(year, month, dayOfMonth)))}`,
          `DTEND;VALUE=DATE:${icsDate(new Date(Date.UTC(year, month, dayOfMonth + 1)))}`,
        )
      }
      lines.push(`SUMMARY:${escapeIcsText(item.title)}`)
      if (item.place_name) lines.push(`LOCATION:${escapeIcsText(item.place_name)}`)
      if (item.lat != null && item.lng != null) lines.push(`GEO:${item.lat.toFixed(6)};${item.lng.toFixed(6)}`)
      if (item.description) lines.push(`DESCRIPTION:${escapeIcsText(item.description)}`)
      lines.push('END:VEVENT')
      events++
    }
  }

  lines.push('END:VCALENDAR')
  return { ics: lines.map(foldIcsLine).join(CRLF) + CRLF, events }
}

/** Safe file name from a trip name ("Estate 2027: Côte d’Azur!" → "estate-2027-cote-d-azur"). */
export const fileSlug = (name: string) =>
  name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'roamie'
