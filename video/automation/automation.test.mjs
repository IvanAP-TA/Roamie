import { describe, expect, it } from 'vitest'
import { checkLine, hashtags, HOOK_STYLES, looksLike, photoCredit, pickFromPool, POOLS, similarity, writeCopy } from './copy.mjs'
import { guideTheme, guideUrl, loadPlaces } from './places.mjs'
import { CROSS_DAYS, makeCarouselPlan, makePlan, pickHookStyle, pickMusic, RECENT_DAYS, seeded } from './plan.mjs'
import { formatBonus, formatScores, hookScores, refreshMetrics, score } from './metrics.mjs'
import { failureMessage, kitMessages } from './publish/telegram.mjs'
import { uploadChunks } from './publish/tiktok.mjs'
import { pickScenario, SCENARIOS, storyTexts } from './stories.mjs'
import { forgetOldUploads, privacyStatus } from './publish/youtube.mjs'

const places = loadPlaces()
const DAY = 86_400_000

/** Runs the planner like the weekly job would, three posts a week. */
function simulate(posts, lang = 'it', start = new Date('2026-10-12')) {
  const history = []
  for (let i = 0; i < posts; i++) {
    const day = new Date(start.getTime() + i * 2.33 * DAY)
    const plan = makePlan(places, history, day, lang)
    history.push({ date: day.toISOString(), format: plan.format, lang, places: plan.places.map((p) => p.key), month: plan.month, pair: plan.pair, scenario: plan.scenario, plan })
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
      for (const format of ['wheel', 'month', 'versus', 'story', 'carousel_guide', 'carousel_month']) {
        for (const line of POOLS[lang][format]) {
          const theme = guideTheme('long-weekends', lang)
          const filled = line.replace('{month}', lang === 'it' ? 'novembre' : 'November').replace('{a}', 'Lisbona').replace('{b}', 'Porto').replace('{theme}', theme).replace('{n}', '5').replace('{problem}', lang === 'it' ? 'La chat del gruppo non decide mai' : 'The group chat never decides')
          expect(checkLine(filled, { min: 15, max: 60, lang, past: [], maxSimilarity: 1, allowedNumbers: ['5'] }), `${lang}/${format}: ${filled}`).toBeNull()
        }
      }
    }
    expect(pickFromPool(POOLS.it.wheel, {}, POOLS.it.wheel.slice(0, 7), seeded('p'))).toBe(POOLS.it.wheel[7])
  })

  it('builds varied, valid hashtags', () => {
    const tags = hashtags({ places: places.slice(0, 3) }, 'it', seeded('h'))
    expect(tags.length).toBeGreaterThanOrEqual(4)
    for (const t of tags) expect(t).toMatch(/^#[a-z0-9]+$/)
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

  it('alerts only about the platforms that failed, with what fixes them', () => {
    expect(failureMessage({ telegram: { id: '1' }, instagram: { id: '2' } })).toBeNull()
    const text = failureMessage({ telegram: { id: '1' }, youtube: { error: 'YouTube token: deleted_client' }, instagram: { error: 'Instagram container: {"error":{"type":"OAuthException"}}' }, tiktok: { id: 'v' } })
    expect(text).toContain('Non pubblicato su youtube, instagram')
    expect(text).toContain('nuovo token YouTube')
    expect(text).toContain('nuovo token Meta')
    expect(text).not.toContain('tiktok')
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
    // A format without tracks of its own borrows the least recently used of all; with no tracks at all, silence.
    expect(tracks.map((t) => `music/${t}`)).toContain(pickMusic('story', tracks, history, seeded('q')))
    expect(pickMusic('story', [], [], seeded('q'))).toBeUndefined()
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

describe('story videos', () => {
  it('every scenario is complete in both languages and its lines pass the copy checks', () => {
    for (const id of Object.keys(SCENARIOS)) {
      for (const lang of ['it', 'en']) {
        const texts = storyTexts(id, lang, ['Lisbona', 'Porto'])
        expect(texts.chat, `${id}/${lang}`).toHaveLength(5)
        expect(texts.fix).toHaveLength(2)
        expect(checkLine(texts.problem, { min: 15, max: 60, lang, past: [], maxSimilarity: 1 }), `${id}/${lang}`).toBeNull()
        for (const line of [...texts.chat.map((m) => m.text), ...texts.fix]) expect(line, `${id}/${lang}`).not.toMatch(/[—–]|\{|\d/)
      }
    }
  })

  it('plans three places with one clear winner, and rotates the scenarios', () => {
    const history = simulate(24, 'en')
    const stories = history.filter((h) => h.format === 'story')
    expect(stories.length).toBeGreaterThan(3)
    for (const { plan } of stories) {
      expect(plan.places).toHaveLength(3)
      const top = Math.max(...plan.points)
      expect(plan.points.filter((p) => p === top)).toHaveLength(1)
      expect(plan.points[plan.winner]).toBe(top)
      expect(SCENARIOS[plan.scenario]).toBeDefined()
    }
    const used = []
    for (let i = 0; i < 8; i++) {
      const id = pickScenario(used.map((scenario) => ({ format: 'story', scenario })), seeded(`s${i}`))
      expect(used.slice(-4)).not.toContain(id)
      used.push(id)
    }
  })
})

describe('hook styles', () => {
  const now = new Date('2026-12-01T16:00:00Z')

  it('every style example passes the checks the AI must pass, its own included', () => {
    for (const [name, style] of Object.entries(HOOK_STYLES)) {
      for (const lang of ['it', 'en']) {
        const line = style.examples[lang]
        expect(checkLine(line, { min: 20, max: 60, lang, past: [], maxSimilarity: 1 }), `${name}/${lang}`).toBeNull()
        expect(style.check?.(line) ?? null, `${name}/${lang}`).toBeNull()
      }
    }
  })

  it('asks the AI for the style and rejects a hook out of it', async () => {
    const plan = { format: 'month', month: 11, places: places.slice(0, 3), hookStyle: 'pov' }
    let prompt = ''
    const plain = async (messages) => ((prompt = messages[0].content), { hook: 'Tre mete per novembre con gli amici', caption: 'Tre posti diversi per un weekend con il gruppo, tra città e natura. Voi quale scegliete?' })
    const copy = await writeCopy(plan, 'it', [], seeded('s'), plain)
    expect(prompt).toContain('POV:')
    expect(copy.source).toBe('pool')
    expect(copy.rejected[0]).toMatch(/POV/)
    expect(copy.hookStyle).toBeUndefined()
    const pov = async () => ({ hook: 'POV: il gruppo vuole partire ma nessuno sceglie', caption: 'Tre posti diversi per un weekend con il gruppo, tra città e natura. Voi quale scegliete?' })
    const ok = await writeCopy(plan, 'it', [], seeded('s'), pov)
    expect(ok.source).toBe('ai')
    expect(ok.hookStyle).toBe('pov')
  })

  it('never repeats the last two styles, and over a month uses them all', () => {
    const history = []
    for (let i = 0; i < 18; i++) {
      const day = new Date(now.getTime() + i * DAY)
      const style = pickHookStyle(history, day, seeded(`h${i}`))
      expect(history.slice(-2).map((h) => h.hookStyle)).not.toContain(style)
      history.push({ date: day.toISOString(), hookStyle: style })
    }
    expect(new Set(history.map((h) => h.hookStyle)).size).toBe(Object.keys(HOOK_STYLES).length)
  })

  it('favours the styles people respond to, once each has enough scored posts', () => {
    const good = { reach: 200, saved: 20, shares: 10, interactions: 40, at: now.toISOString() }
    const poor = { reach: 200, saved: 1, shares: 0, interactions: 5, at: now.toISOString() }
    const at = (d) => new Date(now.getTime() - d * DAY).toISOString()
    const history = [9, 11, 13].flatMap((d) => [
      { date: at(d), hookStyle: 'pov', metrics: good },
      { date: at(d + 1), hookStyle: 'question', metrics: poor },
    ])
    const scores = hookScores(history, now)
    expect(scores.pov.avg).toBeGreaterThan(scores.question.avg)
    // Variety first: between two styles equally unused lately, the stronger one comes first more often.
    const lately = ['problem', 'curiosity', 'problem', 'curiosity', 'challenge', 'opinion'].map((hookStyle, i) => ({ date: at(6 - i), hookStyle }))
    const older = [...history, ...lately]
    const picks = Array.from({ length: 40 }, (_, i) => pickHookStyle(older, now, seeded(`b${i}`)))
    expect(picks.filter((s) => s === 'pov').length).toBeGreaterThan(picks.filter((s) => s === 'question').length)
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

describe('hashtags', () => {
  const byKey = (k) => places.find((p) => p.key === k)

  it('start with the places and their countries, without the resort in brackets', () => {
    const tags = hashtags({ places: [byKey('st-julians'), byKey('lisbon')] }, 'en', seeded('t'))
    expect(tags.slice(0, 2)).toEqual(['#malta', '#lisbon'])
    expect(tags).toContain('#portugal')
    expect(tags.length).toBeLessThanOrEqual(8)
  })

  it("use the guide's theme or the month, in the post's language", () => {
    const budget = places.filter((p) => p.guides.includes('budget')).slice(0, 5)
    expect(hashtags({ guide: 'budget', places: budget }, 'en', seeded('b'))).toContain('#budgettravel')
    expect(hashtags({ guide: 'budget', places: budget }, 'it', seeded('b'))).toContain('#viaggilowcost')
    const november = places.filter((p) => p.months.includes(11)).slice(0, 3)
    expect(hashtags({ month: 11, places: november }, 'en', seeded('m'))).toContain('#novembertravel')
    expect(hashtags({ month: 11, places: november }, 'it', seeded('m'))).toContain('#viagginovembre')
  })
})

describe('TikTok upload parts', () => {
  it('sends a small video whole and a larger one in parts of 10 MB, the last taking the rest', () => {
    expect(uploadChunks(3_000_000)).toEqual([{ start: 0, end: 2_999_999 }])
    expect(uploadChunks(9_000_000)).toEqual([{ start: 0, end: 8_999_999 }])
    const parts = uploadChunks(34_500_000)
    expect(parts).toHaveLength(3)
    expect(parts[0]).toEqual({ start: 0, end: 9_999_999 })
    expect(parts.at(-1)).toEqual({ start: 20_000_000, end: 34_499_999 })
    // Contiguous, and the last part stays under TikTok's limit.
    for (let i = 1; i < parts.length; i++) expect(parts[i].start).toBe(parts[i - 1].end + 1)
    expect(parts.at(-1).end - parts.at(-1).start + 1).toBeLessThanOrEqual(64_000_000)
  })
})

describe('YouTube visibility', () => {
  it('is public unless YOUTUBE_PRIVACY says otherwise, even when GitHub passes the unset variable as empty', () => {
    expect(privacyStatus('')).toBe('public')
    expect(privacyStatus(undefined)).toBe('public')
    expect(privacyStatus(' Unlisted ')).toBe('unlisted')
    expect(privacyStatus('private')).toBe('private')
    expect(privacyStatus('secret')).toBe('public')
  })
})

describe('YouTube data retention', () => {
  it('drops the ids of uploads older than 30 days and keeps the rest of the post', () => {
    const today = new Date('2026-11-30T12:00:00Z')
    const history = [
      { date: '2026-10-01T10:00:00Z', hook: 'old', results: { youtube: { id: 'a', url: 'u' }, instagram: { id: 'i' } } },
      { date: '2026-11-20T10:00:00Z', hook: 'new', results: { youtube: { id: 'b', url: 'v' } } },
    ]
    expect(forgetOldUploads(history, today)).toBe(1)
    expect(history[0]).toEqual({ date: '2026-10-01T10:00:00Z', hook: 'old', results: { instagram: { id: 'i' } } })
    expect(history[1].results.youtube.id).toBe('b')
  })
})
