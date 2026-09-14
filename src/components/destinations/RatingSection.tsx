import { useState } from 'react'
import { Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { useSetRating } from '@/hooks/useDestinations'
import { useTripContext } from '@/hooks/useTripContext'
import { UserAvatar } from '@/components/ui/avatar'
import type { Destination } from '@/lib/types'
import { cn } from '@/lib/utils'

export const averageRating = (d: Pick<Destination, 'reviews'>) =>
  d.reviews.length ? d.reviews.reduce((sum, r) => sum + r.rating, 0) / d.reviews.length : null

/** "How was it?" for a visited destination: the member's stars, the group average and everyone's rating. */
export function RatingSection({ destination: d, className }: { destination: Destination; className?: string }) {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const { members } = useTripContext()
  const setRating = useSetRating(d.trip_id)
  const [hover, setHover] = useState<number | null>(null)

  const mine = d.reviews.find((r) => r.user_id === user?.id)?.rating ?? 0
  const shown = hover ?? mine
  const average = averageRating(d)
  const format = new Intl.NumberFormat(i18n.resolvedLanguage, { maximumFractionDigits: 1 })

  // Tapping your current rating again removes it.
  const rate = (value: number) =>
    setRating.mutate({ destinationId: d.id, rating: value === mine ? 0 : value }, { onError: () => toast.error(t('errors.generic')) })

  return (
    <section className={cn('rounded-[1.5rem] bg-foreground/[0.03] p-4', className)} aria-labelledby="rating-title">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id="rating-title" className="font-sans text-xs font-bold tracking-wide text-primary uppercase">
          {t('review.title')}
        </h3>
        {average != null && (
          <span className="text-sm font-semibold">{t('review.average', { value: format.format(average), count: d.reviews.length })}</span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{t('review.prompt')}</p>

      <div role="radiogroup" aria-label={t('review.yours')} className="-ml-1.5 mt-1 flex" onPointerLeave={() => setHover(null)}>
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={mine === value}
            aria-label={t('review.stars', { count: value })}
            onPointerEnter={() => setHover(value)}
            onClick={() => rate(value)}
            className="flex size-11 items-center justify-center rounded-full transition active:scale-90"
          >
            <Star className={cn('size-7 transition-colors', value <= shown ? 'fill-sun text-sun' : 'text-foreground/25')} strokeWidth={1.8} />
          </button>
        ))}
      </div>

      {d.reviews.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {[...d.reviews]
            .sort((a, b) => b.rating - a.rating)
            .map((review) => {
              const profile = members.find((m) => m.user_id === review.user_id)?.profile ?? null
              return (
                <li key={review.id} className="inline-flex items-center gap-1 rounded-full bg-foreground/[0.05] py-0.5 pr-2.5 pl-0.5 text-xs">
                  <UserAvatar profile={profile} className="size-6 text-[0.55rem]" />
                  <span className="max-w-24 truncate">{profile?.display_name?.split(' ')[0] ?? t('group.formerMember')}</span>
                  <span className="inline-flex items-center gap-0.5 font-semibold">
                    <Star className="size-3 fill-sun text-sun" />
                    {review.rating}
                  </span>
                </li>
              )
            })}
        </ul>
      )}
    </section>
  )
}
