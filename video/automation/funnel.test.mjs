import { describe, expect, it } from 'vitest'
import { reportMessage } from './funnel.mjs'

describe('weekly report', () => {
  it('shows the north star and where trips are lost, with shares', () => {
    const text = reportMessage({
      week: { google_users: 3, guests: 5, trips: 2, joins: 4, proposals: 20, votes: 15, spins: 1 },
      cohort: { trips: 4, two_members: 3, three_members: 2, two_voters: 2, decided: 1, north_star: 1 },
      total: { users: 33, trips: 6 },
    })
    expect(text).toContain('1 viaggi su 4 (25%)')
    expect(text).toContain('con 3+ persone: 2 (50%)')
    expect(text).toContain('amici entrati da un invito: 4')
    expect(reportMessage({ week: { google_users: 0, guests: 0, trips: 0, joins: 0, proposals: 0, votes: 0, spins: 0 }, cohort: { trips: 0, two_members: 0, three_members: 0, two_voters: 0, decided: 0, north_star: 0 }, total: { users: 0, trips: 0 } })).toContain('(–)')
  })
})
