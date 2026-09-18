import { useSyncExternalStore } from 'react'
import hubs from '@/data/country-hubs.json'

/**
 * The country the user travels from, for flight estimates. Guessed from the device's languages ("en-GB" → GB,
 * "es" → ES), changeable from the cost estimate or the profile, and remembered on this device.
 */

/** Where flights from each country start (main airport, else the capital): scripts/countries.mjs. */
export const ORIGIN_HUBS = hubs as unknown as Record<string, [number, number]>

const KEY = 'roamie.origin'
const FALLBACK = 'IT'

export function guessOrigin(languages: readonly string[] = typeof navigator === 'undefined' ? [] : (navigator.languages ?? [navigator.language])): string {
  for (const tag of languages) {
    try {
      const locale = new Intl.Locale(tag)
      // "it" alone means Italy, "en" the US, "es" Spain: the likeliest region for the language.
      const region = locale.region ?? locale.maximize().region
      if (region && ORIGIN_HUBS[region]) return region
    } catch {
      // Not a valid language tag: try the next one.
    }
  }
  return FALLBACK
}

function read(): string {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved && ORIGIN_HUBS[saved]) return saved
  } catch {
    // Storage blocked: fall back to the guess.
  }
  return guessOrigin()
}

let current: string | null = null
const listeners = new Set<() => void>()

export function getOrigin(): string {
  current ??= typeof window === 'undefined' ? FALLBACK : read()
  return current
}

export function setOrigin(code: string) {
  if (!ORIGIN_HUBS[code]) return
  current = code
  try {
    localStorage.setItem(KEY, code)
  } catch {
    // Storage blocked: kept for this visit only.
  }
  listeners.forEach((listener) => listener())
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useOrigin(): [string, (code: string) => void] {
  return [useSyncExternalStore(subscribe, getOrigin, () => FALLBACK), setOrigin]
}
