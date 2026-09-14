import { AnimatePresence, motion } from 'framer-motion'
import { ArrowBigDown, ArrowBigUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { useCastVote } from '@/hooks/useDestinations'
import { netScore } from '@/lib/roulette'
import type { Destination, VoteType } from '@/lib/types'
import { cn } from '@/lib/utils'

export function VoteControl({ destination, size = 'default', className }: { destination: Destination; size?: 'default' | 'lg'; className?: string }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const castVote = useCastVote(destination.trip_id)
  const mine = destination.votes.find((v) => v.user_id === user?.id)?.vote_type
  const score = netScore(destination)
  const lg = size === 'lg'

  const vote = (voteType: VoteType) => (e: React.MouseEvent) => {
    e.stopPropagation()
    if (typeof navigator.vibrate === 'function') navigator.vibrate(8)
    castVote.mutate({ destinationId: destination.id, voteType }, { onError: () => toast.error(t('errors.voteFailed')) })
  }

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border border-border bg-[var(--glass-strong)] p-0.5',
        lg && 'p-1',
        className,
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <motion.button
        type="button"
        whileTap={{ scale: 0.8, y: -3 }}
        aria-pressed={mine === 'up'}
        aria-label={t('votes.up')}
        onClick={vote('up')}
        className={cn(
          'flex items-center justify-center rounded-full transition-colors',
          lg ? 'size-11' : 'size-8',
          mine === 'up' ? 'bg-[linear-gradient(135deg,var(--coral),var(--primary))] text-white shadow-glow' : 'text-muted-foreground hover:text-primary',
        )}
      >
        <ArrowBigUp className={lg ? 'size-6' : 'size-[1.15rem]'} fill={mine === 'up' ? 'currentColor' : 'none'} />
      </motion.button>

      <span className={cn('relative overflow-hidden text-center font-semibold tabular-nums', lg ? 'w-10 text-lg' : 'w-7 text-sm')}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={score}
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -12, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className={cn('block', score > 0 && 'text-primary', score < 0 && 'text-dusk')}
          >
            {score}
          </motion.span>
        </AnimatePresence>
      </span>

      <motion.button
        type="button"
        whileTap={{ scale: 0.8, y: 3 }}
        aria-pressed={mine === 'down'}
        aria-label={t('votes.down')}
        onClick={vote('down')}
        className={cn(
          'flex items-center justify-center rounded-full transition-colors',
          lg ? 'size-11' : 'size-8',
          mine === 'down' ? 'bg-dusk text-white' : 'text-muted-foreground hover:text-dusk',
        )}
      >
        <ArrowBigDown className={lg ? 'size-6' : 'size-[1.15rem]'} fill={mine === 'down' ? 'currentColor' : 'none'} />
      </motion.button>
    </div>
  )
}
