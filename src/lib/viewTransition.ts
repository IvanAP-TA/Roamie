import { useLayoutEffect, type MouseEvent } from 'react'
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

export function navigateWithTransition(go: () => void, path: string, shared?: SharedElement) {
  if (!viewTransitionsSupported()) return go()
  const all = shared ? [...ALWAYS, shared] : ALWAYS
  const sources = all.map((s) => element(s.from))
  sources.forEach((el, i) => el && (el.style.viewTransitionName = all[i].name))
  const landed: HTMLElement[] = []

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
          })
          resolve()
        }
        const timer = setTimeout(done, MAX_WAIT)
        waiting = { path, done }
        go()
      }),
  )
  void transition.finished.finally(() => {
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
