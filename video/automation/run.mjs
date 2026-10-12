/**
 * One automatic post: plan → words → render → checks → publish → history.
 *
 *   node --experimental-strip-types automation/run.mjs
 *
 * Environment:
 *   VIDEO_LANG       it (default) or en
 *   PUBLISH          "on" to publish; anything else renders and checks only (dry run)
 *   TELEGRAM_*       if set, the video and its texts are also sent to Telegram, to post by hand with a sound
 *   HISTORY_PATH     where past posts are kept (default automation/history.json)
 *   MISTRAL_API_KEY  for the AI copy; without it, hand-written lines are used
 *   + each platform's keys (see publish/*.mjs); a platform without keys is skipped
 *
 * Safety: nothing is published unless PUBLISH=on, the video passed every check and its copy passed every check.
 * A failure on one platform doesn't stop the others; the run fails only if nothing at all went out.
 */
import { spawnSync } from 'node:child_process'
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { hashtags, monthName, photoCredit, pickFromPool, POOLS, writeCopy } from './copy.mjs'
import { guideUrl, loadPlaces } from './places.mjs'
import { makePlan, pickMusic, seeded } from './plan.mjs'
import { instagram } from './publish/instagram.mjs'
import { telegram } from './publish/telegram.mjs'
import { tiktok } from './publish/tiktok.mjs'
import { youtube } from './publish/youtube.mjs'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const lang = process.env.VIDEO_LANG === 'en' ? 'en' : 'it'
const publishing = process.env.PUBLISH === 'on'
const historyPath = process.env.HISTORY_PATH ?? fileURLToPath(new URL('./history.json', import.meta.url))
const FPS = 30
const DURATIONS = { wheel: 390, month: 395, versus: 370 }
const COMPOSITION = { wheel: 'Wheel', month: 'Month', versus: 'Versus' }
const PLATFORMS = [youtube, instagram, tiktok]

const log = (...args) => console.log('·', ...args)
const summary = (text) => process.env.GITHUB_STEP_SUMMARY && appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${text}\n`)

/** The largest Commons thumbnail that exists for a photo: sharp enough full screen, never a broken link. */
async function bestPhoto(url) {
  for (const width of [1920, 1280]) {
    const candidate = url.replace(/\/\d+px-/, `/${width}px-`)
    const head = await fetch(candidate, { method: 'HEAD', headers: { 'User-Agent': 'Roamie/1.0 (https://roamie.org)' } }).catch(() => null)
    if (head?.ok) return candidate
  }
  return url
}

const credit = (p) => photoCredit(p.photo)

async function videoPlace(p) {
  return { name: p.name[lang], country: p.country[lang], photo: await bestPhoto(p.photo.url), line: p.line[lang], moods: p.moods.slice(0, 3), budget: p.budget, months: p.months }
}

/** The composition's props, from the plan and the copy. */
async function propsFor(plan, copy, rand, music) {
  const places = await Promise.all(plan.places.map(videoPlace))
  const credits = plan.places.map(credit)
  const pool = POOLS[lang]
  if (plan.format === 'wheel') {
    return {
      lang,
      music,
      hook: copy.hook,
      spinTitle: pool.spin[Math.floor(rand() * pool.spin.length)],
      places,
      points: plan.points,
      winner: plan.winner,
      bestTime: lang === 'it' ? 'Periodo migliore' : 'Best time',
      credits,
    }
  }
  if (plan.format === 'month') return { lang, music, hook: copy.hook, places, credits }
  return {
    lang,
    music,
    hook: copy.hook,
    a: places[0],
    b: places[1],
    rows: lang === 'it' ? ['Budget', 'Quando', 'Vibe'] : ['Budget', 'When', 'Vibe'],
    question: pool.question[Math.floor(rand() * pool.question.length)],
    credits,
  }
}

/** The rendered file must exist, have a sane size and last as long as the composition. */
function checkVideo(file, format) {
  if (!existsSync(file)) throw new Error('render produced no file')
  const size = statSync(file).size
  if (size < 400_000 || size > 80_000_000) throw new Error(`unexpected file size ${size}`)
  const probe = spawnSync('npx', ['remotion', 'ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { cwd: ROOT, encoding: 'utf8', shell: true })
  const seconds = Number.parseFloat(probe.stdout)
  const expected = DURATIONS[format] / FPS
  if (!(Math.abs(seconds - expected) < 0.6)) throw new Error(`duration ${seconds}s, expected ${expected}s`)
  return { size, seconds }
}

async function main() {
  const history = existsSync(historyPath) ? JSON.parse(readFileSync(historyPath, 'utf8')) : []
  const today = new Date()
  const plan = makePlan(loadPlaces(), history, today, lang)
  const rand = seeded(`${today.toISOString()}|copy`)
  log(`plan: ${plan.format} · ${plan.places.map((p) => p.key).join(', ')}${plan.month ? ` · ${monthName(plan.month, lang)}` : ''}`)

  const past = history.filter((h) => h.lang === lang).flatMap((h) => [h.hook, h.caption]).filter(Boolean)
  const copy = await writeCopy(plan, lang, past, rand)
  log(`copy (${copy.source}): ${copy.hook}`, copy.rejected.length ? `· rejected: ${copy.rejected.join('; ')}` : '')

  const tracks = readdirSync(`${ROOT}/public/music`).filter((f) => f.endsWith('.mp3'))
  const music = pickMusic(plan.format, tracks, history.filter((h) => h.lang === lang), rand)
  log(`music: ${music ?? 'none'}`)
  const props = await propsFor(plan, copy, rand, music)
  mkdirSync(`${ROOT}/out`, { recursive: true })
  writeFileSync(`${ROOT}/out/props.json`, JSON.stringify(props))
  const file = `${ROOT}/out/post.mp4`
  const render = spawnSync('npx', ['remotion', 'render', COMPOSITION[plan.format], file, '--props=out/props.json', '--codec=h264'], { cwd: ROOT, stdio: 'inherit', shell: true })
  if (render.status !== 0) throw new Error('render failed')
  const video = checkVideo(file, plan.format)
  log(`video: ${(video.size / 1e6).toFixed(1)} MB, ${video.seconds.toFixed(1)} s`)

  const tags = hashtags(plan, lang, rand)
  const cta = POOLS[lang].cta[Math.floor(rand() * POOLS[lang].cta.length)]
  const link = guideUrl(plan.places[0], lang)
  const photos = `${lang === 'it' ? 'Foto' : 'Photos'}: ${plan.places.map(credit).join(', ')} · Wikimedia Commons`
  const caption = `${copy.caption}\n\n${cta}\n\n${tags.join(' ')}`
  const description = `${copy.caption}\n\n${cta}\n${link}\n\n${photos}\n\n${tags.join(' ')}`
  const post = { file, title: `${copy.hook} #shorts`, caption: `${caption}\n\n${photos}`, description, tags, summary: plan.places.map((p) => p.name[lang]).join(', ') }

  const results = {}
  // The kit to post by hand comes first: when nothing is published automatically, it is the run's only output.
  if (telegram.ready()) {
    try {
      results.telegram = await telegram.publish(post)
      log('telegram: kit sent')
    } catch (error) {
      log(`telegram: FAILED ${error.message}`)
      results.telegram = { error: error.message.slice(0, 300) }
      if (!publishing) throw new Error(`the kit didn't reach Telegram: ${error.message}`)
    }
  }
  if (publishing) {
    for (const platform of PLATFORMS) {
      if (!platform.ready()) {
        log(`${platform.name}: no keys, skipped`)
        continue
      }
      try {
        results[platform.name] = await platform.publish(post)
        log(`${platform.name}: published ${results[platform.name].url ?? results[platform.name].id}`)
      } catch (error) {
        log(`${platform.name}: FAILED ${error.message}`)
        results[platform.name] = { error: error.message.slice(0, 300) }
      }
    }
    const tried = PLATFORMS.map((p) => results[p.name]).filter(Boolean)
    if (tried.length && tried.every((r) => r.error)) throw new Error('every platform failed')
  } else {
    log('nothing published automatically (set PUBLISH=on to publish)')
  }

  history.push({
    date: today.toISOString(),
    format: plan.format,
    lang,
    places: plan.places.map((p) => p.key),
    ...(plan.month && { month: plan.month }),
    ...(plan.pair && { pair: plan.pair }),
    hook: copy.hook,
    caption: copy.caption,
    copySource: copy.source,
    ...(music && { music }),
    published: publishing,
    results,
  })
  writeFileSync(historyPath, `${JSON.stringify(history, null, 2)}\n`)

  summary(`## ${publishing ? 'Published' : results.telegram && !results.telegram.error ? 'Kit sent to Telegram' : 'Dry run'}: ${plan.format}\n`)
  summary(`**${copy.hook}** (${copy.source})\n\n${copy.caption}\n`)
  summary(`Places: ${plan.places.map((p) => p.name[lang]).join(', ')}\n`)
  for (const [name, r] of Object.entries(results)) summary(`- ${name}: ${r.error ? `❌ ${r.error}` : `✅ ${r.url ?? r.id}`}`)
}

main().catch((error) => {
  console.error(error)
  summary(`## ❌ Failed\n\n${error.message}`)
  process.exit(1)
})
