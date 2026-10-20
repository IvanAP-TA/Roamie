/**
 * The weekly research: the month's most discussed Reddit posts about planning trips with friends, turned into ideas
 * for the bots (insights.mjs) and kept in a bank.
 *
 *   node --experimental-strip-types automation/research/run.mjs
 *
 * Environment:
 *   REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET   a Reddit "script" app (read-only); without them the run does nothing
 *   MISTRAL_API_KEY                          turns the posts into ideas
 *   TELEGRAM_*                               a summary of the new ideas
 *   BANK_PATH                                where the bank is kept (default automation/research/bank.json)
 */
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { askMistral } from '../copy.mjs'
import { telegram } from '../publish/telegram.mjs'
import { checkInsight, mergeBank, QUERIES, researchPrompt } from './insights.mjs'
import { reddit } from './reddit.mjs'

const bankPath = process.env.BANK_PATH || fileURLToPath(new URL('./bank.json', import.meta.url))
const log = (...args) => console.log('·', ...args)
const summary = (text) => process.env.GITHUB_STEP_SUMMARY && appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${text}\n`)
const escape = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

async function main() {
  if (!reddit.ready()) {
    log('no REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET: nothing to research')
    summary('## Skipped: no Reddit keys\n')
    return
  }
  const bank = existsSync(bankPath) ? JSON.parse(readFileSync(bankPath, 'utf8')) : []
  const token = await reddit.token()

  const seen = new Map()
  for (const { query, subreddit } of QUERIES) {
    try {
      for (const post of await reddit.search(token, query, { subreddit })) seen.set(post.id, post)
    } catch (error) {
      log(`search "${query}": ${error.message}`)
    }
  }
  const posts = [...seen.values()].sort((a, b) => b.comments + b.score / 10 - (a.comments + a.score / 10)).slice(0, 12)
  log(`posts: ${seen.size} found, ${posts.length} read`)
  if (posts.length < 3) throw new Error(`only ${posts.length} posts found`)
  for (const post of posts.slice(0, 8)) post.top = await reddit.topComments(token, post.id).catch(() => [])

  const sources = posts.flatMap((p) => [p.title, p.text, ...(p.top ?? [])]).filter(Boolean)
  const answer = await askMistral(researchPrompt(posts), { maxTokens: 1600 })
  const insights = (answer?.insights ?? []).filter((insight) => {
    const problem = checkInsight(insight, sources)
    if (problem) log(`idea dropped: ${problem}`)
    return !problem
  })
  if (!insights.length) throw new Error('no idea passed the checks')

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

main().catch((error) => {
  console.error(error)
  summary(`## ❌ Failed\n\n${error.message}`)
  process.exit(1)
})
