import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Loader2, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import type { GuidePlace } from '@/content/guides/content'
import type { LanguageCode } from '@/i18n'
import { useAddGuidePlace } from '@/hooks/useAddGuidePlace'
import { useAuth } from '@/hooks/useAuth'
import { useMyTrips } from '@/hooks/useTrips'
import { GoogleButton } from '@/components/auth/GoogleButton'
import { CoverImage } from '@/components/media/CoverImage'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/misc'
import { Sheet } from '@/components/ui/sheet'

/** "Add to a trip" from a guide: pick one of your trips (signed out: sign in first). */
export function AddToTripSheet({ place, lang, onClose }: { place: GuidePlace | null; lang: LanguageCode; onClose: () => void }) {
  const { t } = useTranslation(undefined, { lng: lang })
  const { session } = useAuth()
  const location = useLocation()
  // Keep the last place on screen while the sheet animates out.
  const [shown, setShown] = useState(place)
  if (place && place !== shown) setShown(place)

  return (
    <Sheet
      open={place !== null}
      onOpenChange={(open) => !open && onClose()}
      title={shown ? t('guides.addTitle', { place: shown.name[lang] }) : ''}
      description={session ? t('guides.addDescription') : undefined}
    >
      {shown &&
        (session ? (
          <TripPicker place={shown} lang={lang} onDone={onClose} />
        ) : (
          <div className="space-y-4 pb-2">
            <p className="text-sm text-muted-foreground">{t('guides.signInBody')}</p>
            <GoogleButton next={location.pathname} />
          </div>
        ))}
    </Sheet>
  )
}

function TripPicker({ place, lang, onDone }: { place: GuidePlace; lang: LanguageCode; onDone: () => void }) {
  const { t } = useTranslation(undefined, { lng: lang })
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data: trips, isLoading } = useMyTrips()
  const add = useAddGuidePlace(lang)

  // Viewers can't propose destinations.
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

  const choose = (tripId: string, tripName: string) => {
    if (add.isPending) return
    add.mutate(
      { tripId, place },
      {
        onSuccess: (created) => {
          onDone()
          toast.success(t('guides.added', { place: place.name[lang], trip: tripName }), {
            action: { label: t('guides.openTrip'), onClick: () => navigate(`/trips/${tripId}?d=${created.id}`) },
          })
        },
        onError: () => toast.error(t('errors.generic')),
      },
    )
  }

  return (
    <ul className="space-y-2 pb-2">
      {editable.map((trip) => {
        const busy = add.isPending && add.variables?.tripId === trip.id
        return (
          <li key={trip.id}>
            <button
              type="button"
              disabled={add.isPending}
              onClick={() => choose(trip.id, trip.name)}
              className="flex w-full items-center gap-3 rounded-[1.25rem] bg-foreground/[0.04] p-2.5 text-left transition hover:bg-foreground/[0.07] disabled:opacity-60"
            >
              <CoverImage url={trip.cover_image_url} seed={trip.id} showAttribution={false} sizes="48px" className="size-12 shrink-0 rounded-xl" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{trip.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {t('guides.tripPlaces', { count: trip.destinations[0]?.count ?? 0 })}
                </span>
              </span>
              {busy ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : <Plus className="size-4 text-primary" />}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
