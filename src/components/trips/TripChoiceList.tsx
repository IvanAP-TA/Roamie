import { Link } from 'react-router-dom'
import { Loader2, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { useMyTrips } from '@/hooks/useTrips'
import { CoverImage } from '@/components/media/CoverImage'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/misc'

/** The user's trips where they can propose destinations (not as a viewer), to pick one; a way to create one if none. */
export function TripChoiceList({
  onChoose,
  busyTripId,
  lang,
}: {
  onChoose: (tripId: string, tripName: string) => void
  /** The trip being saved to: its row spins and the others wait. */
  busyTripId: string | null
  lang?: string
}) {
  const { t } = useTranslation(undefined, { lng: lang })
  const { user } = useAuth()
  const { data: trips, isLoading } = useMyTrips()

  const editable = (trips ?? []).filter((trip) => trip.trip_members.some((m) => m.user_id === user?.id && m.role !== 'viewer'))

  if (isLoading) return <Skeleton className="h-32 rounded-[1.5rem]" />

  if (editable.length === 0) {
    return (
      <div className="space-y-4 pb-2 text-center">
        <p className="text-sm text-muted-foreground">{t('guides.noTrips')}</p>
        <Button asChild>
          <Link to="/trips?new=1">{t('guides.createTrip')}</Link>
        </Button>
      </div>
    )
  }

  return (
    <ul className="space-y-2 pb-2">
      {editable.map((trip) => (
        <li key={trip.id}>
          <button
            type="button"
            disabled={busyTripId !== null}
            onClick={() => onChoose(trip.id, trip.name)}
            className="flex w-full items-center gap-3 rounded-[1.25rem] bg-foreground/[0.04] p-2.5 text-left transition hover:bg-foreground/[0.07] disabled:opacity-60"
          >
            <CoverImage url={trip.cover_image_url} seed={trip.id} showAttribution={false} sizes="48px" className="size-12 shrink-0 rounded-xl" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{trip.name}</span>
              <span className="block text-xs text-muted-foreground">{t('guides.tripPlaces', { count: trip.destinations[0]?.count ?? 0 })}</span>
            </span>
            {busyTripId === trip.id ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : <Plus className="size-4 text-primary" />}
          </button>
        </li>
      ))}
    </ul>
  )
}
