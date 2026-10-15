/**
 * The code of each screen, loaded on demand. App.tsx makes each one a lazy route; the app's shells also call them
 * ahead of time, when the phone is idle, for the screens a tap away (the other dock tabs, a trip). A tab tapped for
 * the first time then opens at once instead of waiting for its download: the router renders navigation as a
 * transition, which keeps the old screen up until the new one's code has arrived.
 */
export const pages = {
  motionShell: () => import('@/components/layout/MotionShell'),
  appShell: () => import('@/components/layout/AppShell'),
  trips: () => import('@/pages/TripsPage'),
  profile: () => import('@/pages/ProfilePage'),
  passport: () => import('@/pages/PassportPage'),
  join: () => import('@/pages/JoinPage'),
  publicTrip: () => import('@/pages/PublicTripPage'),
  guidesIndex: () => import('@/pages/guides/GuidesIndexPage'),
  guide: () => import('@/pages/guides/GuidePage'),
  legal: () => import('@/pages/LegalPage'),
  explore: () => import('@/pages/ExplorePage'),
  notFound: () => import('@/pages/NotFoundPage'),
  tripLayout: () => import('@/pages/trip/TripLayout'),
  destinations: () => import('@/pages/trip/DestinationsTab'),
  map: () => import('@/pages/trip/MapTab'),
  roulette: () => import('@/pages/trip/RouletteTab'),
  itinerary: () => import('@/pages/trip/ItineraryTab'),
  group: () => import('@/pages/trip/GroupTab'),
}

/** Fetches these screens' code once the browser is idle (a failed fetch is retried by the lazy route itself). */
export function preloadPages(...names: (keyof typeof pages)[]) {
  const run = () => {
    for (const name of names) void pages[name]().catch(() => {})
  }
  if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 4000 })
  else setTimeout(run, 1500)
}
