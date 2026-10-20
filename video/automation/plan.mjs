/**
 * What the next video is about: a format and its places, chosen from Roamie's guides under rules that keep the feed
 * varied. Pure and seeded (same history and day → same plan), so it's testable and a failed run can be retried.
 *
 * The rules ("barriere"):
 *  - never the same format twice in a row, and no format more than twice in the last four posts;
 *  - no place shown again within RECENT_DAYS days (relaxed only if nothing else fits);
 *  - a "versus" pair is never repeated, in any order;
 *  - a month is suggested at most once per language within MONTH_GAP_DAYS;
 *  - photos that aren't of the place itself (satellite shots, maps, flags, logos) are never used;
 *  - the hook's style (copy.mjs HOOK_STYLES) is never one of the last two posts', and the least used lately comes first.
 */

import { HOOK_STYLES } from './copy.mjs'
import { formatBonus, formatScores, hookScores } from './metrics.mjs'

export const FORMATS = ['wheel', 'month', 'versus']
export const CAROUSEL_FORMATS = ['guide', 'month']
export const RECENT_DAYS = 30
export const MONTH_GAP_DAYS = 200
/** Videos and carousels keep their own freshness window; across the two, a place only waits this long. */
export const CROSS_DAYS = 7
/** Share of posts planned ignoring what worked, so a format that started badly still gets another chance. */
export const EXPLORE_SHARE = 0.25

const DAY = 86_400_000
const BAD_PHOTO = /satellite|_ESA\d|ESA\d{5}|locator|map[_ (.]|_map|flag|logo|diagram|coat_of_arms/i

/** Small seeded PRNG (mulberry32): the plan depends only on its inputs. */
export function seeded(seedText) {
  let a = [...seedText].reduce((h, c) => (Math.imul(h ^ c.charCodeAt(0), 2654435761) >>> 0), 1779033703)
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const shuffle = (list, rand) => {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Picks `count` places with different countries, in random order; null if there aren't enough. */
function pickDistinct(candidates, count, rand) {
  const out = []
  for (const place of shuffle(candidates, rand)) {
    if (out.some((p) => p.countryCode === place.countryCode)) continue
    out.push(place)
    if (out.length === count) return out
  }
  return null
}

const pairKey = (a, b) => [a, b].sort().join('+')

/**
 * @param places    loadPlaces()
 * @param history   past posts, oldest first: { date, format, lang, places: [keys], month?, pair? }
 * @param today     Date
 * @param lang      'it' | 'en'
 */
export function makePlan(places, history, today, lang) {
  const rand = seeded(`${today.toISOString().slice(0, 10)}|${lang}|${history.length}`)
  const usable = places.filter((p) => !BAD_PHOTO.test(p.photo.url))
  const mine = history.filter((h) => h.lang === lang && h.kind !== 'carousel')
  const carousels = history.filter((h) => h.lang === lang && h.kind === 'carousel')
  const recentKeys = (days) =>
    new Set([...mine.filter((h) => today - new Date(h.date) < days * DAY), ...carousels.filter((h) => today - new Date(h.date) < CROSS_DAYS * DAY)].flatMap((h) => h.places))

  // Formats: the least used lately first (ties broken at random). Strictly: not the last one and at most twice in the
  // last four; if no format can be planned that way, only "not the last one" still holds.
  const last = mine.slice(-4).map((h) => h.format)
  const uses = (f) => last.filter((x) => x === f).length
  // What worked on Instagram nudges the order (see metrics.mjs), except in the exploring share of posts.
  const bonus = rand() < EXPLORE_SHARE ? {} : formatBonus(formatScores(mine, 'video', today))
  const weight = (f) => uses(f) - (bonus[f] ?? 0)
  const ordered = shuffle(FORMATS, rand).sort((a, b) => weight(a) - weight(b))
  const notLast = ordered.filter((f) => f !== last[last.length - 1])
  const strict = notLast.filter((f) => uses(f) < 2)

  // Strict freshness first; each step relaxes the least important rule, never the "never twice in a row".
  for (const [days, formats] of [
    [RECENT_DAYS, strict],
    [RECENT_DAYS, notLast],
    [21, notLast],
  ]) {
    const recent = recentKeys(days)
    const fresh = usable.filter((p) => !recent.has(p.key))
    for (const format of formats) {
      const plan = PLANNERS[format](fresh, mine, today, rand)
      if (plan) return { format, lang, ...plan }
    }
  }
  throw new Error('No plan fits the rules: add places to the guides or wait for the windows to pass.')
}

const PLANNERS = {
  /** Four places from one guide (a coherent theme), different countries; the wheel lands by points, like the app. */
  wheel(fresh, _mine, _today, rand) {
    const byGuide = new Map()
    for (const p of fresh) for (const g of p.guides) byGuide.set(g, [...(byGuide.get(g) ?? []), p])
    for (const guide of shuffle([...byGuide.keys()], rand)) {
      const four = pickDistinct(byGuide.get(guide), 4, rand)
      if (!four) continue
      const points = four.map(() => 3 + Math.floor(rand() * 9))
      const total = points.reduce((a, b) => a + b, 0)
      let ticket = rand() * total
      const winner = points.findIndex((p) => (ticket -= p) < 0)
      return { places: four, points, winner, guide }
    }
    return null
  },

  /** Three places at their best next month (people plan a few weeks ahead), else the one after. */
  month(fresh, mine, today, rand) {
    for (const ahead of [30, 60]) {
      const month = new Date(today.getTime() + ahead * DAY).getMonth() + 1
      const usedLately = mine.some((h) => h.format === 'month' && h.month === month && today - new Date(h.date) < MONTH_GAP_DAYS * DAY)
      if (usedLately) continue
      const three = pickDistinct(fresh.filter((p) => p.months.includes(month)), 3, rand)
      if (three) return { places: three, month }
    }
    return null
  },

  /** Two places sharing a mood (a real choice, not apples and oranges), never the same pair twice. */
  versus(fresh, mine, _today, rand) {
    const used = new Set(mine.filter((h) => h.format === 'versus').map((h) => h.pair))
    for (const a of shuffle(fresh, rand)) {
      for (const b of shuffle(fresh, rand)) {
        if (a.key === b.key || a.countryCode === b.countryCode) continue
        if (!a.moods.some((m) => b.moods.includes(m))) continue
        if (used.has(pairKey(a.key, b.key))) continue
        return { places: [a, b], pair: pairKey(a.key, b.key) }
      }
    }
    return null
  },
}

/**
 * The background track: one of the format's tracks in public/music (named "<format>-…"), never the one its last post
 * of the same format used, and otherwise the least recently used. Seeded like the plan.
 */
export function pickMusic(format, tracks, history, rand) {
  const mine = tracks.filter((t) => t.startsWith(`${format}-`))
  if (!mine.length) return undefined
  const lastUse = (t) => history.findLastIndex((h) => h.music === `music/${t}`)
  const order = shuffle(mine, rand).sort((a, b) => lastUse(a) - lastUse(b))
  return `music/${order[0]}`
}

/**
 * A carousel: five places (four if the rules leave fewer) from one guide, or at their best in a month a few weeks
 * ahead. Never the same format as the previous carousel; a place waits RECENT_DAYS before another carousel and
 * CROSS_DAYS after a video; a guide waits GUIDE_GAP_DAYS, a month MONTH_GAP_DAYS.
 */
export const GUIDE_GAP_DAYS = 35

export function makeCarouselPlan(places, history, today, lang) {
  const rand = seeded(`${today.toISOString().slice(0, 10)}|${lang}|carousel|${history.length}`)
  const usable = places.filter((p) => !BAD_PHOTO.test(p.photo.url))
  const mine = history.filter((h) => h.lang === lang && h.kind === 'carousel')
  const videos = history.filter((h) => h.lang === lang && h.kind !== 'carousel')
  const within = (h, days) => today - new Date(h.date) < days * DAY
  const last = mine[mine.length - 1]?.format
  const bonus = rand() < EXPLORE_SHARE ? {} : formatBonus(formatScores(mine, 'carousel', today))
  const formats = [
    ...shuffle(CAROUSEL_FORMATS, rand)
      .filter((f) => f !== last)
      .sort((a, b) => (bonus[b] ?? 0) - (bonus[a] ?? 0)),
    ...(last ? [last] : []),
  ]

  for (const days of [RECENT_DAYS, 21, 14]) {
    const recent = new Set([...mine.filter((h) => within(h, days)), ...videos.filter((h) => within(h, CROSS_DAYS))].flatMap((h) => h.places))
    const fresh = usable.filter((p) => !recent.has(p.key))
    for (const count of [5, 4]) {
      for (const format of formats) {
        if (format === 'guide') {
          const usedGuides = new Set(mine.filter((h) => h.guide && within(h, Math.min(days, GUIDE_GAP_DAYS))).map((h) => h.guide))
          const guides = shuffle([...new Set(fresh.flatMap((p) => p.guides))], rand).filter((g) => !usedGuides.has(g))
          for (const guide of guides) {
            const picked = pickDistinct(fresh.filter((p) => p.guides.includes(guide)), count, rand)
            if (picked) return { kind: 'carousel', format, lang, guide, places: picked }
          }
        } else {
          for (const ahead of [30, 60]) {
            const month = new Date(today.getTime() + ahead * DAY).getMonth() + 1
            if (mine.some((h) => h.format === 'month' && h.month === month && within(h, MONTH_GAP_DAYS))) continue
            const picked = pickDistinct(fresh.filter((p) => p.months.includes(month)), count, rand)
            if (picked) return { kind: 'carousel', format, lang, month, places: picked }
          }
        }
      }
    }
  }
  throw new Error('No carousel fits the rules: add places to the guides or wait for the windows to pass.')
}

/**
 * The style of the next hook, across videos and carousels of one language: never the style of the last two posts,
 * otherwise the least used in the last six, nudged by Instagram's numbers per style (except in the exploring share).
 * `history`: that language's past posts, oldest first. Seeded like the plan.
 */
export function pickHookStyle(history, today, rand) {
  const recent = history.slice(-6).map((h) => h.hookStyle)
  const uses = (style) => recent.filter((s) => s === style).length
  const bonus = rand() < EXPLORE_SHARE ? {} : formatBonus(hookScores(history, today))
  const styles = shuffle(Object.keys(HOOK_STYLES), rand).filter((s) => !recent.slice(-2).includes(s))
  return styles.sort((a, b) => uses(a) - (bonus[a] ?? 0) - (uses(b) - (bonus[b] ?? 0)))[0]
}
