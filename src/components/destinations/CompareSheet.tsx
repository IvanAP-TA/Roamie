import { useState, type ReactNode } from 'react'
import { ArrowRight, RotateCcw, Sparkles, ThumbsUp, Trophy } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { AiCompareError, ASPECTS, useAiComparison, type Comparison } from '@/hooks/useAiComparison'
import { useClimate } from '@/hooks/useClimate'
import { CoverImage } from '@/components/media/CoverImage'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/misc'
import { Sheet } from '@/components/ui/sheet'
import { totalPoints } from '@/lib/roulette'
import { useTripContext } from '@/hooks/useTripContext'
import { sortReasons } from '@/lib/reasons'
import { votesHidden } from '@/lib/secretVoting'
import { useOrigin } from '@/lib/origin'
import { estimatedBudgetLevel } from '@/lib/tripCost'
import type { Destination } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useBestMonthsLabel } from './ClimateCard'
import { BudgetIndicator, MoodTag } from './moods'

function BestTimeCell({ destination: d }: { destination: Destination }) {
  const { t } = useTranslation()
  const { data, isLoading, isError } = useClimate(d.lat, d.lng)
  const label = useBestMonthsLabel(data)

  if (d.lat == null || d.lng == null) return <span className="text-muted-foreground">{t('compare.noCoords')}</span>
  if (isLoading) return <Skeleton className="h-4 w-16 rounded-md" />
  if (isError || !data) return <span className="text-muted-foreground">—</span>
  return <span className="font-medium">{label ?? t('compare.noBest')}</span>
}

const empty = <span className="text-muted-foreground">—</span>

type Row = { key: string; label: string; render: (d: Destination, i: number) => ReactNode }

function ScoreDots({ score, best }: { score: number; best: boolean }) {
  return (
    <span className="flex gap-0.5" aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={cn('size-1.5 rounded-full', i <= score ? (best ? 'bg-primary' : 'bg-foreground/55') : 'bg-foreground/12')} />
      ))}
    </span>
  )
}

const panel = 'mb-4 rounded-3xl p-4'
const warm = 'bg-[linear-gradient(135deg,color-mix(in_oklab,var(--coral)_13%,transparent),color-mix(in_oklab,var(--primary)_9%,transparent))]'

/** The AI's verdict above the table: ask for it, wait, or read the summary and which place suits what. */
function AiPanel({
  destinations,
  requested,
  onRequest,
  query,
}: {
  destinations: Destination[]
  requested: boolean
  onRequest: () => void
  query: ReturnType<typeof useAiComparison>
}) {
  const { t } = useTranslation()

  if (!requested) {
    return (
      <div className={cn(panel, warm, 'flex flex-col gap-3 sm:flex-row sm:items-center')}>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 font-semibold">
            <Sparkles className="size-4 text-primary" />
            {t('aiCompare.title')}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">{t('aiCompare.intro')}</p>
        </div>
        <Button size="sm" onClick={onRequest} className="shrink-0">
          <Sparkles className="size-4" />
          {t('aiCompare.cta')}
        </Button>
      </div>
    )
  }

  if (query.isPending) {
    return (
      <div className={cn(panel, 'space-y-2 bg-foreground/[0.04]')} role="status">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <Sparkles className="size-4 animate-pulse text-primary" />
          {t('aiCompare.loading')}
        </p>
        <Skeleton className="h-4 w-full rounded-md" />
        <Skeleton className="h-4 w-4/5 rounded-md" />
      </div>
    )
  }

  if (query.isError) {
    const code = query.error instanceof AiCompareError ? query.error.message : 'failed'
    const known = ['user_limit', 'global_limit', 'busy', 'not_configured', 'unauthorized'].includes(code) ? code : 'failed'
    return (
      <div className={cn(panel, 'flex flex-col gap-3 bg-foreground/[0.04] sm:flex-row sm:items-center')} role="alert">
        <p className="min-w-0 flex-1 text-sm">{t(`aiCompare.errors.${known}`)}</p>
        {(known === 'busy' || known === 'failed') && (
          <Button size="sm" variant="outline" onClick={() => void query.refetch()} className="shrink-0">
            <RotateCcw className="size-4" />
            {t('aiCompare.retry')}
          </Button>
        )}
      </div>
    )
  }

  const comparison = query.data
  return (
    <div className={cn(panel, warm)}>
      <p className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-primary uppercase">
        <Sparkles className="size-3.5" />
        {t('aiCompare.title')}
      </p>
      <p className="mt-1.5 text-[0.95rem] leading-relaxed">{comparison.summary}</p>
      {comparison.picks.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {comparison.picks.map((pick, i) => (
            <li key={i} className="flex flex-wrap items-center gap-x-1.5 text-sm">
              <span className="text-muted-foreground">{pick.if}</span>
              <ArrowRight className="size-3.5 text-muted-foreground" />
              <span className="font-semibold">{destinations[pick.place]?.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Table rows from the AI answer: a headline, one row per aspect with its score, who it suits, what to watch out for. */
function aiRows(comparison: Comparison, t: (key: string) => string): Row[] {
  const text = (value: string) => <span className="block text-xs leading-snug">{value}</span>
  return [
    { key: 'ai-headline', label: t('aiCompare.headline'), render: (_, i) => <span className="block text-sm leading-snug font-semibold">{comparison.places[i].headline}</span> },
    ...ASPECTS.map((aspect): Row => {
      const top = Math.max(...comparison.places.map((p) => p.scores[aspect].score))
      return {
        key: `ai-${aspect}`,
        label: t(`aiCompare.aspects.${aspect}`),
        render: (_, i) => {
          const { score, note } = comparison.places[i].scores[aspect]
          return (
            <span className="flex flex-col gap-1">
              <ScoreDots score={score} best={score === top} />
              <span className="sr-only">{score}/5</span>
              {text(note)}
            </span>
          )
        },
      }
    }),
    { key: 'ai-bestFor', label: t('aiCompare.bestFor'), render: (_, i) => text(comparison.places[i].bestFor) },
    { key: 'ai-watchOut', label: t('aiCompare.watchOut'), render: (_, i) => text(comparison.places[i].watchOut) },
  ]
}

/** 2–3 destinations side by side: one column each, one row per attribute. */
export function CompareSheet({
  open,
  onOpenChange,
  destinations,
  onOpenDestination,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  destinations: Destination[]
  onOpenDestination: (id: string) => void
}) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { trip } = useTripContext()
  const hidden = votesHidden(trip)
  const [origin] = useOrigin()
  const topPoints = Math.max(...destinations.map(totalPoints))
  const leaders = destinations.filter((d) => totalPoints(d) === topPoints)
  const hasClimate = destinations.some((d) => d.lat != null && d.lng != null)
  // Asked for this selection only: picking other places shows the button again rather than spending a new request.
  const selection = destinations.map((d) => d.id).join()
  const [requestedFor, setRequestedFor] = useState<string | null>(null)
  const aiRequested = requestedFor === selection
  const ai = useAiComparison(destinations, open && aiRequested)

  const rows: Row[] = [
    {
      key: 'points',
      label: t('compare.points'),
      render: (d) => (
        <span className="flex flex-col gap-0.5">
          <span className="text-lg leading-none font-semibold tabular-nums">{hidden ? t('secret.hidden') : totalPoints(d)}</span>
          <span className="text-xs text-muted-foreground">{t('points.mine', { count: d.votes.find((v) => v.user_id === user?.id)?.points ?? 0 })}</span>
          {!hidden && topPoints > 0 && leaders.length === 1 && leaders[0].id === d.id && (
            <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[0.68rem] font-semibold text-accent-foreground">
              <Trophy className="size-3" />
              {t('compare.leader')}
            </span>
          )}
        </span>
      ),
    },
    {
      key: 'reasons',
      label: t('reasons.title'),
      render: (d) => {
        const top = sortReasons(d.reasons ?? [], hidden).slice(0, 2)
        if (top.length === 0) return empty
        return (
          <ul className="space-y-1.5">
            {top.map((r) => (
              <li key={r.id} className="text-xs leading-snug">
                <span className="line-clamp-3">“{r.text}”</span>
                {!hidden && r.likes.length > 0 && (
                  <span className="mt-0.5 inline-flex items-center gap-1 font-semibold text-primary tabular-nums">
                    <ThumbsUp className="size-3" />
                    {r.likes.length}
                  </span>
                )}
              </li>
            ))}
            {d.reasons.length > 2 && <li className="text-xs text-muted-foreground">{t('reasons.more', { count: d.reasons.length - 2 })}</li>}
          </ul>
        )
      },
    },
    ...(ai.data ? aiRows(ai.data, t) : []),
    { key: 'best', label: t('compare.bestTime'), render: (d) => <BestTimeCell destination={d} /> },
    {
      key: 'budget',
      label: t('compare.budget'),
      render: (d) => {
        const level = estimatedBudgetLevel(d, origin)
        return level ? <BudgetIndicator level={level} showLabel className="[&_.text-sm]:text-xs" /> : empty
      },
    },
    {
      key: 'mood',
      label: t('compare.mood'),
      render: (d) =>
        d.mood.length > 0 ? (
          <span className="flex flex-wrap gap-1">
            {d.mood.map((m) => (
              <MoodTag key={m} mood={m} />
            ))}
          </span>
        ) : (
          empty
        ),
    },
    { key: 'comments', label: t('compare.comments'), render: (d) => <span className="tabular-nums">{d.comments[0]?.count ?? 0}</span> },
    { key: 'proposedBy', label: t('compare.proposedBy'), render: (d) => d.creator?.display_name ?? t('group.formerMember') },
  ]

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t('compare.title')} className="md:max-w-3xl">
      <AiPanel destinations={destinations} requested={aiRequested} onRequest={() => setRequestedFor(selection)} query={ai} />
      <div className="-mx-3 overflow-x-auto px-1 pb-2">
        <table className="w-full border-separate border-spacing-x-1.5 text-sm">
          <thead>
            <tr>
              <th className="w-[4.25rem]" />
              {destinations.map((d) => (
                <th key={d.id} scope="col" className="min-w-[6.25rem] pb-2 text-left align-top font-normal">
                  <button type="button" onClick={() => onOpenDestination(d.id)} className="group w-full text-left" aria-label={t('compare.open', { name: d.name })}>
                    <CoverImage url={d.image_url} seed={d.name} pin showAttribution={false} sizes="200px" className="aspect-[4/3] w-full rounded-2xl shadow-soft" />
                    <span className="mt-2 line-clamp-2 block font-display text-lg leading-tight group-hover:underline">{d.name}</span>
                    {d.country && <span className="block truncate text-xs text-muted-foreground">{d.country}</span>}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <th scope="row" className="border-t border-border py-3 pr-1 text-left align-top text-[0.68rem] font-bold tracking-wide text-muted-foreground uppercase">
                  {row.label}
                </th>
                {destinations.map((d, i) => (
                  <td key={d.id} className="border-t border-border py-3 align-top">
                    {row.render(d, i)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {ai.data && <p className="mt-2 text-[0.65rem] text-muted-foreground">{t('aiCompare.disclaimer')}</p>}
      {hasClimate && (
        <p className="mt-2 text-[0.65rem] text-muted-foreground">
          {t('climate.estimate')} ·{' '}
          <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">
            Weather data by Open-Meteo.com
          </a>
        </p>
      )}
    </Sheet>
  )
}
