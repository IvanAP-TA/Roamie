import { describe, expect, it } from 'vitest'
import { revealOrder, slicesFromSpin } from './liveSpin'
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
