import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MapPinOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useDestinations } from '@/hooks/useDestinations'
import { useTripContext } from '@/hooks/useTripContext'
import { PageTransition } from '@/components/layout/PageTransition'
import { TripMap } from '@/components/map/TripMap'
import { Skeleton } from '@/components/ui/misc'

export default function MapTab() {
  const { t } = useTranslation()
  const { trip } = useTripContext()
  const { data: destinations, isLoading } = useDestinations(trip.id)
  const [, setParams] = useSearchParams()

  const open = (id: string) =>
    setParams((p) => {
      p.set('d', id)
      return p
    })

  const unpinned = useMemo(() => destinations?.filter((d) => d.lat == null || d.lng == null) ?? [], [destinations])
  const pinnedCount = (destinations?.length ?? 0) - unpinned.length

  return (
    <PageTransition className="mx-auto max-w-5xl px-3 md:px-6">
      <header className="mb-3 flex items-end justify-between px-2">
        <div>
          <p className="truncate text-sm font-medium text-muted-foreground">{trip.name}</p>
          <h1 className="text-[2.6rem] leading-none md:text-5xl">{t('map.title')}</h1>
        </div>
        <p className="pb-1 text-sm text-muted-foreground">{t('map.pinned', { count: pinnedCount })}</p>
      </header>

      <div className="relative overflow-hidden rounded-[2rem] shadow-soft">
        {isLoading ? (
          <Skeleton className="h-[calc(100dvh-15rem)] min-h-80 rounded-[2rem]" />
        ) : (
          <TripMap destinations={destinations ?? []} onOpen={open} className="h-[calc(100dvh-15rem)] min-h-80 w-full" />
        )}
        <div className="pointer-events-none absolute top-3 left-3 z-[400] flex gap-1.5">
          {(['proposed', 'selected', 'visited'] as const).map((s) => (
            <span key={s} className="glass-strong inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.68rem] font-semibold">
              <span
                className="size-2.5 rounded-full ring-1 ring-foreground/20"
                style={{ background: s === 'proposed' ? '#fff' : s === 'selected' ? 'var(--sun)' : 'var(--sage)' }}
              />
              {t(`status.${s}`)}
            </span>
          ))}
        </div>
      </div>

      {unpinned.length > 0 && (
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
