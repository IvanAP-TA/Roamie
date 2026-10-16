#!/usr/bin/env node
// The guides' photos as AVIF, served from roamie.org: `npm run guide-photos` after src/content/guides/images.json
// changes (the files are committed; existing ones are kept). Wikimedia's thumbnails are JPEGs at fixed widths, much
// heavier than an AVIF of the same size; the original JPEG stays the fallback for browsers without AVIF.
//
// Per photo, two widths of:
//   <key>-<w>.avif       the whole photo (guide covers, place cards)
//   <key>-band-<w>.avif  its middle band at 3:1, what a guide card shows (a short strip, cropped by object-fit)
// Qualities chosen by eye at phone size: 45 for whole photos, 40 for the bands (no visible difference from 52, about
// a third lighter); either is about a sixth of Wikimedia's JPEG.
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import sharp from 'sharp'

const root = new URL('../', import.meta.url)
const out = new URL('public/guides/photos/', root)
const places = JSON.parse(await readFile(new URL('src/content/guides/images.json', root), 'utf8'))
// Plus the covers chosen for guides without places (covers.json), under their own keys.
const covers = JSON.parse(await readFile(new URL('src/content/guides/covers.json', root), 'utf8'))
const images = { ...places, ...Object.fromEntries(Object.values(covers).filter((c) => !places[c.key]).map((c) => [c.key, c])) }
const WIDTHS = [480, 960]
const BAND = 3

await mkdir(out, { recursive: true })
let made = 0
for (const [key, image] of Object.entries(images)) {
  const targets = WIDTHS.flatMap((w) => [`${key}-${w}.avif`, `${key}-band-${w}.avif`])
  if (targets.every((name) => existsSync(new URL(name, out)))) continue
  const response = await fetch(image.url, { headers: { 'User-Agent': 'RoamieBuild/1.0 (+https://roamie.org)' } })
  if (!response.ok) throw new Error(`${key}: ${response.status} for ${image.url}`)
  const source = Buffer.from(await response.arrayBuffer())
  for (const width of WIDTHS) {
    const whole = await sharp(source).resize({ width, withoutEnlargement: true }).avif({ quality: 45, effort: 6 }).toBuffer()
    await writeFile(new URL(`${key}-${width}.avif`, out), whole)
    const band = await sharp(source)
      .resize({ width, height: Math.round(width / BAND), fit: 'cover', position: 'centre' })
      .avif({ quality: 40, effort: 6 })
      .toBuffer()
    await writeFile(new URL(`${key}-band-${width}.avif`, out), band)
  }
  made++
  console.log(`  ${key}`)
  // Gently: Wikimedia asks automated clients not to hammer its servers.
  await new Promise((resolve) => setTimeout(resolve, 300))
}
console.log(`${made} photos converted, ${Object.keys(images).length - made} already there`)
