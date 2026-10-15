import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { Check, CheckCheck, MessageCircle, Sparkles, ThumbsUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { CoverImage } from '@/components/media/CoverImage'
import { UserAvatar } from '@/components/ui/avatar'
import { BudgetIndicator, MoodTag } from './moods'
import { PointsControl } from './PointsControl'
import { sortReasons } from '@/lib/reasons'
import { useOrigin } from '@/lib/origin'
import { estimatedBudgetLevel } from '@/lib/tripCost'
import type { Destination } from '@/lib/types'
import { cn } from '@/lib/utils'
import { staggerDelay } from '@/components/layout/PageTransition'

export const DestinationCard = forwardRef<
  HTMLElement,
  {
    destination: Destination
    onOpen: () => void
    /** Compare mode: tapping the card selects it instead of opening it. */
    selectable?: boolean
    selected?: boolean
    /** Position in the list: the cards rise in one after the other. */
    index?: number
  }
>(function DestinationCard({ destination: d, onOpen, selectable = false, selected = false, index = 0 }, ref) {
  const { t } = useTranslation()
  const comments = d.comments[0]?.count ?? 0
  const [origin] = useOrigin()
  const budget = estimatedBudgetLevel(d, origin)
  const reasons = d.reasons?.length ?? 0
  const topReason = reasons > 0 ? sortReasons(d.reasons, false)[0] : null

  return (
    <motion.article
      ref={ref}
      // Moves to its new place when the ranking changes; the entrance is a CSS animation (.stagger-item), which the
      // compositor plays instead of a spring stepped in JavaScript for every card.
      layout
      exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      whileHover={{ y: -4 }}
      style={staggerDelay(index)}
      className={cn(
        'stagger-item group overflow-hidden rounded-[2rem] bg-paper shadow-soft transition-shadow hover:shadow-lift',
        selected && 'ring-3 ring-primary ring-offset-2 ring-offset-[var(--background)]',
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-pressed={selectable ? selected : undefined}
        className="block w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <CoverImage
          url={d.image_url}
          attribution={d.image_attribution}
          seed={d.name}
          pin
          sizes="(min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw"
          className="h-56"
          imgClassName="transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-105"
          attributionClassName="top-3 right-3 bottom-auto"
          showAttribution={!selectable}
        >
          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgb(20_10_5/0.6))]" />
          {d.status !== 'proposed' && (
            <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-[var(--glass-strong)] px-2.5 py-1 text-[0.68rem] font-bold tracking-wide uppercase backdrop-blur-md">
              {d.status === 'selected' ? <Sparkles className="size-3.5 text-primary" /> : <CheckCheck className="size-3.5 text-sage" />}
              {t(`status.${d.status}`)}
            </span>
          )}
          {selectable && (
            <span
              aria-hidden
              className={cn(
                'absolute top-3 right-3 z-10 flex size-8 items-center justify-center rounded-full border-2 border-white/90 shadow-md backdrop-blur-md transition-colors',
                selected ? 'bg-primary text-primary-foreground' : 'bg-black/25',
              )}
            >
              {selected && <Check className="size-4" strokeWidth={3} />}
            </span>
          )}
          <div className="absolute inset-x-4 bottom-3.5 text-white">
            <h3 className="truncate text-[1.7rem] leading-tight drop-shadow-md">{d.name}</h3>
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
      </button>

      {/* Always one line, so cards in a row keep the same height whether or not they have reasons. */}
      {topReason ? (
        // Your own likes are the only ones counted during a secret vote, so this order gives nothing away.
        <button type="button" onClick={onOpen} className="flex w-full items-center gap-2 px-4 pt-3 text-left text-sm">
          <ThumbsUp className="size-3.5 shrink-0 text-primary" />
          <span className="min-w-0 flex-1 truncate">{topReason.text}</span>
          {reasons > 1 && <span className="shrink-0 text-xs text-muted-foreground">{t('reasons.more', { count: reasons - 1 })}</span>}
        </button>
      ) : d.status === 'proposed' ? (
        <button type="button" onClick={onOpen} className="flex w-full items-center gap-2 px-4 pt-3 text-left text-sm text-muted-foreground transition hover:text-foreground">
          <ThumbsUp className="size-3.5 shrink-0" />
          <span className="min-w-0 flex-1 truncate">{t('reasons.cardEmpty')}</span>
        </button>
      ) : (
        <div aria-hidden className="h-8" />
      )}

      <div className="flex items-center gap-2 px-3.5 py-3">
        <div className="scrollbar-none flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
          {d.creator && <UserAvatar profile={d.creator} className="size-7 text-[0.6rem]" />}
          {d.mood.slice(0, 3).map((m) => (
            <MoodTag key={m} mood={m} iconOnly={d.mood.length > 1} />
          ))}
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex h-9 items-center gap-1 rounded-full px-2 text-sm font-medium text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground"
          aria-label={t('comments.count', { count: comments })}
        >
          <MessageCircle className="size-4" />
          {comments}
        </button>
        <PointsControl destination={d} />
      </div>
    </motion.article>
  )
})
