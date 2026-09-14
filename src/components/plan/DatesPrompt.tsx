import { Link } from 'react-router-dom'
import { CalendarDays, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useTripContext } from '@/hooks/useTripContext'

/** On the trip home until the dates are fixed: a way into the Dates view, which otherwise sits inside the plan. */
export function DatesPrompt() {
  const { t } = useTranslation()
  const { trip, canEdit } = useTripContext()
  const hasWindow = Boolean(trip.date_window_start && trip.date_window_end && trip.trip_length)

  // Viewers can't choose the period, so there's nothing for them to do until someone has.
  if (trip.start_date || (!hasWindow && !canEdit)) return null

  return (
    <Link
      to={`/trips/${trip.id}/itinerary?view=dates`}
      className="glass flex items-center gap-3 rounded-[1.75rem] p-4 transition hover:bg-foreground/[0.03]"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
        <CalendarDays className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{t('dates.promptTitle')}</span>
        <span className="block text-sm text-muted-foreground">{t(hasWindow ? 'dates.promptMark' : 'dates.promptSetup')}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  )
}
