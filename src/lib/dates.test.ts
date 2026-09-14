import { describe, expect, it } from 'vitest'
import { addDays, bestWindows, dayTotals, eachDay, pendingMembers, type AvailabilityRow } from './dates'

const rows = (user: string, status: 'yes' | 'maybe', ...days: string[]): AvailabilityRow[] => days.map((day) => ({ user_id: user, day, status }))

describe('calendar days', () => {
  it('walks days across months and leap years, in UTC', () => {
    expect(eachDay('2028-02-27', '2028-03-01')).toEqual(['2028-02-27', '2028-02-28', '2028-02-29', '2028-03-01'])
    expect(eachDay('2027-03-27', '2027-03-29')).toHaveLength(3)
    expect(eachDay('2027-07-10', '2027-07-09')).toEqual([])
    expect(addDays('2027-12-31', 1)).toBe('2028-01-01')
  })

  it('counts who is free on each day, ignoring former members', () => {
    const totals = dayTotals(['2027-07-10', '2027-07-11'], ['ana', 'bo'], [
      ...rows('ana', 'yes', '2027-07-10'),
      ...rows('bo', 'maybe', '2027-07-10', '2027-07-11'),
      ...rows('gone', 'yes', '2027-07-10'),
    ])
    expect(totals.get('2027-07-10')).toEqual({ yes: ['ana'], maybe: ['bo'] })
    expect(totals.get('2027-07-11')).toEqual({ yes: [], maybe: ['bo'] })
  })
})

describe('bestWindows', () => {
  const window = { start: '2027-07-01', end: '2027-07-20' }
  const members = ['ana', 'bo', 'cy', 'dee']
  const availability = [
    ...rows('ana', 'yes', ...eachDay('2027-07-03', '2027-07-15')),
    ...rows('bo', 'yes', ...eachDay('2027-07-05', '2027-07-09')),
    ...rows('bo', 'maybe', ...eachDay('2027-07-10', '2027-07-12')),
    ...rows('cy', 'yes', ...eachDay('2027-07-06', '2027-07-12')),
  ]

  it('prefers the window where the most people are free, then the earliest', () => {
    const [best, second] = bestWindows(window, 3, members, availability)
    expect(best).toEqual({ start: '2027-07-06', end: '2027-07-08', free: ['ana', 'bo', 'cy'], maybe: [], missing: [] })
    // "maybe" counts half, suggestions never overlap, and on a tie the earliest window wins.
    expect(second).toEqual({ start: '2027-07-09', end: '2027-07-11', free: ['ana', 'cy'], maybe: ['bo'], missing: [] })
  })

  it('leaves out members who have not answered and reports them separately', () => {
    expect(bestWindows(window, 3, members, availability).every((w) => !w.missing.includes('dee'))).toBe(true)
    expect(pendingMembers(window, members, availability)).toEqual(['dee'])
  })

  it('returns nothing when the trip does not fit or nobody answered', () => {
    expect(bestWindows({ start: '2027-07-01', end: '2027-07-02' }, 3, members, availability)).toEqual([])
    expect(bestWindows(window, 3, members, [])).toEqual([])
  })
})
