import { useState } from 'react'
import { BedDouble, Pencil, Plane, Ticket } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useHomeCity } from '@/hooks/useHomeCity'
import { activitiesUrl, flightsUrl, staysUrl, usesTripCom, type BookingPlace, type BookingTrip } from '@/lib/booking'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

const open = (url: string) => window.open(url, '_blank', 'noopener,noreferrer')

/**
 * Flights, stays and things to do for a place, each a partner's search already filled in (lib/booking.ts). Flights
 * need the city the user leaves from: asked once in a small popover, then remembered (useHomeCity).
 */
export function BookingLinks({ place, trip, lang, className }: { place: BookingPlace; trip?: BookingTrip; lang?: string; className?: string }) {
  const { t, i18n } = useTranslation(undefined, lang ? { lng: lang } : undefined)
  const language = lang ?? i18n.resolvedLanguage ?? 'en'
  const [homeCity, setHomeCity] = useHomeCity()
  const [asking, setAsking] = useState(false)
  const [draft, setDraft] = useState('')

  const flights = (city: string) => open(flightsUrl(place, city, trip, language))
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const city = draft.trim()
    if (!city) return
    // Opened inside the tap, before anything async, so the browser doesn't block it as a pop-up.
    flights(city)
    setHomeCity(city)
    setAsking(false)
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="grid grid-cols-3 gap-2">
        <Popover
          open={asking}
          onOpenChange={(next) => {
            setAsking(next)
            if (next) setDraft(homeCity ?? '')
          }}
        >
          <PopoverTrigger asChild>
            <Button
              size="sm"
              variant="secondary"
              className="w-full"
              onClick={(e) => {
                if (!homeCity) return
                e.preventDefault()
                flights(homeCity)
              }}
            >
              <Plane />
              {t('booking.flights')}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start">
            <form onSubmit={submit} className="space-y-3">
              <label className="block font-semibold" htmlFor="home-city">
                {t('booking.fromTitle')}
              </label>
              <Input id="home-city" value={draft} maxLength={80} autoFocus placeholder={t('booking.fromPlaceholder')} onChange={(e) => setDraft(e.target.value)} enterKeyHint="search" />
              <p className="text-xs text-muted-foreground">{t('booking.fromNote')}</p>
              <Button type="submit" size="sm" className="w-full" disabled={!draft.trim()}>
                <Plane />
                {t('booking.searchFlights')}
              </Button>
            </form>
          </PopoverContent>
        </Popover>
        <Button asChild size="sm" variant="secondary" className="w-full">
          <a href={staysUrl(place, trip, language)} target="_blank" rel="noopener noreferrer">
            <BedDouble />
            {t('booking.stays')}
          </a>
        </Button>
        <Button asChild size="sm" variant="secondary" className="w-full">
          <a href={activitiesUrl(place)} target="_blank" rel="noopener noreferrer">
            <Ticket />
            {t('booking.activities')}
          </a>
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {homeCity && (
          <button type="button" onClick={() => {
              setDraft(homeCity)
              setAsking(true)
            }} className="mr-1 inline-flex items-center gap-1 underline-offset-2 hover:underline">
            <Pencil className="size-3" />
            {t('booking.from', { city: homeCity })}
          </button>
        )}
        {t(usesTripCom(place) ? 'booking.noteTripCom' : 'booking.note')}
      </p>
    </div>
  )
}
