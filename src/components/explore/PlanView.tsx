import { Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Itinerary } from '@/hooks/useTripIdeas'
import { aiErrorCode } from '@/lib/ai'
import { Skeleton } from '@/components/ui/misc'

// The AI itinerary's pieces, shared by the globe's "Trova la meta" (TripFinder) and the Plan tab (AiItinerarySheet).

/** An AI itinerary, day by day, before it's saved. */
export function PlanView({ plan }: { plan: Itinerary }) {
  const { t } = useTranslation()
  return (
    <ol className="space-y-4">
      {plan.days.map((day, i) => (
        <li key={i} className="rounded-[1.5rem] bg-foreground/[0.04] p-4">
          <p className="text-[0.7rem] font-bold tracking-wide text-primary uppercase">{t('tripFinder.day', { n: i + 1 })}</p>
          {day.title && <p className="font-display text-lg leading-tight">{day.title}</p>}
          <ul className="mt-2.5 space-y-2.5">
            {day.items.map((stop, j) => (
              <li key={j} className="flex gap-3 text-sm">
                <span className="w-11 shrink-0 pt-px text-xs font-semibold text-muted-foreground tabular-nums">{stop.time ?? '·'}</span>
                <span className="min-w-0">
                  <span className="block font-medium">{stop.title}</span>
                  {stop.description && <span className="block text-muted-foreground">{stop.description}</span>}
                </span>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  )
}

export function AiErrorNote({ error }: { error: unknown }) {
  const { t } = useTranslation()
  return (
    <p role="alert" className="rounded-2xl bg-destructive/10 px-3 py-2 text-sm">
      {t(`tripFinder.errors.${aiErrorCode(error)}`)}
    </p>
  )
}

export function PlanSkeleton() {
  const { t } = useTranslation()
  return (
    <div className="space-y-3" role="status">
      <p className="flex items-center gap-1.5 text-sm font-medium">
        <Sparkles className="size-4 animate-pulse text-primary" />
        {t('tripFinder.planning')}
      </p>
      <Skeleton className="h-36 rounded-[1.5rem]" />
      <Skeleton className="h-36 rounded-[1.5rem]" />
    </div>
  )
}
