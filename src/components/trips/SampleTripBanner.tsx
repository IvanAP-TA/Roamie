import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, Plus, Sparkles, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { useDestinations } from '@/hooks/useDestinations'
import { useBringInFriend } from '@/hooks/useDemoFriend'
import { isSampleTrip } from '@/hooks/useAddGuidePlace'
import { useTripContext } from '@/hooks/useTripContext'
import { useDeleteTrip } from '@/hooks/useTrips'
import { pointsLeft } from '@/lib/roulette'
import { POINTS_BUDGET } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

/**
 * On the sample trip: three things to try, ticked off as they happen (give your points, bring in a demo friend, spin the
 * wheel), and the way to a real trip (or out of the sample).
 */
export function SampleTripBanner({ onVote }: { onVote: () => void }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { trip, isOwner } = useTripContext()
  const { data: destinations } = useDestinations(trip.id)
  const friend = useBringInFriend()
  const navigate = useNavigate()
  const deleteTrip = useDeleteTrip()
  const [confirming, setConfirming] = useState(false)

  if (!isOwner || !(trip.is_sample || isSampleTrip(trip.id))) return null

  const steps = [
    { key: 'points', done: Boolean(user) && pointsLeft(destinations ?? [], user!.id) < POINTS_BUDGET },
    { key: 'friend', done: friend.arrived },
    { key: 'wheel', done: Boolean(destinations?.some((d) => d.status !== 'proposed')) },
  ] as const
  const current = steps.findIndex((s) => !s.done)

  return (
    <section className="glass-strong rounded-[2rem] p-5">
      <p className="flex items-center gap-2 font-semibold">
        <Sparkles className="size-4 text-primary" />
        {t('sample.bannerTitle')}
      </p>
      <ol className="mt-3 space-y-2">
        {steps.map((step, i) => (
          <li key={step.key} className={cn('flex items-center gap-3', current !== -1 && i > current && 'opacity-60')}>
            <span
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                step.done ? 'bg-sage text-white' : i === current ? 'bg-primary text-primary-foreground' : 'bg-foreground/10',
              )}
            >
              {step.done ? <Check className="size-4" strokeWidth={3} /> : i + 1}
            </span>
            <span className={cn('min-w-0 flex-1', step.done && 'text-muted-foreground line-through decoration-1')}>{t(`sample.steps.${step.key}`)}</span>
            {i === current && step.key === 'points' && (
              <Button size="sm" onClick={onVote}>
                {t('sample.do.points')}
              </Button>
            )}
            {i === current && step.key === 'friend' && friend.available && (
              <Button size="sm" onClick={() => void friend.bringIn()} disabled={friend.busy}>
                {t('sample.do.friend')}
              </Button>
            )}
            {i === current && step.key === 'wheel' && (
              <Button asChild size="sm">
                <Link to={`/trips/${trip.id}/roulette`}>{t('sample.do.wheel')}</Link>
              </Button>
            )}
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => navigate('/trips?new=1')}>
          <Plus />
          {t('sample.createOwn')}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>
          <Trash2 />
          {t('sample.delete')}
        </Button>
      </div>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t('sample.deleteTitle')}
        description={t('sample.deleteBody')}
        confirmLabel={t('sample.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        icon={<Trash2 />}
        onConfirm={async () => {
          try {
            await deleteTrip.mutateAsync(trip.id)
            navigate('/trips', { replace: true })
          } catch {
            toast.error(t('errors.generic'))
          }
        }}
      />
    </section>
  )
}
