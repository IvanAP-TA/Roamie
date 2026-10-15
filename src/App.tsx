import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from '@/components/auth/RequireAuth'
import { ErrorBoundary } from '@/components/layout/ErrorBoundary'
import { Splash } from '@/components/layout/Splash'
import LandingPage from '@/pages/LandingPage'
import AuthCallbackPage from '@/pages/AuthCallbackPage'
import { lazyPage, pages } from '@/lib/pages'

// Everything but the landing page loads on demand, animation library included (MotionShell): the first visit to
// roamie.org downloads only what the landing needs.
const MotionShell = lazyPage(pages.motionShell)
const AppShell = lazy(() => pages.appShell().then((module) => ({ default: module.AppShell })))
const TripsPage = lazyPage(pages.trips)
const ProfilePage = lazyPage(pages.profile)
const PassportPage = lazyPage(pages.passport)
const JoinPage = lazyPage(pages.join)
const PublicTripPage = lazyPage(pages.publicTrip)
const GuidesIndexPage = lazyPage(pages.guidesIndex)
const GuidePage = lazyPage(pages.guide)
const LegalPage = lazyPage(pages.legal)
const ExplorePage = lazyPage(pages.explore)
const NotFoundPage = lazyPage(pages.notFound)
const TripLayout = lazyPage(pages.tripLayout)
const DestinationsTab = lazyPage(pages.destinations)
const MapTab = lazyPage(pages.map)
const RouletteTab = lazyPage(pages.roulette)
const ItineraryTab = lazyPage(pages.itinerary)
const GroupTab = lazyPage(pages.group)
// Mock-data UI preview for local development, and for performance benchmarks of a production build made with
// VITE_PREVIEW=1; removed from the builds that get deployed.
const DevPreview = import.meta.env.DEV || import.meta.env.VITE_PREVIEW === '1' ? lazy(() => import('@/dev/PreviewTrip')) : null

export default function App() {
  return (
    <ErrorBoundary>
    <Suspense fallback={<Splash />}>
      <Routes>
        <Route path="/" element={<LandingPage lang="it" />} />
        <Route path="/en" element={<LandingPage lang="en" />} />
        <Route path="/es" element={<LandingPage lang="es" />} />
        <Route path="/it" element={<Navigate to="/" replace />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        <Route element={<MotionShell />}>
          <Route path="/guide" element={<GuidesIndexPage lang="it" />} />
          <Route path="/guide/:slug" element={<GuidePage lang="it" />} />
          <Route path="/en/guides" element={<GuidesIndexPage lang="en" />} />
          <Route path="/en/guides/:slug" element={<GuidePage lang="en" />} />
          <Route path="/es/guias" element={<GuidesIndexPage lang="es" />} />
          <Route path="/es/guias/:slug" element={<GuidePage lang="es" />} />
          <Route path="/join" element={<JoinPage />} />
          <Route path="/join/:code" element={<JoinPage />} />
          <Route path="/p/:slug" element={<PublicTripPage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/privacy" element={<LegalPage doc="privacy" />} />
          <Route path="/terms" element={<LegalPage doc="terms" />} />

          <Route element={<RequireAuth />}>
            <Route element={<AppShell />}>
              <Route path="/trips" element={<TripsPage />} />
              <Route path="/passport" element={<PassportPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
            <Route path="/trips/:tripId" element={<TripLayout />}>
              <Route index element={<DestinationsTab />} />
              <Route path="map" element={<MapTab />} />
              <Route path="roulette" element={<RouletteTab />} />
              <Route path="itinerary" element={<ItineraryTab />} />
              <Route path="group" element={<GroupTab />} />
              <Route path="*" element={<Navigate to="." replace />} />
            </Route>
          </Route>

          {DevPreview && <Route path="/__preview/:tab?" element={<DevPreview />} />}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
    </ErrorBoundary>
  )
}
