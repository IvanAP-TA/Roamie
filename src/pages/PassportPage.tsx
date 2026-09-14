import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Globe2, Luggage, MapPin, Stamp, Star, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { usePassport, type PassportStamp } from '@/hooks/usePassport'
import { useSeo } from '@/hooks/useSeo'
import { Logo } from '@/components/brand/Logo'
import { averageRating } from '@/components/destinations/RatingSection'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageTransition } from '@/components/layout/PageTransition'
import { TripMap } from '@/components/map/TripMap'
import { CoverImage } from '@/components/media/CoverImage'
import { Button } from '@/components/ui/button'
import { Chip, EmptyState, Skeleton } from '@/components/ui/misc'
import { flagEmoji as flagOf } from '@/lib/flags'

export default function PassportPage() {
  const { t, i18n } = useTranslation()
  const lang = i18n.resolvedLanguage ?? 'en'
  const navigate = useNavigate()
  const { data: stamps, isLoading } = usePassport()
  const [tripFilter, setTripFilter] = useState<string | null>(null)
  useSeo('app')

  const regionNames = useMemo(() => {
    try {
      return new Intl.DisplayNames([lang], { type: 'region' })
    } catch {
      return null
    }
  }, [lang])
  const rating = new Intl.NumberFormat(lang, { maximumFractionDigits: 1 })
  const visitDate = new Intl.DateTimeFormat(lang, { month: 'short', year: 'numeric' })

  const trips = useMemo(() => {
    const byId = new Map<string, string>()
    for (const s of stamps ?? []) if (s.trip) byId.set(s.trip.id, s.trip.name)
    return [...byId].map(([id, name]) => ({ id, name }))
  }, [stamps])

  const visible = useMemo(() => (stamps ?? []).filter((s) => !tripFilter || s.trip_id === tripFilter), [stamps, tripFilter])

  const countryName = (s: Pick<PassportStamp, 'country_code' | 'country'>) =>
    (s.country_code && regionNames?.of(s.country_code)) || s.country || s.country_code || ''

  // Grouped by ISO code when known, otherwise by the typed country name.
  const countries = useMemo(() => {
    const map = new Map<string, { code: string | null; name: string; count: number }>()
    for (const s of visible) {
      const key = s.country_code ?? s.country?.trim().toLowerCase()
      if (!key) continue
      const entry = map.get(key)
      if (entry) entry.count++
      else map.set(key, { code: s.country_code, name: countryName(s), count: 1 })
    }
    return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, lang))
  }, [visible, regionNames, lang])

  const tiles: { label: string; value: number; icon: LucideIcon }[] = [
    { label: t('passport.statCountries', { count: countries.length }), value: countries.length, icon: Globe2 },
    { label: t('passport.statPlaces', { count: visible.length }), value: visible.length, icon: MapPin },
    { label: t('passport.statTrips', { count: new Set(visible.map((s) => s.trip_id)).size }), value: new Set(visible.map((s) => s.trip_id)).size, icon: Luggage },
  ]

  const openStamp = (id: string) => {
    const stamp = visible.find((s) => s.id === id)
    if (stamp) navigate(`/trips/${stamp.trip_id}?d=${stamp.id}`)
  }

  return (
    <>
      <AppHeader left={<Logo to="/trips" />} />
      <PageTransition className="mx-auto max-w-5xl space-y-8 px-5 pt-2 md:px-6">
        <header>
          <p className="text-sm font-medium text-muted-foreground">{t('passport.eyebrow')}</p>
          <h1 className="mt-1 text-[2.6rem] leading-none md:text-6xl">{t('passport.title')}</h1>
        </header>

        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-24 rounded-[1.5rem]" />
            <Skeleton className="h-72 rounded-[2rem]" />
          </div>
        )}

        {stamps && stamps.length === 0 && (
          <EmptyState seed="passport" icon={<Stamp />} title={t('passport.emptyTitle')} body={t('passport.emptyBody')}>
            <Button asChild size="lg">
              <Link to="/trips">{t('passport.goTrips')}</Link>
            </Button>
          </EmptyState>
        )}

        {stamps && stamps.length > 0 && (
          <>
            {trips.length > 1 && (
              <div className="scrollbar-none -mx-5 flex gap-2 overflow-x-auto px-5 md:mx-0 md:px-0">
                <Chip size="sm" active={tripFilter === null} onClick={() => setTripFilter(null)}>
                  {t('passport.allTrips')}
                </Chip>
                {trips.map((trip) => (
                  <Chip key={trip.id} size="sm" active={tripFilter === trip.id} onClick={() => setTripFilter(tripFilter === trip.id ? null : trip.id)}>
                    {trip.name}
                  </Chip>
                ))}
              </div>
            )}

            <section className="grid grid-cols-3 gap-3">
              {tiles.map(({ label, value, icon: Icon }) => (
                <div key={label} className="glass rounded-[1.5rem] p-4">
                  <Icon className="size-4 text-primary" />
                  <p className="mt-2 font-sans text-3xl leading-none font-semibold md:text-4xl">{value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </section>

            <section aria-label={t('passport.map')} className="overflow-hidden rounded-[2rem] shadow-soft">
              <TripMap destinations={visible} onOpen={openStamp} className="h-72 w-full md:h-96" />
            </section>

            {countries.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-2xl">{t('passport.countries')}</h2>
                <ul className="flex flex-wrap gap-2">
                  {countries.map((c) => (
                    <li key={c.code ?? c.name} className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium">
                      {c.code && (
                        <span aria-hidden className="text-base leading-none">
                          {flagOf(c.code)}
                        </span>
                      )}
                      {c.name}
                      <span className="text-muted-foreground tabular-nums">{c.count}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="space-y-3">
              <h2 className="text-2xl">{t('passport.stamps')}</h2>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((s) => {
                  const average = averageRating(s)
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => openStamp(s.id)}
                        className="group flex w-full items-center gap-3 rounded-[1.75rem] bg-paper p-3 text-left shadow-soft transition-shadow hover:shadow-lift"
                      >
                        <CoverImage url={s.image_url} seed={s.name} pin showAttribution={false} className="size-20 shrink-0 rounded-[1.25rem]" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-display text-xl leading-tight">{s.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {s.country_code && <span aria-hidden>{flagOf(s.country_code)} </span>}
                            {[countryName(s), s.trip?.name].filter(Boolean).join(' · ')}
                          </span>
                          <span className="mt-1.5 flex items-center gap-2 text-xs">
                            {average != null ? (
                              <span className="inline-flex items-center gap-0.5 font-semibold">
                                <Star className="size-3.5 fill-sun text-sun" />
                                {rating.format(average)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">{t('passport.notRated')}</span>
                            )}
                            {s.visited_at && <span className="text-muted-foreground">{visitDate.format(new Date(s.visited_at))}</span>}
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          </>
        )}
      </PageTransition>
    </>
  )
}
