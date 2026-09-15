import { describe, expect, it } from 'vitest'
import { angleAtPointer, eligibleEntries, pointsLeft, targetRotation, totalPoints } from './roulette'
import type { Destination } from './types'

const dest = (id: string, points: number[], status: Destination['status'] = 'proposed'): Destination => ({
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
  votes: points.map((p, i) => ({ id: `${id}-${i}`, user_id: `u${i}`, points: p })),
  comments: [{ count: 0 }],
  creator: null,
  country_code: null,
  visited_at: null,
  reviews: [],
  reasons: [],
})

describe('roulette', () => {
  it('sums the points', () => {
    expect(totalPoints(dest('a', [3, 2, 5]))).toBe(10)
  })

  it('counts only proposed destinations towards the budget', () => {
    const list = [dest('a', [4]), dest('b', [3]), dest('picked', [3], 'selected')]
    expect(pointsLeft(list, 'u0')).toBe(3)
    expect(pointsLeft(list, 'nobody')).toBe(10)
  })

  it('keeps only proposed destinations with at least one point', () => {
    const entries = eligibleEntries([dest('a', [3]), dest('b', [1]), dest('none', []), dest('picked', [2], 'selected')])
    expect(entries.map((e) => e.destination.id)).toEqual(['a', 'b'])
  })

  it('sizes slices proportionally to the points and covers the full circle', () => {
    const [a, b] = eligibleEntries([dest('a', [2, 1]), dest('b', [1])])
    expect(a.probability).toBeCloseTo(0.75)
    expect(b.probability).toBeCloseTo(0.25)
    expect(a.startAngle).toBe(0)
    expect(a.endAngle).toBeCloseTo(270)
    expect(b.endAngle).toBeCloseTo(360)
  })

  it('lands the chosen slice under the pointer after several turns', () => {
    const [a, b] = eligibleEntries([dest('a', [3]), dest('b', [1])])
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
