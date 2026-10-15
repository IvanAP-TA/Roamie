import { useMemo, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import {
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  Coins,
  Eye,
  History,
  MapPinCheck,
  MapPinPlus,
  MessageCircle,
  PartyPopper,
  ThumbsUp,
  UserPlus,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { useDueEvents, useLastVisit, useTripEvents, type TripEvent, type TripEventKind } from '@/hooks/useTripEvents'
import { UserAvatar } from '@/components/ui/avatar'
import { Sheet } from '@/components/ui/sheet'
import { cn, timeAgo } from '@/lib/utils'
import { dateFormat } from '@/lib/intl'

const ICONS: Record<TripEventKind, LucideIcon> = {
  joined: UserPlus,
  proposed: MapPinPlus,
  chosen: PartyPopper,
  visited: MapPinCheck,
  commented: MessageCircle,
  reason: ThumbsUp,
  voted: Coins,
  revealed: Eye,
  itinerary: CalendarRange,
  availability: CalendarDays,
  dates_set: CalendarCheck,
}

/** Things that happen to the trip rather than being done by someone. */
const NO_SUBJECT: TripEventKind[] = ['chosen', 'revealed']

const PREVIEW = 3

function EventLine({ event, isNew, onOpenDestination }: { event: TripEvent; isNew: boolean; onOpenDestination: (id: string) => void }) {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const lang = i18n.resolvedLanguage ?? 'en'
  const Icon = ICONS[event.kind]
  const mine = event.actor_id !== null && event.actor_id === user?.id
  const subjectless = NO_SUBJECT.includes(event.kind)
  const dates =
    event.data.start &&
    dateFormat(lang, { day: 'numeric', month: 'short' }).formatRange(
      new Date(`${event.data.start}T12:00:00`),
      new Date(`${event.data.end ?? event.data.start}T12:00:00`),
    )
  const text = t(`feed.${event.kind}${mine ? '_you' : ''}`, {
    place: event.data.name ?? t('feed.aPlace'),
    text: event.data.text,
    count: event.data.count ?? 1,
    dates,
  })
  const name = mine ? t('feed.you') : (event.actor?.display_name ?? t('group.formerMember'))
  const openable = event.destination_id !== null

  const body: ReactNode = (
    <>
      <span className="relative mt-0.5 shrink-0">
        {subjectless ? (
          <span className="flex size-8 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <Icon className="size-4" />
          </span>
        ) : (
          <>
            <UserAvatar profile={event.actor} className="size-8 text-[0.6rem]" />
            <span className="absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-full bg-paper text-primary shadow-sm">
              <Icon className="size-2.5" />
            </span>
          </>
        )}
      </span>
      <span className="min-w-0 flex-1 text-sm leading-snug">
        {!subjectless && <span className="font-semibold">{name} </span>}
        <span className={cn(subjectless && 'font-semibold')}>{text}</span>
        <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          {isNew && <span className="size-1.5 rounded-full bg-primary" aria-hidden />}
          {timeAgo(event.created_at, lang)}
        </span>
      </span>
    </>
  )

  return openable ? (
    <button
      type="button"
      onClick={() => onOpenDestination(event.destination_id!)}
      className="flex w-full items-start gap-3 rounded-2xl p-2 text-left transition hover:bg-foreground/[0.04]"
    >
      {body}
    </button>
  ) : (
    <div className="flex items-start gap-3 p-2">{body}</div>
  )
}

const dayKey = (iso: string) => new Date(iso).toDateString()

/**
 * "Cosa è successo" on the trip home: the latest few things others did, with what's new since the last visit on this
 * device marked, and the whole history in a sheet. Hidden while nobody else has done anything yet.
 */
export function ActivityFeed({ tripId, onOpenDestination }: { tripId: string; onOpenDestination: (id: string) => void }) {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const { data } = useTripEvents(tripId)
  const events = useDueEvents(data)
  const lastVisit = useLastVisit(tripId)
  const [open, setOpen] = useState(false)

  const isNew = (e: TripEvent) => lastVisit !== null && e.actor_id !== user?.id && Date.parse(e.created_at) > lastVisit
  const fresh = events.filter(isNew)
  const others = events.some((e) => e.actor_id !== user?.id)

  const days = useMemo(() => {
    const groups: { key: string; label: string; events: TripEvent[] }[] = []
    const lang = i18n.resolvedLanguage ?? 'en'
    const today = new Date().toDateString()
    const yesterday = new Date(Date.now() - 86_400_000).toDateString()
    for (const e of events) {
      const key = dayKey(e.created_at)
      let group = groups.at(-1)
      if (group?.key !== key) {
        const label =
          key === today
            ? t('feed.today')
            : key === yesterday
              ? t('feed.yesterday')
              : dateFormat(lang, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(e.created_at))
        group = { key, label, events: [] }
        groups.push(group)
      }
      group.events.push(e)
    }
    return groups
  }, [events, i18n.resolvedLanguage, t])

  if (!others) return null

  // New things first; otherwise simply the latest.
  const preview = (fresh.length > 0 ? fresh : events).slice(0, PREVIEW)
  const openDestination = (id: string) => {
    setOpen(false)
    onOpenDestination(id)
  }

  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong rounded-[2rem] p-3 pt-4"
        aria-labelledby="feed-title"
      >
        <div className="flex items-center justify-between gap-3 px-2">
          <h2 id="feed-title" className="flex items-center gap-2 font-display text-xl leading-tight">
            <History className="size-5 text-primary" />
            {t('feed.title')}
          </h2>
          {fresh.length > 0 && (
            <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
              {t('feed.newCount', { count: fresh.length })}
            </span>
          )}
        </div>
        <ul className="mt-1.5">
          {preview.map((e) => (
            <li key={e.id}>
              <EventLine event={e} isNew={isNew(e)} onOpenDestination={openDestination} />
            </li>
          ))}
        </ul>
        {events.length > preview.length && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-1 w-full rounded-full py-2 text-sm font-semibold text-primary transition hover:bg-primary/5"
          >
            {fresh.length > PREVIEW ? t('feed.seeNew', { count: fresh.length - PREVIEW }) : t('feed.seeAll')}
          </button>
        )}
      </motion.section>

      <Sheet open={open} onOpenChange={setOpen} title={t('feed.title')}>
        <div className="space-y-5 pb-2">
          {days.map((day) => (
            <section key={day.key}>
              <h3 className="mb-1 px-2 text-[0.7rem] font-bold tracking-wide text-muted-foreground uppercase">{day.label}</h3>
              <ul>
                {day.events.map((e) => (
                  <li key={e.id}>
                    <EventLine event={e} isNew={isNew(e)} onOpenDestination={openDestination} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </Sheet>
    </>
  )
}
