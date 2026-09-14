import { motion } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { CoverImage } from '@/components/media/CoverImage'
import type { Destination } from '@/lib/types'
import { timeAgo } from '@/lib/utils'

/** The roulette winner, highlighted on the trip home with a slowly rotating sunset border. */
export function NextDestinationCard({ destination: d, onOpen }: { destination: Destination; onOpen: () => void }) {
  const { t, i18n } = useTranslation()

  return (
    <motion.button
      type="button"
      onClick={onOpen}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      className="group relative block w-full overflow-hidden rounded-[2rem] p-[2px] text-left shadow-glow"
    >
      <motion.span
        aria-hidden
        className="absolute -inset-[60%] bg-[conic-gradient(from_0deg,var(--sun),var(--coral),var(--primary),var(--dusk),var(--sun))]"
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      />
      <span className="relative flex items-center gap-4 rounded-[calc(2rem-2px)] bg-paper p-3 pr-5">
        <CoverImage url={d.image_url} seed={d.name} pin showAttribution={false} className="size-20 shrink-0 rounded-[1.4rem]" />
        <span className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-1 text-[0.68rem] font-bold tracking-[0.18em] text-primary uppercase">
            <Sparkles className="size-3.5" />
            {t('destination.next')}
          </span>
          <span className="block truncate font-display text-2xl leading-tight">{d.name}</span>
          {d.selected_at && (
            <span className="block truncate text-xs text-muted-foreground">
              {t('destination.selectedWhen', { when: timeAgo(d.selected_at, i18n.resolvedLanguage ?? 'en') })}
            </span>
          )}
        </span>
        <ArrowRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
      </span>
    </motion.button>
  )
}
