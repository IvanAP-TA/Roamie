import { describe, expect, it } from 'vitest'
import { browserLanguage } from './LanguageHint'

describe('browser language offer', () => {
  it('takes the first language Roamie speaks', () => {
    expect(browserLanguage(['zh-CN', 'es-MX', 'en'])).toBe('es')
    expect(browserLanguage(['it-IT'])).toBe('it')
  })

  it('offers English to a visitor whose languages it does not have', () => {
    expect(browserLanguage(['zh-CN', 'zh'])).toBe('en')
    expect(browserLanguage(['hi-IN'])).toBe('en')
  })

  it('offers nothing when the browser says nothing', () => {
    expect(browserLanguage([])).toBeNull()
  })
})
