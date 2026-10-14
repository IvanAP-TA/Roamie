/**
 * One automatic post: plan → words → render → checks → publish → history. On Tuesdays and Thursdays it's a carousel
 * (slides for Instagram and TikTok), on the other days a video.
 *
 *   node --experimental-strip-types automation/run.mjs
 *
 * Environment:
 *   VIDEO_LANG       en (default) or it
 *   POST_KIND        video or carousel, to override the day's choice (manual runs)
 *   AUTO             "true" for the daily schedule: skips when the day's post is already out
 *   PUBLISH          "on" to publish; anything else renders and checks only (dry run)
 *   TELEGRAM_*       if set, the post and its texts are also sent to Telegram, to post by hand with a sound
 *   SOCIAL_UPLOAD_SECRET  hosts carousel slides at roamie.org/social (needed to publish carousels)
 *   HISTORY_PATH     where past posts are kept (default automation/history.json)
 *   MISTRAL_API_KEY  for the AI copy; without it, hand-written lines are used
 *   + each platform's keys (see publish/*.mjs); a platform without keys is skipped
 *
 * Safety: nothing is published unless PUBLISH=on, the video passed every check and its copy passed every check.
 * A failure on one platform doesn't stop the others; the run fails only if nothing at all went out.
 */
import { spawnSync } from 'node:child_process'
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { hashtags, monthName, photoCredit, pickFromPool, POOLS, writeCopy } from './copy.mjs'
import { formatScores, refreshMetrics } from './metrics.mjs'
import { guideTheme, guideUrl, loadPlaces } from './places.mjs'
import { makeCarouselPlan, makePlan, pickMusic, seeded } from './plan.mjs'
import { facebook } from './publish/facebook.mjs'
import { instagram } from './publish/instagram.mjs'
import { media } from './publish/media.mjs'
import { telegram } from './publish/telegram.mjs'
import { tiktok } from './publish/tiktok.mjs'
import { youtube } from './publish/youtube.mjs'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const lang = process.env.VIDEO_LANG === 'it' ? 'it' : 'en'
const publishing = ['on', 'true', 'yes', '1'].includes((process.env.PUBLISH ?? '').trim().toLowerCase())
const historyPath = process.env.HISTORY_PATH ?? fileURLToPath(new URL('./history.json', import.meta.url))
const FPS = 30
const DURATIONS = { wheel: 390, month: 395, versus: 370 }
const COMPOSITION = { wheel: 'Wheel', month: 'Month', versus: 'Versus' }
const PLATFORMS = [youtube, instagram, facebook, tiktok]

/** Tuesdays and Thursdays are for carousels, the other days for videos; POST_KIND overrides it. */
const kindOf = (today) => (['video', 'carousel'].includes(process.env.POST_KIND) ? process.env.POST_KIND : [2, 4].includes(today.getUTCDay()) ? 'carousel' : 'video')
const pick = (list, rand) => list[Math.floor(rand() * list.length)]

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

async function video(history, today) {
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

  const results = await deliver(post, 'publish')

  history.push({
    date: today.toISOString(),
    kind: 'video',
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

  report('video', plan, copy, results)
}

/**
 * Sends a post everywhere it should go: the Telegram kit first (when nothing is published automatically it is the
 * run's only output), then, with PUBLISH=on, every platform that has keys and supports this kind of post. `method`
 * is the platform method to call: publish for videos, publishCarousel for carousels.
 */
async function deliver(post, method) {
  const results = {}
  if (telegram.ready()) {
    try {
      results.telegram = await telegram[method](post)
      log('telegram: kit sent')
    } catch (error) {
      log(`telegram: FAILED ${error.message}`)
      results.telegram = { error: error.message.slice(0, 300) }
      if (!publishing) throw new Error(`the kit didn't reach Telegram: ${error.message}`)
    }
  }
  if (!publishing) {
    log('nothing published automatically (set PUBLISH=on to publish)')
    return results
  }
  // ONLY=youtube (a manual run's input) publishes on those platforms alone, e.g. to film one upload.
  const only = (process.env.ONLY ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  for (const platform of PLATFORMS) {
    if (!platform[method]) continue
    if (only.length && !only.includes(platform.name)) continue
    if (!platform.ready()) {
      log(`${platform.name}: no keys, skipped`)
      continue
    }
    try {
      results[platform.name] = await platform[method](post)
      log(`${platform.name}: published ${results[platform.name].url ?? results[platform.name].id}`)
    } catch (error) {
      log(`${platform.name}: FAILED ${error.message}`)
      results[platform.name] = { error: error.message.slice(0, 300) }
    }
  }
  if (telegram.ready()) await telegram.alert(results).catch((error) => log(`telegram: alert FAILED ${error.message}`))
  const tried = PLATFORMS.map((p) => results[p.name]).filter(Boolean)
  if (tried.length && tried.every((r) => r.error)) throw new Error('every platform failed')
  return results
}

/** The run's summary on GitHub. */
function report(kind, plan, copy, results) {
  const sent = publishing ? 'Published' : results.telegram && !results.telegram.error ? 'Kit sent to Telegram' : 'Dry run'
  summary(`## ${sent}: ${kind} · ${plan.format}\n`)
  summary(`**${copy.hook}** (${copy.source})\n\n${copy.caption}\n`)
  summary(`Places: ${plan.places.map((p) => p.name[lang]).join(', ')}\n`)
  for (const [name, r] of Object.entries(results)) summary(`- ${name}: ${r.error ? `❌ ${r.error}` : `✅ ${r.url ?? r.id}`}`)
}

/** The slides must all be there, one per frame, each a real image of a sane size. */
function checkSlides(dir, expected) {
  const files = readdirSync(dir)
    .filter((f) => /\.jpe?g$/.test(f))
    .sort((a, b) => Number(a.match(/\d+/)?.[0]) - Number(b.match(/\d+/)?.[0]))
    .map((f) => `${dir}/${f}`)
  if (files.length !== expected) throw new Error(`${files.length} slides, expected ${expected}`)
  for (const f of files) {
    const size = statSync(f).size
    if (size < 30_000 || size > 4_500_000) throw new Error(`unexpected slide size ${size} (${f})`)
  }
  return files
}

async function carousel(history, today) {
  const plan = makeCarouselPlan(loadPlaces(), history, today, lang)
  plan.theme = plan.guide ? guideTheme(plan.guide, lang) : undefined
  const rand = seeded(`${today.toISOString()}|copy`)
  log(`carousel: ${plan.format} · ${plan.guide ?? monthName(plan.month, lang)} · ${plan.places.map((p) => p.key).join(', ')}`)

  const past = history.filter((h) => h.lang === lang).flatMap((h) => [h.hook, h.caption]).filter(Boolean)
  const copy = await writeCopy(plan, lang, past, rand)
  log(`copy (${copy.source}): ${copy.hook}`, copy.rejected.length ? `· rejected: ${copy.rejected.join('; ')}` : '')

  const n = plan.places.length
  const month = plan.month ? monthName(plan.month, lang) : ''
  const props = {
    lang,
    hook: copy.hook,
    kicker: `${plan.theme ?? month.charAt(0).toUpperCase() + month.slice(1)} · ${n} ${lang === 'it' ? 'mete' : 'places'}`,
    places: await Promise.all(plan.places.map(videoPlace)),
    question: pick(lang === 'it' ? ['Quale proponete al vostro gruppo?', 'Voi dove andreste?', 'Salvalo per il prossimo viaggio'] : ['Which one would your group pick?', 'Where would you go?', 'Save it for your next trip'], rand),
    bestTime: lang === 'it' ? 'Periodo migliore' : 'Best time',
    credits: plan.places.map(credit),
  }
  mkdirSync(`${ROOT}/out`, { recursive: true })
  writeFileSync(`${ROOT}/out/props.json`, JSON.stringify(props))
  const dir = `${ROOT}/out/carousel`
  rmSync(dir, { recursive: true, force: true })
  const render = spawnSync('npx', ['remotion', 'render', 'Carousel', dir, '--sequence', '--image-format=jpeg', '--jpeg-quality=88', '--props=out/props.json'], { cwd: ROOT, stdio: 'inherit', shell: true })
  if (render.status !== 0) throw new Error('render failed')
  const files = checkSlides(dir, n + 2)
  log(`slides: ${files.length}`)

  const tags = hashtags(plan, lang, rand)
  const cta = pick(POOLS[lang].cta, rand)
  const photos = `${lang === 'it' ? 'Foto' : 'Photos'}: ${plan.places.map(credit).join(', ')} · Wikimedia Commons`
  const post = { files, caption: `${copy.caption}\n\n${cta}\n\n${tags.join(' ')}\n\n${photos}`, summary: plan.places.map((p) => p.name[lang]).join(', ') }
  // Instagram and TikTok take slides from public URLs, which only exist once they're uploaded.
  if (publishing && media.ready()) post.imageUrls = await media.upload(files, `${today.toISOString().slice(0, 10)}-${Math.floor(rand() * 36 ** 6).toString(36).padStart(6, '0')}`)
  else if (publishing) log('slides not hosted (no SOCIAL_UPLOAD_SECRET): only the Telegram kit carries this carousel')

  const results = await deliver(post, 'publishCarousel')
  history.push({
    date: today.toISOString(),
    kind: 'carousel',
    format: plan.format,
    lang,
    places: plan.places.map((p) => p.key),
    ...(plan.month && { month: plan.month }),
    ...(plan.guide && { guide: plan.guide }),
    hook: copy.hook,
    caption: copy.caption,
    copySource: copy.source,
    published: publishing,
    results,
  })
  writeFileSync(historyPath, `${JSON.stringify(history, null, 2)}\n`)
  report('carousel', plan, copy, results)
}

/** POST_KIND=check: tries every platform's keys without posting anything (after renewing a token). */
async function checkKeys() {
  const lines = []
  for (const platform of PLATFORMS) {
    if (!platform.ready()) {
      lines.push(`➖ ${platform.name}: no keys`)
      continue
    }
    try {
      lines.push(`✅ ${platform.name}: ${await platform.check()}`)
    } catch (error) {
      lines.push(`❌ ${platform.name}: ${error.message.slice(0, 200)}`)
    }
  }
  for (const line of lines) log(line)
  summary(`## Keys check\n\n${lines.map((l) => `- ${l}`).join('\n')}\n`)
  if (telegram.ready()) await telegram.message(`🔑 <b>Controllo chiavi</b>\n\n${lines.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;')}`)
  if (lines.some((l) => l.startsWith('❌'))) throw new Error('some keys failed')
}

async function main() {
  if (process.env.POST_KIND === 'check') return checkKeys()
  const history = existsSync(historyPath) ? JSON.parse(readFileSync(historyPath, 'utf8')) : []
  const today = new Date()
  // The daily start can come twice (Supabase, then GitHub's backup schedule): one post a day.
  if (process.env.AUTO === 'true' && history.some((h) => h.lang === lang && h.date.slice(0, 10) === today.toISOString().slice(0, 10))) {
    log('already posted today: nothing to do')
    summary("## Skipped: the day's post is already out\n")
    return
  }
  // Last posts' numbers first: the planner favours the formats that work (see metrics.mjs).
  const metrics = await refreshMetrics(history, today)
  log(`metrics: ${metrics.read} posts read${metrics.skipped ? ` (${metrics.skipped})` : ''}`)
  const kind = kindOf(today)
  const scores = formatScores(history.filter((h) => h.lang === lang), kind, today)
  if (Object.keys(scores).length) summary(`Format scores (${kind}): ${Object.entries(scores).map(([f, s]) => `${f} ${s.avg.toFixed(3)} (${s.n})`).join(', ')}
`)
  await (kind === 'carousel' ? carousel(history, today) : video(history, today))
}

main().catch((error) => {
  console.error(error)
  summary(`## ❌ Failed\n\n${error.message}`)
  process.exit(1)
})
