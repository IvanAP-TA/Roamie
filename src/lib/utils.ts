import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Only allow same-origin relative paths as post-login redirects (no open redirects). */
export function safeNextPath(next: string | null | undefined, fallback = '/trips'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback
  return next
}

// No whitespace, quotes, backslashes or angle brackets: safe inside HTML attributes and CSS url('…').
const SAFE_URL_TAIL = String.raw`[^\s'"\\<>]+$`
// The Commons API serves originals from upload.wikimedia.org and thumbnails from thumb.wikimedia.org.
const WIKIMEDIA_IMAGE = new RegExp(String.raw`^https://(upload|thumb)\.wikimedia\.org/` + SAFE_URL_TAIL)
const GOOGLE_AVATAR = new RegExp(String.raw`^https://[a-z0-9-]+\.googleusercontent\.com/` + SAFE_URL_TAIL)
const matches = (url: string | null | undefined, pattern: RegExp) => (url && url.length <= 2048 && pattern.test(url) ? url : null)

/** Photos are only ever hot-linked from Wikimedia Commons (same rule as the database check constraints). */
export const safeImageUrl = (url: string | null | undefined): string | null => matches(url, WIKIMEDIA_IMAGE)

/** Avatars only come from Google accounts (same rule as the profiles sanitize trigger). */
export const safeAvatarUrl = (url: string | null | undefined): string | null => matches(url, GOOGLE_AVATAR)

export function initials(name: string | null | undefined): string {
  if (!name) return '?'
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

/** Deterministic 0..n-1 index from a string — used for gradient fallbacks and avatar tints. */
export function hashIndex(value: string, n: number): number {
  let h = 0
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0
  return Math.abs(h) % n
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31_536_000],
  ['month', 2_592_000],
  ['week', 604_800],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
]

export function timeAgo(iso: string, lang: string): string {
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' })
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit)
  }
  return rtf.format(0, 'minute')
}

export const isTouchDevice = () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

export const appUrl = (): string =>
  (import.meta.env.VITE_PUBLIC_APP_URL as string | undefined)?.replace(/\/$/, '') || window.location.origin
