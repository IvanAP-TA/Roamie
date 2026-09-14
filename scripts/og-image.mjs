#!/usr/bin/env node
// Generates the 1200×630 social preview images (public/og/{it,en,es}.png) from the brand artwork.
// Uses sharp (installed with @vite-pwa/assets-generator) and Georgia / Segoe UI from Windows.
// Elsewhere, point OG_FONT_TITLE, OG_FONT_BRAND and OG_FONT_TEXT at other .ttf files.
import { mkdir, readFile } from 'node:fs/promises'
import sharp from 'sharp'

const W = 1200
const H = 630
const FONT_TITLE = process.env.OG_FONT_TITLE ?? 'C:/Windows/Fonts/georgiai.ttf'
const FONT_BRAND = process.env.OG_FONT_BRAND ?? 'C:/Windows/Fonts/georgiaz.ttf'
const FONT_TEXT = process.env.OG_FONT_TEXT ?? 'C:/Windows/Fonts/seguisb.ttf'

const background = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0.55" y2="1">
      <stop offset="0" stop-color="#FF8E6B"/>
      <stop offset="0.55" stop-color="#D9572C"/>
      <stop offset="1" stop-color="#8E3A4C"/>
    </linearGradient>
    <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFE7B8"/>
      <stop offset="1" stop-color="#F7B267"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#sky)"/>
  <circle cx="1020" cy="420" r="170" fill="url(#sun)"/>
  <path d="M0 450c150-50 300-50 450 0s300 50 450 0 225-40 300-20v250H0z" fill="#8E3A4C" opacity=".55"/>
  <path d="M0 515c150-45 300-45 450 0s300 45 450 0 225-36 300-16v166H0z" fill="#6E2C44" opacity=".8"/>
  <path d="M0 575c150-40 300-40 450 0s300 40 450 0 225-30 300-14v99H0z" fill="#4F2037"/>
</svg>`

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

async function text(content, { fontfile, font, width, color = '#FFFFFF' }) {
  return sharp({
    text: { text: `<span foreground="${color}">${escape(content)}</span>`, font, fontfile, width, rgba: true, dpi: 72, wrap: 'word' },
  })
    .png()
    .toBuffer()
}

const icon = await sharp(await readFile(new URL('../public/favicon.svg', import.meta.url)), { density: 300 })
  .resize(84, 84)
  .png()
  .toBuffer()

await mkdir(new URL('../public/og/', import.meta.url), { recursive: true })

for (const lang of ['it', 'en', 'es']) {
  const { landing } = JSON.parse(await readFile(new URL(`../src/locales/${lang}/translation.json`, import.meta.url), 'utf8'))
  const steps = [landing.steps.propose, landing.steps.vote, landing.steps.spin].join('  ·  ')

  const out = new URL(`../public/og/${lang}.png`, import.meta.url)
  await sharp(Buffer.from(background))
    .composite([
      { input: icon, left: 80, top: 64 },
      { input: await text('roamie', { fontfile: FONT_BRAND, font: 'Georgia Bold Italic 58', width: 400 }), left: 184, top: 72 },
      { input: await text(`${landing.titleA} ${landing.titleB}`, { fontfile: FONT_TITLE, font: 'Georgia Italic 70', width: 820 }), left: 80, top: 196 },
      { input: await text(steps, { fontfile: FONT_TEXT, font: 'Segoe UI Semibold 29', width: 900, color: '#FFF3E6' }), left: 82, top: 392 },
    ])
    .png({ compressionLevel: 9 })
    .toFile(out.pathname.replace(/^\/([A-Za-z]:)/, '$1'))
  console.log(`  public/og/${lang}.png`)
}
