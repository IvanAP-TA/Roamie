/**
 * The day's draft for X: the LinkedIn post retold in a few lines for Roamie's account (x.com/getroamie1), sent to
 * Telegram to post by hand: X's API is paid since 2026, and posting by hand costs a minute.
 */
import { checkLine } from '../copy.mjs'
import { numbersIn, unknownNames, withoutLongDashes } from './posts.mjs'

export const X_KINDS = ['build', 'insight', 'feature', 'lesson', 'destination', 'month']
export const X_MAX = 280

/** The messages for the AI: the facts, and the LinkedIn post written from them. */
export function xPrompt(plan, linkedIn, past) {
  const system = [
    'You write a post for X (Twitter) from the account of Roamie, a free web app where groups of friends propose destinations, vote with points and spin a wheel to decide their trip together.',
    'Voice: the small team behind Roamie, writing as "we", like its LinkedIn page but shorter and more direct. Plain, warm, a little dry. No hype, no buzzwords, no exclamation marks, no emoji, no hashtags, no links, no @ mentions, no quotation marks around the post.',
    `Length: at most ${X_MAX - 20} characters. One idea, told concretely. It can end with a short genuine question, or not.`,
    'Use only what the facts and the LinkedIn post say. Never invent numbers, users, results, places or names. Never use em dashes or en dashes (— or –).',
    'Return JSON {"post": string}.',
    ...(past.length ? ['Earlier drafts; say something different, in different words:', ...past.slice(-6).map((p) => `  · ${p}`)] : []),
  ].join('\n')
  return [
    { role: 'system', content: system },
    { role: 'user', content: `Facts:\n${plan.facts}\n\nToday's LinkedIn post:\n${linkedIn}` },
  ]
}

/** Every check a draft must pass: the reason it fails, or null. */
export function checkX(text, plan, linkedIn, past = []) {
  if (typeof text !== 'string') return 'missing'
  const t = text.trim()
  if (/https?:|www\.|\.org\b|\.com\b/i.test(t)) return 'link'
  if (/!/.test(t)) return 'exclamation'
  const unknown = unknownNames(t, `${plan.facts}\n${linkedIn}`)
  if (unknown.length) return `names not in the facts: ${unknown.slice(0, 4).join(', ')}`
  return checkLine(t, { min: 60, max: X_MAX, lang: 'en', past, maxSimilarity: 0.3, allowedNumbers: numbersIn(`${plan.facts}\n${linkedIn}`) })
}

/** Writes the draft: up to three tries. Returns { text, rejected } or { text: null, rejected }. */
export async function writeXPost(plan, linkedIn, ask, past = []) {
  const rejected = []
  const messages = xPrompt(plan, linkedIn, past)
  for (let attempt = 0; attempt < 3; attempt++) {
    const answer = await ask(rejected.length ? [...messages, { role: 'user', content: `Your previous answer was rejected (${rejected.at(-1)}). Try again.` }] : messages)
    if (!answer) break
    const post = typeof answer.post === 'string' ? withoutLongDashes(answer.post.trim().replace(/^["“”]+|["“”]+$/g, '').trim()) : answer.post
    const problem = checkX(post, plan, linkedIn, past)
    if (!problem) return { text: post, rejected }
    rejected.push(problem)
  }
  return { text: null, rejected }
}
