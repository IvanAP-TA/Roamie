import { beforeAll, describe, expect, it } from 'vitest'
import { as, createDb, createUser, type Db } from './harness'

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
  const endpoint = (device: string) => `https://push.example.com/send/${device}`
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
      as(db, EDITOR, (q) => q(`insert into public.push_subscriptions (endpoint, p256dh, auth) values ('https://push.example.com/x', $1, $2)`, [P256DH, AUTH])),
      /permission denied/,
    )
    await rejects(as(db, null, (q) => q(`select public.save_push_subscription('https://push.example.com/x', $1, $2, 'it')`, [P256DH, AUTH])), /permission denied/)
    await rejects(as(db, EDITOR, (q) => q(`select public.save_push_subscription('http://push.example.com/x', $1, $2, 'it')`, [P256DH, AUTH])), /check constraint/)

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
