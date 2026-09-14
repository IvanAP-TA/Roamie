import { describe, expect, it } from 'vitest'
import { bestMonths, comfortScore, monthRanges, summarizeDaily } from './climate'

describe('climate', () => {
  it('scores comfort from daytime highs and rainy days', () => {
    expect(comfortScore(23, 0)).toBeCloseTo(1)
    expect(comfortScore(28, 0)).toBeCloseTo(1)
    expect(comfortScore(43, 0)).toBeCloseTo(0.4)
    expect(comfortScore(23, 15)).toBeCloseTo(0.6)
    // 15.5 °C is 2.5 °C below the ideal band (comfort 1 − 2.5/15); 7.5 rainy days halve dryness.
    expect(comfortScore(15.5, 7.5)).toBeCloseTo(0.6 * (1 - 2.5 / 15) + 0.4 * 0.5)
  })

  it('picks the months close to the best one, and none when nothing is pleasant', () => {
    // Monthly scores measured for Lisbon (2020–2024).
    const lisbon = [0.69, 0.76, 0.75, 0.77, 0.9, 0.86, 0.95, 0.97, 0.82, 0.72, 0.75, 0.68].map((score) => ({ score }))
    expect(bestMonths(lisbon)).toEqual([4, 5, 6, 7])
    expect(bestMonths(Array.from({ length: 12 }, () => ({ score: 0.3 })))).toEqual([])
  })

  it('groups months into ranges across the new year', () => {
    expect(monthRanges([4, 5, 6, 7])).toEqual([[4, 7]])
    expect(monthRanges([11, 0, 1])).toEqual([[11, 1]])
    expect(monthRanges([0, 2, 3])).toEqual([[0, 0], [2, 3]])
    expect(monthRanges([])).toEqual([])
    expect(monthRanges(Array.from({ length: 12 }, (_, i) => i))).toEqual([[0, 11]])
  })

  it('averages daily data per month and counts rainy days per year', () => {
    const months = summarizeDaily({
      time: ['2023-01-01', '2023-01-02', '2024-01-01', '2024-01-02', '2024-01-03'],
      temperature_2m_max: [10, 12, 14, 16, null],
      temperature_2m_min: [2, 4, 6, 8, null],
      precipitation_sum: [0, 3, 1, 0.4, 20],
      sunshine_duration: [3600, 7200, 0, 3600, null],
    })
    expect(months).toHaveLength(12)
    expect(months[0].tempMax).toBeCloseTo(13)
    expect(months[0].tempMin).toBeCloseTo(5)
    expect(months[0].rainDays).toBeCloseTo(1) // 2 rainy days over 2 years; the null day is skipped
    expect(months[0].sunHours).toBeCloseTo(1)
  })
})
