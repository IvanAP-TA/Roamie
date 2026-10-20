/**
 * The weekly research: what people say about planning trips with friends, from the comments under the month's
 * YouTube videos on the subject (and Reddit's most discussed posts, if its API ever approves an app), turned into
 * ideas for the bots (insights.mjs) and kept in a bank.
 *
 *   node --experimental-strip-types automation/research/run.mjs
 *
 * Environment:
 *   YOUTUBE_API_KEY                          YouTube Data API key (read-only); the main source
 *   REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET   an approved Reddit app, optional; new apps need Reddit's approval
 *   MISTRAL_API_KEY                          turns the material into ideas
 *   TELEGRAM_*                               a summary of the new ideas
 *   BANK_PATH                                where the bank is kept (default automation/research/bank.json)
 */
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { askMistral } from '../copy.mjs'
import { telegram } from '../publish/telegram.mjs'
import { checkInsight, mergeBank, QUERIES, researchPrompt, VIDEO_QUERIES } from './insights.mjs'
import { reddit } from './reddit.mjs'
import { youtubeComments } from './youtube.mjs'

const bankPath = process.env.BANK_PATH || fileURLToPath(new URL('./bank.json', import.meta.url))
const log = (...args) => console.log('·', ...args)
// What went wrong along the way (a search refused, a source empty), for the Telegram alert if the run fails.
const problems = []
const summary = (text) => process.env.GITHUB_STEP_SUMMARY && appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${text}\n`)
const escape = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Videos with their top comments, from YouTube. */
async function fromYouTube() {
  const posts = []
  for (const query of VIDEO_QUERIES) {
    try {
      posts.push(...(await youtubeComments.search(query)))
    } catch (error) {
      log(`youtube "${query}": ${error.message}`)
      problems.push(`YouTube "${query}": ${error.message}`)
    }
  }
  return posts
}

/** Posts with their top comments, from Reddit (only with an approved app). */
async function fromReddit() {
  const token = await reddit.token()
  const seen = new Map()
  for (const { query, subreddit } of QUERIES) {
    try {
      for (const post of await reddit.search(token, query, { subreddit })) seen.set(post.id, post)
    } catch (error) {
      log(`reddit "${query}": ${error.message}`)
    }
  }
  const posts = [...seen.values()].sort((a, b) => b.comments + b.score / 10 - (a.comments + a.score / 10)).slice(0, 8)
  for (const post of posts) post.top = await reddit.topComments(token, post.id).catch(() => [])
  return posts
}

async function main() {
  if (!youtubeComments.ready() && !reddit.ready()) {
    log('no YOUTUBE_API_KEY (nor Reddit keys): nothing to research')
    summary('## Skipped: no research keys\n')
    return
  }
  const bank = existsSync(bankPath) ? JSON.parse(readFileSync(bankPath, 'utf8')) : []
  const posts = [...(youtubeComments.ready() ? await fromYouTube() : []), ...(reddit.ready() ? await fromReddit().catch((error) => (log(`reddit: ${error.message}`), [])) : [])]
  const seen = new Set()
  const unique = posts.filter((p) => !seen.has(p.id) && seen.add(p.id)).slice(0, 14)
  log(`material: ${unique.length} videos or posts with comments`)
  if (unique.length < 3) throw new Error(`only ${unique.length} sources found`)

  const sources = unique.flatMap((p) => [p.title, p.text, ...(p.top ?? [])]).filter(Boolean)
  // Up to three tries until at least three ideas pass: each new try is told what was dropped and why, and the ideas
  // already accepted, so it brings different ones.
  const insights = []
  const dropped = []
  for (let attempt = 0; attempt < 3 && insights.length < 3; attempt++) {
    const messages = researchPrompt(unique)
    if (attempt) {
      messages.push({
        role: 'user',
        content: `Some ideas were rejected: ${dropped.slice(-5).join('; ')}. Already accepted (do not repeat): ${insights.map((i) => i.problem).join(' | ') || 'none'}. Return new ideas that follow every rule.`,
      })
    }
    const answer = await askMistral(messages, { maxTokens: 1600 })
    for (const insight of answer?.insights ?? []) {
      const problem = checkInsight(insight, sources)
      if (problem) {
        log(`idea dropped: ${problem}`)
        dropped.push(problem)
      } else if (!insights.some((i) => i.problem === insight.problem)) insights.push(insight)
    }
  }
  if (!insights.length) throw new Error(`no idea passed the checks (${dropped.slice(0, 4).join('; ') || 'no answer from the AI'})`)

  const next = mergeBank(bank, insights, new Date())
  writeFileSync(bankPath, `${JSON.stringify(next, null, 2)}\n`)
  const fresh = next.filter((idea) => !bank.some((old) => old.id === idea.id))
  log(`ideas: ${insights.length} passed, ${fresh.length} new in the bank (${next.length} in all)`)
  summary(`## Research: ${fresh.length} new ideas\n\n${fresh.map((i) => `- **${i.problem}**\n  - LinkedIn: ${i.linkedin_angle}\n  - Video: ${i.video_hook}`).join('\n')}\n`)

  if (telegram.ready() && fresh.length) {
    const lines = fresh.map((i) => `• <b>${escape(i.problem)}</b>\n  🎬 ${escape(i.video_hook)}`)
    await telegram.message(`🔎 <b>Idee della settimana da Reddit</b>\n\n${lines.join('\n\n')}`).catch((error) => log(`telegram: ${error.message}`))
  }
}

main().catch(async (error) => {
  console.error(error)
  summary(`## ❌ Failed\n\n${error.message}`)
  // The run's logs need a GitHub login: the reason goes to Telegram too (API errors carry no keys).
  if (telegram.ready()) {
    const details = [error.message, ...problems.slice(0, 3)].map((line) => `• ${escape(line.slice(0, 200))}`).join('\n')
    await telegram.message(`⚠️ <b>Ricerca settimanale non riuscita</b>\n\n${details}`).catch(() => {})
  }
  process.exit(1)
})
