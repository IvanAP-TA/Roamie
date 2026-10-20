/**
 * From what people say about planning trips together to ideas for our posts: Research → Ideas → Hooks.
 *
 * The AI reads the month's most discussed posts and their top comments and returns the recurring problems, each with
 * an angle for a LinkedIn post and an opening line for a video. These are ideas, not facts: they are summarised in
 * our own words (never quoted, never attributed), carry no numbers and no names, and the bots still build every post
 * from their own facts. The ideas wait in a bank until a post uses them.
 */
import { similarity } from '../copy.mjs'

/** What we look for: the moments where groups get stuck deciding and planning. */
export const QUERIES = [
  { query: 'group trip friends planning' },
  { query: 'trip with friends decide where to go' },
  { query: 'friends cant agree on vacation' },
  { query: 'group travel budget friends' },
  { query: 'bachelor party trip planning' },
  { query: 'organizing a trip with friends', subreddit: 'travel' },
  { query: 'friends trip', subreddit: 'solotravel' },
]

/** The same, as YouTube searches: videos about trips with friends, whose comments tell where it gets hard. */
export const VIDEO_QUERIES = ['group trip with friends', 'planning a trip with friends', 'friends trip went wrong', 'how to plan a group trip', 'bachelor party trip planning']

const words = (text) => text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean)

/** Whether `text` copies a run of `n` words from any source: a quote in disguise. */
export function copiesSource(text, sources, n = 7) {
  const grams = new Set()
  for (const source of sources) {
    const w = words(source)
    for (let i = 0; i + n <= w.length; i++) grams.add(w.slice(i, i + n).join(' '))
  }
  const w = words(text)
  for (let i = 0; i + n <= w.length; i++) if (grams.has(w.slice(i, i + n).join(' '))) return true
  return false
}

const FIELDS = { problem: [20, 160], context: [40, 400], linkedin_angle: [30, 300], video_hook: [20, 70] }

/** Every check an idea must pass. Returns the reason it fails, or null. */
export function checkInsight(insight, sources) {
  for (const [field, [min, max]] of Object.entries(FIELDS)) {
    const value = insight?.[field]
    if (typeof value !== 'string') return `${field} missing`
    const v = value.trim()
    if (v.length < min || v.length > max) return `${field} length ${v.length}`
    if (/https?:|www\.|\br\/\w|\bu\/\w|@\w/i.test(v)) return `${field} has a link or a username`
    if (/\d/.test(v)) return `${field} has a number`
    if (/[—–]/.test(v)) return `${field} has a long dash`
    if (/\p{Extended_Pictographic}/u.test(v)) return `${field} has an emoji`
    if (/"|“|”/.test(v)) return `${field} quotes someone`
    if (copiesSource(v, sources)) return `${field} copies a post`
  }
  return null
}

/** The messages for the AI: the posts and comments, and what to return. */
export function researchPrompt(posts) {
  const material = posts
    .map((p, i) => [`Source ${i + 1} (engagement ${p.score}, ${p.comments} comments): ${p.title}`, p.text && `  ${p.text}`, ...(p.top ?? []).map((c) => `  - comment: ${c}`)].filter(Boolean).join('\n'))
    .join('\n\n')
  const system = [
    'You help Roamie, a free web app where groups of friends propose destinations, vote with points and spin a wheel to decide their trip, understand what people struggle with when they plan trips together.',
    'From the videos, posts and comments below, find up to five recurring problems or tensions about deciding and organising a trip as a group (not about a single destination, not solo travel).',
    'For each, return: problem (one sentence, in your own words), context (two sentences on how it shows up, in your own words), linkedin_angle (an angle for a calm, honest LinkedIn post from the Roamie team), video_hook (a short opening line for a vertical video, 20 to 70 characters, informal).',
    'Rules: summarise, never quote; no usernames, no subreddit names, no links, no numbers, no emoji, no long dashes, no quotation marks. Only problems that really appear in the material.',
    'Return JSON {"insights": [{"problem": string, "context": string, "linkedin_angle": string, "video_hook": string}]}.',
  ].join('\n')
  return [
    { role: 'system', content: system },
    { role: 'user', content: material },
  ]
}

/**
 * The bank with the new ideas added: each gets an id and its date; one too close to an idea already in the bank is
 * left out; the bank keeps the last 60.
 */
export function mergeBank(bank, insights, today) {
  const day = today.toISOString().slice(0, 10)
  const next = [...bank]
  for (const [i, insight] of insights.entries()) {
    if (next.some((old) => similarity(old.problem, insight.problem) > 0.35)) continue
    next.push({ id: `${day}-${i + 1}`, date: day, ...Object.fromEntries(Object.keys(FIELDS).map((f) => [f, insight[f].trim()])) })
  }
  return next.slice(-60)
}

/** The oldest idea no post has used yet (LinkedIn posts record it as topic "research:<id>"), or null. */
export function freshInsight(bank, history) {
  const used = new Set(history.map((h) => h.topic))
  return bank.find((idea) => !used.has(`research:${idea.id}`)) ?? null
}

/** A few recent video openers, as inspiration for the social bot's hook (never copied as they are). */
export const recentHooks = (bank, n = 3) => bank.slice(-n).map((idea) => idea.video_hook)
