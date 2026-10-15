import { lazy, type ComponentType } from 'react'
import { GUIDE_BASE } from '@/content/guides/meta'

type Loader<M = unknown> = () => Promise<M>

// The modules already loaded, by loader: a lazy route whose code is here renders at once instead of suspending.
const loaded = new WeakMap<Loader, unknown>()

function remember<M>(load: Loader<M>): Loader<M> {
  const loader: Loader<M> = () =>
    load().then((module) => {
      loaded.set(loader, module)
      return module
    })
  return loader
}

/**
 * The code of each screen, loaded on demand. App.tsx makes each one a lazy route; the app's shells also call them
 * ahead of time, when the phone is idle, for the screens a tap away (the other dock tabs, a trip). A tab tapped for
 * the first time then opens at once instead of waiting for its download: the router renders navigation as a
 * transition, which keeps the old screen up until the new one's code has arrived.
 */
export const pages = {
  motionShell: remember(() => import('@/components/layout/MotionShell')),
  appShell: remember(() => import('@/components/layout/AppShell')),
  trips: remember(() => import('@/pages/TripsPage')),
  profile: remember(() => import('@/pages/ProfilePage')),
  passport: remember(() => import('@/pages/PassportPage')),
  join: remember(() => import('@/pages/JoinPage')),
  publicTrip: remember(() => import('@/pages/PublicTripPage')),
  guidesIndex: remember(() => import('@/pages/guides/GuidesIndexPage')),
  guide: remember(() => import('@/pages/guides/GuidePage')),
  legal: remember(() => import('@/pages/LegalPage')),
  explore: remember(() => import('@/pages/ExplorePage')),
  notFound: remember(() => import('@/pages/NotFoundPage')),
  tripLayout: remember(() => import('@/pages/trip/TripLayout')),
  destinations: remember(() => import('@/pages/trip/DestinationsTab')),
  map: remember(() => import('@/pages/trip/MapTab')),
  roulette: remember(() => import('@/pages/trip/RouletteTab')),
  itinerary: remember(() => import('@/pages/trip/ItineraryTab')),
  group: remember(() => import('@/pages/trip/GroupTab')),
}

/**
 * React.lazy over one of the loaders above. Once that code is loaded, the route renders synchronously (a thenable
 * that resolves on the spot, which React reads at once): adopting a prerendered page must not suspend, or React
 * drops the markup and draws the page again (see loadPagesFor).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyPage<T extends ComponentType<any>>(load: Loader<{ default: T }>) {
  return lazy(() => {
    const module = loaded.get(load) as { default: T } | undefined
    if (!module) return load()
    return { then: (resolve: (value: { default: T }) => void) => resolve(module) } as Promise<{ default: T }>
  })
}

/**
 * The code a prerendered page's route needs, loaded before React adopts its markup. A route that suspended while
 * being adopted would be drawn anew as soon as anything above it updates (restoring the offline cache does), with
 * the splash screen in between.
 */
export function loadPagesFor(pathname: string): Promise<unknown> {
  const path = pathname.replace(/\/$/, '') || '/'
  const guideBase = Object.values(GUIDE_BASE).find((base) => path === base || path.startsWith(`${base}/`))
  const needed =
    path === '/' || path === '/en' || path === '/es'
      ? []
      : guideBase
        ? [pages.motionShell, path === guideBase ? pages.guidesIndex : pages.guide]
        : path === '/privacy' || path === '/terms'
          ? [pages.motionShell, pages.legal]
          : [pages.motionShell, pages.notFound]
  return Promise.all(needed.map((load) => load()))
}

/** Fetches these screens' code once the browser is idle (a failed fetch is retried by the lazy route itself). */
export function preloadPages(...names: (keyof typeof pages)[]) {
  const run = () => {
    for (const name of names) void pages[name]().catch(() => {})
  }
  if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 4000 })
  else setTimeout(run, 1500)
}
