import { useEffect, useState } from 'react'
import { Loader2, MapPin, Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useVisitedPlaceMutations, type VisitedPlaceInput } from '@/hooks/usePassport'
import type { Place } from '@/lib/nominatim'
import type { VisitedPlace } from '@/lib/types'
import { cn } from '@/lib/utils'
import { PlaceSearch } from '@/components/places/PlaceSearch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet } from '@/components/ui/sheet'

interface PickedPlace {
  country: string | null
  countryCode: string | null
  lat: number | null
  lng: number | null
}

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/

/** Add or edit a place in the user's own passport. Private: it never reaches a trip. */
export function PlaceFormSheet({ open, onOpenChange, place }: { open: boolean; onOpenChange: (open: boolean) => void; place: VisitedPlace | null }) {
  const { t } = useTranslation()
  const { add, update } = useVisitedPlaceMutations()
  const [name, setName] = useState('')
  const [picked, setPicked] = useState<PickedPlace | null>(null)
  const [month, setMonth] = useState('')
  const [rating, setRating] = useState(0)
  const saving = add.isPending || update.isPending
  const thisMonth = new Date().toISOString().slice(0, 7)

  useEffect(() => {
    if (!open) return
    setName(place?.name ?? '')
    setPicked(place ? { country: place.country, countryCode: place.country_code, lat: place.lat, lng: place.lng } : null)
    setMonth(place?.visited_on?.slice(0, 7) ?? '')
    setRating(place?.rating ?? 0)
  }, [open, place])

  const applyPlace = (result: Place) => {
    setName(result.name)
    setPicked({
      country: result.country || null,
      countryCode: result.countryCode ? result.countryCode.toUpperCase() : null,
      lat: result.lat,
      lng: result.lng,
    })
  }

  const save = () => {
    if (!name.trim() || saving) return
    const input: VisitedPlaceInput = {
      name: name.trim().slice(0, 120),
      country: picked?.country?.slice(0, 80) ?? null,
      country_code: picked?.countryCode && /^[A-Z]{2}$/.test(picked.countryCode) ? picked.countryCode : null,
      lat: picked?.lat ?? null,
      lng: picked?.lng ?? null,
      visited_on: MONTH.test(month) ? `${month}-01` : null,
      rating: rating || null,
    }
    const done = {
      onSuccess: () => {
        toast.success(t('passport.placeSaved'))
        onOpenChange(false)
      },
      onError: () => toast.error(t('errors.generic')),
    }
    if (place) update.mutate({ id: place.id, input }, done)
    else add.mutate(input, done)
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={place ? t('passport.editPlaceTitle') : t('passport.addPlaceTitle')}
      description={t('passport.placeHint')}
      footer={
        <Button size="lg" className="w-full" disabled={!name.trim() || saving} onClick={save}>
          {saving && <Loader2 className="animate-spin" />}
          {t('passport.save')}
        </Button>
      }
    >
      <div className="space-y-5 pb-2">
        {picked || place ? (
          <div className="flex items-center gap-3 rounded-[1.25rem] bg-foreground/[0.04] p-3">
            <MapPin className="size-5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <label htmlFor="visited-name" className="sr-only">
                {t('passport.placeName')}
              </label>
              <Input id="visited-name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
              {picked?.country && <p className="mt-1 truncate px-1 text-xs text-muted-foreground">{picked.country}</p>}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setPicked(null)
                setName('')
              }}
            >
              {t('passport.changePlace')}
            </Button>
          </div>
        ) : (
          <PlaceSearch id="visited-place" placeholder={t('passport.searchPlaceholder')} onPick={applyPlace} />
        )}

        <div className="space-y-1.5">
          <label htmlFor="visited-month" className="text-sm font-semibold">
            {t('passport.when')} <span className="font-normal text-muted-foreground">· {t('passport.optional')}</span>
          </label>
          <Input id="visited-month" type="month" max={thisMonth} placeholder="2024-05" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <p id="visited-rating" className="text-sm font-semibold">
            {t('passport.rating')} <span className="font-normal text-muted-foreground">· {t('passport.optional')}</span>
          </p>
          <div role="radiogroup" aria-labelledby="visited-rating" className="-ml-1.5 flex">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={rating === value}
                aria-label={t('review.stars', { count: value })}
                // Tapping the current rating again clears it.
                onClick={() => setRating(rating === value ? 0 : value)}
                className="flex size-11 items-center justify-center rounded-full transition active:scale-90"
              >
                <Star className={cn('size-7 transition-colors', value <= rating ? 'fill-sun text-sun' : 'text-foreground/25')} strokeWidth={1.8} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </Sheet>
  )
}
