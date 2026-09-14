import { describe, expect, it } from 'vitest'
import { balances, convertedCents, settle, shareCents, spentBy, splitCents, totalSpent, type Expense } from './expenses'

const expense = (over: Partial<Expense>): Expense => ({
  id: over.id ?? 'e',
  list_id: 'l',
  kind: 'expense',
  title: 'x',
  amount: 10,
  currency: 'EUR',
  rate: 1,
  paid_by: 'ana',
  spent_on: '2027-07-10',
  category: null,
  created_by: 'ana',
  created_at: '2027-07-10T10:00:00Z',
  expense_shares: [],
  ...over,
})

const equal = (...users: string[]) => users.map((user_id) => ({ user_id, weight: 1 }))

describe('splitCents', () => {
  it('always adds up to the total, giving leftover cents to the largest fractions', () => {
    expect(splitCents(1000, [1, 1, 1])).toEqual([334, 333, 333])
    expect(splitCents(1000, [2, 1])).toEqual([667, 333])
    expect(splitCents(101, [1, 1])).toEqual([51, 50])
    expect(splitCents(1000, [2.5, 7.5])).toEqual([250, 750])
    expect(splitCents(0, [1, 1])).toEqual([0, 0])
  })
})

describe('balances', () => {
  it('converts into the list currency and splits exactly', () => {
    const dinner = expense({ amount: 100, currency: 'USD', rate: 0.9, paid_by: 'ana', expense_shares: equal('ana', 'bo') })
    expect(convertedCents(dinner)).toBe(9000)
    expect(shareCents(dinner)).toEqual(new Map([['ana', 4500], ['bo', 4500]]))
    expect(balances([dinner])).toEqual(new Map([['ana', 4500], ['bo', -4500]]))
  })

  it('a reimbursement settles the debt and is not counted as spending', () => {
    const dinner = expense({ id: 'd', amount: 90, paid_by: 'ana', expense_shares: equal('ana', 'bo') })
    const payback = expense({ id: 'p', kind: 'transfer', amount: 45, paid_by: 'bo', expense_shares: equal('ana') })
    const result = balances([dinner, payback])
    expect([...result.values()].every((cents) => cents === 0)).toBe(true)
    expect(totalSpent([dinner, payback])).toBe(9000)
    expect(spentBy([dinner, payback], 'bo')).toBe(4500)
  })

  it('splits by exact amounts through the weights, regardless of share order', () => {
    const hotel = expense({ amount: 300, paid_by: 'cy', expense_shares: [{ user_id: 'cy', weight: 200 }, { user_id: 'ana', weight: 100 }] })
    expect(shareCents(hotel)).toEqual(new Map([['ana', 10000], ['cy', 20000]]))
  })
})

describe('settle', () => {
  it('finds the fewest transfers and settles everyone to zero', () => {
    const list = [
      expense({ id: '1', amount: 120, paid_by: 'ana', expense_shares: equal('ana', 'bo', 'cy', 'dee') }),
      expense({ id: '2', amount: 60, paid_by: 'bo', expense_shares: equal('ana', 'bo', 'cy', 'dee') }),
      expense({ id: '3', amount: 20, paid_by: 'cy', expense_shares: equal('cy', 'dee') }),
    ]
    const balance = balances(list)
    const transfers = settle(balance)
    expect(transfers).toEqual([
      { from: 'dee', to: 'ana', cents: 5500 },
      { from: 'cy', to: 'ana', cents: 2000 },
      { from: 'cy', to: 'bo', cents: 1500 },
    ])
    for (const { from, to, cents } of transfers) {
      balance.set(from, balance.get(from)! + cents)
      balance.set(to, balance.get(to)! - cents)
    }
    expect([...balance.values()].every((cents) => cents === 0)).toBe(true)
  })

  it('has nothing to do when everyone is even', () => {
    expect(settle(new Map([['ana', 0], ['bo', 0]]))).toEqual([])
  })
})
