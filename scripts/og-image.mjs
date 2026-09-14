#!/usr/bin/env node
// Generates the 1200×630 social preview images from the brand artwork:
//   public/og/{it,en,es}.png              landing pages
//   public/og/guides/{guide}-{lang}.png   one per inspiration guide and language
// Uses sharp (installed with @vite-pwa/assets-generator) and Georgia / Segoe UI from Windows.
// Elsewhere, point OG_FONT_TITLE, OG_FONT_BRAND and OG_FONT_TEXT at other .ttf files.
// Guide titles are read from src/content/guides/meta.ts through Vite, so they never drift from the site.
import { mkdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { createServer } from 'vite'

const W = 1200
const H = 630
const LANGS = ['it', 'en', 'es']
const FONT_TITLE = process.env.OG_FONT_TITLE ?? 'C:/Windows/Fonts/georgiai.ttf'
const FONT_BRAND = process.env.OG_FONT_BRAND ?? 'C:/Windows/Fonts/georgiaz.ttf'
const FONT_TEXT = process.env.OG_FONT_TEXT ?? 'C:/Windows/Fonts/seguisb.ttf'

// [sky top, sky middle, sky bottom, far hills, near hills, nearest hills]. The first one is the landing's.
const PALETTES = [
  ['#FF8E6B', '#D9572C', '#8E3A4C', '#8E3A4C', '#6E2C44', '#4F2037'],
  ['#F7B46A', '#D9713B', '#8F4A28', '#8F4A28', '#6E3A22', '#4A2616'],
  ['#D8A9C6', '#8C6B9A', '#4A3A61', '#5A4674', '#3F3256', '#2A2140'],
  ['#9CCBA9', '#557F69', '#355A4B', '#3E6655', '#2A4A3D', '#1E362D'],
  ['#FFA48C', '#E0605A', '#7A3342', '#8A3A4A', '#62283A', '#4A1E2E'],
]

const background = ([top, middle, bottom, far, near, nearest]) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0.55" y2="1">
      <stop offset="0" stop-color="${top}"/>
      <stop offset="0.55" stop-color="${middle}"/>
      <stop offset="1" stop-color="${bottom}"/>
    </linearGradient>
    <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFE7B8"/>
      <stop offset="1" stop-color="#F7B267"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#sky)"/>
  <circle cx="1020" cy="420" r="170" fill="url(#sun)"/>
  <path d="M0 450c150-50 300-50 450 0s300 50 450 0 225-40 300-20v250H0z" fill="${far}" opacity=".55"/>
  <path d="M0 515c150-45 300-45 450 0s300 45 450 0 225-36 300-16v166H0z" fill="${near}" opacity=".8"/>
  <path d="M0 575c150-40 300-40 450 0s300 40 450 0 225-30 300-14v99H0z" fill="${nearest}"/>
</svg>`

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

async function text(content, { fontfile, font, width, color = '#FFFFFF' }) {
  return sharp({
    text: { text: `<span foreground="${color}">${escape(content)}</span>`, font, fontfile, width, rgba: true, dpi: 72, wrap: 'word' },
  })
    .png()
    .toBuffer()
}

const toPath = (url) => fileURLToPath(url)

const icon = await sharp(await readFile(new URL('../public/favicon.svg', import.meta.url)), { density: 300 })
  .resize(84, 84)
  .png()
  .toBuffer()

const locales = Object.fromEntries(
  await Promise.all(
    LANGS.map(async (lang) => [lang, JSON.parse(await readFile(new URL(`../src/locales/${lang}/translation.json`, import.meta.url), 'utf8'))]),
  ),
)

const brand = async () => [
  { input: icon, left: 80, top: 64 },
  { input: await text('roamie', { fontfile: FONT_BRAND, font: 'Georgia Bold Italic 58', width: 400 }), left: 184, top: 72 },
]

// ─── Landing pages ──────────────────────────────────────────────────────────
await mkdir(new URL('../public/og/', import.meta.url), { recursive: true })

for (const lang of LANGS) {
  const { landing } = locales[lang]
  const steps = [landing.steps.propose, landing.steps.vote, landing.steps.spin].join('  ·  ')

  await sharp(Buffer.from(background(PALETTES[0])))
    .composite([
      ...(await brand()),
      { input: await text(`${landing.titleA} ${landing.titleB}`, { fontfile: FONT_TITLE, font: 'Georgia Italic 70', width: 820 }), left: 80, top: 196 },
      { input: await text(steps, { fontfile: FONT_TEXT, font: 'Segoe UI Semibold 29', width: 900, color: '#FFF3E6' }), left: 82, top: 392 },
    ])
    .png({ compressionLevel: 9 })
    .toFile(toPath(new URL(`../public/og/${lang}.png`, import.meta.url)))
  console.log(`  public/og/${lang}.png`)
}

// ─── Inspiration guides ─────────────────────────────────────────────────────
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
try {
  const { GUIDES } = await vite.ssrLoadModule('/src/content/guides/meta.ts')
  await mkdir(new URL('../public/og/guides/', import.meta.url), { recursive: true })

  for (const [index, guide] of GUIDES.entries()) {
    for (const lang of LANGS) {
      const title = guide.title[lang]
      // Long titles get a smaller size so they stay on three lines at most.
      const size = title.length > 52 ? 58 : 66
      await sharp(Buffer.from(background(PALETTES[index % PALETTES.length])))
        .composite([
          ...(await brand()),
          {
            input: await text(locales[lang].guides.eyebrow.toUpperCase(), { fontfile: FONT_TEXT, font: 'Segoe UI Semibold 26', width: 700, color: '#FFE7B8' }),
            left: 82,
            top: 196,
          },
          { input: await text(title, { fontfile: FONT_TITLE, font: `Georgia Italic ${size}`, width: 860 }), left: 80, top: 240 },
          { input: await text('roamie.org', { fontfile: FONT_TEXT, font: 'Segoe UI Semibold 28', width: 400, color: '#FFF3E6' }), left: 82, top: 548 },
        ])
        .png({ compressionLevel: 9 })
        .toFile(toPath(new URL(`../public/og/guides/${guide.id}-${lang}.png`, import.meta.url)))
      console.log(`  public/og/guides/${guide.id}-${lang}.png`)
    }
  }
} finally {
  await vite.close()
}
