import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Layers, MessagesSquare, Plus, UserPlus, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { isSampleTrip } from '@/hooks/useAddGuidePlace'
import { useTripContext } from '@/hooks/useTripContext'
import { Button } from '@/components/ui/button'
import { pointsLeft } from '@/lib/roulette'
import { POINTS_BUDGET, type Destination } from '@/lib/types'
import { cn } from '@/lib/utils'

const dismissedKey = (tripId: string) => `roamie.firstSteps.${tripId}`

/**
 * The first minute of a new trip, for whoever made it: the three things that turn a list into a group decision,
 * each ticked off by itself as it happens (someone joined, two places in, points given). It goes when all three are
 * done, or when it's closed; it never shows on the sample trip.
 */
export function FirstSteps({
  destinations,
  onPasteChat,
  onPropose,
  onVote,
}: {
  destinations: Destination[]
  onPasteChat: () => void
  onPropose: () => void
  onVote: () => void
}) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { trip, members, isOwner } = useTripContext()
  const [dismissed, setDismissed] = useState(() => {
    try {
      return Boolean(localStorage.getItem(dismissedKey(trip.id)))
    } catch {
      return false
    }
  })

  const proposed = destinations.filter((d) => d.status === 'proposed').length
  const steps = [
    { done: members.length >= 2, key: 'invite' },
    { done: proposed >= 2, key: 'places' },
    { done: Boolean(user) && pointsLeft(destinations, user!.id) < POINTS_BUDGET, key: 'vote' },
  ] as const
  if (!isOwner || dismissed || isSampleTrip(trip.id) || steps.every((s) => s.done) || destinations.some((d) => d.status !== 'proposed')) return null

  const close = () => {
    try {
      localStorage.setItem(dismissedKey(trip.id), '1')
    } catch {
      // nowhere to remember it: it just goes for now
    }
    setDismissed(true)
  }
  const current = steps.findIndex((s) => !s.done)

  return (
    <section aria-labelledby="first-steps" className="glass relative rounded-[1.75rem] p-5">
      <button type="button" onClick={close} aria-label={t('common.close')} className="absolute top-3 right-3 inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-foreground/5">
        <X className="size-4" />
      </button>
      <h2 id="first-steps" className="pr-8 text-xl leading-snug">
        {t('firstSteps.title')}
      </h2>
      <ol className="mt-4 space-y-3">
        {steps.map((step, i) => (
          <li key={step.key} className={cn('flex gap-3', i > current && 'opacity-60')}>
            <span
              className={cn(
                'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                step.done ? 'bg-sage text-white' : i === current ? 'bg-primary text-primary-foreground' : 'bg-foreground/10',
              )}
            >
              {step.done ? <Check className="size-4" strokeWidth={3} /> : i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className={cn('font-semibold', step.done && 'text-muted-foreground line-through decoration-1')}>{t(`firstSteps.${step.key}.title`)}</p>
              {i === current && (
                <>
                  <p className="mt-0.5 text-sm text-muted-foreground">{t(`firstSteps.${step.key}.body`)}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {step.key === 'invite' && (
                      <Button asChild size="sm">
                        <Link to={`/trips/${trip.id}/group`}>
                          <UserPlus />
                          {t('firstSteps.invite.cta')}
                        </Link>
                      </Button>
                    )}
                    {step.key === 'places' && (
                      <>
                        <Button size="sm" onClick={onPasteChat}>
                          <MessagesSquare />
                          {t('chatImport.title')}
                        </Button>
                        <Button size="sm" variant="glass" onClick={onPropose}>
                          <Plus />
                          {t('destination.add')}
                        </Button>
                      </>
                    )}
                    {step.key === 'vote' && (
                      <Button size="sm" onClick={onVote}>
                        <Layers />
                        {t('deck.open')}
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
