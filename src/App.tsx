import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from '@/components/auth/RequireAuth'
import { AppShell } from '@/components/layout/AppShell'
import { Splash } from '@/components/layout/Splash'
import LandingPage from '@/pages/LandingPage'
import AuthCallbackPage from '@/pages/AuthCallbackPage'

const TripsPage = lazy(() => import('@/pages/TripsPage'))
const ProfilePage = lazy(() => import('@/pages/ProfilePage'))
const PassportPage = lazy(() => import('@/pages/PassportPage'))
const JoinPage = lazy(() => import('@/pages/JoinPage'))
const LegalPage = lazy(() => import('@/pages/LegalPage'))
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
        <Route path="/join" element={<JoinPage />} />
        <Route path="/join/:code" element={<JoinPage />} />
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
      </Routes>
    </Suspense>
  )
}
