import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, animate, motion, useMotionValue } from 'framer-motion'
import confetti from 'canvas-confetti'
import { ArrowRight, Dices, Lock, Sparkles, Volume2, VolumeX, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useDestinations, useSpinRoulette } from '@/hooks/useDestinations'
import { useTripContext } from '@/hooks/useTripContext'
import { keys } from '@/hooks/useTrips'
import { eligibleEntries, markLocalSpin, targetRotation, type RouletteEntry } from '@/lib/roulette'
import { playWin, unlockAudio, useSoundEnabled } from '@/lib/sound'
import { rpcErrorCode } from '@/lib/supabase'
import type { Destination } from '@/lib/types'
import { PageTransition } from '@/components/layout/PageTransition'
import { RouletteWheel, SLICE_COLORS } from '@/components/roulette/RouletteWheel'
import { CoverImage } from '@/components/media/CoverImage'
import { AttributionText } from '@/components/media/Attribution'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState, Skeleton } from '@/components/ui/misc'

type Phase = 'idle' | 'confirm' | 'spinning' | 'result'

function celebrate() {
  const colors = ['#ff7a5c', '#f4a950', '#c24e27', '#fff1c9', '#d99ab8']
  const base = { particleCount: 70, spread: 70, startVelocity: 55, colors, disableForReducedMotion: true, zIndex: 70 }
  void confetti({ ...base, angle: 60, origin: { x: 0, y: 0.75 } })
  void confetti({ ...base, angle: 120, origin: { x: 1, y: 0.75 } })
  setTimeout(() => void confetti({ ...base, particleCount: 90, spread: 120, startVelocity: 35, origin: { x: 0.5, y: 0.35 } }), 250)
}

export default function RouletteTab() {
  const { t, i18n } = useTranslation()
  const { trip, canEdit } = useTripContext()
  const { data: destinations, isLoading } = useDestinations(trip.id)
  const spin = useSpinRoulette(trip.id)
  const qc = useQueryClient()
  const [, setParams] = useSearchParams()
  const [soundOn, setSoundOn] = useSoundEnabled()

  const rotation = useMotionValue(0)
  const [phase, setPhase] = useState<Phase>('idle')
  const [frozen, setFrozen] = useState<RouletteEntry[] | null>(null)
  const [winner, setWinner] = useState<Destination | null>(null)

  const live = useMemo(() => eligibleEntries(destinations ?? []), [destinations])
  // Freeze the slices while spinning so realtime updates can't reshape the wheel mid-animation.
  const entries = frozen ?? live
  const history = useMemo(
    () =>
      (destinations ?? [])
        .filter((d) => d.status === 'selected')
        .sort((a, b) => (b.selected_at ?? '').localeCompare(a.selected_at ?? '')),
    [destinations],
  )
  const percent = new Intl.NumberFormat(i18n.resolvedLanguage, { style: 'percent', maximumFractionDigits: 0 })

  const openDestination = (id: string) =>
    setParams((p) => {
      p.set('d', id)
      return p
    })

  const reset = () => {
    setPhase('idle')
    setFrozen(null)
    setWinner(null)
  }

  const runSpin = async () => {
    const snapshot = live
    setFrozen(snapshot)
    setPhase('spinning')
    try {
      // Server draws the winner; meanwhile a small wind-up so the tap feels instant.
      const [winnerId] = await Promise.all([
        spin.mutateAsync(),
        animate(rotation, rotation.get() - 24, { duration: 0.4, ease: 'easeOut' }),
      ])
      markLocalSpin(winnerId)
      const entry = snapshot.find((e) => e.destination.id === winnerId)

      if (entry) {
        await animate(rotation, targetRotation(rotation.get(), entry, 6, Math.random()), {
          duration: 5.4,
          ease: [0.12, 0.7, 0.08, 1],
        })
        setWinner(entry.destination)
      } else {
        // The wheel was out of date (votes changed a moment ago): show the result without the animation.
        await qc.invalidateQueries({ queryKey: keys.destinations(trip.id) })
        setWinner(qc.getQueryData<Destination[]>(keys.destinations(trip.id))?.find((d) => d.id === winnerId) ?? null)
      }

      setPhase('result')
      celebrate()
      playWin()
      if (typeof navigator.vibrate === 'function') navigator.vibrate([30, 60, 30])
      void qc.invalidateQueries({ queryKey: keys.destinations(trip.id) })
    } catch (err) {
      reset()
      toast.error(rpcErrorCode(err as Error) === 'no_eligible_destinations' ? t('roulette.noEligible') : t('errors.generic'))
      void qc.invalidateQueries({ queryKey: keys.destinations(trip.id) })
    }
  }

  const spinning = phase === 'spinning'
  const canSpin = canEdit && entries.length > 0 && phase === 'idle'

  return (
    <PageTransition className="mx-auto max-w-5xl px-5 md:px-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="truncate text-sm font-medium text-muted-foreground">{trip.name}</p>
          <h1 className="text-[2.6rem] leading-none md:text-5xl">{t('roulette.title')}</h1>
        </div>
        <Button
          variant="glass"
          size="icon-sm"
          onClick={() => setSoundOn(!soundOn)}
          aria-label={t('roulette.sound')}
          aria-pressed={soundOn}
        >
          {soundOn ? <Volume2 /> : <VolumeX />}
        </Button>
      </header>
      <p className="mt-2 max-w-lg text-sm text-muted-foreground">{t('roulette.subtitle')}</p>

      {isLoading && <Skeleton className="mx-auto mt-8 aspect-square w-full max-w-[22rem] rounded-full" />}

      {!isLoading && entries.length === 0 && phase === 'idle' && (
        <EmptyState seed="2" icon={<Dices />} title={t('roulette.emptyTitle')} body={t('roulette.emptyBody')}>
          <Button asChild size="lg">
            <Link to={`/trips/${trip.id}`}>
              {t('roulette.goVote')}
              <ArrowRight />
            </Link>
          </Button>
        </EmptyState>
      )}

      {!isLoading && entries.length > 0 && (
        <div className="mt-8 grid items-start gap-10 md:grid-cols-[1.15fr_1fr]">
          <div className="space-y-6">
            <RouletteWheel
              entries={entries}
              rotation={rotation}
              spinning={spinning}
              hubLabel={spinning ? '…' : t('roulette.hub')}
              hubDisabled={!canSpin}
              onHubClick={() => canSpin && setPhase('confirm')}
            />
            {canEdit ? (
              <Button size="lg" className="mx-auto flex h-16 w-full max-w-xs text-lg" disabled={!canSpin} onClick={() => setPhase('confirm')}>
                <Dices className="size-6" />
                {spinning ? t('roulette.spinning') : t('roulette.spin')}
              </Button>
            ) : (
              <p className="mx-auto flex w-fit items-center gap-1.5 rounded-full bg-foreground/[0.05] px-4 py-2 text-sm text-muted-foreground">
                <Lock className="size-4" />
                {t('roulette.viewerHint')}
              </p>
            )}
          </div>

          <section className="glass rounded-[2rem] p-5">
            <h2 className="mb-3 font-sans text-xs font-bold tracking-[0.18em] text-muted-foreground uppercase">{t('roulette.odds')}</h2>
            <ul className="space-y-1">
              {entries.map((e, i) => (
                <li key={e.destination.id}>
                  <button
                    type="button"
                    onClick={() => openDestination(e.destination.id)}
                    className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition hover:bg-foreground/[0.04]"
                  >
                    <span className="size-3.5 shrink-0 rounded-full" style={{ background: SLICE_COLORS[i % SLICE_COLORS.length] }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{e.destination.name}</span>
                      <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-foreground/[0.06]">
                        <motion.span
                          className="block h-full rounded-full"
                          style={{ background: SLICE_COLORS[i % SLICE_COLORS.length] }}
                          initial={{ width: 0 }}
                          animate={{ width: `${e.probability * 100}%` }}
                          transition={{ type: 'spring', stiffness: 120, damping: 20, delay: i * 0.05 }}
                        />
                      </span>
                    </span>
                    <span className="w-12 text-right text-sm font-semibold tabular-nums">{percent.format(e.probability)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {history.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 inline-flex items-center gap-2 font-sans text-sm font-semibold text-muted-foreground">
            <Sparkles className="size-4 text-primary" />
            {t('roulette.history')}
          </h2>
          <div className="flex flex-wrap gap-2">
            {history.map((d) => (
              <button key={d.id} type="button" onClick={() => openDestination(d.id)} className="glass rounded-full px-4 py-2 text-sm font-medium transition active:scale-95">
                {d.name}
              </button>
            ))}
          </div>
        </section>
      )}

      <ConfirmDialog
        open={phase === 'confirm'}
        onOpenChange={(open) => !open && phase === 'confirm' && setPhase('idle')}
        title={t('roulette.confirmTitle')}
        description={t('roulette.confirmBody')}
        confirmLabel={t('roulette.confirmCta')}
        cancelLabel={t('common.cancel')}
        icon={<Dices />}
        onConfirm={() => {
          unlockAudio()
          void runSpin()
        }}
      />

      <AnimatePresence>
        {phase === 'result' && winner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-[#2b1d17]/45 p-5 backdrop-blur-md"
            onClick={reset}
          >
            <motion.div
              initial={{ scale: 0.6, rotate: -8, y: 40 }}
              animate={{ scale: 1, rotate: 0, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 180, damping: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm overflow-hidden rounded-[2.25rem] bg-paper p-2 shadow-lift"
            >
              <CoverImage url={winner.image_url} seed={winner.name} pin showAttribution={false} className="h-64 rounded-[1.9rem]">
                <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_35%,rgb(20_10_5/0.7))]" />
                <Button variant="glass" size="icon-sm" className="absolute top-3 right-3" onClick={reset} aria-label={t('common.close')}>
                  <X />
                </Button>
                <div className="absolute inset-x-5 bottom-5 text-white">
                  <p className="text-xs font-bold tracking-[0.24em] uppercase opacity-85">{t('roulette.winnerEyebrow')}</p>
                  <motion.h2
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="text-5xl leading-none drop-shadow-lg display-wonk"
                  >
                    {winner.name}
                  </motion.h2>
                  {winner.country && <p className="mt-1 text-sm opacity-85">{winner.country}</p>}
                </div>
              </CoverImage>
              <AttributionText raw={winner.image_attribution} className="px-3 pt-2" />
              <div className="flex gap-2 p-3">
                <Button
                  size="lg"
                  className="flex-1"
                  onClick={() => {
                    const id = winner.id
                    reset()
                    openDestination(id)
                  }}
                >
                  {t('roulette.viewDetails')}
                  <ArrowRight />
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  )
}
