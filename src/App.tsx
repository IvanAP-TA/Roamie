import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from '@/components/auth/RequireAuth'
import { Splash } from '@/components/layout/Splash'
import LandingPage from '@/pages/LandingPage'
import AuthCallbackPage from '@/pages/AuthCallbackPage'

// Everything but the landing page loads on demand, animation library included (MotionShell): the first visit to
// roamie.org downloads only what the landing needs.
const MotionShell = lazy(() => import('@/components/layout/MotionShell'))
const AppShell = lazy(() => import('@/components/layout/AppShell').then((module) => ({ default: module.AppShell })))
const TripsPage = lazy(() => import('@/pages/TripsPage'))
const ProfilePage = lazy(() => import('@/pages/ProfilePage'))
const PassportPage = lazy(() => import('@/pages/PassportPage'))
const JoinPage = lazy(() => import('@/pages/JoinPage'))
const PublicTripPage = lazy(() => import('@/pages/PublicTripPage'))
const GuidesIndexPage = lazy(() => import('@/pages/guides/GuidesIndexPage'))
const GuidePage = lazy(() => import('@/pages/guides/GuidePage'))
const LegalPage = lazy(() => import('@/pages/LegalPage'))
const ExplorePage = lazy(() => import('@/pages/ExplorePage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))
const TripLayout = lazy(() => import('@/pages/trip/TripLayout'))
const DestinationsTab = lazy(() => import('@/pages/trip/DestinationsTab'))
const MapTab = lazy(() => import('@/pages/trip/MapTab'))
const RouletteTab = lazy(() => import('@/pages/trip/RouletteTab'))
const ItineraryTab = lazy(() => import('@/pages/trip/ItineraryTab'))
const GroupTab = lazy(() => import('@/pages/trip/GroupTab'))
// Mock-data UI preview for local development only; removed from production builds.
const DevPreview = import.meta.env.DEV ? lazy(() => import('@/dev/PreviewTrip')) : null

export default function App() {
  return (
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
  )
}
