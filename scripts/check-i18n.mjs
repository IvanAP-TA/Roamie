#!/usr/bin/env node
// Verifies that every locale has the same keys and that static t('…') keys used in src exist.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const LOCALES = ['it', 'en', 'es']
const PLURAL_SUFFIXES = ['_zero', '_one', '_two', '_few', '_many', '_other']

const flatten = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v) ? flatten(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  )

const keysByLocale = Object.fromEntries(
  LOCALES.map((l) => [l, new Set(flatten(JSON.parse(readFileSync(`src/locales/${l}/translation.json`, 'utf8'))))]),
)

let failures = 0
const [reference, ...others] = LOCALES
for (const locale of others) {
  for (const key of keysByLocale[reference]) {
    if (!keysByLocale[locale].has(key)) {
      console.error(`✗ ${locale} is missing "${key}"`)
      failures++
    }
  }
  for (const key of keysByLocale[locale]) {
    if (!keysByLocale[reference].has(key)) {
      console.error(`✗ ${locale} has extra key "${key}" (not in ${reference})`)
      failures++
    }
  }
}

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? walk(path) : /\.(tsx?|jsx?)$/.test(name) && !name.endsWith('.test.ts') ? [path] : []
  })

const has = (set, key) => set.has(key) || PLURAL_SUFFIXES.some((s) => set.has(key + s)) || [...set].some((k) => k.startsWith(`${key}.`))

let dynamic = 0
for (const file of walk('src')) {
  const source = readFileSync(file, 'utf8')
  for (const match of source.matchAll(/\bt\(\s*(['"`])((?:(?!\1).)+)\1/g)) {
    const key = match[2]
    if (key.includes('${')) {
      dynamic++
      continue
    }
    for (const locale of LOCALES) {
      if (!has(keysByLocale[locale], key)) {
        console.error(`✗ ${file}: "${key}" missing in ${locale}`)
        failures++
      }
    }
  }
}

if (failures) {
  console.error(`\n${failures} i18n problem(s).`)
  process.exit(1)
}
console.log(`✓ i18n OK — ${keysByLocale[reference].size} keys × ${LOCALES.length} locales (${dynamic} dynamic keys not statically checked)`)
