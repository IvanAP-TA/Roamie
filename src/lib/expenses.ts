/**
 * Shared expenses: conversion into the list currency, exact splits in cents, balances and the fewest
 * transfers that settle them. Everything is integer cents, so parts always add up to the total.
 */

export const EXPENSE_CATEGORIES = ['food', 'stay', 'transport', 'activity', 'shopping', 'other'] as const
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

export interface ExpenseShare {
  user_id: string
  weight: number
}

export interface Expense {
  id: string
  list_id: string
  kind: 'expense' | 'transfer'
  title: string
  amount: number
  currency: string
  /** Units of the list currency for one unit of the expense currency */
  rate: number
  paid_by: string | null
  /** yyyy-mm-dd */
  spent_on: string
  category: ExpenseCategory | null
  created_by: string | null
  created_at: string
  expense_shares: ExpenseShare[]
}

export interface ExpenseList {
  id: string
  trip_id: string
  name: string
  currency: string
  created_by: string | null
  created_at: string
  expenses: Expense[]
}

export const toCents = (amount: number) => Math.round(amount * 100)

/** The expense in the list currency, in cents. */
export const convertedCents = (expense: Pick<Expense, 'amount' | 'rate'>) => Math.round(expense.amount * 100 * expense.rate)

/**
 * Splits `total` cents proportionally to `weights`. Leftover cents go to the largest fractional parts
 * (ties: earliest first), so the parts always add up to exactly `total`.
 */
export function splitCents(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0)
  if (sum <= 0 || total <= 0) return weights.map(() => 0)
  const exact = weights.map((weight) => (total * weight) / sum)
  const parts = exact.map((value) => Math.floor(value))
  let leftover = total - parts.reduce((a, b) => a + b, 0)
  const byFraction = exact.map((value, index) => ({ fraction: value - Math.floor(value), index })).sort((a, b) => b.fraction - a.fraction || a.index - b.index)
  for (const { index } of byFraction) {
    if (leftover <= 0) break
    parts[index]++
    leftover--
  }
  return parts
}

/** Shares in a stable order, so every client splits the leftover cents the same way. */
const orderedShares = (expense: Pick<Expense, 'expense_shares'>) => [...expense.expense_shares].sort((a, b) => a.user_id.localeCompare(b.user_id))

/** Each member's part of an expense, in cents of the list currency. */
export function shareCents(expense: Pick<Expense, 'amount' | 'rate' | 'expense_shares'>): Map<string, number> {
  const shares = orderedShares(expense)
  const parts = splitCents(convertedCents(expense), shares.map((s) => s.weight))
  return new Map(shares.map((share, index) => [share.user_id, parts[index]]))
}

/** Positive: the group owes this member; negative: they owe the group. Cents of the list currency. */
export function balances(expenses: Expense[]): Map<string, number> {
  const result = new Map<string, number>()
  const add = (userId: string, cents: number) => result.set(userId, (result.get(userId) ?? 0) + cents)
  for (const expense of expenses) {
    if (expense.paid_by) add(expense.paid_by, convertedCents(expense))
    for (const [userId, cents] of shareCents(expense)) add(userId, -cents)
  }
  return result
}

/** What the group spent, in cents of the list currency (reimbursements excluded). */
export const totalSpent = (expenses: Expense[]) => expenses.reduce((sum, e) => (e.kind === 'expense' ? sum + convertedCents(e) : sum), 0)

/** What a member consumed (their shares of real expenses), in cents. */
export const spentBy = (expenses: Expense[], userId: string) =>
  expenses.reduce((sum, e) => (e.kind === 'expense' ? sum + (shareCents(e).get(userId) ?? 0) : sum), 0)

export interface Transfer {
  from: string
  to: string
  cents: number
}

/** The transfers that settle all balances: the largest debt pays the largest credit first. */
export function settle(balance: Map<string, number>): Transfer[] {
  const byAmount = (a: { user: string; cents: number }, b: { user: string; cents: number }) => b.cents - a.cents || a.user.localeCompare(b.user)
  const creditors = [...balance].filter(([, cents]) => cents > 0).map(([user, cents]) => ({ user, cents })).sort(byAmount)
  const debtors = [...balance].filter(([, cents]) => cents < 0).map(([user, cents]) => ({ user, cents: -cents })).sort(byAmount)

  const transfers: Transfer[] = []
  let c = 0
  let d = 0
  while (c < creditors.length && d < debtors.length) {
    const cents = Math.min(creditors[c].cents, debtors[d].cents)
    if (cents > 0) transfers.push({ from: debtors[d].user, to: creditors[c].user, cents })
    creditors[c].cents -= cents
    debtors[d].cents -= cents
    if (creditors[c].cents === 0) c++
    if (debtors[d].cents === 0) d++
  }
  return transfers
}
