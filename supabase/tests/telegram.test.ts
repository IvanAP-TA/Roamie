import { beforeAll, describe, expect, it } from 'vitest'
import { as, createDb, createUser, type Db } from './harness'

const OWNER = '11111111-1111-4111-8111-111111111111'
const FRIEND = '22222222-2222-4222-8222-222222222222'
const CHAT = -1001234567890

let db: Db
let tripId: string
let inviteCode: string

const outbox = async () =>
  (await db.query<{ kind: string; data: Record<string, string> }>(`select kind, data from public.telegram_outbox order by id`)).rows

beforeAll(async () => {
  db = await createDb()
  await createUser(db, OWNER, 'Olivia')
  await createUser(db, FRIEND, 'Enzo')
  const [trip] = await as(db, OWNER, (q) => q<{ id: string; invite_code: string }>(`insert into public.trips (name) values ('Estate 2027') returning id, invite_code`))
  tripId = trip.id
  inviteCode = trip.invite_code
  // Before any group is linked, nothing is queued.
  await as(db, OWNER, (q) => q(`insert into public.destinations (trip_id, name) values ($1, 'Oslo')`, [tripId]))
})

describe('telegram groups', () => {
  it('queues nothing for a trip without a linked group', async () => {
    expect(await outbox()).toEqual([])
  })

  it('tells a linked group about proposals, people joining and the wheel', async () => {
    await db.query(`insert into public.telegram_chats (chat_id, trip_id, lang) values ($1, $2, 'it')`, [CHAT, tripId])
    const [destination] = await as(db, OWNER, (q) => q<{ id: string }>(`insert into public.destinations (trip_id, name) values ($1, 'Lisbona') returning id`, [tripId]))
    await as(db, FRIEND, (q) => q(`select public.join_trip($1)`, [inviteCode]))
    await db.query(`update public.destinations set status = 'selected', selected_at = now() where id = $1`, [destination.id])

    expect(await outbox()).toEqual([
      { kind: 'destination', data: { actor: 'Olivia', destination: 'Lisbona' } },
      { kind: 'member', data: { actor: 'Enzo' } },
      { kind: 'roulette', data: { destination: 'Lisbona' } },
    ])
  })

  it('hands the pending messages to the bot once, with the trip they belong to', async () => {
    const first = (await db.query<{ kind: string; trip_name: string; invite_code: string; lang: string }>(`select * from public.claim_telegram_batch(10)`)).rows
    expect(first.map((m) => m.kind)).toEqual(['destination', 'member', 'roulette'])
    expect(first[0]).toMatchObject({ trip_name: 'Estate 2027', invite_code: inviteCode, lang: 'it' })
    expect((await db.query(`select * from public.claim_telegram_batch(10)`)).rows).toEqual([])
  })

  it('is out of reach of the app', async () => {
    await expect(as(db, OWNER, (q) => q(`select * from public.telegram_chats`))).rejects.toThrow(/permission denied/)
    await expect(as(db, OWNER, (q) => q(`select * from public.claim_telegram_batch(10)`))).rejects.toThrow(/permission denied/)
  })
})
