import { describe, expect, it } from 'vitest'
import { bestMonths, climateWarnings, comfortScore, monthRanges, scoreMonths, summarizeDaily } from './climate'

/** Monthly averages measured with Open-Meteo for 2021–2025: [feels-like high °C, rain mm, heavy-rain days, gale days]. */
const months = (rows: [number, number, number, number][]) =>
  scoreMonths(rows.map(([feelsMax, rainMm, heavyRainDays, windyDays]) => ({ feelsMax, rainMm, heavyRainDays, windyDays })))

// Central Vietnam, where the country's map pin falls: mild but wet all year, downpours and typhoon gusts in autumn.
const CENTRAL_VIETNAM = months([
  [16.8, 149, 1.2, 0.2], [19.4, 131, 1.4, 0.2], [24.2, 98, 0.6, 0.2], [28.3, 117, 0.6, 0.4],
  [29.6, 200, 2.0, 0.2], [31.0, 242, 2.0, 0.6], [29.6, 219, 2.0, 1.6], [30.3, 219, 2.0, 2.0],
  [27.6, 440, 6.6, 1.6], [23.7, 699, 8.6, 3.0], [21.0, 374, 5.6, 0.6], [17.3, 348, 4.8, 0.2],
])

const HANOI = months([
  [20.9, 45, 0.2, 0], [22.6, 64, 0.6, 0], [28.1, 71, 0.8, 0], [33.7, 95, 1.0, 0],
  [37.2, 234, 3.6, 0], [40.0, 345, 7.6, 0], [40.3, 313, 5.4, 0.4], [39.5, 378, 6.6, 0],
  [37.2, 404, 7.4, 0.4], [31.6, 218, 2.8, 0.2], [28.2, 61, 0.8, 0], [21.9, 20, 0.2, 0.4],
])

// Arctic coast: cool summers and gales in every month, far more of them in winter.
const LOFOTEN = months([
  [-3.7, 122, 1.2, 13.0], [-2.9, 116, 0.8, 13.0], [-2.3, 98, 0, 12.8], [0.1, 65, 0, 5.4],
  [5.2, 89, 0.2, 6.6], [11.1, 72, 0, 5.4], [15.3, 64, 0.2, 2.8], [13.8, 123, 1.0, 5.0],
  [9.3, 96, 0.2, 8.4], [3.6, 149, 0.6, 9.4], [-0.6, 100, 0.4, 7.2], [-3.1, 119, 0.6, 13.2],
])

describe('climate', () => {
  it('scores how the day feels, how dry the month is and how stormy', () => {
    expect(comfortScore(24, 0, 0, 0)).toBeCloseTo(1)
    expect(comfortScore(18, 0, 0, 0)).toBeCloseTo(1)
    expect(comfortScore(28, 0, 0, 0)).toBeCloseTo(1)
    // Feels like 40 °C: nothing for comfort, full marks for dryness. 11 °C is halfway down the cool side.
    expect(comfortScore(40, 0, 0, 0)).toBeCloseTo(0.4)
    expect(comfortScore(11, 0, 0, 0)).toBeCloseTo(0.7)
    expect(comfortScore(24, 250, 6, 0)).toBeCloseTo(0.6)
    expect(comfortScore(24, 0, 0, 4)).toBeCloseTo(0.7)
    // As windy as the place always is: no penalty.
    expect(comfortScore(24, 0, 0, 4, 4)).toBeCloseTo(1)
  })

  it('no longer calls a wet place good all year round', () => {
    expect(bestMonths(CENTRAL_VIETNAM)).toEqual([0, 1, 2, 3])
    expect(climateWarnings(CENTRAL_VIETNAM)).toEqual({ heat: [], cold: [], rain: [8, 9, 10, 11], wind: [6, 7, 8, 9] })
  })

  it('leaves out the hot, rainy season', () => {
    expect(monthRanges(bestMonths(HANOI))).toEqual([[10, 2]])
    expect(climateWarnings(HANOI).heat).toEqual([4, 5, 6, 7, 8])
    expect(climateWarnings(HANOI).rain).toEqual([5, 6, 7, 8])
    expect(climateWarnings(HANOI).wind).toEqual([])
  })

  it('still finds the summer on a cold, windy coast, and warns only about its stormiest months', () => {
    expect(bestMonths(LOFOTEN)).toEqual([6])
    expect(climateWarnings(LOFOTEN).wind).toEqual([0, 1, 2, 11])
    expect(climateWarnings(LOFOTEN).cold).toEqual([0, 1, 2, 3, 9, 10, 11])
  })

  it('picks the months close to the best one, and none when nothing is pleasant', () => {
    const lisbon = [0.69, 0.76, 0.75, 0.77, 0.9, 0.86, 0.95, 0.97, 0.82, 0.72, 0.75, 0.68].map((score) => ({ score }))
    expect(bestMonths(lisbon)).toEqual([4, 5, 6, 7])
    expect(bestMonths(Array.from({ length: 12 }, () => ({ score: 0.55 })))).toEqual([])
  })

  it('groups months into ranges across the new year', () => {
    expect(monthRanges([4, 5, 6, 7])).toEqual([[4, 7]])
    expect(monthRanges([11, 0, 1])).toEqual([[11, 1]])
    expect(monthRanges([0, 2, 3])).toEqual([[0, 0], [2, 3]])
    expect(monthRanges([])).toEqual([])
    expect(monthRanges(Array.from({ length: 12 }, (_, i) => i))).toEqual([[0, 11]])
  })

  it('averages daily data per month and counts heavy rain and gales per year', () => {
    const [january] = summarizeDaily({
      time: ['2023-01-01', '2023-01-02', '2024-01-01', '2024-01-02', '2024-01-03'],
      temperature_2m_max: [10, 12, 14, 16, null],
      temperature_2m_min: [2, 4, 6, 8, null],
      apparent_temperature_max: [8, 10, null, 14, null],
      precipitation_sum: [0, 25, 1, 0.4, 20],
      wind_gusts_10m_max: [30, 70, 20, 62, null],
      sunshine_duration: [3600, 7200, 0, 3600, null],
    })
    expect(january.tempMax).toBeCloseTo(13)
    expect(january.tempMin).toBeCloseTo(5)
    // A missing "feels like" value falls back to the real high (14); the day without temperatures is skipped.
    expect(january.feelsMax).toBeCloseTo((8 + 10 + 14 + 14) / 4)
    expect(january.rainMm).toBeCloseTo(26.4 / 2)
    expect(january.heavyRainDays).toBeCloseTo(0.5)
    expect(january.windyDays).toBeCloseTo(1)
    expect(january.sunHours).toBeCloseTo(1)
  })
})
