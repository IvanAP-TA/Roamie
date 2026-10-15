import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from '@/components/auth/RequireAuth'
import { ErrorBoundary } from '@/components/layout/ErrorBoundary'
import { Splash } from '@/components/layout/Splash'
import LandingPage from '@/pages/LandingPage'
import AuthCallbackPage from '@/pages/AuthCallbackPage'
import { pages } from '@/lib/pages'

// Everything but the landing page loads on demand, animation library included (MotionShell): the first visit to
// roamie.org downloads only what the landing needs.
const MotionShell = lazy(pages.motionShell)
const AppShell = lazy(() => pages.appShell().then((module) => ({ default: module.AppShell })))
const TripsPage = lazy(pages.trips)
const ProfilePage = lazy(pages.profile)
const PassportPage = lazy(pages.passport)
const JoinPage = lazy(pages.join)
const PublicTripPage = lazy(pages.publicTrip)
const GuidesIndexPage = lazy(pages.guidesIndex)
const GuidePage = lazy(pages.guide)
const LegalPage = lazy(pages.legal)
const ExplorePage = lazy(pages.explore)
const NotFoundPage = lazy(pages.notFound)
const TripLayout = lazy(pages.tripLayout)
const DestinationsTab = lazy(pages.destinations)
const MapTab = lazy(pages.map)
const RouletteTab = lazy(pages.roulette)
const ItineraryTab = lazy(pages.itinerary)
const GroupTab = lazy(pages.group)
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
