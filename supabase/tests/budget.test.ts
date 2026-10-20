import { beforeAll, describe, expect, it } from 'vitest'
import { as, createDb, createUser, type Db } from './harness'

const OWNER = '11111111-1111-4111-8111-111111111111'
const A = '22222222-2222-4222-8222-222222222222'
const B = '33333333-3333-4333-8333-333333333333'
const STRANGER = '44444444-4444-4444-8444-444444444444'

let db: Db
let tripId: string

const budget = async (user: string) => (await as(db, user, (q) => q<{ group_budget: Record<string, number | null> }>(`select public.group_budget($1)`, [tripId])))[0].group_budget
const answer = (user: string, band: number | null) => as(db, user, (q) => q(`select public.set_my_budget($1, $2::smallint)`, [tripId, band]))

beforeAll(async () => {
  db = await createDb()
  for (const [id, name] of [[OWNER, 'Olivia'], [A, 'Anna'], [B, 'Bruno'], [STRANGER, 'Sam']]) await createUser(db, id, name)
  const [trip] = await as(db, OWNER, (q) => q<{ id: string; invite_code: string }>(`insert into public.trips (name) values ('Estate') returning id, invite_code`))
  tripId = trip.id
  for (const id of [A, B]) await as(db, id, (q) => q(`select public.join_trip($1)`, [trip.invite_code]))
})

describe('secret budget', () => {
  it('keeps the ceiling hidden until three members have answered', async () => {
    await answer(OWNER, 3)
    await answer(A, 2)
    expect(await budget(OWNER)).toEqual({ members: 3, answered: 2, mine: 3, ceiling: null })
    await answer(B, 4)
    expect(await budget(B)).toEqual({ members: 3, answered: 3, mine: 4, ceiling: 2 })
  })

  it('lets each member change or take back only their own answer', async () => {
    await answer(A, null)
    expect(await budget(OWNER)).toMatchObject({ answered: 2, ceiling: null })
    await answer(A, 1)
    expect(await budget(OWNER)).toMatchObject({ answered: 3, ceiling: 1 })
  })

  it("never shows anyone else's answer, not even to the owner", async () => {
    await expect(as(db, OWNER, (q) => q(`select * from public.trip_budgets`))).rejects.toThrow(/permission denied/)
    await expect(budget(STRANGER)).rejects.toThrow(/not_a_member/)
    await expect(answer(STRANGER, 2)).rejects.toThrow(/not_a_member/)
  })
})
