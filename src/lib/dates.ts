/**
 * Choosing the dates together: calendar-day arithmetic (UTC, yyyy-mm-dd) and the best windows for the group.
 */

export type DayStatus = 'yes' | 'maybe'

export interface AvailabilityRow {
  user_id: string
  /** yyyy-mm-dd */
  day: string
  status: DayStatus
}

const DAY_MS = 86_400_000
const toTime = (day: string) => Date.parse(`${day}T00:00:00Z`)
const toDay = (time: number) => new Date(time).toISOString().slice(0, 10)

export const addDays = (day: string, count: number) => toDay(toTime(day) + count * DAY_MS)

export const daysBetween = (from: string, to: string) => Math.round((toTime(to) - toTime(from)) / DAY_MS)

/** Every day from start to end, both included; empty when the range is invalid. */
export function eachDay(start: string, end: string): string[] {
  const count = daysBetween(start, end)
  if (!Number.isFinite(count) || count < 0) return []
  return Array.from({ length: count + 1 }, (_, i) => addDays(start, i))
}

/** user → day → status */
export function availabilityIndex(rows: AvailabilityRow[]) {
  const index = new Map<string, Map<string, DayStatus>>()
  for (const row of rows) {
    const days = index.get(row.user_id) ?? new Map<string, DayStatus>()
    days.set(row.day, row.status)
    index.set(row.user_id, days)
  }
  return index
}

export interface DayTotal {
  yes: string[]
  maybe: string[]
}

/** Who is free (or maybe) on each day, for the members of the trip only. */
export function dayTotals(days: string[], memberIds: string[], rows: AvailabilityRow[]): Map<string, DayTotal> {
  const index = availabilityIndex(rows)
  return new Map(
    days.map((day) => {
      const total: DayTotal = { yes: [], maybe: [] }
      for (const member of memberIds) {
        const status = index.get(member)?.get(day)
        if (status) total[status].push(member)
      }
      return [day, total]
    }),
  )
}

export interface DateWindow {
  start: string
  end: string
  /** Free on every day */
  free: string[]
  /** Free or maybe on every day, with at least one maybe */
  maybe: string[]
  /** Not available on at least one day */
  missing: string[]
}

/**
 * The best trips of `length` days inside the window: the most members free on every day (a "maybe" counts
 * half), earliest first on ties. Windows never overlap, so the suggestions are real alternatives.
 * Members who haven't marked any day are left out of the ranking.
 */
export function bestWindows(
  window: { start: string; end: string },
  length: number,
  memberIds: string[],
  rows: AvailabilityRow[],
  limit = 3,
): DateWindow[] {
  const days = eachDay(window.start, window.end)
  if (length < 1 || days.length < length) return []
  const index = availabilityIndex(rows)
  const responders = memberIds.filter((m) => index.has(m))
  if (responders.length === 0) return []

  const candidates = days.slice(0, days.length - length + 1).map((start) => {
    const span = days.slice(days.indexOf(start), days.indexOf(start) + length)
    const result: DateWindow = { start, end: span[span.length - 1], free: [], maybe: [], missing: [] }
    for (const member of responders) {
      const statuses = span.map((day) => index.get(member)?.get(day))
      if (statuses.every((s) => s === 'yes')) result.free.push(member)
      else if (statuses.every((s) => s === 'yes' || s === 'maybe')) result.maybe.push(member)
      else result.missing.push(member)
    }
    return { result, score: result.free.length + result.maybe.length / 2 }
  })

  const picked: DateWindow[] = []
  for (const { result } of candidates.filter((c) => c.score > 0).sort((a, b) => b.score - a.score || a.result.start.localeCompare(b.result.start))) {
    if (picked.some((p) => result.start <= p.end && result.end >= p.start)) continue
    picked.push(result)
    if (picked.length === limit) break
  }
  return picked
}

/** Members who haven't marked a single day inside the window yet. */
export function pendingMembers(window: { start: string; end: string }, memberIds: string[], rows: AvailabilityRow[]): string[] {
  const answered = new Set(rows.filter((r) => r.day >= window.start && r.day <= window.end).map((r) => r.user_id))
  return memberIds.filter((m) => !answered.has(m))
}
