#!/usr/bin/env node
// Post-build step (see "build" in package.json): renders the public pages (landing ×3 languages,
// legal, 404, guides) into static HTML with their meta tags, so crawlers and link previews get real content and the
// browser can adopt the markup as it is (hydration, see main.tsx).
import { existsSync } from 'node:fs'
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import Beasties from 'beasties'
import { loadEnv } from 'vite'

const root = new URL('../', import.meta.url)
const dist = new URL('dist/', root)
const ssrDir = new URL('dist-ssr/', root)

// Vite gives the build environment precedence over .env files, even for empty values.
const env = loadEnv('production', process.cwd(), 'VITE_')
const missing = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'].filter((key) => !env[key])
if (missing.length > 0) {
  const why = (key) =>
    key in process.env
      ? 'set to an empty value in the build environment, which overrides .env.production'
      : existsSync('.env.production')
        ? 'not defined in .env.production'
        : '.env.production not found and not set in the build environment'
  throw new Error(`Missing ${missing.map((key) => `${key} (${why(key)})`).join('; ')}`)
}

const { ROUTES, render, sitemap } = await import(new URL('entry-prerender.js', ssrDir).href)

const template = await readFile(new URL('index.html', dist), 'utf8')
const HEAD = /<!--seo:start-->[\s\S]*?<!--seo:end-->/
if (!HEAD.test(template) || !template.includes('<!--app-html-->')) {
  throw new Error('dist/index.html is missing the <!--seo:start/end--> or <!--app-html--> markers')
}

// The headline (LCP) and body text use these two faces: fetch them alongside the CSS instead of after it.
const assets = await readdir(new URL('assets/', dist))
const fontPreloads = [/^fraunces-latin-full-normal-.+\.woff2$/, /^instrument-sans-latin-wght-normal-.+\.woff2$/]
  .map((pattern) => assets.find((file) => pattern.test(file)))
  .filter(Boolean)
  .map((file) => `<link rel="preload" href="/assets/${file}" as="font" type="font/woff2" crossorigin />`)

// Each prerendered page gets the CSS rules its own markup uses inlined, and the full stylesheet moves to the
// end of <body>, so the first paint doesn't wait for the whole app's CSS. `preload: 'body'` needs no inline
// script, which the Content-Security-Policy forbids.
const beasties = new Beasties({
  path: fileURLToPath(dist),
  publicPath: '/',
  preload: 'body',
  pruneSource: false,
  inlineFonts: false,
  preloadFonts: false,
  logLevel: 'warn',
})

// The build day, for what the pages show by date: the client renders the same while adopting the markup (useToday).
// data-markup-lang keeps the markup's language for main.tsx: the app rewrites <html lang> as soon as it picks one.
const built = new Date().toISOString().slice(0, 10)

for (const route of ROUTES) {
  const { html, head } = await render(route)
  const rendered = template
    .replace(/<html lang="[^"]*"/, `<html lang="${route.lang}" data-built="${built}" data-markup-lang="${route.lang}"`)
    .replace(HEAD, () => [...fontPreloads, head].join('\n    '))
    .replace('<!--app-html-->', () => html)
  const page = await beasties.process(rendered)
  const target = new URL(route.file, dist)
  await mkdir(new URL('.', target), { recursive: true })
  await writeFile(target, page)
  console.log(`  prerendered ${route.path.padEnd(9)} → dist/${route.file}`)
}

await writeFile(new URL('sitemap.xml', dist), sitemap())
console.log(`  sitemap     → dist/sitemap.xml (${ROUTES.length - 1} URLs)`)

await rm(ssrDir, { recursive: true, force: true })
