/**
 * The week's numbers for the brain: a Markdown page (Numeri/AAAA-Wnn.md) in the private repo roamie-brain, read by
 * the Capo agent every Monday. Written by report.mjs with BRAIN_TOKEN (a fine-grained token with Contents
 * read/write on roamie-brain only); without the token nothing is written. Funnel numbers stay out of this public
 * repo: they only go to Telegram and to the brain.
 */
const BRAIN_REPO = process.env.BRAIN_REPO || 'IvanAP-TA/roamie-brain'
const DAY = 86_400_000
const pct = (part, whole) => (whole ? `${Math.round((100 * part) / whole)}%` : '–')

/** The ISO week of a date, e.g. 2026-W44. */
export function isoWeek(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const year = d.getUTCFullYear()
  const week = Math.ceil(((d - Date.UTC(year, 0, 1)) / DAY + 1) / 7)
  return `${year}-W${String(week).padStart(2, '0')}`
}

/** The posts of the last 7 days, one line each: date, kind, format, where it went and what failed. */
export function postLines(history, today, label) {
  const recent = history.filter((p) => today - new Date(p.date) <= 7 * DAY)
  if (!recent.length) return [`- ${label}: nessun post negli ultimi 7 giorni.`]
  return recent.map((p) => {
    const results = Object.entries(p.results ?? {})
    const ok = results.filter(([, r]) => !r?.error).map(([name]) => name)
    const failed = results.filter(([, r]) => r?.error).map(([name, r]) => `${name} (${String(r.error).slice(0, 80)})`)
    const what = [p.kind ?? 'video', p.format, p.hookStyle && `hook ${p.hookStyle}`, p.metrics && `Instagram: copertura ${p.metrics.reach ?? '–'}, interazioni ${p.metrics.interactions ?? '–'}, salvataggi ${p.metrics.saved ?? '–'}, condivisioni ${p.metrics.shares ?? '–'}`].filter(Boolean).join(' · ')
    return `- ${p.date.slice(0, 10)} · ${label} · ${what} · ok: ${ok.join(', ') || 'nessuna'}${failed.length ? ` · errori: ${failed.join('; ')}` : ''}`
  })
}

/** The whole page. `funnel` is public.funnel_report()'s output, `qa` qa.mjs's (either may be missing). */
export function numbersPage({ today, funnel, social = [], linkedin = [], qa }) {
  const lines = [`# Numeri ${isoWeek(today)}`, '', `Scritto da GitHub Actions il ${today.toISOString().slice(0, 16).replace('T', ' ')} UTC. Non modificare a mano.`, '']
  lines.push('## Funnel', '')
  if (funnel) {
    const { week, cohort, total } = funnel
    lines.push(
      `Stella polare: **${cohort.north_star}** viaggi su ${cohort.trips} (${pct(cohort.north_star, cohort.trips)}) con 3+ persone e una meta scelta (viaggi veri creati negli ultimi 28 giorni).`,
      '',
      '| Passo (ultimi 28 giorni) | Viaggi | % |',
      '|---|---|---|',
      `| creati | ${cohort.trips} | |`,
      `| con 2+ persone | ${cohort.two_members} | ${pct(cohort.two_members, cohort.trips)} |`,
      `| con 3+ persone | ${cohort.three_members} | ${pct(cohort.three_members, cohort.trips)} |`,
      `| votati da 2+ persone | ${cohort.two_voters} | ${pct(cohort.two_voters, cohort.trips)} |`,
      `| con una meta scelta | ${cohort.decided} | ${pct(cohort.decided, cohort.trips)} |`,
      '',
      `Ultimi 7 giorni: ${week.google_users} nuovi account Google, ${week.guests} ospiti, ${week.trips} viaggi creati, ${week.joins} amici entrati da un invito, ${week.proposals} mete proposte, ${week.votes} voti, ${week.spins} ruote girate.`,
      '',
      `In tutto: ${total.users} account, ${total.trips} viaggi veri.`,
    )
  } else lines.push('Non disponibile questa settimana (la funzione funnel-report non ha risposto).')
  lines.push('', '## Post degli ultimi 7 giorni', '', ...postLines(social, today, 'social'), ...postLines(linkedin, today, 'linkedin'))
  lines.push('', '## Controllo delle pagine', '')
  if (!qa) lines.push('Non eseguito questa settimana.')
  else {
    lines.push('Build di `main` a 1440, 768 e 390 px; solo problemi oggettivi (testo tagliato o coperto, scroll orizzontale, immagini rotte, contrasto, testo piccolo, font mancanti).', '')
    for (const page of qa.pages) {
      if (page.error) lines.push(`- \`${page.path}\`: controllo non riuscito (${page.error})`)
      else if (!page.findings.length) lines.push(`- \`${page.path}\`: nessun problema`)
      else for (const f of page.findings) lines.push(`- \`${page.path}\` · ${f.level} · ${f.id} · ${f.width}px${f.alsoAt ? ` (anche ${f.alsoAt.join(', ')})` : ''}: ${f.message}`)
    }
  }
  return `${lines.join('\n')}\n`
}

/** How many objective problems the page check found, for the Telegram line. */
export const qaCount = (qa) => (qa ? qa.pages.reduce((n, p) => n + p.findings.length, 0) : null)

/** Writes (or replaces) the page in the brain repo through the GitHub contents API. */
export async function writeToBrain(path, text, token = process.env.BRAIN_TOKEN) {
  const url = `https://api.github.com/repos/${BRAIN_REPO}/contents/${path}`
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'roamie-report' }
  const existing = await fetch(url, { headers })
  const sha = existing.ok ? (await existing.json()).sha : undefined
  const response = await fetch(url, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ message: `Numeri ${path.replace(/^Numeri\/|\.md$/g, '')}`, content: Buffer.from(text).toString('base64'), ...(sha && { sha }) }),
  })
  if (!response.ok) throw new Error(`brain ${response.status} ${(await response.text()).slice(0, 200)}`)
}
