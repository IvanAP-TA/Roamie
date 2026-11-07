import { describe, expect, it } from 'vitest'
import { revealOrder, slicesFromSpin, withoutSpoiler } from './liveSpin'
import type { Destination } from './types'
import { angleAtPointer, targetRotation } from './roulette'

const ENTRIES = [
  { id: 'oslo', name: 'Oslo', points: 17 },
  { id: 'lisbon', name: 'Lisbona', points: 13 },
  { id: 'porto', name: 'Porto', points: 10 },
]

describe('live wheel', () => {
  it('draws the slices in the order and size the server recorded', () => {
    const slices = slicesFromSpin(ENTRIES)
    expect(slices.map((s) => s.destination.id)).toEqual(['oslo', 'lisbon', 'porto'])
    expect(slices[0]).toMatchObject({ startAngle: 0, score: 17 })
    expect(slices[0].endAngle).toBeCloseTo((17 / 40) * 360)
    expect(slices.at(-1)!.endAngle).toBeCloseTo(360)
  })

  it('stops every screen on the recorded winner, at the recorded spot', () => {
    const slices = slicesFromSpin(ENTRIES)
    const lisbon = slices[1]
    for (const landing of [0, 0.5, 0.999]) {
      const angle = angleAtPointer(targetRotation(137, lisbon, 6, landing))
      expect(angle).toBeGreaterThanOrEqual(lisbon.startAngle)
      expect(angle).toBeLessThan(lisbon.endAngle)
    }
  })

  it('reveals from last place to first', () => {
    expect(revealOrder(ENTRIES).map((e) => e.id)).toEqual(['porto', 'lisbon', 'oslo'])
    expect(revealOrder([{ name: 'B', points: 5 }, { name: 'A', points: 5 }]).map((e) => e.name)).toEqual(['B', 'A'])
  })
})

describe('the winner stays hidden until the wheel stops', () => {
  const place = (id: string, status: Destination['status']) => ({ id, trip_id: 't1', status, selected_at: status === 'selected' ? '2026-11-07T10:00:00Z' : null }) as Destination

  it('shows the place being picked as still in the running, and leaves the others alone', () => {
    const list = [place('a', 'selected'), place('b', 'proposed'), place('c', 'selected')]
    const shown = withoutSpoiler(list, { tripId: 't1', winnerId: 'a' })
    expect(shown.map((d) => d.status)).toEqual(['proposed', 'proposed', 'selected'])
    expect(shown[0].selected_at).toBeNull()
    // Nothing playing, or another trip's wheel: the list is as it is.
    expect(withoutSpoiler(list, null)).toBe(list)
    expect(withoutSpoiler(list, { tripId: 't2', winnerId: 'a' }).map((d) => d.status)).toEqual(['selected', 'proposed', 'selected'])
  })
})
