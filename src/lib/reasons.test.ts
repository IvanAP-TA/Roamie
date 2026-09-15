import { describe, expect, it } from 'vitest'
import { sortReasons } from './reasons'

const reason = (id: string, created_at: string, likes: number) => ({
  id,
  user_id: 'u1',
  text: id,
  created_at,
  likes: Array.from({ length: likes }, (_, i) => ({ id: `${id}-${i}`, user_id: `u${i}` })),
})

describe('reasons to go', () => {
  const list = [reason('mare', '2026-09-03', 1), reason('voli', '2026-09-01', 0), reason('cibo', '2026-09-02', 3)]

  it('puts the most liked first, then the oldest', () => {
    expect(sortReasons(list, false).map((r) => r.id)).toEqual(['cibo', 'mare', 'voli'])
  })

  it('keeps writing order during a secret vote', () => {
    expect(sortReasons(list, true).map((r) => r.id)).toEqual(['voli', 'cibo', 'mare'])
  })
})
