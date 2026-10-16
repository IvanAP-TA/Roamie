import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { Coins, Lock, Minus, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { useDestinations, useSetPoints } from '@/hooks/useDestinations'
import { useTripContext } from '@/hooks/useTripContext'
import { keys } from '@/hooks/useTrips'
import { pointsLeft, totalPoints } from '@/lib/roulette'
import { votesHidden } from '@/lib/secretVoting'
import { rpcErrorCode } from '@/lib/supabase'
import { POINTS_BUDGET, type Destination } from '@/lib/types'
import { cn } from '@/lib/utils'
import { haptic } from '@/lib/haptics'

const SAVE_DELAY_MS = 450

/**
 * −/+ stepper for the member's points on a destination, with the destination's total in the middle.
 * Every tap updates the shared query cache at once, so all cards and the "points left" badge agree on
 * the budget; only the last value is sent, shortly after the last tap (or when the control unmounts).
 */
export function PointsControl({ destination, size = 'default', className }: { destination: Destination; size?: 'default' | 'lg'; className?: string }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const qc = useQueryClient()
  const setPoints = useSetPoints(destination.trip_id)
  const key = keys.destinations(destination.trip_id)
  const pending = useRef<{ value: number; timer: ReturnType<typeof setTimeout>; previous: Destination[] | undefined } | null>(null)

  const mine = destination.votes.find((v) => v.user_id === user?.id)?.points ?? 0
  const total = totalPoints(destination)
  // Which way the total rolls: up when it grows, down when it shrinks.
  const shown = useRef(total)
  const direction = total >= shown.current ? 1 : -1
  useEffect(() => {
    shown.current = total
  }, [total])
  const { trip } = useTripContext()
  const hidden = votesHidden(trip)
  const open = destination.status === 'proposed'
  const lg = size === 'lg'

  const writeCache = (value: number) =>
    qc.setQueryData<Destination[]>(key, (list) =>
      list?.map((d) => {
        if (d.id !== destination.id || !user) return d
        const existing = d.votes.find((v) => v.user_id === user.id)
        const others = d.votes.filter((v) => v.user_id !== user.id)
        return { ...d, votes: value > 0 ? [...others, { id: existing?.id ?? `optimistic-${d.id}`, user_id: user.id, points: value }] : others }
      }),
    )

  const commit = () => {
    const job = pending.current
    if (!job) return
    pending.current = null
    setPoints.mutate(
      { destinationId: destination.id, points: job.value },
      {
        onError: (err) => {
          qc.setQueryData(key, job.previous)
          toast.error(rpcErrorCode(err as Error) === 'points_budget_exceeded' ? t('points.noneLeft') : t('errors.voteFailed'))
        },
      },
    )
  }

  const change = (delta: 1 | -1) => (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!open || !user) return
    // Read the cache directly: taps can arrive faster than re-renders, and other cards may hold drafts.
    const list = qc.getQueryData<Destination[]>(key) ?? [destination]
    const current = list.find((d) => d.id === destination.id)?.votes.find((v) => v.user_id === user.id)?.points ?? 0
    if (delta > 0 && pointsLeft(list, user.id) <= 0) {
      toast(t('points.noneLeft'))
      return
    }
    const next = Math.min(POINTS_BUDGET, Math.max(0, current + delta))
    if (next === current) return
    haptic('tap')

    const previous = pending.current?.previous ?? list
    if (pending.current) clearTimeout(pending.current.timer)
    writeCache(next)
    pending.current = { value: next, previous, timer: setTimeout(commit, SAVE_DELAY_MS) }
  }

  // Don't lose a change when the card or sheet goes away before the save delay.
  useEffect(
    () => () => {
      if (!pending.current) return
      clearTimeout(pending.current.timer)
      commit()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return (
    <div
      className={cn('inline-flex items-center rounded-full border border-border bg-[var(--glass-strong)] p-0.5', lg && 'p-1', className)}
      onClick={(e) => e.stopPropagation()}
      // Keys pressed on the buttons inside must not reach the card around it either.
      onKeyDown={(e) => e.stopPropagation()}
    >
      <motion.button
        type="button"
        whileTap={{ scale: 0.8, y: 3 }}
        aria-label={t('points.remove')}
        disabled={!open || mine === 0}
        onClick={change(-1)}
        className={cn(
          'flex items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground disabled:opacity-35',
          lg ? 'size-11' : 'size-8',
        )}
      >
        <Minus className={lg ? 'size-5' : 'size-4'} />
      </motion.button>

      <span
        className={cn('flex flex-col items-center leading-none tabular-nums', lg ? 'w-16' : 'w-12')}
        title={hidden ? t('secret.hiddenTotal') : t('points.score', { count: total })}
      >
        {hidden ? (
          // Secret vote: the total would include only this member's points, so it isn't shown.
          <Lock className={cn('text-muted-foreground', lg ? 'size-[1.125rem]' : 'size-3.5')} aria-label={t('secret.hiddenTotal')} />
        ) : (
          <span className="relative overflow-hidden">
            <AnimatePresence mode="popLayout" initial={false} custom={direction}>
              <motion.span
                key={total}
                custom={direction}
                variants={{
                  enter: (dir: number) => ({ y: 10 * dir, opacity: 0 }),
                  center: { y: 0, opacity: 1 },
                  leave: (dir: number) => ({ y: -10 * dir, opacity: 0 }),
                }}
                initial="enter"
                animate="center"
                exit="leave"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className={cn('block font-semibold', lg ? 'text-lg' : 'text-sm', total > 0 && 'text-primary')}
              >
                {total}
              </motion.span>
            </AnimatePresence>
          </span>
        )}
        <span className={cn('mt-0.5 block font-medium whitespace-nowrap', lg ? 'text-xs' : 'text-[0.6rem]', mine > 0 ? 'text-foreground' : 'text-muted-foreground')}>
          {t('points.mine', { count: mine })}
        </span>
      </span>

      <motion.button
        type="button"
        whileTap={{ scale: 0.8, y: -3 }}
        aria-label={t('points.add')}
        disabled={!open}
        onClick={change(1)}
        className={cn(
          'flex items-center justify-center rounded-full transition-colors disabled:opacity-35',
          lg ? 'size-11' : 'size-8',
          mine > 0 ? 'bg-[linear-gradient(135deg,var(--coral),var(--primary))] text-white shadow-glow' : 'text-muted-foreground hover:text-primary',
        )}
      >
        <Plus className={lg ? 'size-5' : 'size-4'} />
      </motion.button>
    </div>
  )
}

/** "You have N points left out of 10" for the current trip. */
export function PointsLeftBadge({ tripId, className }: { tripId: string; className?: string }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { data: destinations } = useDestinations(tripId)
  const left = Math.max(0, pointsLeft(destinations ?? [], user?.id))

  return (
    <p className={cn('inline-flex items-center gap-1.5 rounded-full bg-foreground/[0.05] px-3 py-1.5 text-xs text-muted-foreground', className)} title={t('points.hint')}>
      <Coins className={cn('size-3.5', left > 0 ? 'text-primary' : 'text-muted-foreground')} />
      <span className={cn('font-semibold', left > 0 && 'text-foreground')}>{t('points.left', { count: left })}</span>
    </p>
  )
}
