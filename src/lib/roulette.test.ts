import { describe, expect, it } from 'vitest'
import { angleAtPointer, eligibleEntries, netScore, targetRotation } from './roulette'
import type { Destination, VoteType } from './types'

const dest = (id: string, votes: VoteType[], status: Destination['status'] = 'proposed'): Destination => ({
  id,
  trip_id: 't',
  name: id,
  country: null,
  lat: null,
  lng: null,
  image_url: null,
  image_attribution: null,
  mood: [],
  budget_level: null,
  expectations: null,
  status,
  selected_at: null,
  created_by: null,
  created_at: '2026-09-13T00:00:00Z',
  votes: votes.map((vote_type, i) => ({ id: `${id}-${i}`, user_id: `u${i}`, vote_type })),
  comments: [{ count: 0 }],
  creator: null,
})

describe('roulette', () => {
  it('computes the net score', () => {
    expect(netScore(dest('a', ['up', 'up', 'down']))).toBe(1)
  })

  it('keeps only proposed destinations with a positive net score', () => {
    const entries = eligibleEntries([
      dest('a', ['up', 'up', 'up']),
      dest('b', ['up']),
      dest('zero', ['up', 'down']),
      dest('neg', ['down']),
      dest('picked', ['up', 'up'], 'selected'),
    ])
    expect(entries.map((e) => e.destination.id)).toEqual(['a', 'b'])
  })

  it('sizes slices proportionally to the score and covers the full circle', () => {
    const [a, b] = eligibleEntries([dest('a', ['up', 'up', 'up']), dest('b', ['up'])])
    expect(a.probability).toBeCloseTo(0.75)
    expect(b.probability).toBeCloseTo(0.25)
    expect(a.startAngle).toBe(0)
    expect(a.endAngle).toBeCloseTo(270)
    expect(b.endAngle).toBeCloseTo(360)
  })

  it('lands the chosen slice under the pointer after several turns', () => {
    const [a, b] = eligibleEntries([dest('a', ['up', 'up', 'up']), dest('b', ['up'])])
    for (const [entry, current, jitter] of [
      [a, 0, 0],
      [b, 1234.5, 0.99],
      [a, -80, 0.5],
    ] as const) {
      const target = targetRotation(current, entry, 6, jitter)
      expect(target - current).toBeGreaterThan(5 * 360)
      const angle = angleAtPointer(target)
      expect(angle).toBeGreaterThanOrEqual(entry.startAngle)
      expect(angle).toBeLessThan(entry.endAngle)
    }
  })
})
