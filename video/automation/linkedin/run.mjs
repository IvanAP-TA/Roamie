/**
 * The day's LinkedIn post: plan → words → image → publish → history. See posts.mjs for what gets posted when.
 *
 *   node --experimental-strip-types automation/linkedin/run.mjs
 *
 * Environment:
 *   PUBLISH                "on" to post on the page through Make; anything else only sends the kit to Telegram
 *   AUTO                   "true" for the daily schedule: skips when the day's post is already out
 *   LINKEDIN_KIND          build, insight, destination, feature, month or lesson, to override the day's choice
 *   MISTRAL_API_KEY        writes the post (without it there is no post: LinkedIn texts are never hand-filled)
 *   SOCIAL_UPLOAD_SECRET   hosts the image at roamie.org/social, where Make fetches it
 *   MAKE_LINKEDIN_WEBHOOK  the Make scenario that posts on the page (publish/make.mjs)
 *   TELEGRAM_*             the kit: the image and the text, to post by hand (and the alerts)
 *   HISTORY_PATH           where past posts are kept (default automation/linkedin/history.json)
 */
import { execFileSync } from 'node:child_process'
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { askMistral } from '../copy.mjs'
import { loadPlaces } from '../places.mjs'
import { seeded } from '../plan.mjs'
import { make } from '../publish/make.mjs'
import { media } from '../publish/media.mjs'
import { telegram } from '../publish/telegram.mjs'
import { assemblePost, makeLinkedInPlan, postFirstLine, writeLinkedInPost } from './posts.mjs'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))
const publishing = ['on', 'true', 'yes', '1'].includes((process.env.PUBLISH ?? '').trim().toLowerCase())
const historyPath = process.env.HISTORY_PATH ?? fileURLToPath(new URL('./history.json', import.meta.url))
const log = (...args) => console.log('·', ...args)
const summary = (text) => process.env.GITHUB_STEP_SUMMARY && appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${text}\n`)
const isJpeg = (bytes) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff

/** The last week's commit subjects on this branch, for Monday's "this week" post. */
function lastWeekCommits() {
  try {
    return execFileSync('git', ['log', '--since=8 days ago', '--no-merges', '--format=%s'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean)
  } catch {
    return []
  }
}

/** A Commons photo at a width LinkedIn shows sharply, as JPEG bytes, or null (then the post uses an app card). */
async function commonsPhoto(url) {
  for (const width of [1920, 1280]) {
    const candidate = url.replace(/\/\d+px-/, `/${width}px-`)
    const response = await fetch(candidate, { headers: { 'User-Agent': 'Roamie/1.0 (https://roamie.org)' }, signal: AbortSignal.timeout(30_000) }).catch(() => null)
    if (!response?.ok) continue
    const bytes = new Uint8Array(await response.arrayBuffer())
    if (isJpeg(bytes) && bytes.length > 40_000 && bytes.length < 4_500_000) return bytes
  }
  return null
}

const card = (name) => new Uint8Array(readFileSync(new URL(`./cards/${name}.jpg`, import.meta.url)))

async function main() {
  const history = existsSync(historyPath) ? JSON.parse(readFileSync(historyPath, 'utf8')) : []
  const today = new Date()
  const day = today.toISOString().slice(0, 10)
  // The daily start can come twice (Supabase, then GitHub's backup schedule): one post a day.
  if (process.env.AUTO === 'true' && history.some((h) => h.date.slice(0, 10) === day && !h.failed)) {
    log('already posted today: nothing to do')
    summary("## Skipped: today's LinkedIn post is already out\n")
    return
  }

  const places = loadPlaces()
  const commits = lastWeekCommits()
  const past = history.map((h) => h.firstLine).filter(Boolean)
  const pastTexts = history.slice(-30).map((h) => h.text).filter(Boolean)
  const ask = (messages) => askMistral(messages, { maxTokens: 900 })
  const rejected = []

  // The day's kind of post, and if the AI can't write one that passes the checks, a post about a feature (the
  // simplest facts) rather than nothing.
  let plan = makeLinkedInPlan({ places, history, today, commits })
  let written = { text: null }
  for (const kind of [...new Set([plan.kind, 'feature'])]) {
    if (kind !== plan.kind) plan = makeLinkedInPlan({ places, history, today, commits, kind })
    log(`plan: ${plan.kind} · ${plan.topic}`)
    written = await writeLinkedInPost(plan, past, ask, pastTexts)
    rejected.push(...written.rejected.map((r) => `${plan.kind}: ${r}`))
    if (written.text) break
  }
  if (rejected.length) log(`rejected: ${rejected.join('; ')}`)
  if (!written.text) {
    const reason = process.env.MISTRAL_API_KEY ? `the AI's texts didn't pass the checks (${rejected.join('; ') || 'no answer'})` : 'no MISTRAL_API_KEY'
    if (telegram.ready()) await telegram.message(`⚠️ <b>Niente post LinkedIn oggi</b>\n\n${reason.replace(/</g, '&lt;')}`).catch(() => {})
    // Kept in the history (on the public social-history branch), so the reasons can be read without the run's logs;
    // a failed day doesn't stop the backup schedule from trying again.
    history.push({ date: today.toISOString(), kind: plan.kind, topic: plan.topic, failed: true, rejected: rejected.slice(-12) })
    writeFileSync(historyPath, `${JSON.stringify(history, null, 2)}\n`)
    throw new Error(`no post: ${reason}`)
  }
  let image = plan.image.photo ? await commonsPhoto(plan.image.photo.url) : null
  if (plan.image.photo && !image) {
    log('photo unavailable: using an app card')
    delete plan.credit
  }
  image ??= card(plan.image.card ?? 'home')
  const finalText = assemblePost(written.text, plan)

  mkdirSync(`${ROOT}/out`, { recursive: true })
  writeFileSync(`${ROOT}/out/linkedin.jpg`, image)
  writeFileSync(`${ROOT}/out/linkedin.txt`, finalText)
  log(`post (${finalText.length} characters):\n\n${finalText}\n`)

  const results = {}
  if (publishing && make.ready()) {
    try {
      if (!media.ready()) throw new Error('no SOCIAL_UPLOAD_SECRET to host the image')
      const rand = seeded(`${day}|linkedin-folder`)
      const [imageUrl] = await media.upload([`${ROOT}/out/linkedin.jpg`], `${day}-li${Math.floor(rand() * 36 ** 6).toString(36).padStart(6, '0')}`)
      results.linkedin = await make.publish({ text: finalText, imageUrl })
      log(`linkedin: sent to Make (${results.linkedin.id})`)
    } catch (error) {
      log(`linkedin: FAILED ${error.message}`)
      results.linkedin = { error: error.message.slice(0, 300) }
    }
  } else log(publishing ? 'linkedin: no MAKE_LINKEDIN_WEBHOOK, only the Telegram kit' : 'nothing published automatically (set PUBLISH=on to publish)')

  if (telegram.ready()) {
    try {
      const posted = Boolean(results.linkedin && !results.linkedin.error)
      results.telegram = await telegram.publishLinkedIn({ image, text: finalText, summary: `${plan.kind} · ${postFirstLine(written.text).slice(0, 80)}`, posted })
      await telegram.alert(results)
    } catch (error) {
      log(`telegram: FAILED ${error.message}`)
      results.telegram = { error: error.message.slice(0, 300) }
    }
  }
  const delivered = Object.values(results).some((r) => !r.error)
  if (!delivered && Object.keys(results).length) throw new Error('the post reached neither LinkedIn nor Telegram')

  history.push({
    date: today.toISOString(),
    kind: plan.kind,
    topic: plan.topic,
    ...(plan.places && { places: plan.places }),
    firstLine: postFirstLine(written.text),
    text: written.text,
    published: Boolean(results.linkedin && !results.linkedin.error),
    results,
  })
  writeFileSync(historyPath, `${JSON.stringify(history, null, 2)}\n`)
  summary(`## LinkedIn: ${plan.kind} · ${plan.topic}\n\n${finalText}\n`)
  for (const [name, r] of Object.entries(results)) summary(`- ${name}: ${r.error ? `❌ ${r.error}` : `✅ ${r.id}`}`)
}

main().catch((error) => {
  console.error(error)
  summary(`## ❌ Failed\n\n${error.message}`)
  process.exit(1)
})
