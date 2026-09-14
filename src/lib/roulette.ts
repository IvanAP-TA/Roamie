import type { Destination } from './types'

export interface RouletteEntry {
  destination: Destination
  score: number
  probability: number
  /** Degrees, clockwise from 12 o'clock. */
  startAngle: number
  endAngle: number
}

export function netScore(destination: Pick<Destination, 'votes'>): number {
  return destination.votes.reduce((sum, v) => sum + (v.vote_type === 'up' ? 1 : -1), 0)
}

/**
 * Mirrors the eligibility rule of `spin_roulette()` in SQL: status 'proposed' and net score > 0.
 * Each slice's angle is proportional to its score, so the wheel shows the real odds.
 */
export function eligibleEntries(destinations: Destination[]): RouletteEntry[] {
  const scored = destinations
    .filter((d) => d.status === 'proposed')
    .map((destination) => ({ destination, score: netScore(destination) }))
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score || a.destination.name.localeCompare(b.destination.name))

  const total = scored.reduce((sum, e) => sum + e.score, 0)
  let angle = 0
  return scored.map((e) => {
    const probability = e.score / total
    const entry = { ...e, probability, startAngle: angle, endAngle: angle + probability * 360 }
    angle = entry.endAngle
    return entry
  })
}

/**
 * Final wheel rotation (clockwise, degrees) so that `entry` stops under the top pointer
 * after at least `turns` full spins. `jitter` ∈ [0,1) picks where inside the slice it lands.
 */
export function targetRotation(current: number, entry: Pick<RouletteEntry, 'startAngle' | 'endAngle'>, turns = 6, jitter = 0.5) {
  const span = entry.endAngle - entry.startAngle
  const inset = span * 0.15
  const landingAngle = entry.startAngle + inset + (span - 2 * inset) * jitter
  const normalizedCurrent = ((current % 360) + 360) % 360
  const base = current - normalizedCurrent
  return base + turns * 360 + ((360 - landingAngle) % 360)
}

/** Angle (0..360) under the pointer for a given wheel rotation. */
export function angleAtPointer(rotation: number) {
  return (((360 - rotation) % 360) + 360) % 360
}

// Spins started from this device, so the realtime "someone spun the wheel" toast isn't shown twice.
const localSpins = new Set<string>()
export const markLocalSpin = (destinationId: string) => localSpins.add(destinationId)
export const isLocalSpin = (destinationId: string) => localSpins.has(destinationId)
