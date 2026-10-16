import { startTransition, useEffect, useLayoutEffect, useState, type MouseEvent } from 'react'
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom'

/**
 * Page changes animated with the View Transitions API (Chrome, so also the Android app): the browser snapshots the
 * old page, React renders the new one, and the two are morphed on the compositor. An element can carry over from one
 * page to the other (a trip's cover growing into the trip's header): it gets the same view-transition-name on both
 * sides, the old one just before the snapshot, the new one once the new page has rendered. Names are set only for the
 * transition: a named element is a backdrop root, which would switch off the glass blur of the dock inside it.
 *
 * Elsewhere, or with reduced motion, navigation is the plain one.
 */

export interface SharedElement {
  name: string
  /** Where it is on the current page: a selector, or (from a link) the [data-vt] element inside the link */
  from?: string | Element | null
  /** Where it lands on the new page */
  to: string
}

/** Elements on both pages that morph rather than cross-fade with the rest. */
const ALWAYS: SharedElement[] = [{ name: 'dock', from: 'nav[data-dock]', to: 'nav[data-dock]' }]

let waiting: { path: string; done: () => void } | null = null

// Whether the page is scrolled, noted as it scrolls: asking at navigation time would make the browser lay out the new
// page in the middle of rendering it, on every tab change.
let scrolled = false
if (typeof window !== 'undefined') addEventListener('scroll', () => (scrolled = window.scrollY > 0), { passive: true })

// A page that takes longer than this to appear isn't worth holding the old one frozen for.
const MAX_WAIT = 700

export const viewTransitionsSupported = () =>
  typeof document !== 'undefined' &&
  'startViewTransition' in document &&
  !matchMedia('(prefers-reduced-motion: reduce)').matches

const element = (target: string | Element | null | undefined) =>
  (typeof target === 'string' ? document.querySelector(target) : target) as HTMLElement | null

// Whether a transition is playing, for the pages that keep their heavy parts for after it (usePageSettled).
let playing = false
const settleListeners = new Set<() => void>()
function setPlaying(value: boolean) {
  playing = value
  settleListeners.forEach((listener) => listener())
}

/**
 * False while a page transition captures the new page, true otherwise (and always outside a transition, as on a
 * direct load). A page renders what the transition shows (its header, the photo that carries over) at once and the
 * rest once this turns true: the browser holds the old page frozen until the new one has rendered, so a page built in
 * full on a slow phone meant a long freeze before any animation.
 */
export function usePageSettled(): boolean {
  const [settled, setSettled] = useState(() => !playing)
  useEffect(() => {
    if (settled) return
    const check = () => !playing && startTransition(() => setSettled(true))
    settleListeners.add(check)
    check()
    return () => void settleListeners.delete(check)
  }, [settled])
  return settled
}

export function navigateWithTransition(go: () => void, path: string, shared?: SharedElement) {
  if (!viewTransitionsSupported()) return go()
  setPlaying(true)
  const all = shared ? [...ALWAYS, shared] : ALWAYS
  const sources = all.map((s) => element(s.from))
  sources.forEach((el, i) => el && (el.style.viewTransitionName = all[i].name))
  const landed: HTMLElement[] = []
  // Where the shared element starts, read now while the page's layout is still clean.
  const fromBox = shared ? element(shared.from)?.getBoundingClientRect() : undefined
  const root = document.documentElement

  const transition = document.startViewTransition(
    () =>
      new Promise<void>((resolve) => {
        // The old page is captured: its elements give their names up (one element per name and page).
        for (const el of sources) if (el) el.style.viewTransitionName = ''
        const done = () => {
          clearTimeout(timer)
          waiting = null
          all.forEach((s) => {
            const el = element(s.to)
            if (!el) return
            el.style.viewTransitionName = s.name
            landed.push(el)
            // The landing element is animated by the transition: its own entrance would only fight it.
            const entering = el.closest<HTMLElement>('.page-enter, .stagger-item')
            if (entering && s.name !== 'dock') entering.style.animation = 'none'
            // The photo travels by translation and a uniform scale only (index.css, .vt-morph): the browser's own
            // morph animates width and height, which the main thread has to compute frame by frame, and on a slow
            // phone it's busy right then with the new page. The compositor plays transforms on its own.
            if (s === shared && fromBox) {
              const toBox = el.getBoundingClientRect()
              root.style.setProperty('--vt-from-x', `${fromBox.left}px`)
              root.style.setProperty('--vt-from-y', `${fromBox.top}px`)
              root.style.setProperty('--vt-scale', String(fromBox.width / (toBox.width || 1)))
              root.style.setProperty('--vt-to-x', `${toBox.left}px`)
              root.style.setProperty('--vt-to-y', `${toBox.top}px`)
              root.classList.add('vt-morph')
            }
          })
          resolve()
        }
        const timer = setTimeout(done, MAX_WAIT)
        waiting = { path, done }
        go()
      }),
  )
  // The rest of the page is built as soon as the animation has started: it plays on the compositor (transforms and
  // opacity only), so the main thread's work doesn't make it stutter, and the page is complete as early as possible.
  void transition.ready.finally(() => setPlaying(false))
  void transition.finished.finally(() => {
    setPlaying(false)
    root.classList.remove('vt-morph')
    for (const el of landed) el.style.viewTransitionName = ''
  })
}

/**
 * Render once, in the router. A new page starts at its top (the browser's back and forward keep where you were), and a
 * pending transition captures it as soon as the router has rendered it, scrolled to the top already.
 */
export function ViewTransitionReady() {
  const { pathname } = useLocation()
  const navigationType = useNavigationType()
  useLayoutEffect(() => {
    if (navigationType !== 'POP' && scrolled) {
      window.scrollTo(0, 0)
      scrolled = false
    }
    if (waiting && pathname === waiting.path) waiting.done()
  }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

/**
 * Opens a page with a transition from a link's click: (event, to, shared). Without `shared.from`, the shared element
 * is the [data-vt] element inside the link. Clicks meant for a new tab or window keep the browser's behaviour.
 */
export function useTransitionNavigate() {
  const navigate = useNavigate()
  return (event: MouseEvent<HTMLElement>, to: string, shared?: SharedElement) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    if (!viewTransitionsSupported()) return
    event.preventDefault()
    const from = shared && (shared.from ?? event.currentTarget.querySelector('[data-vt]'))
    navigateWithTransition(() => navigate(to), to.split(/[?#]/)[0], shared && { ...shared, from })
  }
}

/** onClick for one link that opens its page with a transition (see useTransitionNavigate). */
export function useTransitionClick(to: string, shared?: SharedElement) {
  const open = useTransitionNavigate()
  return (event: MouseEvent<HTMLElement>) => open(event, to, shared)
}
