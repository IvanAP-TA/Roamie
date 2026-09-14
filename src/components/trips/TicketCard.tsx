import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowUpRight, MapPin } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { CoverImage } from '@/components/media/CoverImage'
import { AvatarStack } from '@/components/ui/avatar'
import { formatInviteCode } from '@/lib/share'
import type { Role, TripListItem } from '@/lib/types'
import { cn } from '@/lib/utils'

const ROLE_STYLE: Record<Role, string> = {
  owner: 'bg-[var(--sun)] text-[#3b2410]',
  editor: 'bg-white/85 text-[#4a2e22]',
  viewer: 'bg-black/40 text-white',
}

/** A trip as a boarding pass: photo, route-style title, perforation and a tear-off stub. */
export function TicketCard({ trip, myRole }: { trip: TripListItem; myRole: Role | undefined }) {
  const { t } = useTranslation()
  const destinationCount = trip.destinations[0]?.count ?? 0

  return (
    <motion.div
      whileHover={{ y: -6, rotate: -0.4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      className="drop-shadow-[0_18px_28px_rgb(150_70_30/0.18)] dark:drop-shadow-[0_18px_28px_rgb(0_0_0/0.45)]"
    >
      <Link
        to={`/trips/${trip.id}`}
        className="ticket-notch block overflow-hidden rounded-[1.75rem] bg-paper outline-none [--notch-y:calc(100%-3.5rem)] focus-visible:ring-2 focus-visible:ring-ring"
      >
        <CoverImage url={trip.cover_image_url} attribution={trip.cover_image_attribution} seed={trip.id} className="h-40">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(0_0_0/0.15),transparent_40%,rgb(0_0_0/0.25))]" />
          <div className="absolute top-3 left-3 flex gap-1.5">
            {myRole && (
              <span className={cn('rounded-full px-2.5 py-1 text-[0.65rem] font-bold tracking-wider uppercase', ROLE_STYLE[myRole])}>
                {t(`roles.${myRole}`)}
              </span>
            )}
          </div>
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/35 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-md">
            <MapPin className="size-3.5" />
            {t('trips.destinationCount', { count: destinationCount })}
          </span>
        </CoverImage>

        <div className="px-5 pt-4 pb-4">
          <p className="text-[0.62rem] font-bold tracking-[0.22em] text-muted-foreground uppercase">{t('trips.boardingPass')}</p>
          <h3 className="mt-0.5 truncate text-[1.65rem] leading-tight">{trip.name}</h3>
          <p className="mt-0.5 line-clamp-1 min-h-5 text-sm text-muted-foreground">{trip.description}</p>
        </div>

        <div className="mx-5 border-t-2 border-dashed border-foreground/10" />

        <div className="flex h-14 items-center justify-between px-5">
          <AvatarStack profiles={trip.trip_members.map((m) => m.profile)} size="size-7" />
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs tracking-widest text-muted-foreground">{formatInviteCode(trip.invite_code)}</span>
            <span className="flex size-8 items-center justify-center rounded-full bg-foreground text-background transition-transform duration-300 group-hover:rotate-45">
              <ArrowUpRight className="size-4" />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
