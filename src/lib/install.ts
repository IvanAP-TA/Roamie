/**
 * "Install the app" support. Chrome, Edge and Samsung Internet fire `beforeinstallprompt` once, early in the
 * page load, so the listener lives here and main.tsx imports this module before rendering. iOS has no install
 * API: there the UI explains "Share → Add to Home Screen" instead.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export interface InstallState {
  /** The browser can show its own install dialog right now */
  canPrompt: boolean
  /** iPhone/iPad: installable only through the share menu */
  isIos: boolean
  /** Already running as an installed app, or just installed */
  installed: boolean
}

let deferredPrompt: BeforeInstallPromptEvent | null = null
let justInstalled = false
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((listener) => listener())

const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true)

const isIosDevice = () =>
  typeof navigator !== 'undefined' &&
  (/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    // Keep the browser from showing its own mini-infobar: the app offers the install where it makes sense.
    event.preventDefault()
    deferredPrompt = event as BeforeInstallPromptEvent
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    justInstalled = true
    notify()
  })
}

let snapshot: InstallState = { canPrompt: false, isIos: false, installed: false }

export function getInstallState(): InstallState {
  const next: InstallState = { canPrompt: deferredPrompt !== null, isIos: isIosDevice(), installed: justInstalled || isStandalone() }
  if (next.canPrompt !== snapshot.canPrompt || next.isIos !== snapshot.isIos || next.installed !== snapshot.installed) snapshot = next
  return snapshot
}

export const serverInstallState: InstallState = { canPrompt: false, isIos: false, installed: false }

export function subscribeInstallState(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Shows the browser's install dialog; resolves to true when the user accepts. */
export async function promptInstall(): Promise<boolean> {
  const event = deferredPrompt
  if (!event) return false
  // The event can only be used once.
  deferredPrompt = null
  notify()
  await event.prompt()
  const { outcome } = await event.userChoice
  return outcome === 'accepted'
}
