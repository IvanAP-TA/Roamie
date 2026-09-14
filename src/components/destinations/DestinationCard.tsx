import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { CheckCheck, MessageCircle, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { CoverImage } from '@/components/media/CoverImage'
import { UserAvatar } from '@/components/ui/avatar'
import { BudgetIndicator, MoodTag } from './moods'
import { PointsControl } from './PointsControl'
import type { Destination } from '@/lib/types'

export const DestinationCard = forwardRef<HTMLElement, { destination: Destination; onOpen: () => void }>(
  function DestinationCard({ destination: d, onOpen }, ref) {
    const { t } = useTranslation()
    const comments = d.comments[0]?.count ?? 0

    return (
      <motion.article
        ref={ref}
        layout
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.2 } }}
        transition={{ type: 'spring', stiffness: 260, damping: 28 }}
        whileHover={{ y: -4 }}
        className="group overflow-hidden rounded-[2rem] bg-paper shadow-soft transition-shadow hover:shadow-lift"
      >
        <button type="button" onClick={onOpen} className="block w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <CoverImage
            url={d.image_url}
            attribution={d.image_attribution}
            seed={d.name}
            pin
            className="h-56"
            imgClassName="transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-105"
            attributionClassName="top-3 right-3 bottom-auto"
          >
            <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgb(20_10_5/0.6))]" />
            {d.status !== 'proposed' && (
              <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-[var(--glass-strong)] px-2.5 py-1 text-[0.68rem] font-bold tracking-wide uppercase backdrop-blur-md">
                {d.status === 'selected' ? <Sparkles className="size-3.5 text-primary" /> : <CheckCheck className="size-3.5 text-sage" />}
                {t(`status.${d.status}`)}
              </span>
            )}
            <div className="absolute inset-x-4 bottom-3.5 text-white">
              <h3 className="truncate text-[1.7rem] leading-tight drop-shadow-md">{d.name}</h3>
              <div className="flex items-center gap-2 text-sm text-white/85">
                {d.country && <span className="truncate">{d.country}</span>}
                {d.budget_level && (
                  <>
                    <span className="size-1 rounded-full bg-white/60" />
                    <BudgetIndicator level={d.budget_level} className="[&_span_span]:!text-white [&_.text-foreground\/20]:!text-white/35" />
                  </>
                )}
              </div>
            </div>
          </CoverImage>
        </button>

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
  },
)
