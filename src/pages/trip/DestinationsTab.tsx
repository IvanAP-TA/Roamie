import { useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDownWideNarrow, Clock, Columns3, Eye, MapPinPlus, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useDestinations } from '@/hooks/useDestinations'
import { useTripContext } from '@/hooks/useTripContext'
import { PageTransition } from '@/components/layout/PageTransition'
import { CoverImage } from '@/components/media/CoverImage'
import { CompareSheet } from '@/components/destinations/CompareSheet'
import { DestinationCard } from '@/components/destinations/DestinationCard'
import { DestinationFormSheet } from '@/components/destinations/DestinationFormSheet'
import { GuidesLinkButton } from '@/components/guides/GuidesLink'
import { NextDestinationCard } from '@/components/destinations/NextDestinationCard'
import { PointsLeftBadge } from '@/components/destinations/PointsControl'
import { ResetPointsButton } from '@/components/destinations/ResetPoints'
import { DatesPrompt } from '@/components/plan/DatesPrompt'
import { MOOD_META } from '@/components/destinations/moods'
import { AvatarStack } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Chip, EmptyState, Skeleton } from '@/components/ui/misc'
import { totalPoints } from '@/lib/roulette'
import { keepOrder } from '@/lib/stableOrder'
import { MOODS, type Destination, type DestinationStatus, type Mood } from '@/lib/types'
import { cn } from '@/lib/utils'

const STATUSES: DestinationStatus[] = ['proposed', 'selected', 'visited']
const MAX_COMPARE = 3

export default function DestinationsTab() {
  const { t } = useTranslation()
  const { trip, members, canEdit } = useTripContext()
  const { data: destinations, isLoading, isError, isFetchedAfterMount, refetch } = useDestinations(trip.id)
  const [, setParams] = useSearchParams()
  const [status, setStatus] = useState<DestinationStatus>('proposed')
  const [moodFilter, setMoodFilter] = useState<Mood | null>(null)
  const [sort, setSort] = useState<'votes' | 'recent'>('votes')
  const [adding, setAdding] = useState(false)

  // Compare mode: tapping cards selects up to 3 of them. The ref mirrors the selection so taps that
  // arrive before a re-render still see the latest value.
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const selectedRef = useRef<string[]>([])
  const [comparing, setComparing] = useState(false)

  const open = (id: string) =>
    setParams((p) => {
      p.set('d', id)
      return p
    })

  const updateSelected = (next: string[]) => {
    selectedRef.current = next
    setSelected(next)
  }

  const stopSelecting = () => {
    setSelecting(false)
    updateSelected([])
  }

  const toggleSelected = (id: string) => {
    const current = selectedRef.current
    if (current.includes(id)) updateSelected(current.filter((x) => x !== id))
    else if (current.length >= MAX_COMPARE) toast(t('compare.max'))
    else updateSelected([...current, id])
  }

  const counts = useMemo(
    () => Object.fromEntries(STATUSES.map((s) => [s, destinations?.filter((d) => d.status === s).length ?? 0])) as Record<DestinationStatus, number>,
    [destinations],
  )

  const next = useMemo(
    () =>
      destinations
        ?.filter((d) => d.status === 'selected')
        .sort((a, b) => (b.selected_at ?? '').localeCompare(a.selected_at ?? ''))[0],
    [destinations],
  )

  // The order is settled once fresh data arrives, and again only when the tab, filter or sort changes (or the page is
  // opened again): votes coming in, ours or other members', don't reshuffle the cards under the finger. A card moving
  // up also dragged the page with it, because the browser keeps the element being tapped in view.
  const frozenOrder = useRef<{ view: string; ids: string[] } | null>(null)
  const list = useMemo(() => {
    const filtered = (destinations ?? []).filter((d) => d.status === status && (!moodFilter || d.mood.includes(moodFilter)))
    const sorted =
      sort === 'votes'
        ? [...filtered].sort((a, b) => totalPoints(b) - totalPoints(a) || b.created_at.localeCompare(a.created_at))
        : filtered
    const view = `${status}|${moodFilter ?? ''}|${sort}`
    const frozen = frozenOrder.current

    if (!frozen || frozen.view !== view || !isFetchedAfterMount) {
      frozenOrder.current = isFetchedAfterMount ? { view, ids: sorted.map((d) => d.id) } : null
      return sorted
    }
    // Destinations added meanwhile go first, so a new proposal is in sight.
    const ordered = keepOrder(sorted, frozen.ids)
    frozenOrder.current = { view, ids: ordered.map((d) => d.id) }
    return ordered
  }, [destinations, status, moodFilter, sort, isFetchedAfterMount])

  // In the order they were picked; destinations deleted meanwhile drop out.
  const compared = selected.map((id) => destinations?.find((d) => d.id === id)).filter((d): d is Destination => Boolean(d))

  const usedMoods = MOODS.filter((m) => destinations?.some((d) => d.status === status && d.mood.includes(m)))

  const viewTools = (
    <>
      <Button
        variant={selecting ? 'default' : 'glass'}
        size="icon"
        onClick={() => (selecting ? stopSelecting() : setSelecting(true))}
        aria-pressed={selecting}
        aria-label={t('compare.toggle')}
        title={t('compare.toggle')}
        disabled={(destinations?.length ?? 0) < 2}
      >
        <Columns3 />
      </Button>
      <Button
        variant="glass"
        size="icon"
        onClick={() => setSort(sort === 'votes' ? 'recent' : 'votes')}
        aria-label={sort === 'votes' ? t('destination.sortVotes') : t('destination.sortRecent')}
        title={sort === 'votes' ? t('destination.sortVotes') : t('destination.sortRecent')}
      >
        {sort === 'votes' ? <ArrowDownWideNarrow /> : <Clock />}
      </Button>
    </>
  )

  return (
    <PageTransition className="mx-auto max-w-5xl">
      {/* ── Hero ── */}
      <section className="px-3 md:px-6">
        <CoverImage
          url={trip.cover_image_url}
          attribution={trip.cover_image_attribution}
          seed={trip.id}
          className="h-60 rounded-[2.25rem] shadow-soft md:h-72"
        >
          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_25%,rgb(20_10_5/0.7))]" />
          <div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-3 text-white md:inset-x-8 md:bottom-7">
            <div className="min-w-0">
              <h1 className="text-[2.5rem] leading-[0.95] drop-shadow-md md:text-6xl">{trip.name}</h1>
              {trip.description && <p className="mt-2 line-clamp-2 max-w-xl text-sm text-white/85 md:text-base">{trip.description}</p>}
            </div>
            <AvatarStack profiles={members.map((m) => m.profile)} max={4} size="size-9" className="shrink-0 [&>*]:ring-white/80" />
          </div>
        </CoverImage>
      </section>

      <div className="space-y-6 px-5 pt-6 md:px-6">
        {next && <NextDestinationCard destination={next} onOpen={() => open(next.id)} />}
        <DatesPrompt />

        {/* ── Toolbar ── */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            {/* min-w-0 lets the tabs shrink on narrow phones instead of pushing the page wider than the screen. */}
            <div className="glass relative flex min-w-0 flex-1 gap-1 rounded-full p-1 sm:flex-none">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setStatus(s)
                    setMoodFilter(null)
                  }}
                  className={cn(
                    'relative min-w-0 flex-1 rounded-full px-1.5 py-2 text-[13px] font-semibold min-[360px]:px-2 min-[360px]:text-sm whitespace-nowrap transition-colors sm:flex-none sm:px-4',
                    status === s ? 'text-background' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {status === s && (
                    <motion.span layoutId="status-pill" className="absolute inset-0 rounded-full bg-foreground" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />
                  )}
                  <span className="relative block truncate">
                    {t(`status.tab.${s}`)} <span className="opacity-60">{counts[s]}</span>
                  </span>
                </button>
              ))}
            </div>
            <div className="hidden shrink-0 gap-2 md:flex">{viewTools}</div>
            {canEdit && (
              <Button className="hidden md:inline-flex" onClick={() => setAdding(true)}>
                <Plus />
                {t('destination.add')}
              </Button>
            )}
          </div>

          {/* Phones and small tablets: the status tabs fill the row above, so proposing, compare & sort sit here. */}
          <div className="flex items-center gap-2 md:hidden">
            {canEdit && !selecting && (
              <Button className="rounded-full" onClick={() => setAdding(true)}>
                <MapPinPlus />
                {t('destination.propose')}
              </Button>
            )}
            <div className="ml-auto flex shrink-0 gap-2">{viewTools}</div>
          </div>

          {usedMoods.length > 1 && (
            <div className="scrollbar-none -mx-5 flex gap-2 overflow-x-auto px-5 md:mx-0 md:px-0">
              <Chip size="sm" active={moodFilter === null} onClick={() => setMoodFilter(null)}>
                {t('destination.allMoods')}
              </Chip>
              {usedMoods.map((m) => {
                const Icon = MOOD_META[m].icon
                return (
                  <Chip key={m} size="sm" active={moodFilter === m} onClick={() => setMoodFilter(moodFilter === m ? null : m)}>
                    <Icon className={cn(moodFilter !== m && MOOD_META[m].tint)} />
                    {t(`moods.${m}`)}
                  </Chip>
                )
              })}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {selecting ? (
              <p className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground">
                <Columns3 className="size-3.5" />
                {t('compare.selectHint')}
              </p>
            ) : (
              status === 'proposed' &&
              counts.proposed > 0 && (
                <>
                  <PointsLeftBadge tripId={trip.id} />
                  <ResetPointsButton destinations={destinations ?? []} />
                </>
              )
            )}
            {!canEdit && (
              <p className="inline-flex items-center gap-1.5 rounded-full bg-foreground/[0.05] px-3 py-1.5 text-xs text-muted-foreground">
                <Eye className="size-3.5" />
                {t('destination.viewerHint')}
              </p>
            )}
          </div>
        </div>

        {/* ── List ── */}
        {isLoading && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-[19rem] rounded-[2rem]" />
            ))}
          </div>
        )}

        {isError && (
          <EmptyState seed="error" title={t('errors.loadDestinations')}>
            <Button onClick={() => void refetch()}>{t('common.retry')}</Button>
          </EmptyState>
        )}

        {destinations && list.length === 0 && (
          <EmptyState
            seed={status}
            icon={<MapPinPlus />}
            title={t(`destination.empty.${status}.title`)}
            body={t(`destination.empty.${status}.body`)}
          >
            {status === 'proposed' && canEdit && (
              <Button size="lg" onClick={() => setAdding(true)}>
                <Plus />
                {t('destination.add')}
              </Button>
            )}
            {status === 'proposed' && <GuidesLinkButton size="lg" variant="glass" />}
          </EmptyState>
        )}

        {list.length > 0 && (
          <motion.div layout className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {list.map((d) => (
                <DestinationCard
                  key={d.id}
                  destination={d}
                  selectable={selecting}
                  selected={selected.includes(d.id)}
                  onOpen={() => (selecting ? toggleSelected(d.id) : open(d.id))}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Compare bar, above the dock in the thumb zone */}
      <AnimatePresence>
        {selecting && (
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            className="glass-strong fixed inset-x-4 bottom-[calc(max(env(safe-area-inset-bottom),0.75rem)+5.75rem)] z-30 mx-auto flex max-w-md items-center gap-1 rounded-full py-1.5 pr-1.5 pl-5 shadow-lift md:bottom-8"
          >
            <span className="flex-1 truncate text-sm font-medium" aria-live="polite">
              {t('compare.selected', { count: selected.length })}
            </span>
            <Button variant="ghost" size="sm" onClick={stopSelecting}>
              {t('common.cancel')}
            </Button>
            <Button size="sm" disabled={compared.length < 2} onClick={() => setComparing(true)}>
              <Columns3 />
              {t('compare.cta')}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <DestinationFormSheet open={adding} onOpenChange={setAdding} tripId={trip.id} />

      <CompareSheet
        open={comparing && compared.length >= 2}
        onOpenChange={setComparing}
        destinations={compared}
        onOpenDestination={(id) => {
          setComparing(false)
          open(id)
        }}
      />
    </PageTransition>
  )
}
