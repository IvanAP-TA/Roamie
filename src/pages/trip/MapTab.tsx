import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MapPinOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useDestinations } from '@/hooks/useDestinations'
import { useItinerary } from '@/hooks/useItinerary'
import { useTripContext } from '@/hooks/useTripContext'
import { PageTransition } from '@/components/layout/PageTransition'
import { StopsMap, dayColor, isLocated } from '@/components/map/StopsMap'
import { TripMap } from '@/components/map/TripMap'
import { Skeleton } from '@/components/ui/misc'
import { cn } from '@/lib/utils'

type Layer = 'destinations' | 'stops'

export default function MapTab() {
  const { t } = useTranslation()
  const { trip } = useTripContext()
  const { data: destinations, isLoading } = useDestinations(trip.id)
  const { data: days, isLoading: daysLoading } = useItinerary(trip.id)
  const [params, setParams] = useSearchParams()
  const layer: Layer = params.get('layer') === 'stops' ? 'stops' : 'destinations'

  const setLayer = (next: Layer) =>
    setParams(
      (p) => {
        if (next === 'stops') p.set('layer', 'stops')
        else p.delete('layer')
        return p
      },
      { replace: true },
    )

  const open = (id: string) =>
    setParams((p) => {
      p.set('d', id)
      return p
    })

  const unpinned = useMemo(() => destinations?.filter((d) => d.lat == null || d.lng == null) ?? [], [destinations])
  const pinnedCount = (destinations?.length ?? 0) - unpinned.length
  const locatedDays = useMemo(
    () => (days ?? []).map((day, index) => ({ day, index, stops: day.itinerary_items.filter(isLocated).length })).filter((d) => d.stops > 0),
    [days],
  )
  const stopCount = locatedDays.reduce((sum, d) => sum + d.stops, 0)
  const loading = layer === 'stops' ? daysLoading : isLoading
  const mapClass = 'h-[calc(100dvh-17rem)] min-h-80 w-full'

  return (
    <PageTransition className="mx-auto max-w-5xl px-3 md:px-6">
      <header className="mb-3 flex flex-wrap items-end justify-between gap-3 px-2">
        <div>
          <p className="hidden truncate text-sm font-medium text-muted-foreground md:block">{trip.name}</p>
          <h1 className="text-[2.3rem] leading-none md:text-5xl">{t('map.title')}</h1>
        </div>
        <div role="tablist" aria-label={t('map.title')} className="glass flex gap-1 rounded-full p-1">
          {(['destinations', 'stops'] as const).map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={layer === id}
              onClick={() => setLayer(id)}
              className={cn(
                'relative min-h-9 rounded-full px-4 text-sm font-semibold transition-colors',
                layer === id ? 'text-background' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {layer === id && (
                <motion.span layoutId="map-layer-pill" className="absolute inset-0 rounded-full bg-foreground" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />
              )}
              <span className="relative">{t(id === 'stops' ? 'stops.layerStops' : 'stops.layerDestinations')}</span>
            </button>
          ))}
        </div>
      </header>
      <p className="mb-3 px-2 text-sm text-muted-foreground">
        {layer === 'stops' ? t('stops.onMapCount', { count: stopCount }) : t('map.pinned', { count: pinnedCount })}
      </p>

      <div className="relative overflow-hidden rounded-[2rem] shadow-soft">
        {loading ? (
          <Skeleton className={cn(mapClass, 'rounded-[2rem]')} />
        ) : layer === 'stops' ? (
          <StopsMap days={days ?? []} className={mapClass} />
        ) : (
          <TripMap destinations={destinations ?? []} onOpen={open} className={mapClass} />
        )}
        <div className="pointer-events-none absolute top-3 left-3 z-[400] flex max-w-[calc(100%-1.5rem)] flex-wrap gap-1.5">
          {layer === 'destinations'
            ? (['proposed', 'selected', 'visited'] as const).map((s) => (
                <span key={s} className="glass-strong inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.68rem] font-semibold">
                  <span
                    className="size-2.5 rounded-full ring-1 ring-foreground/20"
                    style={{ background: s === 'proposed' ? '#fff' : s === 'selected' ? 'var(--sun)' : 'var(--sage)' }}
                  />
                  {t(`status.${s}`)}
                </span>
              ))
            : locatedDays.map(({ day, index }) => (
                <span key={day.id} className="glass-strong inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.68rem] font-semibold">
                  <span className="size-2.5 rounded-full" style={{ background: dayColor(index) }} />
                  {t('itinerary.day', { n: day.day_number })}
                </span>
              ))}
        </div>
      </div>

      {layer === 'stops' && !loading && stopCount === 0 && <p className="mt-4 px-2 text-sm text-muted-foreground">{t('stops.noStops')}</p>}

      {layer === 'destinations' && unpinned.length > 0 && (
        <section className="mt-5 px-2">
          <h2 className="mb-2 inline-flex items-center gap-2 font-sans text-sm font-semibold text-muted-foreground">
            <MapPinOff className="size-4" />
            {t('map.unpinned', { count: unpinned.length })}
          </h2>
          <div className="flex flex-wrap gap-2">
            {unpinned.map((d) => (
              <button key={d.id} type="button" onClick={() => open(d.id)} className="glass rounded-full px-3.5 py-1.5 text-sm font-medium transition active:scale-95">
                {d.name}
              </button>
            ))}
          </div>
        </section>
      )}
    </PageTransition>
  )
}
