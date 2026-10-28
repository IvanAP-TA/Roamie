import { describe, expect, it } from 'vitest'
import { bridgeTip, BRIDGES, easter, nextBridgeDate } from './bridges'
import { findExplore, placesForBridge } from './explore'

const bridge = (id: string) => BRIDGES.find((b) => b.id === id)!

describe('ponti', () => {
  it('computes Easter', () => {
    expect(easter(2026)).toEqual({ month: 4, day: 5 })
    expect(easter(2027)).toEqual({ month: 3, day: 28 })
  })

  it('finds the next date, today included', () => {
    expect(nextBridgeDate(bridge('immacolata'), new Date(2026, 11, 8))).toMatchObject({ year: 2026, month: 12, day: 8 })
    expect(nextBridgeDate(bridge('immacolata'), new Date(2026, 11, 9))).toMatchObject({ year: 2027, month: 12, day: 8 })
    expect(nextBridgeDate(bridge('pasqua'), new Date(2026, 9, 28))).toMatchObject({ year: 2027, month: 3, day: 29, weekday: 1 })
  })

  it('says how the day falls', () => {
    // 8 Dec 2026 is a Tuesday, 25 Apr 2027 a Sunday, 1 May 2027 a Saturday
    expect(bridgeTip(bridge('immacolata'), new Date(2026, 9, 28))).toBe(
      "Nel 2026 l'8 dicembre cade di martedì: con un giorno di ferie il lunedì fate quattro giorni, da sabato a martedì.",
    )
    expect(bridgeTip(bridge('25-aprile'), new Date(2026, 9, 28))).toMatch(/^Nel 2027 il 25 aprile cade di domenica: niente ponte/)
    expect(bridgeTip(bridge('1-maggio'), new Date(2026, 9, 28))).toMatch(/^Nel 2027 il 1° maggio cade di sabato/)
  })

  it('has Italian pages only, with nearby places', () => {
    expect(findExplore('it', 'ponte-del-25-aprile')).toEqual({
      kind: 'bridge',
      bridge: bridge('25-aprile'),
    })
    expect(findExplore('en', 'ponte-del-25-aprile')).toBeNull()
    for (const b of BRIDGES) expect(placesForBridge(b, 2027).length, b.id).toBeGreaterThanOrEqual(3)
  })
})
