import { Flame } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useTrendingPlaces } from '@/hooks/useTrendingPlaces'
import { flagEmoji } from '@/lib/flags'
import { cn } from '@/lib/utils'
import { CoverImage } from '@/components/media/CoverImage'

/**
 * The places groups on Roamie propose and choose most, anonymous and aggregated (see refresh_trending_places in SQL).
 * Hidden until enough groups have proposed the same places.
 */
export function TrendingPlaces({ className }: { className?: string }) {
  const { t } = useTranslation()
  const { data: places } = useTrendingPlaces()
  if (!places?.length) return null

  return (
    <section className={cn('space-y-3', className)} aria-labelledby="trending-title">
      <div>
        <h2 id="trending-title" className="inline-flex items-center gap-2 text-2xl">
          <Flame className="size-5 text-primary" />
          {t('trending.title')}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('trending.subtitle')}</p>
      </div>
      <ol className="scrollbar-none -mx-5 flex snap-x gap-3 overflow-x-auto px-5 pt-1 pb-3 md:-mx-6 md:px-6">
        {places.map((place) => (
          <li key={place.rank} className="w-44 shrink-0 snap-start overflow-hidden rounded-[1.5rem] bg-paper shadow-soft">
            <CoverImage
              url={place.image_url}
              attribution={place.image_attribution}
              seed={place.name}
              pin
              sizes="176px"
              className="h-28"
              attributionClassName="right-1.5 bottom-1.5"
            >
              <span className="absolute top-2 left-2 rounded-full bg-[var(--glass-strong)] px-2 py-0.5 text-xs font-bold tabular-nums backdrop-blur-md">
                #{place.rank}
              </span>
            </CoverImage>
            <div className="p-3">
              <p className="truncate font-display text-lg leading-tight">{place.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                <span aria-hidden>{flagEmoji(place.country_code)} </span>
                {place.country}
              </p>
              <p className="mt-1.5 text-xs font-semibold text-primary">
                {place.chosen > 0 ? t('trending.chosen', { count: place.chosen }) : t('trending.proposed', { count: place.trips })}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
