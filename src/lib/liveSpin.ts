import { useSyncExternalStore } from 'react'
import type { RouletteEntry } from './roulette'
import type { Destination } from './types'

/** One slice of the wheel as the server drew it. */
export interface SpinEntry {
  id: string
  name: string
  points: number
}

/** A row of roulette_spins: what everyone watching the live wheel is shown. */
export interface LiveSpin {
  id: string
  trip_id: string
  winner_id: string | null
  entries: SpinEntry[]
  /** Where the pointer stops inside the winner's slice, 0..1 */
  landing: number
  /** The spin ended a secret round: the reveal plays first */
  revealed_votes: boolean
  /** Null when the wheel spun by itself at the scheduled time */
  spun_by: string | null
  created_at: string
}

export type WheelSlice = Pick<RouletteEntry, 'score' | 'probability' | 'startAngle' | 'endAngle'> & {
  destination: { id: string; name: string }
}

/** The wheel exactly as drawn: same slices in the same order for everyone, whatever votes their device can see. */
export function slicesFromSpin(entries: SpinEntry[]): WheelSlice[] {
  const total = entries.reduce((sum, e) => sum + e.points, 0)
  let angle = 0
  return entries.map((e) => {
    const probability = total > 0 ? e.points / total : 0
    const slice = {
      destination: { id: e.id, name: e.name },
      score: e.points,
      probability,
      startAngle: angle,
      endAngle: angle + probability * 360,
    }
    angle = slice.endAngle
    return slice
  })
}

// While the live wheel is playing, the place it will pick must not show up as picked anywhere else on the page: the show
// sits over a blurred copy of the trip, and the lists behind it would give the winner away before the wheel stops.
let playing: { tripId: string; winnerId: string } | null = null
const playingListeners = new Set<() => void>()

/** Set when a spin starts playing, cleared when its card is closed. */
export function setPlayingSpin(next: { tripId: string; winnerId: string } | null) {
  playing = next
  playingListeners.forEach((listener) => listener())
}

export function usePlayingSpin() {
  return useSyncExternalStore(
    (listener) => {
      playingListeners.add(listener)
      return () => playingListeners.delete(listener)
    },
    () => playing,
    () => null,
  )
}

/** The trip's places as they look until the wheel stops: the winner is still in the running. */
export function withoutSpoiler(list: Destination[], spin: { tripId: string; winnerId: string } | null): Destination[] {
  if (!spin) return list
  return list.map((d) => (d.trip_id === spin.tripId && d.id === spin.winnerId && d.status === 'selected' ? { ...d, status: 'proposed' as const, selected_at: null } : d))
}

/** The reveal's order: last place first, so the leader comes out at the end. */
export function revealOrder<T extends { name: string; points: number }>(entries: T[]): T[] {
  return [...entries].sort((a, b) => a.points - b.points || b.name.localeCompare(a.name))
}

// Realtime delivers new spins in useTripRealtime; the live show listens here.
const spins = new EventTarget()

export function announceSpin(spin: LiveSpin) {
  spins.dispatchEvent(new CustomEvent<LiveSpin>('spin', { detail: spin }))
}

export function onSpinAnnounced(tripId: string, listener: (spin: LiveSpin) => void) {
  const handler = (event: Event) => {
    const spin = (event as CustomEvent<LiveSpin>).detail
    if (spin.trip_id === tripId) listener(spin)
  }
  spins.addEventListener('spin', handler)
  return () => spins.removeEventListener('spin', handler)
}

/** Stages of the live show, in milliseconds. */
export const SHOW_TIMING = {
  /** Per destination revealed, before the wheel */
  revealStep: 900,
  countdown: 3000,
  spin: 6000,
}
