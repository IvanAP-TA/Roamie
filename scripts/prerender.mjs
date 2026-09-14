#!/usr/bin/env node
// Post-build step (see "build" in package.json):
//  1. renders the public pages (landing ×3 languages, legal, 404) into static HTML with their meta tags
//  2. fills the Supabase host into the Content-Security-Policy in dist/_headers
import { readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { loadEnv } from 'vite'

const root = new URL('../', import.meta.url)
const dist = new URL('dist/', root)
const ssrDir = new URL('dist-ssr/', root)

const env = loadEnv('production', process.cwd(), 'VITE_')
if (!env.VITE_SUPABASE_URL) throw new Error('VITE_SUPABASE_URL is required: the CSP in _headers must allow the Supabase host')

const { ROUTES, render } = await import(new URL('entry-prerender.js', ssrDir).href)

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

for (const route of ROUTES) {
  const { html, head } = await render(route)
  const page = template
    .replace(/<html lang="[^"]*"/, `<html lang="${route.lang}"`)
    .replace(HEAD, () => [...fontPreloads, head].join('\n    '))
    .replace('<!--app-html-->', () => html)
  await writeFile(new URL(route.file, dist), page)
  console.log(`  prerendered ${route.path.padEnd(9)} → dist/${route.file}`)
}

const headersFile = new URL('_headers', dist)
const headers = await readFile(headersFile, 'utf8')
await writeFile(headersFile, headers.split('__SUPABASE_HOST__').join(new URL(env.VITE_SUPABASE_URL).host))

await rm(ssrDir, { recursive: true, force: true })
