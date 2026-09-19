import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import type { GuidePlace } from '@/content/guides/content'
import type { LanguageCode } from '@/i18n'
import { useAddGuidePlace } from '@/hooks/useAddGuidePlace'
import { useAuth } from '@/hooks/useAuth'
import { GoogleButton } from '@/components/auth/GoogleButton'
import { Sheet } from '@/components/ui/sheet'
import { TripChoiceList } from '@/components/trips/TripChoiceList'

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
  const navigate = useNavigate()
  const add = useAddGuidePlace(lang)

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

  return <TripChoiceList onChoose={choose} busyTripId={add.isPending ? (add.variables?.tripId ?? null) : null} lang={lang} />
}
