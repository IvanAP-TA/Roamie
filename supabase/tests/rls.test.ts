import { beforeAll, describe, expect, it } from 'vitest'
import { as, createDb, createGuest, createUser, type Db } from './harness'

const OWNER = '11111111-1111-4111-8111-111111111111'
const EDITOR = '22222222-2222-4222-8222-222222222222'
const VIEWER = '33333333-3333-4333-8333-333333333333'
const STRANGER = '44444444-4444-4444-8444-444444444444'

let db: Db
let tripId: string
let inviteCode: string
let destId: string

async function rejects(p: Promise<unknown>, pattern: RegExp) {
  await expect(p).rejects.toThrow(pattern)
}

beforeAll(async () => {
  db = await createDb()
  for (const [id, name] of [
    [OWNER, 'Olivia'],
    [EDITOR, 'Enzo'],
    [VIEWER, 'Vera'],
    [STRANGER, 'Sam'],
  ]) {
    await createUser(db, id, name)
  }

  const [trip] = await as(db, OWNER, (q) =>
    q<{ id: string; invite_code: string }>(
      `insert into public.trips (name, description) values ('Estate 2027', 'Mare o montagna?') returning id, invite_code`,
    ),
  )
  tripId = trip.id
  inviteCode = trip.invite_code
})

describe('profiles & trips', () => {
  it('creates a profile from Google metadata', async () => {
    const { rows } = await db.query<{ display_name: string; avatar_url: string }>(
      `select display_name, avatar_url from public.profiles where id = $1`,
      [OWNER],
    )
    expect(rows[0]).toEqual({ display_name: 'Olivia', avatar_url: 'https://lh3.googleusercontent.com/a/Olivia' })
  })

  it('generates an 8-char invite code and makes the creator owner', async () => {
    expect(inviteCode).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/)
    const members = await as(db, OWNER, (q) => q(`select user_id, role from public.trip_members where trip_id = $1`, [tripId]))
    expect(members).toEqual([{ user_id: OWNER, role: 'owner' }])
  })

  it('hides trips from non-members', async () => {
    const rows = await as(db, STRANGER, (q) => q(`select id from public.trips`))
    expect(rows).toHaveLength(0)
  })

  it('cannot create a trip for someone else', async () => {
    await rejects(
      as(db, STRANGER, (q) => q(`insert into public.trips (name, owner_id) values ('x', $1)`, [OWNER])),
      /row-level security/,
    )
  })
})

describe('hardening', () => {
  it('anon cannot call the RLS helpers', async () => {
    await rejects(as(db, null, (q) => q(`select public.is_trip_member($1)`, [tripId])), /permission denied/)
    await rejects(as(db, null, (q) => q(`select public.shares_trip_with($1)`, [OWNER])), /permission denied/)
  })

  it('only accepts Wikimedia photos or illustrated scenes as images', async () => {
    const setCover = (url: string) =>
      as(db, OWNER, (q) => q(`update public.trips set cover_image_url = $1 where id = $2`, [url, tripId]))
    await setCover('scene:3')
    await setCover('https://thumb.wikimedia.org/wikipedia/commons/thumb/b/ba/Beijing_(China).jpg/1280px-Beijing_(China).jpg')
    await setCover('https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Lisboa_(Portugal).jpg/1280px-Lisboa_(Portugal).jpg')
    for (const bad of [
      'https://evil.example/pixel.gif',
      "https://upload.wikimedia.org/x.jpg');position:fixed",
      'javascript:alert(1)',
    ]) {
      await rejects(setCover(bad), /check constraint/)
    }
  })

  it('drops non-Google avatars and caps display names', async () => {
    await as(db, STRANGER, (q) =>
      q(`update public.profiles set avatar_url = 'https://evil.example/me.png', display_name = $1 where id = $2`, [
        'x'.repeat(200),
        STRANGER,
      ]),
    )
    const [profile] = await as(db, STRANGER, (q) =>
      q<{ avatar_url: string | null; display_name: string }>(`select avatar_url, display_name from public.profiles where id = $1`, [STRANGER]),
    )
    expect(profile.avatar_url).toBeNull()
    expect(profile.display_name).toHaveLength(80)
  })
})

describe('invites', () => {
  it('anon sees a minimal preview, case-insensitively', async () => {
    const rows = await as(db, null, (q) => q(`select * from public.get_trip_preview($1)`, [inviteCode.toLowerCase()]))
    expect(rows).toEqual([
      expect.objectContaining({ id: tripId, name: 'Estate 2027', member_count: 1, is_member: false }),
    ])
    expect(rows[0]).not.toHaveProperty('description')
  })

  it('anon cannot join or read tables', async () => {
    await rejects(as(db, null, (q) => q(`select public.join_trip($1)`, [inviteCode])), /permission denied/)
    await rejects(as(db, null, (q) => q(`select * from public.trips`)), /permission denied/)
  })

  it('users join as editors; joining twice is a no-op', async () => {
    for (const uid of [EDITOR, VIEWER, EDITOR]) {
      const [row] = await as(db, uid, (q) => q<{ join_trip: string }>(`select public.join_trip($1)`, [inviteCode]))
      expect(row.join_trip).toBe(tripId)
    }
    const members = await as(db, EDITOR, (q) =>
      q(`select user_id, role from public.trip_members where trip_id = $1 order by joined_at`, [tripId]),
    )
    expect(members).toHaveLength(3)
    expect(members.every((m) => m.role !== 'viewer')).toBe(true)
  })

  it('rejects invalid codes', async () => {
    await rejects(as(db, STRANGER, (q) => q(`select public.join_trip('NOPE0000')`)), /invalid_invite_code/)
  })

  it('only the owner changes roles; nobody can promote to owner', async () => {
    await as(db, OWNER, (q) => q(`update public.trip_members set role = 'viewer' where user_id = $1`, [VIEWER]))
    const changed = await as(db, EDITOR, (q) =>
      q(`update public.trip_members set role = 'viewer' where user_id = $1 returning id`, [VIEWER]),
    )
    expect(changed).toHaveLength(0)
    await rejects(
      as(db, OWNER, (q) => q(`update public.trip_members set role = 'owner' where user_id = $1`, [EDITOR])),
      /row-level security/,
    )
    const [role] = await as(db, VIEWER, (q) => q<{ role: string }>(`select role from public.trip_members where user_id = $1`, [VIEWER]))
    expect(role.role).toBe('viewer')
  })

  it('members see co-member profiles, strangers do not', async () => {
    expect(await as(db, VIEWER, (q) => q(`select id from public.profiles`))).toHaveLength(3)
    expect(await as(db, STRANGER, (q) => q(`select id from public.profiles`))).toEqual([{ id: STRANGER }])
  })

  it('regenerating the code invalidates the old one (owner only)', async () => {
    await rejects(as(db, EDITOR, (q) => q(`select public.regenerate_invite_code($1)`, [tripId])), /forbidden/)
    const [row] = await as(db, OWNER, (q) =>
      q<{ regenerate_invite_code: string }>(`select public.regenerate_invite_code($1)`, [tripId]),
    )
    expect(row.regenerate_invite_code).not.toBe(inviteCode)
    expect(await as(db, null, (q) => q(`select * from public.get_trip_preview($1)`, [inviteCode]))).toHaveLength(0)
    inviteCode = row.regenerate_invite_code
  })
})

describe('destinations, votes & comments', () => {
  it('editors add destinations, viewers cannot', async () => {
    const [d] = await as(db, EDITOR, (q) =>
      q<{ id: string; created_by: string }>(
        `insert into public.destinations (trip_id, name, mood, budget_level) values ($1, 'Lisbona', '{culture,food_wine}', 2) returning id, created_by`,
        [tripId],
      ),
    )
    destId = d.id
    expect(d.created_by).toBe(EDITOR)
    await rejects(
      as(db, VIEWER, (q) => q(`insert into public.destinations (trip_id, name) values ($1, 'Oslo')`, [tripId])),
      /row-level security/,
    )
  })

  it('rejects unknown mood tags', async () => {
    await rejects(
      as(db, EDITOR, (q) => q(`insert into public.destinations (trip_id, name, mood) values ($1, 'X', '{party}')`, [tripId])),
      /check constraint/,
    )
  })

  it('viewers cannot edit or delete destinations; trip_id is immutable', async () => {
    const updated = await as(db, VIEWER, (q) => q(`update public.destinations set name = 'Hack' where id = $1 returning id`, [destId]))
    expect(updated).toHaveLength(0)
    const deleted = await as(db, VIEWER, (q) => q(`delete from public.destinations where id = $1 returning id`, [destId]))
    expect(deleted).toHaveLength(0)
    await rejects(
      as(db, EDITOR, (q) => q(`update public.destinations set trip_id = gen_random_uuid() where id = $1`, [destId])),
      /permission denied/,
    )
  })

  it('set_points allocates, changes and removes points, returning what is left', async () => {
    const setPoints = (uid: string, points: number) =>
      as(db, uid, (q) => q<{ set_points: number }>(`select public.set_points($1, $2)`, [destId, points]))
    expect((await setPoints(VIEWER, 4))[0].set_points).toBe(6)
    expect((await setPoints(VIEWER, 7))[0].set_points).toBe(3)
    expect((await setPoints(VIEWER, 0))[0].set_points).toBe(10)
    await rejects(setPoints(VIEWER, 11), /invalid_points/)
    await setPoints(VIEWER, 3)
    await setPoints(EDITOR, 5)
    const votes = await as(db, OWNER, (q) => q(`select user_id, points from public.votes where destination_id = $1`, [destId]))
    expect(votes).toHaveLength(2)
  })

  it('nobody can spend more than 10 points in a trip', async () => {
    const [other] = await as(db, EDITOR, (q) =>
      q<{ id: string }>(`insert into public.destinations (trip_id, name) values ($1, 'Siviglia') returning id`, [tripId]),
    )
    await rejects(as(db, EDITOR, (q) => q(`select public.set_points($1, 6)`, [other.id])), /points_budget_exceeded/)
    const [row] = await as(db, EDITOR, (q) => q<{ set_points: number }>(`select public.set_points($1, 5)`, [other.id]))
    expect(row.set_points).toBe(0)
    await rejects(as(db, EDITOR, (q) => q(`update public.votes set points = 6 where destination_id = $1`, [other.id])), /points_budget_exceeded/)
    await as(db, EDITOR, (q) => q(`delete from public.destinations where id = $1`, [other.id]))
  })

  it('strangers cannot vote, read votes or comment', async () => {
    await rejects(as(db, STRANGER, (q) => q(`select public.set_points($1, 1)`, [destId])), /row-level security/)
    expect(await as(db, STRANGER, (q) => q(`select id from public.votes`))).toHaveLength(0)
    await rejects(
      as(db, STRANGER, (q) => q(`insert into public.comments (destination_id, content) values ($1, 'hi')`, [destId])),
      /row-level security/,
    )
  })

  it('viewers comment; only author edits; owner moderates', async () => {
    const [c] = await as(db, VIEWER, (q) =>
      q<{ id: string }>(`insert into public.comments (destination_id, content) values ($1, 'Pastéis de nata!') returning id`, [destId]),
    )
    const editedByOther = await as(db, EDITOR, (q) => q(`update public.comments set content = 'x' where id = $1 returning id`, [c.id]))
    expect(editedByOther).toHaveLength(0)
    const deletedByEditor = await as(db, EDITOR, (q) => q(`delete from public.comments where id = $1 returning id`, [c.id]))
    expect(deletedByEditor).toHaveLength(0)
    const deletedByOwner = await as(db, OWNER, (q) => q(`delete from public.comments where id = $1 returning id`, [c.id]))
    expect(deletedByOwner).toHaveLength(1)
  })
})

describe('roulette', () => {
  let porto: string
  let berlin: string

  beforeAll(async () => {
    const rows = await as(db, EDITOR, (q) =>
      q<{ id: string; name: string }>(
        `insert into public.destinations (trip_id, name) values ($1, 'Porto'), ($1, 'Berlino') returning id, name`,
        [tripId],
      ),
    )
    porto = rows.find((r) => r.name === 'Porto')!.id
    berlin = rows.find((r) => r.name === 'Berlino')!.id
    // Porto and Berlino: no points (not eligible). Lisbona: 3 + 5 points (eligible).
    expect(porto).toBeTruthy()
    expect(berlin).toBeTruthy()
  })

  it('viewers cannot spin', async () => {
    await rejects(as(db, VIEWER, (q) => q(`select public.spin_roulette($1)`, [tripId])), /forbidden/)
  })

  it('only picks proposed destinations with a positive net score, then marks it selected', async () => {
    const [row] = await as(db, EDITOR, (q) => q<{ spin_roulette: string }>(`select public.spin_roulette($1)`, [tripId]))
    expect(row.spin_roulette).toBe(destId)
    const [d] = await as(db, OWNER, (q) =>
      q<{ status: string; selected_at: string | null }>(`select status, selected_at from public.destinations where id = $1`, [destId]),
    )
    expect(d.status).toBe('selected')
    expect(d.selected_at).not.toBeNull()
  })

  it('fails when nothing is eligible anymore', async () => {
    await rejects(as(db, OWNER, (q) => q(`select public.spin_roulette($1)`, [tripId])), /no_eligible_destinations/)
  })

  it('draws proportionally to the net score', async () => {
    // Fresh trip: A = +3, B = +1 → expect ≈75% A.
    await db.query(`insert into auth.users (id, email) select gen_random_uuid(), 'bulk' || g || '@x.io' from generate_series(1, 3) g`)
    const { rows: voters } = await db.query<{ id: string }>(`select id from public.profiles where display_name like 'bulk%'`)
    const [t] = await as(db, OWNER, (q) => q<{ id: string }>(`insert into public.trips (name) values ('Stats') returning id`))
    await db.query(`insert into public.trip_members (trip_id, user_id) select $1, unnest($2::uuid[])`, [t.id, voters.map((v) => v.id)])
    const [a, b] = await as(db, OWNER, (q) =>
      q<{ id: string }>(`insert into public.destinations (trip_id, name) values ($1, 'A'), ($1, 'B') returning id`, [t.id]),
    )
    await db.query(`insert into public.votes (destination_id, user_id, points) select $1, unnest($2::uuid[]), 1`, [
      a.id,
      voters.map((v) => v.id),
    ])
    await db.query(`insert into public.votes (destination_id, user_id, points) values ($1, $2, 1)`, [b.id, voters[0].id])

    let aWins = 0
    const N = 400
    for (let i = 0; i < N; i++) {
      const [row] = await as(db, OWNER, (q) => q<{ spin_roulette: string }>(`select public.spin_roulette($1)`, [t.id]))
      if (row.spin_roulette === a.id) aWins++
      await db.query(`update public.destinations set status = 'proposed' where trip_id = $1`, [t.id])
    }
    expect(aWins / N).toBeGreaterThan(0.65)
    expect(aWins / N).toBeLessThan(0.85)
  })
})

describe('scheduled spins', () => {
  const inAnHour = () => new Date(Date.now() + 60 * 60 * 1000).toISOString()
  const spinAt = async (trip: string) =>
    (await db.query<{ roulette_spin_at: string | null }>(`select roulette_spin_at from public.trips where id = $1`, [trip])).rows[0].roulette_spin_at
  let withPoints: string
  let pointless: string
  let winner: string

  beforeAll(async () => {
    const [a] = await as(db, OWNER, (q) => q<{ id: string }>(`insert into public.trips (name) values ('Ruota programmata') returning id`))
    const [b] = await as(db, OWNER, (q) => q<{ id: string }>(`insert into public.trips (name) values ('Nessun punto') returning id`))
    withPoints = a.id
    pointless = b.id
    const [d] = await as(db, OWNER, (q) => q<{ id: string }>(`insert into public.destinations (trip_id, name) values ($1, 'Siviglia') returning id`, [withPoints]))
    winner = d.id
    await db.query(`insert into public.votes (destination_id, user_id, points) values ($1, $2, 3)`, [winner, OWNER])
    await as(db, OWNER, (q) => q(`insert into public.destinations (trip_id, name) values ($1, 'Senza voti')`, [pointless]))
  })

  it('lets owners and editors schedule a time ahead, and nobody set it directly', async () => {
    await rejects(as(db, VIEWER, (q) => q(`select public.schedule_roulette($1, $2)`, [tripId, inAnHour()])), /forbidden/)
    await rejects(as(db, STRANGER, (q) => q(`select public.schedule_roulette($1, $2)`, [tripId, inAnHour()])), /forbidden/)
    await rejects(as(db, EDITOR, (q) => q(`select public.schedule_roulette($1, now() - interval '1 hour')`, [tripId])), /invalid_spin_time/)
    await rejects(as(db, EDITOR, (q) => q(`select public.schedule_roulette($1, now() + interval '2 years')`, [tripId])), /invalid_spin_time/)

    await as(db, EDITOR, (q) => q(`select public.schedule_roulette($1, $2)`, [tripId, inAnHour()]))
    const [seen] = await as(db, VIEWER, (q) => q<{ roulette_spin_at: string | null }>(`select roulette_spin_at from public.trips where id = $1`, [tripId]))
    expect(seen.roulette_spin_at).not.toBeNull()
    await rejects(as(db, EDITOR, (q) => q(`update public.trips set roulette_spin_at = now() where id = $1`, [tripId])), /permission denied/)
    await rejects(as(db, EDITOR, (q) => q(`select public.run_scheduled_spins()`)), /permission denied/)

    // Without a time: cancelled.
    await as(db, EDITOR, (q) => q(`select public.schedule_roulette($1)`, [tripId]))
    expect(await spinAt(tripId)).toBeNull()
  })

  it('spins trips whose time has come once, and lets a schedule with nothing to draw lapse', async () => {
    await db.query(`update public.trips set roulette_spin_at = now() - interval '1 minute' where id = any($1::uuid[])`, [[withPoints, pointless]])
    const { rows } = await db.query<{ run_scheduled_spins: number }>(`select public.run_scheduled_spins()`)
    expect(rows[0].run_scheduled_spins).toBe(1)

    const [d] = (await db.query<{ status: string }>(`select status from public.destinations where id = $1`, [winner])).rows
    expect(d.status).toBe('selected')
    expect(await spinAt(withPoints)).toBeNull()
    expect(await spinAt(pointless)).toBeNull()
    expect((await db.query<{ run_scheduled_spins: number }>(`select public.run_scheduled_spins()`)).rows[0].run_scheduled_spins).toBe(0)
  })

  it('a spin by hand replaces the scheduled one', async () => {
    await db.query(`update public.destinations set status = 'proposed' where id = $1`, [winner])
    await as(db, OWNER, (q) => q(`select public.schedule_roulette($1, $2)`, [withPoints, inAnHour()]))
    await as(db, OWNER, (q) => q(`select public.spin_roulette($1)`, [withPoints]))
    expect(await spinAt(withPoints)).toBeNull()
  })
})

describe('secret voting and the live wheel', () => {
  let trip: string
  let lisbon: string
  let oslo: string
  const pointsOf = (user: string) =>
    as(db, user, (q) => q<{ user_id: string; points: number }>(`select v.user_id, v.points from public.votes v join public.destinations d on d.id = v.destination_id where d.trip_id = $1`, [trip]))
  const give = (user: string, destination: string, points: number) =>
    as(db, user, (q) => q(`select public.set_points($1, $2)`, [destination, points]))
  const revealedAt = async () =>
    (await db.query<{ votes_revealed_at: string | null }>(`select votes_revealed_at from public.trips where id = $1`, [trip])).rows[0].votes_revealed_at

  beforeAll(async () => {
    const [t] = await as(db, OWNER, (q) => q<{ id: string }>(`insert into public.trips (name) values ('Voto segreto') returning id`))
    trip = t.id
    await db.query(`insert into public.trip_members (trip_id, user_id, role) values ($1, $2, 'editor'), ($1, $3, 'viewer')`, [trip, EDITOR, VIEWER])
    const rows = await as(db, OWNER, (q) =>
      q<{ id: string; name: string }>(`insert into public.destinations (trip_id, name) values ($1, 'Lisbona'), ($1, 'Oslo') returning id, name`, [trip]),
    )
    lisbon = rows.find((r) => r.name === 'Lisbona')!.id
    oslo = rows.find((r) => r.name === 'Oslo')!.id
  })

  it('lets owners and editors run a secret round, in which members see only their own points', async () => {
    await rejects(as(db, VIEWER, (q) => q(`select public.set_secret_voting($1, true)`, [trip])), /forbidden/)
    await as(db, EDITOR, (q) => q(`select public.set_secret_voting($1, true)`, [trip]))
    await give(OWNER, lisbon, 4)
    await give(VIEWER, lisbon, 3)

    expect((await pointsOf(OWNER)).map((v) => v.user_id)).toEqual([OWNER])
    expect((await pointsOf(VIEWER)).map((v) => v.user_id)).toEqual([VIEWER])

    // Not even the public page gives them away.
    await db.query(`update public.trips set public_slug = 'voto-segreto' where id = $1`, [trip])
    const [page] = await as(db, null, (q) => q<{ get_public_trip: { destinations: { name: string; points: number | null }[] } }>(`select public.get_public_trip('voto-segreto')`))
    expect(page.get_public_trip.destinations.find((d) => d.name === 'Lisbona')?.points).toBeNull()

    const [progress] = await as(db, VIEWER, (q) => q<{ voted: number; done: number; members: number }>(`select * from public.vote_progress($1)`, [trip]))
    expect(progress).toEqual({ voted: 2, done: 0, members: 3 })
    await rejects(as(db, STRANGER, (q) => q(`select * from public.vote_progress($1)`, [trip])), /forbidden/)

    await rejects(as(db, VIEWER, (q) => q(`select public.reveal_votes($1)`, [trip])), /forbidden/)
    await as(db, EDITOR, (q) => q(`select public.reveal_votes($1)`, [trip]))
    expect(await revealedAt()).not.toBeNull()
    expect(await pointsOf(OWNER)).toHaveLength(2)
  })

  it('reveals by itself once every member has used all their points', async () => {
    await as(db, OWNER, (q) => q(`select public.set_secret_voting($1, true)`, [trip]))
    expect(await pointsOf(OWNER)).toHaveLength(1)
    await give(OWNER, lisbon, 10)
    await give(VIEWER, oslo, 7)
    expect(await revealedAt()).toBeNull()
    await give(EDITOR, oslo, 10)
    expect(await revealedAt()).not.toBeNull()
    expect(await pointsOf(VIEWER)).toHaveLength(4)
  })

  it('records the wheel of every spin for all members, and a spin ends a secret round', async () => {
    await as(db, OWNER, (q) => q(`select public.set_secret_voting($1, true)`, [trip]))
    await as(db, VIEWER, (q) => q(`select public.save_push_subscription('https://fcm.googleapis.com/fcm/send/live', $1, $2, 'it')`, [`B${'A'.repeat(86)}`, 'A'.repeat(22)]))

    const [{ spin_roulette: winner }] = await as(db, EDITOR, (q) => q<{ spin_roulette: string }>(`select public.spin_roulette($1)`, [trip]))
    const spins = await as(db, VIEWER, (q) =>
      q<{ winner_id: string; entries: { id: string; name: string; points: number }[]; landing: number; revealed_votes: boolean; spun_by: string }>(
        `select winner_id, entries, landing, revealed_votes, spun_by from public.roulette_spins where trip_id = $1`,
        [trip],
      ),
    )
    expect(spins).toHaveLength(1)
    const [spin] = spins
    expect(spin.winner_id).toBe(winner)
    // Oslo 7 + 10 = 17 before Lisbona 10 + 3 = 13: slices in drawing order, with the points as drawn.
    expect(spin.entries).toEqual([
      { id: oslo, name: 'Oslo', points: 17 },
      { id: lisbon, name: 'Lisbona', points: 13 },
    ])
    expect(spin.landing).toBeGreaterThanOrEqual(0)
    expect(spin.landing).toBeLessThan(1)
    expect(spin).toMatchObject({ revealed_votes: true, spun_by: EDITOR })
    expect(await revealedAt()).not.toBeNull()

    expect(await as(db, STRANGER, (q) => q(`select id from public.roulette_spins where trip_id = $1`, [trip]))).toHaveLength(0)
    await rejects(
      as(db, OWNER, (q) => q(`insert into public.roulette_spins (trip_id, entries, landing) values ($1, '[]', 0.5)`, [trip])),
      /permission denied/,
    )

    // The result notification waits for the wheel to stop.
    const { rows: queued } = await db.query<{ delay: number }>(
      `select extract(epoch from send_after - created_at)::float as delay from public.push_outbox where kind = 'roulette' and trip_id = $1`,
      [trip],
    )
    expect(queued).toHaveLength(1)
    expect(queued[0].delay).toBeGreaterThanOrEqual(10)
    const claimed = await db.transaction(async (tx) => {
      await tx.exec('set local role service_role')
      return (await tx.query(`select * from public.claim_push_batch()`)).rows
    })
    expect(claimed).toHaveLength(0)

    await db.exec(`delete from public.push_outbox; delete from public.push_subscriptions;`)
  })
})

describe('reasons to go', () => {
  let trip: string
  let dest: string
  // Like counts as the member sees them (the count runs under their own permissions).
  const reasons = (user: string) =>
    as(db, user, (q) =>
      q<{ id: string; text: string; likes: number }>(
        `select r.id, r.text, (select count(*)::int from public.reason_likes l where l.reason_id = r.id) as likes
         from public.destination_reasons r where r.destination_id = $1 order by r.created_at, r.text`,
        [dest],
      ),
    )
  const add = (user: string, text: string) =>
    as(db, user, (q) => q<{ id: string }>(`insert into public.destination_reasons (destination_id, text) values ($1, $2) returning id`, [dest, text]))

  beforeAll(async () => {
    const [t] = await as(db, OWNER, (q) => q<{ id: string }>(`insert into public.trips (name) values ('Motivi') returning id`))
    trip = t.id
    await db.query(`insert into public.trip_members (trip_id, user_id, role) values ($1, $2, 'editor'), ($1, $3, 'viewer')`, [trip, EDITOR, VIEWER])
    const [d] = await as(db, OWNER, (q) => q<{ id: string }>(`insert into public.destinations (trip_id, name) values ($1, 'Porto') returning id`, [trip]))
    dest = d.id
  })

  it('lets members write up to 3 reasons each, readable only within the trip', async () => {
    for (const text of ['Voli a 40€', 'Si mangia benissimo', 'Il mare a due passi']) await add(VIEWER, text)
    await rejects(add(VIEWER, 'Un quarto'), /reasons_limit/)
    await add(EDITOR, 'Costa poco')
    await rejects(add(EDITOR, '   '), /check constraint/)
    await rejects(add(EDITOR, 'x'.repeat(121)), /check constraint/)
    await rejects(add(STRANGER, 'Intruso'), /row-level security/)
    await rejects(
      as(db, VIEWER, (q) => q(`insert into public.destination_reasons (destination_id, user_id, text) values ($1, $2, 'A nome suo')`, [dest, EDITOR])),
      /row-level security/,
    )
    expect(await reasons(STRANGER)).toHaveLength(0)
    expect(await reasons(OWNER)).toHaveLength(4)

    // Only the author or the trip owner removes a reason.
    const costa = (await reasons(OWNER)).find((r) => r.text === 'Costa poco')!
    expect(await as(db, VIEWER, (q) => q(`delete from public.destination_reasons where id = $1 returning id`, [costa.id]))).toHaveLength(0)
    expect(await as(db, OWNER, (q) => q(`delete from public.destination_reasons where id = $1 returning id`, [costa.id]))).toHaveLength(1)
  })

  it('hides who liked what during a secret vote, until the reveal', async () => {
    const voli = (await reasons(OWNER)).find((r) => r.text === 'Voli a 40€')!
    const like = (user: string) => as(db, user, (q) => q(`insert into public.reason_likes (reason_id) values ($1)`, [voli.id]))
    const likesSeenBy = async (user: string) => (await reasons(user)).find((r) => r.id === voli.id)?.likes
    await like(OWNER)
    await rejects(like(OWNER), /duplicate key/)
    await rejects(like(STRANGER), /row-level security/)
    expect(await likesSeenBy(EDITOR)).toBe(1)

    await as(db, OWNER, (q) => q(`select public.set_secret_voting($1, true)`, [trip]))
    await like(EDITOR)
    expect(await likesSeenBy(VIEWER)).toBe(0)
    expect(await likesSeenBy(EDITOR)).toBe(1)
    expect(await likesSeenBy(OWNER)).toBe(1)
    expect(await as(db, VIEWER, (q) => q(`delete from public.reason_likes where reason_id = $1 returning id`, [voli.id]))).toHaveLength(0)

    await as(db, OWNER, (q) => q(`select public.reveal_votes($1)`, [trip]))
    expect(await likesSeenBy(VIEWER)).toBe(2)
  })
})

describe('itinerary', () => {
  it('editors build days and items, viewers only read', async () => {
    const [day] = await as(db, EDITOR, (q) =>
      q<{ id: string }>(`insert into public.itinerary_days (trip_id, day_number, title) values ($1, 1, 'Arrivo') returning id`, [tripId]),
    )
    await as(db, EDITOR, (q) =>
      q(`insert into public.itinerary_items (itinerary_day_id, title, order_index) values ($1, 'Check-in', 0), ($1, 'Cena', 1)`, [day.id]),
    )
    expect(await as(db, VIEWER, (q) => q(`select id from public.itinerary_items`))).toHaveLength(2)
    await rejects(
      as(db, VIEWER, (q) => q(`insert into public.itinerary_items (itinerary_day_id, title) values ($1, 'Nope')`, [day.id])),
      /row-level security/,
    )
    const reordered = await as(db, VIEWER, (q) => q(`update public.itinerary_items set order_index = 5 returning id`))
    expect(reordered).toHaveLength(0)
    expect(await as(db, STRANGER, (q) => q(`select id from public.itinerary_days`))).toHaveLength(0)
  })

  it('stops can have a place, always with both coordinates', async () => {
    const [day] = await as(db, EDITOR, (q) =>
      q<{ id: string }>(`insert into public.itinerary_days (trip_id, day_number) values ($1, 9) returning id`, [tripId]),
    )
    const [stop] = await as(db, EDITOR, (q) =>
      q<{ id: string; place_name: string }>(
        `insert into public.itinerary_items (itinerary_day_id, title, place_name, lat, lng) values ($1, 'Fushimi Inari', 'Fushimi Inari Taisha', 34.9671, 135.7727) returning id, place_name`,
        [day.id],
      ),
    )
    expect(stop.place_name).toBe('Fushimi Inari Taisha')
    await rejects(
      as(db, EDITOR, (q) => q(`insert into public.itinerary_items (itinerary_day_id, title, lat) values ($1, 'x', 10)`, [day.id])),
      /check constraint/,
    )
    await as(db, EDITOR, (q) => q(`update public.itinerary_items set place_name = null, lat = null, lng = null where id = $1`, [stop.id]))
    await as(db, EDITOR, (q) => q(`delete from public.itinerary_days where id = $1`, [day.id]))
  })
})

describe('plan: links & checklist', () => {
  it('editors manage links, viewers only read, URLs must be http(s)', async () => {
    const [link] = await as(db, EDITOR, (q) =>
      q<{ id: string }>(
        `insert into public.trip_links (trip_id, category, title, url) values ($1, 'flight', 'Volo andata', 'https://example.com/booking/123') returning id`,
        [tripId],
      ),
    )
    await rejects(
      as(db, EDITOR, (q) => q(`insert into public.trip_links (trip_id, title, url) values ($1, 'x', 'javascript:alert(1)')`, [tripId])),
      /check constraint/,
    )
    await rejects(as(db, VIEWER, (q) => q(`insert into public.trip_links (trip_id, title) values ($1, 'x')`, [tripId])), /row-level security/)
    expect(await as(db, VIEWER, (q) => q(`select id from public.trip_links`))).toHaveLength(1)
    expect(await as(db, STRANGER, (q) => q(`select id from public.trip_links`))).toHaveLength(0)
    expect(await as(db, VIEWER, (q) => q(`update public.trip_links set title = 'hack' where id = $1 returning id`, [link.id]))).toHaveLength(0)
  })

  it('checklist items go only to trip members and record when they are done', async () => {
    const [item] = await as(db, EDITOR, (q) =>
      q<{ id: string }>(
        `insert into public.checklist_items (trip_id, kind, title, assignee_id) values ($1, 'book', 'Prenotare il traghetto', $2) returning id`,
        [tripId, OWNER],
      ),
    )
    await rejects(
      as(db, EDITOR, (q) => q(`insert into public.checklist_items (trip_id, title, assignee_id) values ($1, 'x', $2)`, [tripId, STRANGER])),
      /row-level security/,
    )
    const [done] = await as(db, OWNER, (q) =>
      q<{ done_at: string | null }>(`update public.checklist_items set done = true where id = $1 returning done_at`, [item.id]),
    )
    expect(done.done_at).not.toBeNull()
    const [undone] = await as(db, OWNER, (q) =>
      q<{ done_at: string | null }>(`update public.checklist_items set done = false where id = $1 returning done_at`, [item.id]),
    )
    expect(undone.done_at).toBeNull()
    await rejects(
      as(db, OWNER, (q) => q(`update public.checklist_items set trip_id = gen_random_uuid() where id = $1`, [item.id])),
      /permission denied/,
    )
    expect(await as(db, VIEWER, (q) => q(`update public.checklist_items set done = true returning id`))).toHaveLength(0)
  })
})

describe('passport: visits and ratings', () => {
  it('records when a destination is visited and keeps country codes valid', async () => {
    const [visited] = await as(db, OWNER, (q) =>
      q<{ visited_at: string | null }>(`update public.destinations set status = 'visited', country_code = 'PT' where id = $1 returning visited_at`, [destId]),
    )
    expect(visited.visited_at).not.toBeNull()
    await rejects(as(db, OWNER, (q) => q(`update public.destinations set country_code = 'Portugal' where id = $1`, [destId])), /check constraint/)
  })

  it('members rate visited destinations only, one rating each', async () => {
    const rate = (uid: string, id: string, rating: number) => as(db, uid, (q) => q(`select public.set_rating($1, $2)`, [id, rating]))
    await rate(VIEWER, destId, 4)
    await rate(VIEWER, destId, 5)
    await rate(OWNER, destId, 3)
    const rows = await as(db, EDITOR, (q) =>
      q<{ rating: number }>(`select rating from public.destination_reviews where destination_id = $1 order by rating`, [destId]),
    )
    expect(rows.map((r) => r.rating)).toEqual([3, 5])

    const [proposed] = await as(db, EDITOR, (q) =>
      q<{ id: string }>(`insert into public.destinations (trip_id, name) values ($1, 'Oslo') returning id`, [tripId]),
    )
    await rejects(rate(EDITOR, proposed.id, 4), /row-level security/)
    await rejects(rate(STRANGER, destId, 4), /row-level security/)
    await rejects(rate(VIEWER, destId, 6), /invalid_rating/)
    expect(await as(db, STRANGER, (q) => q(`select id from public.destination_reviews`))).toHaveLength(0)

    await rate(OWNER, destId, 0)
    expect(await as(db, OWNER, (q) => q(`select id from public.destination_reviews where user_id = $1`, [OWNER]))).toHaveLength(0)
    await as(db, EDITOR, (q) => q(`delete from public.destinations where id = $1`, [proposed.id]))
  })
})

describe('public trip page', () => {
  let slug: string
  const publish = (uid: string | null, value: boolean) =>
    as(db, uid, (q) => q<{ set_trip_public: string | null }>(`select public.set_trip_public($1, $2)`, [tripId, value]))

  it('only the owner publishes, with a stable unguessable slug', async () => {
    await rejects(publish(EDITOR, true), /forbidden/)
    await rejects(publish(null, true), /permission denied/)
    await rejects(as(db, OWNER, (q) => q(`update public.trips set public_slug = 'mine' where id = $1`, [tripId])), /permission denied/)

    const [first] = await publish(OWNER, true)
    expect(first.set_trip_public).toMatch(/^([a-z0-9]+-)*[a-z0-9]{8}$/)
    const [again] = await publish(OWNER, true)
    expect(again.set_trip_public).toBe(first.set_trip_public)
    slug = first.set_trip_public!
  })

  it('anon reads destinations with points and the itinerary, but no people or comments', async () => {
    const [{ page }] = await as(db, null, (q) =>
      q<{ page: { name: string; destinations: Record<string, unknown>[]; days: unknown[] } }>(
        `select public.get_public_trip($1) as page`,
        [` ${slug.toUpperCase()} `],
      ),
    )
    expect(page.destinations.length).toBeGreaterThan(0)
    expect(Object.keys(page.destinations[0]).sort()).toEqual(
      ['budget_level', 'country', 'country_code', 'id', 'image_attribution', 'image_url', 'lat', 'lng', 'mood', 'name', 'points', 'status'],
    )
    expect(Array.isArray(page.days)).toBe(true)
    const json = JSON.stringify(page)
    expect(json).not.toMatch(/Olivia|Enzo|Vera|user_id|created_by|invite_code|expectations/)
    expect(json).not.toContain(inviteCode)
  })

  it('unpublishing takes the page down', async () => {
    await publish(OWNER, false)
    const [{ page }] = await as(db, null, (q) => q<{ page: unknown }>(`select public.get_public_trip($1) as page`, [slug]))
    expect(page).toBeNull()
  })
})

describe('personal passport', () => {
  it('keeps personal visited places private to their author', async () => {
    const [place] = await as(db, VIEWER, (q) =>
      q<{ id: string }>(
        `insert into public.visited_places (name, country_code, lat, lng, visited_on, rating)
         values ('Tokyo', 'JP', 35.68, 139.69, '2024-04-01', 5) returning id`,
      ),
    )
    expect(await as(db, OWNER, (q) => q(`select id from public.visited_places`))).toHaveLength(0)
    expect(await as(db, OWNER, (q) => q(`update public.visited_places set rating = 1 where id = $1 returning id`, [place.id]))).toHaveLength(0)
    await rejects(as(db, OWNER, (q) => q(`insert into public.visited_places (user_id, name) values ($1, 'Oslo')`, [VIEWER])), /row-level security/)
    await rejects(as(db, VIEWER, (q) => q(`update public.visited_places set user_id = $1 where id = $2`, [OWNER, place.id])), /permission denied/)
    await rejects(as(db, VIEWER, (q) => q(`insert into public.visited_places (name, lat) values ('Oslo', 59.9)`)), /check constraint/)
    await rejects(as(db, null, (q) => q(`select * from public.visited_places`)), /permission denied/)
    await as(db, VIEWER, (q) => q(`delete from public.visited_places where id = $1`, [place.id]))
  })

  it('lets a member hide a group visit from their own passport only', async () => {
    await as(db, VIEWER, (q) => q(`insert into public.passport_exclusions (destination_id) values ($1)`, [destId]))
    expect(await as(db, VIEWER, (q) => q(`select destination_id from public.passport_exclusions`))).toHaveLength(1)
    expect(await as(db, OWNER, (q) => q(`select destination_id from public.passport_exclusions`))).toHaveLength(0)
    await rejects(
      as(db, STRANGER, (q) => q(`insert into public.passport_exclusions (destination_id) values ($1)`, [destId])),
      /row-level security/,
    )
    await as(db, VIEWER, (q) => q(`delete from public.passport_exclusions where destination_id = $1`, [destId]))
    expect(await as(db, VIEWER, (q) => q(`select destination_id from public.passport_exclusions`))).toHaveLength(0)
  })
})

describe('choosing dates', () => {
  const setDays = (uid: string | null, days: string[], status: string | null) =>
    as(db, uid, (q) => q(`select public.set_availability($1, $2::date[], $3)`, [tripId, days, status]))

  it('editors set the window and the fixed dates; viewers cannot', async () => {
    await as(db, EDITOR, (q) =>
      q(`update public.trips set date_window_start = '2027-07-01', date_window_end = '2027-08-31', trip_length = 5 where id = $1`, [tripId]),
    )
    const viewerUpdate = await as(db, VIEWER, (q) => q(`update public.trips set start_date = '2027-07-10', end_date = '2027-07-14' where id = $1 returning id`, [tripId]))
    expect(viewerUpdate).toHaveLength(0)
    await rejects(as(db, EDITOR, (q) => q(`update public.trips set start_date = '2027-07-14', end_date = '2027-07-10' where id = $1`, [tripId])), /check constraint/)
    await rejects(as(db, EDITOR, (q) => q(`update public.trips set start_date = '2027-07-14' where id = $1`, [tripId])), /check constraint/)
  })

  it('members mark their own days; the group sees them, strangers do not', async () => {
    await setDays(VIEWER, ['2027-07-10', '2027-07-11', '2027-07-12'], 'yes')
    await setDays(VIEWER, ['2027-07-12'], 'maybe')
    await setDays(OWNER, ['2027-07-10'], 'yes')
    const rows = await as(db, EDITOR, (q) =>
      q<{ user_id: string; day: string; status: string }>(`select user_id, day::text, status from public.availability where trip_id = $1 order by user_id, day`, [tripId]),
    )
    expect(rows).toEqual([
      { user_id: OWNER, day: '2027-07-10', status: 'yes' },
      { user_id: VIEWER, day: '2027-07-10', status: 'yes' },
      { user_id: VIEWER, day: '2027-07-11', status: 'yes' },
      { user_id: VIEWER, day: '2027-07-12', status: 'maybe' },
    ])
    expect(await as(db, STRANGER, (q) => q(`select day from public.availability`))).toHaveLength(0)
    await rejects(setDays(STRANGER, ['2027-07-10'], 'yes'), /row-level security/)
    await rejects(setDays(null, ['2027-07-10'], 'yes'), /permission denied/)
    await rejects(setDays(VIEWER, ['2027-07-10'], 'sure'), /invalid_status/)
    await rejects(
      as(db, OWNER, (q) => q(`insert into public.availability (trip_id, user_id, day, status) values ($1, $2, '2027-07-20', 'yes')`, [tripId, VIEWER])),
      /row-level security/,
    )

    await setDays(VIEWER, ['2027-07-10', '2027-07-11'], null)
    const left = await as(db, VIEWER, (q) => q<{ day: string }>(`select day::text from public.availability where user_id = $1`, [VIEWER]))
    expect(left.map((r) => r.day)).toEqual(['2027-07-12'])
  })
})

describe('resetting points', () => {
  it('members clear their own points; only the owner clears everyone', async () => {
    const [dest] = await as(db, EDITOR, (q) =>
      q<{ id: string }>(`insert into public.destinations (trip_id, name) values ($1, 'Reset test') returning id`, [tripId]),
    )
    const votesOn = () => as(db, OWNER, (q) => q<{ user_id: string }>(`select user_id from public.votes where destination_id = $1`, [dest.id]))

    await as(db, VIEWER, (q) => q(`select public.set_points($1, 1)`, [dest.id]))
    await as(db, EDITOR, (q) => q(`select public.set_points($1, 1)`, [dest.id]))

    const [own] = await as(db, VIEWER, (q) => q<{ reset_points: number }>(`select public.reset_points($1)`, [tripId]))
    expect(own.reset_points).toBeGreaterThanOrEqual(1)
    expect((await votesOn()).map((v) => v.user_id)).toEqual([EDITOR])

    await rejects(as(db, EDITOR, (q) => q(`select public.reset_points($1, true)`, [tripId])), /forbidden/)
    await rejects(as(db, STRANGER, (q) => q(`select public.reset_points($1)`, [tripId])), /forbidden/)
    await rejects(as(db, null, (q) => q(`select public.reset_points($1)`, [tripId])), /permission denied/)

    const [everyone] = await as(db, OWNER, (q) => q<{ reset_points: number }>(`select public.reset_points($1, true)`, [tripId]))
    expect(everyone.reset_points).toBeGreaterThanOrEqual(1)
    expect(await votesOn()).toHaveLength(0)

    await as(db, EDITOR, (q) => q(`delete from public.destinations where id = $1`, [dest.id]))
  })
})

describe('push notifications', () => {
  const P256DH = `B${'A'.repeat(86)}`
  const AUTH = 'A'.repeat(22)
  const endpoint = (device: string) => `https://fcm.googleapis.com/fcm/send/${device}`
  const subscribe = (user: string, device = user) =>
    as(db, user, (q) => q(`select public.save_push_subscription($1, $2, $3, 'it')`, [endpoint(device), P256DH, AUTH]))
  const queued = async () =>
    (
      await db.query<{ user_id: string; kind: string; data: Record<string, string> }>(
        `select user_id, kind, data from public.push_outbox where claimed_at is null order by id`,
      )
    ).rows
  const recipients = async (kind: string) =>
    (await queued())
      .filter((row) => row.kind === kind)
      .map((row) => row.user_id)
      .sort()
  const clearQueue = () => db.query(`delete from public.push_outbox`)

  it('keeps devices private and moves a device to the account signed in on it', async () => {
    await subscribe(EDITOR)
    await subscribe(VIEWER)
    expect(await as(db, EDITOR, (q) => q(`select endpoint from public.push_subscriptions`))).toEqual([{ endpoint: endpoint(EDITOR) }])
    await rejects(
      as(db, EDITOR, (q) => q(`insert into public.push_subscriptions (endpoint, p256dh, auth) values ('https://fcm.googleapis.com/fcm/x', $1, $2)`, [P256DH, AUTH])),
      /permission denied/,
    )
    await rejects(as(db, null, (q) => q(`select public.save_push_subscription('https://fcm.googleapis.com/fcm/x', $1, $2, 'it')`, [P256DH, AUTH])), /permission denied/)
    await rejects(as(db, EDITOR, (q) => q(`select public.save_push_subscription('http://fcm.googleapis.com/fcm/x', $1, $2, 'it')`, [P256DH, AUTH])), /check constraint/)

    // The editor's phone, now signed in with another account.
    await subscribe(STRANGER, EDITOR)
    expect(await as(db, EDITOR, (q) => q(`select endpoint from public.push_subscriptions`))).toHaveLength(0)
    await subscribe(EDITOR)
    expect(await as(db, STRANGER, (q) => q(`delete from public.push_subscriptions returning id`))).toHaveLength(0)
  })

  it('keeps the queue and the key pair out of reach of the app', async () => {
    await rejects(as(db, EDITOR, (q) => q(`select * from public.push_outbox`)), /permission denied/)
    await rejects(as(db, EDITOR, (q) => q(`select * from public.claim_push_batch()`)), /permission denied/)
    await rejects(as(db, EDITOR, (q) => q(`select public.push_vapid_keys()`)), /permission denied/)
    await rejects(
      as(db, EDITOR, (q) => q(`select public.enqueue_push($1, 'member', 'members', '{}', array[$2]::uuid[])`, [tripId, VIEWER])),
      /permission denied/,
    )
  })

  it('queues new destinations, dates and members for the other members with a device', async () => {
    await clearQueue()
    const [dest] = await as(db, OWNER, (q) =>
      q<{ id: string }>(`insert into public.destinations (trip_id, name) values ($1, 'Tromsø') returning id`, [tripId]),
    )
    // Not the owner (who proposed it, and has no device) nor the stranger (subscribed, but not in the trip).
    expect(await recipients('destination')).toEqual([EDITOR, VIEWER].sort())
    expect((await queued())[0].data).toMatchObject({ actor: 'Olivia', destination: 'Tromsø', destination_id: dest.id })

    await db.query(
      `update public.trips set start_date = null, end_date = null, date_window_start = null, date_window_end = null, trip_length = null where id = $1`,
      [tripId],
    )
    await as(db, EDITOR, (q) =>
      q(`update public.trips set date_window_start = '2027-07-01', date_window_end = '2027-08-31', trip_length = 5 where id = $1`, [tripId]),
    )
    expect(await recipients('dates_open')).toEqual([VIEWER])
    await as(db, OWNER, (q) => q(`update public.trips set start_date = '2027-07-10', end_date = '2027-07-14' where id = $1`, [tripId]))
    expect(await recipients('dates_fixed')).toEqual([EDITOR, VIEWER].sort())

    const NEWCOMER = '55555555-5555-4555-8555-555555555555'
    await createUser(db, NEWCOMER, 'Mia')
    await db.query(`insert into public.trip_members (trip_id, user_id, role) values ($1, $2, 'viewer')`, [tripId, NEWCOMER])
    expect(await recipients('member')).toEqual([EDITOR, VIEWER].sort())
    await db.query(`delete from public.trip_members where user_id = $1`, [NEWCOMER])
    await db.query(`delete from public.destinations where id = $1`, [dest.id])
  })

  it('sends comments to the proposer and earlier commenters, minus the categories turned off', async () => {
    const [dest] = await as(db, EDITOR, (q) =>
      q<{ id: string }>(`insert into public.destinations (trip_id, name) values ($1, 'Bergen') returning id`, [tripId]),
    )
    await clearQueue()
    await as(db, VIEWER, (q) => q(`insert into public.notification_preferences (comments) values (false)`))
    expect(await as(db, STRANGER, (q) => q(`update public.notification_preferences set comments = true returning user_id`))).toHaveLength(0)
    await rejects(
      as(db, STRANGER, (q) => q(`insert into public.notification_preferences (user_id, comments) values ($1, true)`, [VIEWER])),
      /row-level security/,
    )

    await as(db, VIEWER, (q) => q(`insert into public.comments (destination_id, content) values ($1, 'Aurora boreale!')`, [dest.id]))
    expect(await queued()).toEqual([
      { user_id: EDITOR, kind: 'comment', data: expect.objectContaining({ actor: 'Vera', destination: 'Bergen', excerpt: 'Aurora boreale!' }) },
    ])
    await clearQueue()
    await as(db, OWNER, (q) => q(`insert into public.comments (destination_id, content) values ($1, 'Ci sto')`, [dest.id]))
    // The editor proposed it; the viewer commented before but turned comments off.
    expect(await recipients('comment')).toEqual([EDITOR])
    await db.query(`delete from public.destinations where id = $1`, [dest.id])
  })

  it('hands each queued row to the delivery function once, with the device to send it to', async () => {
    const claim = () =>
      db.transaction(async (tx) => {
        await tx.exec('set local role service_role')
        return (await tx.query<{ kind: string; endpoint: string; trip_name: string; lang: string }>(`select * from public.claim_push_batch()`)).rows
      })
    const pending = await queued()
    expect(pending.length).toBeGreaterThan(0)
    const batch = await claim()
    expect(batch).toHaveLength(pending.length)
    expect(batch[0]).toMatchObject({ kind: 'comment', endpoint: endpoint(EDITOR), lang: 'it' })
    expect(batch[0].trip_name).toBeTruthy()
    expect(await claim()).toHaveLength(0)

    await db.exec(`delete from public.push_outbox; delete from public.push_subscriptions; delete from public.notification_preferences;`)
  })

  it('sends mentions to the members tagged, or to everyone with @all, once per person', async () => {
    await subscribe(OWNER)
    await subscribe(EDITOR)
    await subscribe(VIEWER)
    const [dest] = await as(db, EDITOR, (q) =>
      q<{ id: string }>(`insert into public.destinations (trip_id, name) values ($1, 'Stavanger') returning id`, [tripId]),
    )
    const comment = (user: string, content: string) =>
      as(db, user, (q) => q(`insert into public.comments (destination_id, content) values ($1, $2)`, [dest.id, content]))
    await clearQueue()

    // The owner is tagged; the stranger's id is ignored (not in the trip). The editor proposed it: a plain comment.
    await comment(VIEWER, `<@${OWNER}> <@${STRANGER}> guarda qui`)
    expect(await queued()).toEqual([
      {
        user_id: OWNER,
        kind: 'mention',
        data: expect.objectContaining({ actor: 'Vera', destination: 'Stavanger', excerpt: '@Olivia @… guarda qui', all: false }),
      },
      { user_id: EDITOR, kind: 'comment', data: expect.objectContaining({ excerpt: '@Olivia @… guarda qui' }) },
    ])

    // @all: every other member, as a mention only, even with comment notifications turned off.
    await clearQueue()
    await as(db, VIEWER, (q) => q(`insert into public.notification_preferences (comments) values (false)`))
    await comment(OWNER, 'Si parte? @all')
    expect(await recipients('mention')).toEqual([EDITOR, VIEWER].sort())
    expect(await recipients('comment')).toEqual([])

    // Mentions turned off: the proposer still hears about it as a comment.
    await clearQueue()
    await as(db, EDITOR, (q) => q(`insert into public.notification_preferences (mentions) values (false)`))
    await comment(OWNER, `<@${EDITOR}> ci sei?`)
    expect(await queued()).toEqual([{ user_id: EDITOR, kind: 'comment', data: expect.objectContaining({ all: false }) }])

    // An e-mail address isn't @all, and @all has a limit.
    await clearQueue()
    await comment(VIEWER, 'scrivimi a vera@allegra.it')
    expect(await recipients('mention')).toEqual([])
    await comment(OWNER, '@ALL due')
    await comment(OWNER, '@all tre')
    await rejects(comment(OWNER, '@all quattro'), /mention_all_limited/)
    await comment(OWNER, 'senza tag va bene')

    await db.query(`delete from public.destinations where id = $1`, [dest.id])
    await db.exec(`delete from public.push_outbox; delete from public.push_subscriptions; delete from public.notification_preferences;`)
  })
})

describe('membership lifecycle & account deletion', () => {
  it('owner cannot leave or be removed; members can leave', async () => {
    const ownerLeft = await as(db, OWNER, (q) => q(`delete from public.trip_members where user_id = $1 returning id`, [OWNER]))
    expect(ownerLeft).toHaveLength(0)
    const left = await as(db, VIEWER, (q) => q(`delete from public.trip_members where user_id = $1 and trip_id = $2 returning id`, [VIEWER, tripId]))
    expect(left).toHaveLength(1)
  })

  it('deleting an account cascades but keeps proposed destinations in shared trips', async () => {
    await as(db, EDITOR, (q) => q(`select public.delete_account()`))
    const { rows } = await db.query<{ created_by: string | null }>(`select created_by from public.destinations where id = $1`, [destId])
    expect(rows[0].created_by).toBeNull()
    const { rows: votes } = await db.query(`select 1 from public.votes where user_id = $1`, [EDITOR])
    expect(votes).toHaveLength(0)
  })

  it('owner deleting the account removes their trips', async () => {
    await as(db, OWNER, (q) => q(`select public.delete_account()`))
    const { rows } = await db.query(`select 1 from public.trips where id = $1`, [tripId])
    expect(rows).toHaveLength(0)
  })
})

describe('limits against abuse', () => {
  const SPAMMER = '66666666-6666-4666-8666-666666666666'
  let trip: string

  beforeAll(async () => {
    await createUser(db, SPAMMER, 'Spam')
    const [t] = await as(db, SPAMMER, (q) => q<{ id: string }>(`insert into public.trips (name) values ('Tanti link') returning id`))
    trip = t.id
  })

  it("accepts push subscriptions only from the browsers' push services, up to 10 per person", async () => {
    const save = (endpoint: string) =>
      as(db, SPAMMER, (q) => q(`select public.save_push_subscription($1, $2, $3, 'it')`, [endpoint, `B${'A'.repeat(86)}`, 'A'.repeat(22)]))
    await rejects(save('https://evil.example.com/collect'), /check constraint/)
    await rejects(save('https://fcm.googleapis.com.evil.example/x'), /check constraint/)
    await save('https://web.push.apple.com/abc')
    await save('https://updates.push.services.mozilla.com/wpush/v2/abc')
    await save('https://wns2-par02p.notify.windows.com/w/?token=abc')
    for (let i = 0; i < 7; i++) await save(`https://fcm.googleapis.com/fcm/send/${i}`)
    await rejects(save('https://fcm.googleapis.com/fcm/send/extra'), /limit_reached/)
    // A device already saved can always be saved again.
    await save('https://fcm.googleapis.com/fcm/send/3')
    await db.exec(`delete from public.push_subscriptions`)
  })

  it('caps how much one person can create, and how fast they comment', async () => {
    const links = (n: number) =>
      as(db, SPAMMER, (q) =>
        q(`insert into public.trip_links (trip_id, title, category, created_by) select $1, 'Link ' || g, 'other', $2 from generate_series(1, ${n}) g`, [trip, SPAMMER]),
      )
    await links(100)
    await rejects(links(1), /limit_reached/)

    const [d] = await as(db, SPAMMER, (q) => q<{ id: string }>(`insert into public.destinations (trip_id, name) values ($1, 'Spam') returning id`, [trip]))
    const comments = (n: number) =>
      as(db, SPAMMER, (q) => q(`insert into public.comments (destination_id, content) select $1, 'ciao ' || g from generate_series(1, ${n}) g`, [d.id]))
    await comments(30)
    await rejects(comments(1), /rate_limited/)

    // The API can't empty a table, whatever the row rules.
    await rejects(as(db, SPAMMER, (q) => q(`truncate public.comments`)), /permission denied/)
  })
})

describe('trending places', () => {
  const OWNERS = [
    '77777777-7777-4777-8777-777777777777',
    '88888888-8888-4888-8888-888888888888',
    '99999999-9999-4999-8999-999999999999',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  ]
  const FRIEND = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  const LISBON = { country: 'Portogallo', code: 'PT', lat: 38.7223, lng: -9.1393 }
  const OSLO = { country: 'Norvegia', code: 'NO', lat: 59.9139, lng: 10.7522 }
  let firstTrip: string

  beforeAll(async () => {
    await createUser(db, FRIEND, 'Amico')
    for (const [i, owner] of OWNERS.entries()) {
      await createUser(db, owner, `Owner ${i}`)
      const [t] = await as(db, owner, (q) => q<{ id: string }>(`insert into public.trips (name) values ($1) returning id`, [`Gruppo ${i}`]))
      if (i === 0) firstTrip = t.id
      // The last trip has nobody else in it, so it doesn't count.
      if (i < 3) await db.query(`insert into public.trip_members (trip_id, user_id, role) values ($1, $2, 'editor')`, [t.id, FRIEND])
      const add = (p: typeof LISBON, name: string) =>
        as(db, owner, (q) =>
          q(`insert into public.destinations (trip_id, name, country, country_code, lat, lng) values ($1, $2, $3, $4, $5, $6)`, [
            t.id,
            name,
            p.country,
            p.code,
            p.lat + i * 0.001,
            p.lng,
          ]),
        )
      await add(LISBON, i === 1 ? 'Lisbon' : 'Lisbona')
      // Only 2 groups: not enough to be published.
      if (i < 2) await add(OSLO, 'Oslo')
      // Written by hand, without a place from the search: never published.
      await as(db, owner, (q) => q(`insert into public.destinations (trip_id, name) values ($1, 'Casa di Marco')`, [t.id]))
    }
    await db.query(`update public.destinations set status = 'selected' where trip_id = $1 and name = 'Lisbona'`, [firstTrip])
  })

  it('publishes only places proposed by at least 3 groups, without saying which', async () => {
    await db.query(`select public.refresh_trending_places()`)
    const rows = await as(db, null, (q) => q<Record<string, unknown>>(`select * from public.trending_places order by rank`))
    expect(rows).toEqual([expect.objectContaining({ rank: 1, name: 'Lisbona', country: 'Portogallo', country_code: 'PT', trips: 3, chosen: 1 })])
    expect(Object.keys(rows[0]).sort()).toEqual(
      ['chosen', 'country', 'country_code', 'image_attribution', 'image_url', 'name', 'rank', 'refreshed_at', 'trips'].sort(),
    )

    await rejects(as(db, null, (q) => q(`select public.refresh_trending_places()`)), /permission denied/)
    await rejects(as(db, OWNERS[0], (q) => q(`select public.refresh_trending_places()`)), /permission denied/)
    await rejects(
      as(db, OWNERS[0], (q) => q(`insert into public.trending_places (rank, name, country_code, trips, chosen) values (99, 'Spam', 'IT', 99, 99)`)),
      /permission denied/,
    )
  })
})

describe('guests', () => {
  const GUEST = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
  const HOST = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
  let trip: string
  let code: string

  beforeAll(async () => {
    await createUser(db, HOST, 'Host')
    await createGuest(db, GUEST, 'Giulia')
    const [t] = await as(db, HOST, (q) => q<{ id: string; invite_code: string }>(`insert into public.trips (name) values ('Con ospiti') returning id, invite_code`))
    trip = t.id
    code = t.invite_code
  })

  it('lets a guest join with an invite and take part, but not create trips', async () => {
    const [{ join_trip }] = await as(db, GUEST, (q) => q<{ join_trip: string }>(`select public.join_trip($1)`, [code]))
    expect(join_trip).toBe(trip)
    const [profile] = await as(db, GUEST, (q) => q(`select display_name, avatar_url from public.profiles where id = $1`, [GUEST]))
    expect(profile).toEqual({ display_name: 'Giulia', avatar_url: null })

    const [d] = await as(db, GUEST, (q) => q<{ id: string }>(`insert into public.destinations (trip_id, name) values ($1, 'Atene') returning id`, [trip]))
    await as(db, GUEST, (q) => q(`select public.set_points($1, 3)`, [d.id]))
    await as(db, GUEST, (q) => q(`insert into public.comments (destination_id, content) values ($1, 'Io ci sto')`, [d.id]))
    await rejects(as(db, GUEST, (q) => q(`insert into public.trips (name) values ('Mio')`)), /row-level security/)
  })

  it('keeps everything once the guest links a Google account', async () => {
    // What Supabase does when linkIdentity succeeds: same user id, no longer anonymous.
    await db.query(`update auth.users set is_anonymous = false where id = $1`, [GUEST])
    const [mine] = await as(db, GUEST, (q) => q<{ id: string }>(`insert into public.trips (name) values ('Ora è mio') returning id`))
    expect(mine.id).toBeTruthy()
    expect(await as(db, GUEST, (q) => q(`select id from public.trips where id = $1`, [trip]))).toHaveLength(1)
    expect(await as(db, GUEST, (q) => q(`select id from public.votes where user_id = $1`, [GUEST]))).toHaveLength(1)
  })

  it('keeps the guest helpers away from the API', async () => {
    await rejects(as(db, null, (q) => q(`select public.is_guest()`)), /permission denied/)
    await rejects(as(db, HOST, (q) => q(`select public.delete_stale_guests()`)), /permission denied/)
  })
})
