/**
 * Synthesises the videos' sound effects into public/sfx: no downloads, no licences to track.
 *
 *   node scripts/make-sfx.mjs
 *
 * tick   a peg hitting the wheel's pointer (very short, bright click)
 * ding   the winning place (a small bell: a few partials with exponential decay)
 * whoosh a scene change (noise swept through a low-pass filter)
 */
import { mkdirSync, writeFileSync } from 'node:fs'

const RATE = 44100
const OUT = new URL('../public/sfx/', import.meta.url)

/** 16-bit mono PCM WAV from samples in [-1, 1]. */
function wav(samples) {
  const data = Buffer.alloc(samples.length * 2)
  samples.forEach((s, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32767), i * 2))
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + data.length, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(1, 22)
  header.writeUInt32LE(RATE, 24)
  header.writeUInt32LE(RATE * 2, 28)
  header.writeUInt16LE(2, 32)
  header.writeUInt16LE(16, 34)
  header.write('data', 36)
  header.writeUInt32LE(data.length, 40)
  return Buffer.concat([header, data])
}

// Seeded noise, so the files are the same on every run.
let seed = 7
const noise = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff
  return (seed / 0x7fffffff) * 2 - 1
}

const make = (seconds, fn) => Array.from({ length: Math.round(seconds * RATE) }, (_, i) => fn(i / RATE))

const tick = make(0.035, (t) => {
  const env = Math.exp(-t * 180)
  return env * (0.55 * Math.sin(2 * Math.PI * 2400 * t) + 0.35 * noise())
})

const ding = make(1.4, (t) => {
  const attack = Math.min(1, t / 0.004)
  const partials = [
    [1046.5, 1, 3.2],
    [2093, 0.45, 4.5],
    [3139.5, 0.22, 6],
    [4186, 0.12, 8],
  ]
  return 0.5 * attack * partials.reduce((sum, [f, a, d]) => sum + a * Math.exp(-t * d) * Math.sin(2 * Math.PI * f * t), 0)
})

let lp = 0
const whoosh = make(0.55, (t) => {
  const x = t / 0.55
  const env = Math.sin(Math.PI * x) ** 2
  const cutoff = 0.02 + 0.25 * Math.sin(Math.PI * x)
  lp += cutoff * (noise() - lp)
  return 0.9 * env * lp * 3
})

mkdirSync(OUT, { recursive: true })
for (const [name, samples] of Object.entries({ tick, ding, whoosh })) {
  writeFileSync(new URL(`${name}.wav`, OUT), wav(samples))
  console.log(`public/sfx/${name}.wav`)
}
