/**
 * The Monday report on Telegram: the funnel that decides what to build next (supabase/functions/funnel-report,
 * public.funnel_report()), counts only. Then the same numbers, the week's posts and the page check (qa.mjs) go to
 * the brain (brain.mjs), where the Capo agent reads them.
 *
 *   node automation/report.mjs
 *
 * Environment: SUPABASE_URL (default the project's), SOCIAL_UPLOAD_SECRET (the funnel-report key), TELEGRAM_*,
 * QA_OUT (qa.mjs's output, optional), BRAIN_TOKEN (optional: without it nothing goes to the brain).
 */
import { appendFileSync, existsSync, readFileSync } from 'node:fs'
import { isoWeek, numbersPage, qaCount, writeToBrain } from './brain.mjs'
import { reportMessage } from './funnel.mjs'
import { telegram } from './publish/telegram.mjs'

const URL_BASE = process.env.SUPABASE_URL || 'https://tvcumfzhnuljngdzuuue.supabase.co'
const HISTORY = 'https://raw.githubusercontent.com/IvanAP-TA/Roamie/social-history'
const summary = (text) => process.env.GITHUB_STEP_SUMMARY && appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${text}\n`)
const log = (...args) => console.log('·', ...args)
const json = (url) => fetch(url, { signal: AbortSignal.timeout(20_000) }).then((r) => (r.ok ? r.json() : []), () => [])

async function main() {
  const response = await fetch(`${URL_BASE}/functions/v1/funnel-report`, { headers: { 'x-report-secret': process.env.SOCIAL_UPLOAD_SECRET ?? '' } })
  const funnel = response.ok ? await response.json() : null
  const qa = process.env.QA_OUT && existsSync(process.env.QA_OUT) ? JSON.parse(readFileSync(process.env.QA_OUT, 'utf8')) : null

  if (funnel) {
    const problems = qaCount(qa)
    const text = reportMessage(funnel) + (problems === null ? '' : `\n\nControllo pagine: ${problems ? `${problems} problemi di impaginazione (dettagli nel cervello)` : 'nessun problema'}.`)
    console.log(text.replace(/<[^>]+>/g, ''))
    summary(text.replace(/<\/?b>/g, '**').replace(/<\/?i>/g, '_'))
    if (telegram.ready()) await telegram.message(text)
  }

  if (process.env.BRAIN_TOKEN) {
    const today = new Date()
    const [social, linkedin] = await Promise.all([json(`${HISTORY}/history.json`), json(`${HISTORY}/linkedin-history.json`)])
    await writeToBrain(`Numeri/${isoWeek(today)}.md`, numbersPage({ today, funnel, social, linkedin, qa }))
    log(`brain: Numeri/${isoWeek(today)}.md written`)
  } else log('brain: no BRAIN_TOKEN, nothing written')

  if (!funnel) throw new Error(`funnel-report ${response.status}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
