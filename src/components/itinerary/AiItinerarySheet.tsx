import { useState } from 'react'
import { CalendarDays, Loader2, Minus, Plus, RotateCcw, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { GoogleButton } from '@/components/auth/GoogleButton'
import { AiErrorNote, PlanSkeleton, PlanView } from '@/components/explore/PlanView'
import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/misc'
import { Sheet } from '@/components/ui/sheet'
import { useAuth } from '@/hooks/useAuth'
import { useDestinations } from '@/hooks/useDestinations'
import { MAX_DAYS, PACES, useAddItinerary, usePlaceItinerary, type Itinerary } from '@/hooks/useTripIdeas'
import { useTripContext } from '@/hooks/useTripContext'
import { totalPoints } from '@/lib/roulette'
import type { Destination } from '@/lib/types'

const DAY = 86_400_000

/**
 * The places the plan can be for: the one picked last first, then the proposals by points, then the visited ones.
 * At most six, so the choice stays one glance.
 */
function candidates(destinations: Destination[]): Destination[] {
  const selected = destinations.filter((d) => d.status === 'selected').sort((a, b) => (b.selected_at ?? '').localeCompare(a.selected_at ?? ''))
  const proposed = destinations.filter((d) => d.status === 'proposed').sort((a, b) => totalPoints(b) - totalPoints(a))
  const visited = destinations.filter((d) => d.status === 'visited')
  return [...selected, ...proposed, ...visited].slice(0, 6)
}

/** The trip's fixed dates as a number of days (within what the AI writes in one go), or null. */
function tripDays(start: string | null, end: string | null): number | null {
  if (!start || !end) return null
  const days = Math.round((new Date(`${end}T12:00:00`).getTime() - new Date(`${start}T12:00:00`).getTime()) / DAY) + 1
  return days >= 1 ? Math.min(MAX_DAYS, days) : null
}

/**
 * "Create with AI" in the Plan tab: the same day-by-day itinerary as the globe's trip finder, for one of the trip's
 * own places. The plan is shown first and added after the days already there only when the group asks.
 */
export function AiItinerarySheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation()
  const { session, isGuest } = useAuth()
  const { trip } = useTripContext()
  const { data: destinations } = useDestinations(trip.id)
  const places = candidates(destinations ?? [])
  const [placeId, setPlaceId] = useState<string | null>(null)
  const place = places.find((d) => d.id === placeId) ?? places[0] ?? null
  const [days, setDays] = useState(() => tripDays(trip.start_date, trip.end_date) ?? 3)
  const [pace, setPace] = useState<(typeof PACES)[number] | null>(null)
  const [plan, setPlan] = useState<Itinerary | null>(null)
  const itinerary = usePlaceItinerary()
  const add = useAddItinerary()

  // Any change of choice after a plan means a new plan.
  const choose = (apply: () => void) => {
    apply()
    setPlan(null)
    itinerary.reset()
  }

  const make = () => {
    if (!place) return
    itinerary.mutate(
      {
        place: { name: place.name, country: place.country },
        days,
        criteria: { moods: place.mood.slice(0, 3), budget: place.budget_level ?? null, month: trip.start_date ? Number(trip.start_date.slice(5, 7)) : null, pace },
      },
      { onSuccess: setPlan },
    )
  }

  const save = () => {
    if (!plan || !place) return
    add.mutate(
      { tripId: trip.id, itinerary: plan, near: place.lat != null && place.lng != null ? { lat: place.lat, lng: place.lng } : null },
      {
        onSuccess: () => {
          toast.success(t('aiPlan.added', { count: plan.days.length, place: place.name }))
          onOpenChange(false)
          setPlan(null)
          itinerary.reset()
        },
        onError: () => toast.error(t('errors.generic')),
      },
    )
  }

  // The AI needs a Google account (the Edge Function refuses guests).
  if (!session || isGuest) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange} title={t('aiPlan.title')}>
        <div className="space-y-4 pb-2">
          <p className="text-sm text-muted-foreground">{t(isGuest ? 'tripFinder.guest' : 'aiPlan.signIn')}</p>
          <GoogleButton link={isGuest} next={`/trips/${trip.id}/itinerary`} label={isGuest ? t('guest.link') : undefined} />
        </div>
      </Sheet>
    )
  }

  const busy = itinerary.isPending || add.isPending
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t('aiPlan.title')}
      description={plan ? undefined : t('aiPlan.intro')}
      footer={
        place ? (
          <div className="space-y-2 pb-3">
            {itinerary.isError && <AiErrorNote error={itinerary.error} />}
            {plan ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button className="flex-1" disabled={busy} onClick={save}>
                  {add.isPending ? <Loader2 className="animate-spin" /> : <Plus />}
                  {t('aiPlan.add', { count: plan.days.length })}
                </Button>
                <Button variant="outline" className="flex-1" disabled={busy} onClick={() => choose(() => {})}>
                  <RotateCcw />
                  {t('tripFinder.change')}
                </Button>
              </div>
            ) : (
              <Button className="w-full" disabled={busy} onClick={make}>
                {itinerary.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />}
                {itinerary.isPending ? t('tripFinder.planning') : t('tripFinder.makePlan')}
              </Button>
            )}
          </div>
        ) : undefined
      }
    >
      {!place ? (
        <p className="pb-4 text-sm text-muted-foreground">{t('aiPlan.noPlaces')}</p>
      ) : plan ? (
        <div className="space-y-3 pb-2">
          <PlanView plan={plan} />
          <p className="text-[0.7rem] text-muted-foreground">{t('tripFinder.planNote')}</p>
        </div>
      ) : itinerary.isPending ? (
        <PlanSkeleton />
      ) : (
        <div className="space-y-5 pb-2">
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">{t('aiPlan.where')}</h3>
            <div className="flex flex-wrap gap-2">
              {places.map((d) => (
                <Chip key={d.id} size="sm" active={d.id === place.id} onClick={() => choose(() => setPlaceId(d.id))}>
                  {d.name}
                </Chip>
              ))}
            </div>
          </section>
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-foreground/[0.04] p-3">
            <span className="flex items-center gap-2 text-sm font-medium">
              <CalendarDays className="size-4 text-primary" />
              {t('tripFinder.days', { count: days })}
            </span>
            <span className="flex items-center gap-1">
              <Button variant="glass" size="icon-sm" aria-label={t('tripFinder.fewerDays')} disabled={days <= 1} onClick={() => choose(() => setDays(days - 1))}>
                <Minus />
              </Button>
              <Button variant="glass" size="icon-sm" aria-label={t('tripFinder.moreDays')} disabled={days >= MAX_DAYS} onClick={() => choose(() => setDays(days + 1))}>
                <Plus />
              </Button>
            </span>
          </div>
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">{t('tripFinder.sections.pace')}</h3>
            <div className="flex flex-wrap gap-2">
              <Chip size="sm" active={pace === null} onClick={() => choose(() => setPace(null))}>
                {t('tripFinder.any')}
              </Chip>
              {PACES.map((p) => (
                <Chip key={p} size="sm" active={pace === p} onClick={() => choose(() => setPace(p))}>
                  {t(`tripFinder.paces.${p}`)}
                </Chip>
              ))}
            </div>
          </section>
          <p className="text-xs text-muted-foreground">{t('aiPlan.privacy')}</p>
        </div>
      )}
    </Sheet>
  )
}
