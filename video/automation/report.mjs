/**
 * The Monday report on Telegram: the funnel that decides what to build next (supabase/functions/funnel-report,
 * public.funnel_report()), counts only.
 *
 *   node automation/report.mjs
 *
 * Environment: SUPABASE_URL (default the project's), SOCIAL_UPLOAD_SECRET (the funnel-report key), TELEGRAM_*.
 */
import { appendFileSync } from 'node:fs'
import { reportMessage } from './funnel.mjs'
import { telegram } from './publish/telegram.mjs'

const URL_BASE = process.env.SUPABASE_URL || 'https://tvcumfzhnuljngdzuuue.supabase.co'
const summary = (text) => process.env.GITHUB_STEP_SUMMARY && appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${text}\n`)

async function main() {
  const response = await fetch(`${URL_BASE}/functions/v1/funnel-report`, { headers: { 'x-report-secret': process.env.SOCIAL_UPLOAD_SECRET ?? '' } })
  if (!response.ok) throw new Error(`funnel-report ${response.status}`)
  const text = reportMessage(await response.json())
  console.log(text.replace(/<[^>]+>/g, ''))
  summary(text.replace(/<\/?b>/g, '**').replace(/<\/?i>/g, '_'))
  if (telegram.ready()) await telegram.message(text)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
