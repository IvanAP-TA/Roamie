/**
 * What worked: Instagram's numbers for past posts (the only platform whose API gives them with our keys), turned into
 * a score per format (and per hook style) that the planner uses to favour the formats people respond to, without dropping the others.
 *
 * Needs the Page token to carry instagram_manage_insights; without it the numbers are simply not read.
 */

const DAY = 86_400_000
/** Posts this old or older stop changing much: their numbers are read once more and then kept. */
const SETTLED_DAYS = 14
const MAX_AGE_DAYS = 60
/** Insight calls per run, to stay far from the API's limits. */
const MAX_READS = 20

const GRAPH = () => `https://graph.facebook.com/${process.env.META_GRAPH_VERSION ?? 'v26.0'}`

/** Reach, saves, shares and interactions of one Instagram post. */
async function instagramInsights(mediaId) {
  const url = `${GRAPH()}/${mediaId}/insights?metric=reach,saved,shares,total_interactions&access_token=${process.env.INSTAGRAM_ACCESS_TOKEN}`
  const data = await fetch(url).then((r) => r.json())
  if (data.error) throw Object.assign(new Error(data.error.message ?? 'insights'), { code: data.error.code })
  const value = (name) => data.data?.find((m) => m.name === name)?.values?.[0]?.value ?? 0
  return { reach: value('reach'), saved: value('saved'), shares: value('shares'), interactions: value('total_interactions') }
}

/**
 * Reads the numbers of recent Instagram posts into history (h.metrics), newest first: posts younger than a day are
 * skipped (too early), settled ones are read once more after SETTLED_DAYS. Stops at the first permission error.
 */
export async function refreshMetrics(history, today, read = instagramInsights) {
  if (!process.env.INSTAGRAM_ACCESS_TOKEN && read === instagramInsights) return { read: 0, skipped: 'no token' }
  let reads = 0
  for (const post of [...history].reverse()) {
    const id = post.results?.instagram?.id
    if (!id || post.results.instagram.error) continue
    const age = (today - new Date(post.date)) / DAY
    if (age < 1 || age > MAX_AGE_DAYS) continue
    const readAge = post.metrics ? (today - new Date(post.metrics.at)) / DAY : Infinity
    const settled = post.metrics && new Date(post.metrics.at) - new Date(post.date) >= SETTLED_DAYS * DAY
    if (settled || readAge < 1) continue
    if (reads >= MAX_READS) break
    try {
      post.metrics = { ...(await read(id)), at: today.toISOString() }
      reads++
    } catch (error) {
      return { read: reads, skipped: error.message }
    }
  }
  return { read: reads }
}

/**
 * How well a post did for the people it reached: saves and shares count the most (they're what spreads a post),
 * then any interaction. Null when it reached too few people to say.
 */
export function score(post) {
  const m = post.metrics
  if (!m || m.reach < 20) return null
  return (3 * m.saved + 4 * m.shares + m.interactions) / m.reach
}

/** Average score per format over the last 90 days, for one kind of post ('video' or 'carousel'). */
export const formatScores = (history, kind, today) => scoresBy(history.filter((post) => (post.kind ?? 'video') === kind), (post) => post.format, today)

/** Average score per hook style (copy.mjs HOOK_STYLES) over the last 90 days, videos and carousels together. */
export const hookScores = (history, today) => scoresBy(history, (post) => post.hookStyle, today)

/** Average score per group (`groupOf(post)`, posts without one left out) over the last 90 days. */
function scoresBy(history, groupOf, today) {
  const sums = {}
  for (const post of history) {
    const group = groupOf(post)
    if (!group || today - new Date(post.date) > 90 * DAY) continue
    const s = score(post)
    if (s === null) continue
    sums[group] ??= { total: 0, n: 0 }
    sums[group].total += s
    sums[group].n++
  }
  return Object.fromEntries(Object.entries(sums).map(([group, { total, n }]) => [group, { avg: total / n, n }]))
}

/**
 * A nudge per format, between -0.9 and 0.9: how far its average is from the others', once it has at least 3 scored
 * posts. Smaller than one "use" in the planner's balance, so it reorders formats but never breaks the variety rules.
 */
export function formatBonus(scores) {
  const known = Object.entries(scores).filter(([, s]) => s.n >= 3)
  if (known.length < 2) return {}
  const mean = known.reduce((sum, [, s]) => sum + s.avg, 0) / known.length
  const spread = Math.max(...known.map(([, s]) => Math.abs(s.avg - mean))) || 1
  return Object.fromEntries(known.map(([format, s]) => [format, (0.9 * (s.avg - mean)) / spread]))
}
