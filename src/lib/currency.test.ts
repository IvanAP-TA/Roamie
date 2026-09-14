import { describe, expect, it } from 'vitest'
import { amountInput, currencyOptions, formatMoney, parseAmount, parseRate } from './currency'

describe('money input', () => {
  it('accepts a decimal comma or point, up to two decimals', () => {
    expect(parseAmount('12,50')).toBe(12.5)
    expect(parseAmount(' 1200 ')).toBe(1200)
    expect(parseAmount('0.99')).toBe(0.99)
    for (const bad of ['', '0', '-3', '12,345', '1.234,50', 'abc']) expect(parseAmount(bad)).toBeNull()
    expect(parseRate('0,87489')).toBe(0.87489)
    expect(parseRate('0')).toBeNull()
  })

  it('round-trips amounts for editing in the user language', () => {
    expect(amountInput(12.5, 'it')).toBe('12,50')
    expect(amountInput(40, 'en')).toBe('40')
    expect(parseAmount(amountInput(1234.56, 'es'))).toBe(1234.56)
  })

  it('formats cents and lists common currencies first', () => {
    expect(formatMoney(12450, 'EUR', 'it')).toMatch(/124,50\s€/)
    const { common, rest } = currencyOptions('it')
    expect(common[0].code).toBe('EUR')
    expect(common.find((c) => c.code === 'USD')?.label).toContain('dollaro')
    expect(rest.some((c) => c.code === 'EUR')).toBe(false)
  })
})
