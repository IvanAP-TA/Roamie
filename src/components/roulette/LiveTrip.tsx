import { createContext, Fragment, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { AnimatePresence, animate, motion, useMotionValue } from 'framer-motion'
import { ArrowRight, MessageCircle, Sparkles, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { useDestinations } from '@/hooks/useDestinations'
import { useTripContext } from '@/hooks/useTripContext'
import { keys } from '@/hooks/useTrips'
import { onSpinAnnounced, revealOrder, SHOW_TIMING, slicesFromSpin, type LiveSpin, type SpinEntry } from '@/lib/liveSpin'
import { targetRotation, totalPoints } from '@/lib/roulette'
import { publicTripLink, whatsappShareUrl } from '@/lib/share'
import { playWin } from '@/lib/sound'
import { renderDecisionCard, storyPhotoUrl } from '@/lib/storyCard'
import { supabase } from '@/lib/supabase'
import type { Destination } from '@/lib/types'
import { appUrl, cn } from '@/lib/utils'
import { dateFormat } from '@/lib/intl'
import { NextSteps } from '@/components/plan/NextSteps'
import { Floating } from '@/components/layout/Floating'
import { CoverImage } from '@/components/media/CoverImage'
import { ShareStoryButton } from '@/components/media/ShareStoryButton'
import { UserAvatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { RouletteWheel } from './RouletteWheel'
import { haptic } from '@/lib/haptics'

/**
 * The trip's live moments, shared by everyone who has it open: the wheel spinning (by hand or at the scheduled time),
 * the reveal of a secret vote, who's online and the emoji reactions. Spins arrive through realtime
 * (useTripRealtime → announceSpin); presence and reactions use a private channel only trip members can join.
 */

const REACTIONS = ['🎉', '😍', '😱', '🤞', '😂', '🙈']
const REVEAL_SEEN_KEY = (tripId: string) => `roamie.reveal.${tripId}`

interface Reaction {
  id: string
  emoji: string
  userId: string
  /** Horizontal position, % */
  x: number
}

interface LiveTripValue {
  /** Plays a recorded spin (ignored if it's already been shown on this device) */
  play: (spin: LiveSpin) => void
  /** User ids of the members with the trip open right now */
  online: string[]
  react: (emoji: string) => void
  reactions: Reaction[]
}

const LiveTripContext = createContext<LiveTripValue | null>(null)

export function useLiveTrip() {
  const value = useContext(LiveTripContext)
  if (!value) throw new Error('useLiveTrip must be used inside <LiveTripProvider>')
  return value
}

function remember(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Storage blocked: the reveal may show again next time.
  }
}

function recall(key: string) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function celebrate() {
  void import('canvas-confetti').then(({ default: confetti }) => {
    const colors = ['#ff7a5c', '#f4a950', '#c24e27', '#fff1c9', '#d99ab8']
    const base = { particleCount: 70, spread: 70, startVelocity: 55, colors, disableForReducedMotion: true, zIndex: 80 }
    void confetti({ ...base, angle: 60, origin: { x: 0, y: 0.75 } })
    void confetti({ ...base, angle: 120, origin: { x: 1, y: 0.75 } })
    setTimeout(() => void confetti({ ...base, particleCount: 90, spread: 120, startVelocity: 35, origin: { x: 0.5, y: 0.35 } }), 250)
  })
}

export function LiveTripProvider({ children }: { children: ReactNode }) {
  const { trip } = useTripContext()
  const { user } = useAuth()
  const qc = useQueryClient()
  const [spin, setSpin] = useState<LiveSpin | null>(null)
  const [reveal, setReveal] = useState<SpinEntry[] | null>(null)
  const [online, setOnline] = useState<string[]>([])
  const [reactions, setReactions] = useState<Reaction[]>([])
  const shown = useRef(new Set<string>())
  const lastSpinAt = useRef(0)
  const channel = useRef<RealtimeChannel | null>(null)

  const play = useCallback((next: LiveSpin) => {
    if (shown.current.has(next.id)) return
    shown.current.add(next.id)
    lastSpinAt.current = Date.now()
    setReveal(null)
    setSpin(next)
  }, [])

  useEffect(() => onSpinAnnounced(trip.id, play), [trip.id, play])

  // A secret round revealed without a spin (by an organiser, or once everyone voted): the reveal, once per device.
  const revealedAt = trip.secret_voting ? trip.votes_revealed_at : null
  useEffect(() => {
    if (!revealedAt || recall(REVEAL_SEEN_KEY(trip.id)) === revealedAt) return
    // A trip opened hours later just shows the votes.
    if (Date.now() - Date.parse(revealedAt) > 12 * 60 * 60 * 1000) {
      remember(REVEAL_SEEN_KEY(trip.id), revealedAt)
      return
    }
    const timer = setTimeout(() => {
      remember(REVEAL_SEEN_KEY(trip.id), revealedAt)
      // A spin that ended the round plays its own reveal.
      if (Date.now() - lastSpinAt.current < 15_000) return
      const key = keys.destinations(trip.id)
      void qc.invalidateQueries({ queryKey: key }).then(() => {
        const ranking = (qc.getQueryData<Destination[]>(key) ?? [])
          .filter((d) => d.status === 'proposed')
          .map((d) => ({ id: d.id, name: d.name, points: totalPoints(d) }))
          .filter((d) => d.points > 0)
        if (ranking.length > 0) setReveal(ranking)
      })
    }, 1500)
    return () => clearTimeout(timer)
  }, [revealedAt, trip.id, qc])

  const addReaction = useCallback((reaction: Reaction) => {
    setReactions((list) => [...list.slice(-24), reaction])
    setTimeout(() => setReactions((list) => list.filter((r) => r.id !== reaction.id)), 2600)
  }, [])

  const userId = user?.id
  useEffect(() => {
    if (!userId) return
    const live = supabase.channel(`trip-live:${trip.id}`, { config: { private: true, presence: { key: userId } } })
    live
      .on('presence', { event: 'sync' }, () => setOnline(Object.keys(live.presenceState())))
      .on('broadcast', { event: 'reaction' }, ({ payload }) => {
        const reaction = payload as Partial<Reaction>
        if (typeof reaction.emoji === 'string' && REACTIONS.includes(reaction.emoji) && typeof reaction.id === 'string') {
          addReaction({ id: reaction.id, emoji: reaction.emoji, userId: String(reaction.userId), x: Number(reaction.x) || 50 })
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') void live.track({ online_at: new Date().toISOString() })
      })
    channel.current = live
    return () => {
      channel.current = null
      void supabase.removeChannel(live)
    }
  }, [trip.id, userId, addReaction])

  const react = useCallback(
    (emoji: string) => {
      if (!userId) return
      const reaction = { id: crypto.randomUUID(), emoji, userId, x: 15 + Math.random() * 70 }
      addReaction(reaction)
      void channel.current?.send({ type: 'broadcast', event: 'reaction', payload: reaction })
    },
    [userId, addReaction],
  )

  const value = useMemo(() => ({ play, online, react, reactions }), [play, online, react, reactions])

  return (
    <LiveTripContext.Provider value={value}>
      {children}
      <Floating>
        <AnimatePresence>
          {spin && <LiveSpinShow key={spin.id} spin={spin} onClose={() => setSpin(null)} />}
          {!spin && reveal && <RevealShow key="reveal" entries={reveal} onClose={() => setReveal(null)} />}
        </AnimatePresence>
      </Floating>
    </LiveTripContext.Provider>
  )
}

/** Avatars of the members with the trip open, for the wheel screen and the live show. */
export function OnlineMembers({ className }: { className?: string }) {
  const { t } = useTranslation()
  const { members } = useTripContext()
  const { online } = useLiveTrip()
  const here = members.filter((m) => online.includes(m.user_id))
  if (here.length < 2) return null
  return (
    <span className={cn('inline-flex items-center gap-2 text-xs font-medium text-muted-foreground', className)}>
      <span className="flex -space-x-2">
        {here.slice(0, 5).map((m) => (
          <UserAvatar key={m.user_id} profile={m.profile} className="size-7 text-[0.6rem] ring-2 ring-[var(--paper)]" />
        ))}
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="size-2 animate-pulse rounded-full bg-sage" />
        {t('live.online', { count: here.length })}
      </span>
    </span>
  )
}

function Overlay({ children, onClose, closable }: { children: ReactNode; onClose: () => void; closable: boolean }) {
  const { t } = useTranslation()
  const { react, reactions } = useLiveTrip()
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex flex-col bg-[#2b1d17]/70 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
    >
      <div className="pt-safe flex items-center justify-between px-4 py-3">
        <OnlineMembers className="text-white/85" />
        <span />
        {closable && (
          <Button variant="glass" size="icon-sm" onClick={onClose} aria-label={t('live.close')}>
            <X />
          </Button>
        )}
      </div>

      {/* Centred while it fits, from the top once it doesn't (a plain justify-center would cut the top off). */}
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center-safe overflow-x-hidden overflow-y-auto px-5 py-2">{children}</div>

      <div className="pb-safe flex justify-center gap-1.5 px-4 pt-2" aria-label={t('live.react')}>
        {REACTIONS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => react(emoji)}
            className="flex size-11 items-center justify-center rounded-full bg-white/10 text-2xl transition active:scale-90"
          >
            {emoji}
          </button>
        ))}
      </div>

      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {reactions.map((r) => (
          <motion.span
            key={r.id}
            initial={{ y: 0, opacity: 1, scale: 0.6 }}
            animate={{ y: -320, opacity: 0, scale: 1.4 }}
            transition={{ duration: 2.4, ease: 'easeOut' }}
            className="absolute bottom-20 text-4xl"
            style={{ left: `${r.x}%` }}
          >
            {r.emoji}
          </motion.span>
        ))}
      </div>
    </motion.div>
  )
}

/** Most points first, for the story image. */
const storyRanking = (entries: SpinEntry[], pointsLabel: (count: number) => string) =>
  [...revealOrder(entries)].reverse().map((e) => ({ id: e.id, name: e.name, points: e.points, pointsLabel: pointsLabel(e.points) }))

/** Destinations and points, uncovered from last place to first. */
function RevealRanking({ entries }: { entries: SpinEntry[] }) {
  const { t } = useTranslation()
  const ordered = revealOrder(entries)
  const max = Math.max(1, ...entries.map((e) => e.points))
  return (
    <div className="w-full max-w-sm text-white">
      <p className="text-center text-xs font-bold tracking-[0.24em] uppercase opacity-80">{t('secret.revealEyebrow')}</p>
      <h2 className="mt-1 text-center text-3xl leading-tight">{t('secret.revealHeading')}</h2>
      <ol className="mt-6 flex flex-col-reverse gap-2">
        {ordered.map((entry, i) => {
          const place = ordered.length - i
          return (
            <motion.li
              key={entry.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (i * SHOW_TIMING.revealStep) / 1000, type: 'spring', stiffness: 220, damping: 22 }}
              className={cn('flex items-center gap-3 rounded-2xl px-4 py-3', place === 1 ? 'bg-white text-foreground shadow-lift' : 'bg-white/10')}
            >
              <span className="w-5 font-display text-xl italic">{place}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{entry.name}</span>
                <span className={cn('mt-1.5 block h-1.5 overflow-hidden rounded-full', place === 1 ? 'bg-foreground/10' : 'bg-white/15')}>
                  <motion.span
                    className="block h-full rounded-full bg-[linear-gradient(90deg,var(--coral),var(--primary))]"
                    initial={{ width: 0 }}
                    animate={{ width: `${(entry.points / max) * 100}%` }}
                    transition={{ delay: (i * SHOW_TIMING.revealStep) / 1000 + 0.2, duration: 0.6, ease: 'easeOut' }}
                  />
                </span>
              </span>
              <span className="text-sm font-semibold tabular-nums">{t('secret.points', { count: entry.points })}</span>
            </motion.li>
          )
        })}
      </ol>
    </div>
  )
}

function RevealShow({ entries, onClose }: { entries: SpinEntry[]; onClose: () => void }) {
  const { t } = useTranslation()
  const { trip } = useTripContext()
  const navigate = useNavigate()
  const done = entries.length * SHOW_TIMING.revealStep + 600
  const [finished, setFinished] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setFinished(true)
      celebrate()
    }, done)
    return () => clearTimeout(timer)
  }, [done])

  return (
    <Overlay onClose={onClose} closable>
      <RevealRanking entries={entries} />
      <div className={cn('mt-6 flex flex-wrap justify-center gap-2 transition-opacity duration-500', finished ? 'opacity-100' : 'pointer-events-none opacity-0')}>
        <Button variant="glass" onClick={onClose}>
          {t('secret.close')}
        </Button>
        <ShareStoryButton
          fileName="roamie-voto.png"
          title={t('story.shareTitle')}
          render={() => {
            const ranking = storyRanking(entries, (count) => t('secret.points', { count }))
            return renderDecisionCard({
              kind: 'reveal',
              eyebrow: t('secret.revealEyebrow'),
              title: t('secret.revealHeading'),
              subtitle: null,
              tripName: trip.name,
              ranking,
              winnerId: ranking[0]?.id ?? null,
              photoUrl: null,
              footer: t('story.footer'),
            })
          }}
        />
        <Button
          onClick={() => {
            onClose()
            navigate(`/trips/${trip.id}/roulette`)
          }}
        >
          {t('secret.toRoulette')}
          <ArrowRight />
        </Button>
      </div>
    </Overlay>
  )
}

type Phase = 'reveal' | 'countdown' | 'spin' | 'result'

const letters = (text: string) =>
  typeof Intl.Segmenter === 'function' ? Array.from(new Intl.Segmenter().segment(text), (s) => s.segment) : Array.from(text)

/**
 * The winning place's name, rising in letter by letter (index.css, .winner-letter). Read whole by screen readers;
 * each word stays on one line.
 */
function WinnerName({ name, className }: { name: string; className?: string }) {
  const words = name.split(' ')
  const count = name.replace(/ /g, '').length
  // The whole name is in within about half a second, however long it is.
  const step = Math.min(0.05, 0.5 / Math.max(count, 1))
  let index = 0
  return (
    <h2 aria-label={name} className={className}>
      {words.map((word, w) => (
        <Fragment key={w}>
          {w > 0 && ' '}
          <span aria-hidden className="inline-block whitespace-nowrap">
            {letters(word).map((letter, l) => (
              <span key={l} className="winner-letter inline-block" style={{ '--delay': `${0.3 + index++ * step}s` } as React.CSSProperties}>
                {letter}
              </span>
            ))}
          </span>
        </Fragment>
      ))}
    </h2>
  )
}

function LiveSpinShow({ spin, onClose }: { spin: LiveSpin; onClose: () => void }) {
  const { t, i18n } = useTranslation()
  const { trip, members } = useTripContext()
  const { data: destinations } = useDestinations(spin.trip_id)
  const [, setParams] = useSearchParams()
  const slices = useMemo(() => slicesFromSpin(spin.entries), [spin.entries])
  const winnerSlice = slices.find((s) => s.destination.id === spin.winner_id)
  const winner = destinations?.find((d) => d.id === spin.winner_id)
  const [phase, setPhase] = useState<Phase>(spin.revealed_votes ? 'reveal' : 'countdown')
  const [count, setCount] = useState(3)
  const rotation = useMotionValue(0)
  const spinner = members.find((m) => m.user_id === spin.spun_by)?.profile?.display_name?.split(' ')[0]

  useEffect(() => {
    let cancelled = false
    const timers: number[] = []
    const later = (ms: number, run: () => void) => timers.push(window.setTimeout(() => !cancelled && run(), ms))
    const revealMs = spin.revealed_votes ? spin.entries.length * SHOW_TIMING.revealStep + 1800 : 0

    later(revealMs, () => {
      setCount(3)
      setPhase('countdown')
    })
    later(revealMs + 1000, () => setCount(2))
    later(revealMs + 2000, () => setCount(1))
    later(revealMs + SHOW_TIMING.countdown, () => {
      if (!winnerSlice) {
        setPhase('result')
        return
      }
      setPhase('spin')
      void animate(rotation, targetRotation(0, winnerSlice, 6, spin.landing), {
        duration: SHOW_TIMING.spin / 1000,
        ease: [0.12, 0.7, 0.08, 1],
      }).then(() => {
        if (cancelled) return
        setPhase('result')
        celebrate()
        playWin()
        haptic('celebrate')
      })
    })

    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
      rotation.stop()
    }
  }, [spin, winnerSlice, rotation])

  const winnerName = winner?.name ?? winnerSlice?.destination.name ?? ''
  const story = () =>
    renderDecisionCard({
      kind: 'wheel',
      eyebrow: t('story.wheelEyebrow'),
      title: winnerName,
      subtitle: winner?.country ?? null,
      tripName: trip.name,
      ranking: storyRanking(spin.entries, (count) => t('secret.points', { count })),
      winnerId: spin.winner_id,
      photoUrl: storyPhotoUrl(winner?.image_url),
      footer: t('story.footer'),
    })

  return (
    <Overlay onClose={onClose} closable={phase === 'result'}>
      {phase === 'reveal' && <RevealRanking entries={spin.entries} />}

      {(phase === 'countdown' || phase === 'spin') && (
        <div className="flex w-full flex-col items-center gap-5 text-white">
          <p className="text-center text-sm font-semibold opacity-90">
            {spinner ? t('live.byMember', { name: spinner }) : t('live.scheduled')}
          </p>
          <div className="relative w-full max-w-[22rem]">
            <RouletteWheel entries={slices} rotation={rotation} spinning={phase === 'spin'} hubLabel={phase === 'spin' ? '…' : String(count)} hubDisabled />
            <AnimatePresence>
              {phase === 'countdown' && (
                <motion.span
                  key={count}
                  initial={{ scale: 1.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  className="pointer-events-none absolute inset-0 flex items-center justify-center font-display text-8xl text-white drop-shadow-lg"
                >
                  {count}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {phase === 'result' && (
        <div className="flex w-full flex-col items-center gap-4">
        {/* Light behind everything: rays opening and turning slowly, and one ring rushing out as the card lands. Fixed
            to the screen and clipped there, so it never makes the overlay scroll. */}
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute top-[42%] left-1/2 size-0">
            <div className="winner-rays absolute -top-[22rem] -left-[22rem] size-[44rem]" />
            <div className="winner-ring absolute -top-40 -left-40 size-80 rounded-full border-2 border-white/70" />
          </div>
        </div>
        <motion.div
          initial={{ scale: 0.6, rotate: -8, y: 40 }}
          animate={{ scale: 1, rotate: 0, y: 0 }}
          transition={{ type: 'spring', stiffness: 180, damping: 15 }}
          className="relative w-full max-w-sm overflow-hidden rounded-[2.25rem] bg-paper p-2 shadow-lift"
        >
          <CoverImage
            url={winner?.image_url}
            seed={winnerName}
            pin
            showAttribution={false}
            sizes="384px"
            imgClassName="winner-zoom"
            className="h-64 rounded-[1.9rem]"
          >
            <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_35%,rgb(20_10_5/0.7))]" />
            <div className="absolute inset-x-5 bottom-5 text-white">
              <p className="winner-in inline-flex items-center gap-1 text-xs font-bold tracking-[0.24em] uppercase opacity-85" style={{ '--delay': '0.2s' } as React.CSSProperties}>
                <Sparkles className="size-3.5" />
                {t('live.winnerEyebrow')}
              </p>
              <WinnerName name={winnerName} className="text-5xl leading-none drop-shadow-lg display-wonk" />
              {winner?.country && (
                <p className="winner-in mt-1 text-sm opacity-85" style={{ '--delay': '0.75s' } as React.CSSProperties}>
                  {winner.country}
                </p>
              )}
            </div>
          </CoverImage>
          <div className="winner-in flex gap-2 p-3" style={{ '--delay': '0.9s' } as React.CSSProperties}>
            <Button variant="ghost" onClick={onClose}>
              {t('live.close')}
            </Button>
            {winner && (
              <Button
                size="lg"
                className="flex-1"
                onClick={() => {
                  onClose()
                  setParams((p) => {
                    p.set('d', winner.id)
                    return p
                  })
                }}
              >
                {t('live.viewDestination')}
                <ArrowRight />
              </Button>
            )}
          </div>
        </motion.div>
        <div className="winner-in flex flex-wrap justify-center gap-2" style={{ '--delay': '1.05s' } as React.CSSProperties}>
          {/* The decision, ready for the group chat: the trip's public page if it has one, Roamie otherwise. */}
          <Button asChild variant="glass">
            <a
              href={whatsappShareUrl(t('story.whatsappText', { place: winnerName }), trip.public_slug ? publicTripLink(trip.public_slug) : `${appUrl()}/?ref=whatsapp`)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle />
              {t('story.whatsapp')}
            </a>
          </Button>
          <ShareStoryButton render={story} fileName="roamie-ruota.png" title={t('story.shareTitle')} />
        </div>
        {/* Drawn by the database, not by anyone's phone: when, and how likely this place was. */}
        {winnerSlice && (
          <p className="winner-in max-w-sm text-center text-xs text-white/80" style={{ '--delay': '1.15s' } as React.CSSProperties}>
            {t('live.drawProof', {
              time: dateFormat(i18n.resolvedLanguage, { hour: '2-digit', minute: '2-digit' }).format(new Date(spin.created_at)),
              place: winnerName,
              percent: Math.round(winnerSlice.probability * 100),
            })}
          </p>
        )}
        {winner && (
          <div className="winner-in w-full max-w-sm" style={{ '--delay': '1.25s' } as React.CSSProperties}>
            <NextSteps onDone={onClose} className="glass" />
          </div>
        )}
        </div>
      )}
    </Overlay>
  )
}
