import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from 'framer-motion'
import { ArrowLeft, ArrowRight, ChevronRight, Coins, Layers, RotateCcw, ThumbsUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { CoverImage } from '@/components/media/CoverImage'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'
import { haptic } from '@/lib/haptics'
import { useOrigin } from '@/lib/origin'
import { sortReasons } from '@/lib/reasons'
import { pointsLeft } from '@/lib/roulette'
import { estimatedBudgetLevel } from '@/lib/tripCost'
import type { Destination } from '@/lib/types'
import { cn } from '@/lib/utils'
import { BudgetIndicator, MoodTag } from './moods'
import { PointsControl, PointsLeftBadge } from './PointsControl'

/** How far (px) or how fast (px/s) a drag must go to move to the next or previous card. */
const SWIPE_DISTANCE = 80
const SWIPE_SPEED = 400

/**
 * The points left, and the way into the deck: one pill where the "points left" badge used to be, so the toolbar
 * doesn't grow a new button.
 */
export function VoteDeckButton({ tripId, onOpen, className }: { tripId: string; onOpen: () => void; className?: string }) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={onOpen}
      title={t('points.hint')}
      className={cn(
        'group inline-flex items-center gap-1.5 rounded-full bg-foreground/[0.05] py-1.5 pr-2 pl-3 text-xs text-muted-foreground transition hover:bg-foreground/[0.09] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        className,
      )}
    >
      <PointsLeftBadge tripId={tripId} short className="bg-transparent p-0" />
      <span aria-hidden className="size-1 rounded-full bg-foreground/25" />
      <Layers className="size-3.5 text-primary" />
      <span className="font-semibold text-foreground">{t('deck.open')}</span>
      <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
    </button>
  )
}

/** One proposal, big: photo, name, country, budget, moods, the best reason, and the points stepper. */
function DeckCard({ destination: d }: { destination: Destination }) {
  const { t } = useTranslation()
  const [origin] = useOrigin()
  const budget = estimatedBudgetLevel(d, origin)
  const topReason = d.reasons?.length ? sortReasons(d.reasons, false)[0] : null
  return (
    <div className="overflow-hidden rounded-[2rem] bg-paper shadow-lift">
      <CoverImage url={d.image_url} attribution={d.image_attribution} seed={d.name} pin sizes="(min-width: 768px) 460px, 100vw" className="h-64 min-[400px]:h-72" attributionClassName="top-3 right-3 bottom-auto">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_40%,rgb(20_10_5/0.65))]" />
        <div className="absolute inset-x-5 bottom-4 text-white">
          <h3 className="text-[2rem] leading-tight drop-shadow-md [overflow-wrap:anywhere]">{d.name}</h3>
          <div className="flex items-center gap-2 text-sm text-white/85">
            {d.country && <span className="truncate">{d.country}</span>}
            {budget && (
              <>
                <span className="size-1 rounded-full bg-white/60" />
                <BudgetIndicator level={budget} className="[&_span_span]:!text-white [&_.text-foreground\/20]:!text-white/35" />
              </>
            )}
          </div>
        </div>
      </CoverImage>
      <div className="space-y-4 p-5">
        {d.mood.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {d.mood.slice(0, 3).map((m) => (
              <MoodTag key={m} mood={m} />
            ))}
          </div>
        )}
        <p className={cn('flex items-start gap-2 text-sm', !topReason && 'text-muted-foreground')}>
          <ThumbsUp className={cn('mt-0.5 size-3.5 shrink-0', topReason && 'text-primary')} />
          <span className="line-clamp-2">{topReason ? topReason.text : t('reasons.cardEmpty')}</span>
        </p>
        <div className="flex justify-center">
          <PointsControl destination={d} size="lg" />
        </div>
      </div>
    </div>
  )
}

/** The end of the deck: where your points went, and what's left. */
function Summary({ destinations, onAgain, onClose }: { destinations: Destination[]; onAgain: () => void; onClose: () => void }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const given = destinations
    .map((d) => ({ d, points: d.votes.find((v) => v.user_id === user?.id)?.points ?? 0 }))
    .filter((x) => x.points > 0)
    .sort((a, b) => b.points - a.points)
  const left = Math.max(0, pointsLeft(destinations, user?.id))
  return (
    <div className="space-y-5 py-2">
      <h3 className="font-display text-2xl">{t('deck.summaryTitle')}</h3>
      {given.length ? (
        <ul className="space-y-2">
          {given.map(({ d, points }) => (
            <li key={d.id} className="flex items-center justify-between gap-3 rounded-2xl bg-foreground/[0.04] px-4 py-3">
              <span className="min-w-0 truncate font-medium">{d.name}</span>
              <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary tabular-nums">
                <Coins className="size-3.5" />
                {t('points.score', { count: points })}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{t('deck.summaryEmpty')}</p>
      )}
      {left > 0 && <p className="text-sm text-muted-foreground">{t('points.left', { count: left })}</p>}
      <div className="flex flex-wrap gap-2">
        <Button onClick={onClose}>{t('deck.close')}</Button>
        <Button variant="glass" onClick={onAgain}>
          <RotateCcw />
          {t('deck.again')}
        </Button>
      </div>
    </div>
  )
}

/**
 * The second way to vote: the proposals one at a time, big, to swipe through (or the arrows, or the keyboard's ← →),
 * giving points on each with the same stepper as the list. `ids` is the order when the deck was opened, so votes
 * arriving meanwhile don't reshuffle it; the cards themselves stay live.
 */
export function VoteDeck({ open, onOpenChange, ids, destinations }: { open: boolean; onOpenChange: (open: boolean) => void; ids: string[]; destinations: Destination[] }) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const cards = ids.map((id) => destinations.find((d) => d.id === id)).filter((d): d is Destination => Boolean(d) && d!.status === 'proposed')
  const [[index, direction], setPosition] = useState<[number, number]>([0, 1])
  const done = index >= cards.length

  // A new opening starts from the first card.
  const [openedWith, setOpenedWith] = useState(ids)
  if (openedWith !== ids) {
    setOpenedWith(ids)
    setPosition([0, 1])
  }

  const go = (step: 1 | -1) => {
    const next = Math.min(cards.length, Math.max(0, index + step))
    if (next === index) return
    haptic('tap')
    setPosition([next, step])
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -SWIPE_DISTANCE || info.velocity.x < -SWIPE_SPEED) go(1)
    else if (info.offset.x > SWIPE_DISTANCE || info.velocity.x > SWIPE_SPEED) go(-1)
  }

  const card = cards[index]
  const shift = reduced ? 0 : 320
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t('deck.title')}
      description={done ? undefined : t('deck.hint')}
      footer={
        done ? undefined : (
          <div className="flex items-center justify-between gap-2 pb-3">
            <Button variant="ghost" onClick={() => go(-1)} disabled={index === 0}>
              <ArrowLeft />
              {t('deck.back')}
            </Button>
            <span className="text-sm font-medium text-muted-foreground tabular-nums" aria-live="polite">
              {t('deck.progress', { current: index + 1, total: cards.length })}
            </span>
            <Button onClick={() => go(1)}>
              {index === cards.length - 1 ? t('deck.finish') : t('deck.next')}
              <ArrowRight />
            </Button>
          </div>
        )
      }
    >
      {done ? (
        <Summary destinations={destinations} onAgain={() => setPosition([0, -1])} onClose={() => onOpenChange(false)} />
      ) : (
        <div className="relative overflow-x-clip pb-1">
          {card && (
            <div className="mb-3 flex justify-center">
              <PointsLeftBadge tripId={card.trip_id} />
            </div>
          )}
          <AnimatePresence mode="popLayout" initial={false} custom={direction}>
            {card && (
              <motion.div
                key={card.id}
                custom={direction}
                variants={{
                  enter: (dir: number) => ({ x: dir * shift, opacity: 0, rotate: reduced ? 0 : dir * 4 }),
                  center: { x: 0, opacity: 1, rotate: 0 },
                  leave: (dir: number) => ({ x: -dir * shift, opacity: 0, rotate: reduced ? 0 : -dir * 4 }),
                }}
                initial="enter"
                animate="center"
                exit="leave"
                transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.7}
                dragSnapToOrigin
                onDragEnd={onDragEnd}
                className="touch-pan-y"
              >
                <DeckCard destination={card} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </Sheet>
  )
}
