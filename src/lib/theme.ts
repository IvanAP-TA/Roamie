import { useSyncExternalStore } from 'react'

/**
 * Light or dark: the device's setting by default, or the one picked in Profile. The inline script in index.html and
 * shell.html applies it before the first paint (data-theme on <html>, which the CSS reads) and exposes
 * window.roamieApplyTheme, called here after every change.
 */
export type ThemeChoice = 'system' | 'light' | 'dark'
export const THEMES: ThemeChoice[] = ['system', 'light', 'dark']

const KEY = 'roamie.theme'
const EVENT = 'roamie:theme-pref'

declare global {
  interface Window {
    roamieApplyTheme?: () => void
  }
}

function readTheme(): ThemeChoice {
  try {
    const value = localStorage.getItem(KEY)
    return value === 'light' || value === 'dark' ? value : 'system'
  } catch {
    return 'system'
  }
}

export function setTheme(choice: ThemeChoice) {
  try {
    if (choice === 'system') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, choice)
  } catch {
    // ignore: the theme then lasts until the page is closed
  }
  window.roamieApplyTheme?.()
  window.dispatchEvent(new Event(EVENT))
}

export function useTheme(): [ThemeChoice, (choice: ThemeChoice) => void] {
  const choice = useSyncExternalStore(
    (cb) => {
      window.addEventListener(EVENT, cb)
      window.addEventListener('storage', cb)
      return () => {
        window.removeEventListener(EVENT, cb)
        window.removeEventListener('storage', cb)
      }
    },
    readTheme,
    () => 'system' as const,
  )
  return [choice, setTheme]
}
