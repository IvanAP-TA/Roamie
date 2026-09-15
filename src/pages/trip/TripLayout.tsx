import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Outlet, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarRange, CloudOff, Compass, FerrisWheel, Map, UserPlus, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { useDestinations } from '@/hooks/useDestinations'
import { useItinerary } from '@/hooks/useItinerary'
import { useChecklist, useTripLinks } from '@/hooks/usePlan'
import { useAvailability } from '@/hooks/useTripDates'
import { useTrip, useTripMembers } from '@/hooks/useTrips'
import { useTripRealtime } from '@/hooks/useTripRealtime'
import { TripContext, type TripContextValue } from '@/hooks/useTripContext'
import { AuroraBackground } from '@/components/brand/AuroraBackground'
import { AppHeader } from '@/components/layout/AppHeader'
import { DockNav } from '@/components/layout/DockNav'
import { Splash } from '@/components/layout/Splash'
import { DestinationDetailSheet } from '@/components/destinations/DestinationDetailSheet'
import { InviteTicket } from '@/components/trips/InviteTicket'
import { Button } from '@/components/ui/button'
import { EmptyState, Skeleton } from '@/components/ui/misc'
import { Sheet } from '@/components/ui/sheet'

export default function TripLayout() {
  const { t } = useTranslation()
  const { tripId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const tripQuery = useTrip(tripId)
  const membersQuery = useTripMembers(tripId)
  const [inviteOpen, setInviteOpen] = useState(false)
  useTripRealtime(tripId)

  // Load the whole trip as soon as it opens, not view by view: it's all saved on the device for offline use.
  useDestinations(tripId!)
  useItinerary(tripId!)
  useChecklist(tripId!)
  useTripLinks(tripId!)
  useAvailability(tripId!)

  const trip = tripQuery.data
  const members = useMemo(() => membersQuery.data ?? [], [membersQuery.data])
  const me = members.find((m) => m.user_id === user?.id) ?? null

  // Removed from the trip, or trip deleted, while it was open (realtime refetch).
  const hadAccess = useRef(false)
  const hasAccess = Boolean(trip && me)
  useEffect(() => {
    if (hasAccess) hadAccess.current = true
    else if (hadAccess.current && !tripQuery.isFetching && !membersQuery.isFetching) {
      hadAccess.current = false
      toast(t('trip.accessLost'))
      navigate('/trips', { replace: true })
    }
  }, [hasAccess, tripQuery.isFetching, membersQuery.isFetching, navigate, t])

  const value = useMemo<TripContextValue | null>(
    () =>
      trip && me
        ? {
            trip,
            members,
            me,
            role: me.role,
            isOwner: me.role === 'owner',
            canEdit: me.role === 'owner' || me.role === 'editor',
          }
        : null,
    [trip, members, me],
  )

  if (tripQuery.isLoading || membersQuery.isLoading) return <Splash />

  // Offline and this trip was never opened on the device: nothing to show yet.
  if (!value && (tripQuery.isPaused || membersQuery.isPaused)) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <AuroraBackground />
        <EmptyState seed="offline" icon={<CloudOff />} title={t('offline.tripUnavailableTitle')} body={t('offline.tripUnavailableBody')}>
          <Button asChild>
            <Link to="/trips">{t('trip.backToTrips')}</Link>
          </Button>
        </EmptyState>
      </div>
    )
  }

  if (!value) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <AuroraBackground />
        <EmptyState seed="lost" icon={<Compass />} title={t('trip.notFoundTitle')} body={t('trip.notFoundBody')}>
          <Button asChild>
            <Link to="/trips">{t('trip.backToTrips')}</Link>
          </Button>
        </EmptyState>
      </div>
    )
  }

  const base = `/trips/${value.trip.id}`

  return (
    <TripContext.Provider value={value}>
      <div className="relative min-h-dvh">
        <AuroraBackground />
        <AppHeader
          left={
            <Button asChild variant="glass" size="icon-sm" aria-label={t('trip.backToTrips')}>
              <Link to="/trips">
                <ArrowLeft />
              </Link>
            </Button>
          }
          title={value.trip.name}
          right={
            <Button variant="glass" size="sm" onClick={() => setInviteOpen(true)} className="px-3">
              <UserPlus />
              <span className="hidden sm:inline">{t('invite.invite')}</span>
            </Button>
          }
        />

        <div className="pb-36 md:pb-12 md:pl-28">
          <Suspense
            fallback={
              <div className="mx-auto max-w-5xl space-y-4 px-5 pt-4">
                <Skeleton className="h-48 rounded-[2rem]" />
                <Skeleton className="h-32 rounded-[2rem]" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </div>

        <DockNav
          layoutId="trip-dock"
          items={[
            { to: base, end: true, label: t('nav.destinations'), icon: Compass },
            { to: `${base}/map`, label: t('nav.map'), icon: Map },
            { to: `${base}/roulette`, label: t('nav.roulette'), icon: FerrisWheel, primary: true },
            { to: `${base}/itinerary`, label: t('nav.itinerary'), icon: CalendarRange },
            { to: `${base}/group`, label: t('nav.group'), icon: Users },
          ]}
        />

        <DestinationDetailSheet />

        <Sheet open={inviteOpen} onOpenChange={setInviteOpen} title={t('invite.title')} description={t('invite.subtitle')}>
          <InviteTicket trip={value.trip} />
        </Sheet>
      </div>
    </TripContext.Provider>
  )
}
