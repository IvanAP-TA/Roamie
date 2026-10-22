import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { motion, useMotionValue } from 'framer-motion'
import { ArrowRight, Dices, Lock, Sparkles, Volume2, VolumeX } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useDestinations, useSpinRoulette } from '@/hooks/useDestinations'
import { fetchLatestSpin } from '@/hooks/useSecretVoting'
import { useTripContext } from '@/hooks/useTripContext'
import { keys } from '@/hooks/useTrips'
import { eligibleEntries } from '@/lib/roulette'
import { votesHidden } from '@/lib/secretVoting'
import { unlockAudio, useSoundEnabled } from '@/lib/sound'
import { rpcErrorCode } from '@/lib/supabase'
import { PageTransition } from '@/components/layout/PageTransition'
import { OnlineMembers, useLiveTrip } from '@/components/roulette/LiveTrip'
import { RouletteSchedule } from '@/components/roulette/RouletteSchedule'
import { RouletteWheel, sliceColor } from '@/components/roulette/RouletteWheel'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState, Skeleton } from '@/components/ui/misc'
import { numberFormat } from '@/lib/intl'
import { haptic } from '@/lib/haptics'

export default function RouletteTab() {
  const { t, i18n } = useTranslation()
  const { trip, canEdit } = useTripContext()
  const { data: destinations, isLoading } = useDestinations(trip.id)
  const spin = useSpinRoulette(trip.id)
  const qc = useQueryClient()
  const { play } = useLiveTrip()
  const [, setParams] = useSearchParams()
  const [soundOn, setSoundOn] = useSoundEnabled()
  // The wheel here stays still: every spin plays in the live show, for everyone at once.
  const rotation = useMotionValue(0)
  const [confirming, setConfirming] = useState(false)
  const [spinning, setSpinning] = useState(false)
  const hidden = votesHidden(trip)

  const proposed = useMemo(() => (destinations ?? []).filter((d) => d.status === 'proposed'), [destinations])
  const odds = useMemo(() => eligibleEntries(destinations ?? []), [destinations])
  // Secret vote: every proposal gets the same slice, so the wheel gives nothing away.
  const mystery = useMemo(
    () => proposed.map((destination, i) => ({ destination, startAngle: (i * 360) / proposed.length, endAngle: ((i + 1) * 360) / proposed.length })),
    [proposed],
  )
  const entries = hidden ? mystery : odds
  const history = useMemo(
    () =>
      (destinations ?? [])
        .filter((d) => d.status === 'selected')
        .sort((a, b) => (b.selected_at ?? '').localeCompare(a.selected_at ?? '')),
    [destinations],
  )
  const percent = numberFormat(i18n.resolvedLanguage, { style: 'percent', maximumFractionDigits: 0 })

  const openDestination = (id: string) =>
    setParams((p) => {
      p.set('d', id)
      return p
    })

  const runSpin = async () => {
    haptic('tap')
    setSpinning(true)
    try {
      await spin.mutateAsync()
      // Everyone else gets the spin through realtime; here it plays right away (the same recording).
      const recorded = await fetchLatestSpin(trip.id)
      if (recorded) play(recorded)
    } catch (err) {
      toast.error(rpcErrorCode(err as Error) === 'no_eligible_destinations' ? t('roulette.noEligible') : t('errors.generic'))
    } finally {
      setSpinning(false)
      void qc.invalidateQueries({ queryKey: keys.destinations(trip.id) })
    }
  }

  const canSpin = canEdit && entries.length > 0 && !spinning

  return (
    <PageTransition className="mx-auto max-w-5xl px-5 md:px-6">
      <header className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          {/* On phones the sticky header already shows the trip name. */}
          <p className="hidden truncate text-sm font-medium text-muted-foreground md:block">{trip.name}</p>
          <h1 className="text-[2.3rem] leading-none md:text-5xl">{t('roulette.title')}</h1>
        </div>
        <div className="flex items-center gap-3">
          <OnlineMembers className="hidden sm:inline-flex" />
          <Button variant="glass" size="icon-sm" onClick={() => setSoundOn(!soundOn)} aria-label={t('roulette.sound')} aria-pressed={soundOn}>
            {soundOn ? <Volume2 /> : <VolumeX />}
          </Button>
        </div>
      </header>
      <p className="mt-2 max-w-lg text-sm text-muted-foreground">{t('roulette.subtitle')}</p>
      <OnlineMembers className="mt-3 sm:hidden" />

      {isLoading && <Skeleton className="mx-auto mt-8 aspect-square w-full max-w-[22rem] rounded-full" />}

      {!isLoading && entries.length === 0 && (
        <>
          <EmptyState seed="2" icon={<Dices />} title={t('roulette.emptyTitle')} body={t('roulette.emptyBody')}>
            <Button asChild size="lg">
              <Link to={`/trips/${trip.id}`}>
                {t('roulette.goVote')}
                <ArrowRight />
              </Link>
            </Button>
          </EmptyState>
          {/* The spin can be set before anyone has voted: "vote by Friday, the wheel spins at nine". */}
          <RouletteSchedule className="mx-auto max-w-md" />
        </>
      )}

      {!isLoading && entries.length > 0 && (
        <div className="mt-6 grid items-start gap-8 md:mt-8 md:grid-cols-[1.15fr_1fr] md:gap-10">
          <div className="space-y-5 md:space-y-6">
            <RouletteWheel
              entries={entries}
              rotation={rotation}
              spinning={spinning}
              hubLabel={spinning ? '…' : hidden ? '?' : t('roulette.hub')}
              hubDisabled={!canSpin}
              onHubClick={() => canSpin && setConfirming(true)}
            />
            {canEdit ? (
              <Button size="lg" className="mx-auto flex h-16 w-full max-w-xs text-lg" disabled={!canSpin} onClick={() => setConfirming(true)}>
                <Dices className="size-6" />
                {spinning ? t('roulette.spinning') : t('roulette.spin')}
              </Button>
            ) : (
              <p className="mx-auto flex w-fit items-center gap-1.5 rounded-full bg-foreground/[0.05] px-4 py-2 text-sm text-muted-foreground">
                <Lock className="size-4" />
                {t('roulette.viewerHint')}
              </p>
            )}
            <RouletteSchedule />
          </div>

          <section className="glass rounded-[2rem] p-5">
            <h2 className="mb-3 font-sans text-xs font-bold tracking-[0.18em] text-muted-foreground uppercase">{t('roulette.odds')}</h2>
            {hidden ? (
              <p className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
                <Lock className="mt-0.5 size-4 shrink-0 text-primary" />
                {t('secret.wheelHint')}
              </p>
            ) : (
              <ul className="space-y-1">
                {odds.map((e, i) => (
                  <li key={e.destination.id}>
                    <button
                      type="button"
                      onClick={() => openDestination(e.destination.id)}
                      className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition hover:bg-foreground/[0.04]"
                    >
                      <span className="size-3.5 shrink-0 rounded-full" style={{ background: sliceColor(i, odds.length) }} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{e.destination.name}</span>
                        <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-foreground/[0.06]">
                          <motion.span
                            className="block h-full rounded-full"
                            style={{ background: sliceColor(i, odds.length) }}
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
            )}
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
        open={confirming}
        onOpenChange={setConfirming}
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
    </PageTransition>
  )
}
