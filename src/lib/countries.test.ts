import { describe, expect, it } from 'vitest'
import data from '@/data/countries.json'
import { countryName, currencyName, languageName, utcLabel, zoneOffset, type CountryTable } from './countries'

const countries = data.countries as unknown as CountryTable

describe('country facts', () => {
  it('cover the world with capitals, money and languages', () => {
    expect(Object.keys(countries).length).toBeGreaterThan(230)
    expect(countries.IT).toMatchObject({ num: '380', currencies: ['EUR'], languages: ['it'], tz: 'Europe/Rome', drive: 'right' })
    expect(countries.GB.drive).toBe('left')
    expect(countries.JP.capitalName?.es).toBe('Tokio')
    for (const [code, facts] of Object.entries(countries)) {
      expect(Math.abs(facts.capital[0]), code).toBeLessThanOrEqual(90)
      expect(Math.abs(facts.capital[1]), code).toBeLessThanOrEqual(180)
    }
  })

  it('names things in the reader’s language', () => {
    expect(countryName('PT', 'it')).toBe('Portogallo')
    expect(currencyName('JPY', 'en')).toBe('Japanese Yen')
    expect(languageName('pt', 'it')).toBe('Portoghese')
  })

  it('writes and reads UTC offsets', () => {
    expect(utcLabel([60, 60])).toBe('UTC+1')
    expect(utcLabel([330, 330])).toBe('UTC+5:30')
    expect(utcLabel([-600, -300])).toBe('UTC−10 … UTC−5')
    expect(zoneOffset('Asia/Kolkata')).toBe(330)
    expect(zoneOffset('Europe/Rome', new Date('2026-01-15T12:00:00Z'))).toBe(60)
    expect(zoneOffset('Europe/Rome', new Date('2026-07-15T12:00:00Z'))).toBe(120)
    expect(zoneOffset('Not/AZone')).toBeNull()
  })
})
