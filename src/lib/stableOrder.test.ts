import { describe, expect, it } from 'vitest'
import { keepOrder } from './stableOrder'

const ids = (items: { id: string }[]) => items.map((item) => item.id)
const of = (...list: string[]) => list.map((id) => ({ id }))

describe('keepOrder', () => {
  it('keeps the shown order when a vote would move a card up', () => {
    // Freshly sorted by points, "c" now leads; the list on screen stays a, b, c.
    expect(ids(keepOrder(of('c', 'a', 'b'), ['a', 'b', 'c']))).toEqual(['a', 'b', 'c'])
  })

  it('puts new items first and drops removed ones', () => {
    expect(ids(keepOrder(of('b', 'new', 'c'), ['a', 'b', 'c']))).toEqual(['new', 'b', 'c'])
  })

  it('returns the given order when nothing was shown yet', () => {
    expect(ids(keepOrder(of('c', 'a'), []))).toEqual(['c', 'a'])
  })
})
