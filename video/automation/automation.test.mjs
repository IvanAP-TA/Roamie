import { describe, expect, it } from 'vitest'
import { checkLine, hashtags, looksLike, photoCredit, pickFromPool, POOLS, similarity, writeCopy } from './copy.mjs'
import { guideTheme, guideUrl, loadPlaces } from './places.mjs'
import { CROSS_DAYS, makeCarouselPlan, makePlan, pickMusic, RECENT_DAYS, seeded } from './plan.mjs'
import { formatBonus, formatScores, refreshMetrics, score } from './metrics.mjs'
import { kitMessages } from './publish/telegram.mjs'

const places = loadPlaces()
const DAY = 86_400_000

/** Runs the planner like the weekly job would, three posts a week. */
function simulate(posts, lang = 'it', start = new Date('2026-10-12')) {
  const history = []
  for (let i = 0; i < posts; i++) {
    const day = new Date(start.getTime() + i * 2.33 * DAY)
    const plan = makePlan(places, history, day, lang)
    history.push({ date: day.toISOString(), format: plan.format, lang, places: plan.places.map((p) => p.key), month: plan.month, pair: plan.pair, plan })
  }
  return history
}

describe('places', () => {
  it('come from the guides with a photo, facts and a guide link', () => {
    expect(places.length).toBeGreaterThan(40)
    for (const p of places) {
      expect(p.photo.url).toMatch(/^https:\/\/(upload|thumb)\.wikimedia\.org\//)
      expect(p.months.length).toBeGreaterThan(0)
      expect(p.line.it.length).toBeGreaterThan(20)
      expect(guideUrl(p, 'it')).toMatch(/^https:\/\/roamie\.org\/guide\/[a-z-]+$/)
    }
  })
})

describe('plan', () => {
  const history = simulate(60)

  it('never repeats a format twice in a row', () => {
    for (let i = 1; i < history.length; i++) expect(history[i].format).not.toBe(history[i - 1].format)
  })

  it("doesn't show a place again within three weeks, and usually not within the full window", () => {
    let withinWindow = 0
    for (const [i, post] of history.entries()) {
      for (const earlier of history.slice(0, i)) {
        const days = (new Date(post.date) - new Date(earlier.date)) / DAY
        const shared = post.places.filter((k) => earlier.places.includes(k))
        if (shared.length && days < 21) throw new Error(`${shared} again after ${days} days`)
        if (shared.length && days < RECENT_DAYS) withinWindow++
      }
    }
    expect(withinWindow).toBeLessThan(history.length / 4)
  })

  it('never repeats a versus pair or a month in the same language within the gap', () => {
    const pairs = history.filter((h) => h.pair).map((h) => h.pair)
    expect(new Set(pairs).size).toBe(pairs.length)
    const months = history.filter((h) => h.month)
    for (const [i, h] of months.entries()) {
      for (const earlier of months.slice(0, i)) {
        if (earlier.month === h.month) expect((new Date(h.date) - new Date(earlier.date)) / DAY).toBeGreaterThan(200)
      }
    }
  })

  it('picks places from different countries, never with a satellite photo', () => {
    for (const { plan } of history) {
      const countries = plan.places.map((p) => p.countryCode)
      expect(new Set(countries).size).toBe(countries.length)
      for (const p of plan.places) expect(p.photo.url).not.toMatch(/ESA\d|satellite/i)
    }
  })

  it('is the same for the same day and history, so a failed run can be retried', () => {
    const day = new Date('2026-11-02')
    expect(makePlan(places, [], day, 'it').places.map((p) => p.key)).toEqual(makePlan(places, [], day, 'it').places.map((p) => p.key))
  })
})

describe('copy checks', () => {
  const base = { min: 20, max: 60, lang: 'it', past: [], maxSimilarity: 0.4, allowedNumbers: ['4'] }

  it('rejects invented numbers, prices, links, shouting and the wrong language', () => {
    expect(checkLine('Quattro mete per il weekend con gli amici', base)).toBeNull()
    expect(checkLine('Voli a 39 euro per la tua prossima meta', base)).toMatch(/number/)
    expect(checkLine('Le 4 mete più belle per il gruppo', base)).toBeNull()
    expect(checkLine('Tutto a 30€ per il weekend del gruppo', base)).toMatch(/number|prices/)
    expect(checkLine('Scopri di più su www.roamie.org per il gruppo', base)).toMatch(/banned/)
    expect(checkLine('DOVE ANDIAMO CON IL GRUPPO STAVOLTA?', base)).toBe('shouting')
    expect(checkLine('Where are we going with the group this time?', base)).toBe('language')
    expect(checkLine('Il posto imperdibile per la vostra estate', base)).toMatch(/banned/)
    expect(checkLine('Dove vorresti *davvero* andare con il gruppo?', base)).toBe('formatting')
  })

  it('rejects a wheel hook that names only some of its places', () => {
    const allOrNone = ['Marrakech', 'Hanoi', 'Istanbul', 'Vilnius']
    const en = { ...base, lang: 'en', allOrNone }
    expect(checkLine('Sunset in Marrakech or street food in Hanoi?', en)).toBe('names only some of the places')
    expect(checkLine('Four places, one group, and one wheel', en)).toBeNull()
  })

  it('rejects a line too close to an earlier one', () => {
    const past = ['Non riuscite a decidere dove andare? Lasciate fare alla ruota']
    expect(checkLine('Non riuscite a decidere dove andare? Lasciate fare alla ruota!', { ...base, max: 80, past })).toMatch(/earlier/)
    expect(similarity('Lisbona o Porto: voi dove andate?', 'Il gruppo è diviso tra due città')).toBeLessThan(0.2)
  })

  it('tells Italian from English', () => {
    expect(looksLike('Dove andiamo con gli amici?', 'it')).toBe(true)
    expect(looksLike('Where are we going with friends?', 'en')).toBe(true)
    expect(looksLike('Where are we going with friends?', 'it')).toBe(false)
  })

  it('falls back to a hand-written line when the AI keeps failing the checks', async () => {
    const plan = { format: 'versus', places: places.slice(0, 2) }
    const sloppy = async () => ({ hook: 'BEST TRIP EVER 100%', caption: 'Prices from 29€!' })
    const copy = await writeCopy(plan, 'it', [], seeded('x'), sloppy)
    expect(copy.source).toBe('pool')
    expect(copy.rejected).toHaveLength(3)
    expect(copy.hook).toContain(places[0].name.it)
  })

  it('accepts a good AI line, and the versus hook must name both places', async () => {
    const plan = { format: 'versus', places: places.slice(0, 2) }
    const [a, b] = plan.places.map((p) => p.name.it)
    const good = async () => ({ hook: `${a} o ${b}: dove va il gruppo?`, caption: `Da una parte ${a}, dall’altra ${b}: due modi diversi di passare il weekend. Voi quale scegliete?` })
    expect((await writeCopy(plan, 'it', [], seeded('y'), good)).source).toBe('ai')
    const vague = async () => ({ hook: 'Due città, un solo weekend con il gruppo', caption: 'Due modi diversi di passare il weekend con gli amici. Voi quale scegliete?' })
    expect((await writeCopy(plan, 'it', [], seeded('z'), vague)).source).toBe('pool')
  })

  it('every hand-written line passes the same checks the AI must pass', () => {
    for (const lang of ['it', 'en']) {
      for (const format of ['wheel', 'month', 'versus', 'carousel_guide', 'carousel_month']) {
        for (const line of POOLS[lang][format]) {
          const theme = guideTheme('long-weekends', lang)
          const filled = line.replace('{month}', lang === 'it' ? 'novembre' : 'November').replace('{a}', 'Lisbona').replace('{b}', 'Porto').replace('{theme}', theme).replace('{n}', '5')
          expect(checkLine(filled, { min: 15, max: 60, lang, past: [], maxSimilarity: 1, allowedNumbers: ['5'] }), `${lang}/${format}: ${filled}`).toBeNull()
        }
      }
    }
    expect(pickFromPool(POOLS.it.wheel, {}, POOLS.it.wheel.slice(0, 7), seeded('p'))).toBe(POOLS.it.wheel[7])
  })

  it('builds varied, valid hashtags', () => {
    const tags = hashtags({ places: places.slice(0, 3) }, 'it', seeded('h'))
    expect(tags.length).toBeGreaterThanOrEqual(4)
    for (const t of tags) expect(t).toMatch(/^#[a-z]+$/)
  })
})

describe('telegram kit', () => {
  it('puts each text in its own copyable block, escaped for HTML', () => {
    const messages = kitMessages({ caption: 'Lisbon <3 & Porto\n\n#grouptrip', title: 'Lisbon or Porto? #shorts', description: 'Two cities.\nhttps://roamie.org/guide/x' })
    expect(messages).toHaveLength(3)
    expect(messages[0]).toContain('<code>Lisbon &lt;3 &amp; Porto\n\n#grouptrip</code>')
    expect(messages[1]).toContain('<code>Lisbon or Porto? #shorts</code>')
    expect(messages[2]).toContain('https://roamie.org/guide/x</code>')
  })
})

describe('credits and hashtags', () => {
  it('cuts a long author at a word and keeps the licence', () => {
    expect(photoCredit({ author: 'The Municipality of Tromsø from Tromsø, Norway', license: 'CC BY 2.0' })).toBe('The Municipality of Tromsø from Tromsø (CC BY 2.0)')
    expect(photoCredit({ author: '<a href="x">Diego Delso</a>', license: 'CC BY-SA 4.0' })).toBe('Diego Delso (CC BY-SA 4.0)')
  })

  it('spells Nordic letters out in hashtags', () => {
    const tromso = places.find((p) => p.key === 'tromso')
    expect(tromso).toBeDefined()
    expect(hashtags({ places: [tromso] }, 'it', seeded('t'))).toContain('#tromso')
  })
})

describe('music', () => {
  const tracks = ['wheel-1-a.mp3', 'wheel-2-b.mp3', 'wheel-3-c.mp3', 'month-1-d.mp3', 'versus-1-e.mp3']

  it("picks one of the format's tracks, never the one its last post used", () => {
    expect(pickMusic('month', tracks, [], seeded('m'))).toBe('music/month-1-d.mp3')
    const history = [{ format: 'wheel', music: 'music/wheel-2-b.mp3' }, { format: 'wheel', music: 'music/wheel-1-a.mp3' }]
    expect(pickMusic('wheel', tracks, history, seeded('w'))).toBe('music/wheel-3-c.mp3')
    expect(pickMusic('quiz', tracks, [], seeded('q'))).toBeUndefined()
  })
})

describe('carousels', () => {
  /** Mon, Wed, Fri videos and Tue, Thu carousels, like the weekly job, for `weeks` weeks. */
  function week(weeks) {
    const history = []
    const start = new Date('2026-10-12T16:00:00Z')
    for (let i = 0; i < weeks * 7; i++) {
      const day = new Date(start.getTime() + i * DAY)
      const weekday = day.getUTCDay()
      if (weekday === 0 || weekday === 6) continue
      const kind = weekday === 2 || weekday === 4 ? 'carousel' : 'video'
      const plan = kind === 'carousel' ? makeCarouselPlan(places, history, day, 'it') : makePlan(places, history, day, 'it')
      history.push({ date: day.toISOString(), kind, format: plan.format, lang: 'it', places: plan.places.map((p) => p.key), month: plan.month, guide: plan.guide, pair: plan.pair, plan })
    }
    return history
  }
  const history = week(20)
  const carousels = history.filter((h) => h.kind === 'carousel')

  it('plans every day of a mixed schedule, with 4 or 5 places from different countries', () => {
    expect(carousels.length).toBe(40)
    for (const { plan } of carousels) {
      expect(plan.places.length).toBeGreaterThanOrEqual(4)
      expect(new Set(plan.places.map((p) => p.countryCode)).size).toBe(plan.places.length)
    }
  })

  it('keeps carousels apart from each other and from the last week of videos', () => {
    for (const [i, post] of history.entries()) {
      for (const earlier of history.slice(0, i)) {
        const days = (new Date(post.date) - new Date(earlier.date)) / DAY
        const shared = post.places.some((k) => earlier.places.includes(k))
        if (!shared) continue
        if (post.kind === earlier.kind && post.kind === 'carousel') expect(days, `${post.date} after ${earlier.date}`).toBeGreaterThanOrEqual(14)
        if (post.kind !== earlier.kind) expect(days, `${post.date} after ${earlier.date}`).toBeGreaterThanOrEqual(CROSS_DAYS)
      }
    }
  })

  it('gives every guide carousel a theme for its cover', () => {
    for (const { plan } of carousels.filter((h) => h.format === 'guide')) expect(guideTheme(plan.guide, 'it')).toBeTruthy()
  })
})

describe('learning from what worked', () => {
  const now = new Date('2026-12-01T16:00:00Z')
  const post = (format, daysAgo, metrics, kind = 'video') => ({ date: new Date(now.getTime() - daysAgo * DAY).toISOString(), kind, format, lang: 'it', places: [], metrics, results: { instagram: { id: `m${format}${daysAgo}` } } })

  it('scores saves and shares above likes, and ignores posts that reached too few people', () => {
    expect(score({ metrics: { reach: 10, saved: 5, shares: 5, interactions: 10 } })).toBeNull()
    const saved = score({ metrics: { reach: 100, saved: 10, shares: 0, interactions: 10 } })
    const liked = score({ metrics: { reach: 100, saved: 0, shares: 0, interactions: 30 } })
    expect(saved).toBeGreaterThan(liked)
  })

  it('nudges formats only once they have enough scored posts, within the variety rules', () => {
    const good = { reach: 200, saved: 20, shares: 10, interactions: 40, at: now.toISOString() }
    const poor = { reach: 200, saved: 1, shares: 0, interactions: 5, at: now.toISOString() }
    const history = [1, 3, 5].flatMap((d) => [post('wheel', d, good), post('versus', d + 1, poor)])
    const bonus = formatBonus(formatScores(history, 'video', now))
    expect(bonus.wheel).toBeGreaterThan(0)
    expect(bonus.versus).toBeLessThan(0)
    expect(Math.abs(bonus.wheel)).toBeLessThanOrEqual(0.9)
    expect(formatBonus(formatScores(history.slice(0, 2), 'video', now))).toEqual({})
  })

  it('reads numbers for recent posts only, and stops on a permission error', async () => {
    const history = [post('wheel', 0.5, undefined), post('month', 3, undefined), post('versus', 90, undefined)]
    const read = async () => ({ reach: 50, saved: 2, shares: 1, interactions: 5 })
    process.env.INSTAGRAM_ACCESS_TOKEN ??= 'test'
    const result = await refreshMetrics(history, now, read)
    expect(result.read).toBe(1)
    expect(history[1].metrics.reach).toBe(50)
    expect(history[0].metrics).toBeUndefined()
    const denied = await refreshMetrics([post('wheel', 2, undefined)], now, async () => {
      throw new Error('missing permission')
    })
    expect(denied).toEqual({ read: 0, skipped: 'missing permission' })
  })
})
