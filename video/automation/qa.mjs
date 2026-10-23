/**
 * The Monday page check: taste-skill's inspect.mjs (MIT, cloned at a pinned commit by report.yml) opens a few public
 * pages of a local build in Chrome at 1440, 768 and 390 px. Only objective layout problems are kept: the skill's
 * taste rules (palette, glass, gradients, shadows…) go against choices made on purpose, so they'd only be noise.
 *
 *   INSPECT=…/inspect.mjs BASE_URL=http://localhost:4173 QA_OUT=qa.json node automation/qa.mjs
 *
 * Writes { pages: [{ path, findings, error? }] } to QA_OUT; never fails the run (the report must still go out).
 */
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export const PAGES = ['/', '/en', '/en/guides', '/en/guides/how-to-plan-a-group-trip', '/explore', '/join']

/**
 * The inspect.mjs rules that are facts about the layout, not about taste. Left out after checking them on the live
 * site (2026-10-23): off-centre measures the header's logo and language button, not the centred content;
 * blank-gap can't see the marquee's words, drawn by CSS; late-title is the language hint a visitor whose browser
 * speaks another language gets on purpose; headline-lines flags the big display titles, a design choice.
 */
export const OBJECTIVE = new Set([
  'lopsided', 'one-sided-bleed', 'overflow', 'side-scroll', 'broken-image', 'contrast', 'clipped-text',
  'covered-text', 'edge-text', 'tiny-text', 'small-text', 'empty-screens', 'no-title', 'many-h1', 'font-fallback',
  'reduced-hidden',
])

/** A report's objective findings, in a compact shape. */
export function objectiveFindings(report) {
  return (report?.findings ?? [])
    .filter((f) => OBJECTIVE.has(f.id))
    .map((f) => ({ level: f.level, id: f.id, width: f.width, ...(f.alsoAt?.length && { alsoAt: f.alsoAt }), message: f.message }))
}

function check(path) {
  const out = mkdtempSync(join(tmpdir(), 'qa-'))
  const run = spawnSync(process.execPath, [process.env.INSPECT, new URL(path, process.env.BASE_URL).href, '--json', '--out', out], { encoding: 'utf8', timeout: 180_000 })
  try {
    return { path, findings: objectiveFindings(JSON.parse(run.stdout)) }
  } catch {
    const lines = (run.stderr || run.error?.message || 'no report').trim().split('\n')
    return { path, findings: [], error: (lines.findLast((l) => /Error/.test(l)) ?? lines.at(-1)).trim().slice(0, 200) }
  }
}

if (process.argv[1]?.endsWith('qa.mjs')) {
  const pages = PAGES.map(check)
  for (const p of pages) console.log(`· ${p.path}: ${p.error ? `error ${p.error}` : `${p.findings.length} findings`}`)
  writeFileSync(process.env.QA_OUT || 'qa.json', JSON.stringify({ pages }, null, 1))
}
