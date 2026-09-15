import type { ReactNode } from 'react'
import { Trophy } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { useClimate } from '@/hooks/useClimate'
import { CoverImage } from '@/components/media/CoverImage'
import { Skeleton } from '@/components/ui/misc'
import { Sheet } from '@/components/ui/sheet'
import { totalPoints } from '@/lib/roulette'
import { estimatedBudgetLevel } from '@/lib/tripCost'
import type { Destination } from '@/lib/types'
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
  const topPoints = Math.max(...destinations.map(totalPoints))
  const leaders = destinations.filter((d) => totalPoints(d) === topPoints)
  const hasClimate = destinations.some((d) => d.lat != null && d.lng != null)

  const rows: { key: string; label: string; render: (d: Destination) => ReactNode }[] = [
    {
      key: 'points',
      label: t('compare.points'),
      render: (d) => (
        <span className="flex flex-col gap-0.5">
          <span className="text-lg leading-none font-semibold tabular-nums">{totalPoints(d)}</span>
          <span className="text-xs text-muted-foreground">{t('points.mine', { count: d.votes.find((v) => v.user_id === user?.id)?.points ?? 0 })}</span>
          {topPoints > 0 && leaders.length === 1 && leaders[0].id === d.id && (
            <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[0.68rem] font-semibold text-accent-foreground">
              <Trophy className="size-3" />
              {t('compare.leader')}
            </span>
          )}
        </span>
      ),
    },
    { key: 'best', label: t('compare.bestTime'), render: (d) => <BestTimeCell destination={d} /> },
    {
      key: 'budget',
      label: t('compare.budget'),
      render: (d) => {
        const level = estimatedBudgetLevel(d)
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
      <div className="-mx-3 overflow-x-auto px-1 pb-2">
        <table className="w-full border-separate border-spacing-x-1.5 text-sm">
          <thead>
            <tr>
              <th className="w-[4.25rem]" />
              {destinations.map((d) => (
                <th key={d.id} scope="col" className="min-w-[6.25rem] pb-2 text-left align-top font-normal">
                  <button type="button" onClick={() => onOpenDestination(d.id)} className="group w-full text-left" aria-label={t('compare.open', { name: d.name })}>
                    <CoverImage url={d.image_url} seed={d.name} pin showAttribution={false} className="aspect-[4/3] w-full rounded-2xl shadow-soft" />
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
                {destinations.map((d) => (
                  <td key={d.id} className="border-t border-border py-3 align-top">
                    {row.render(d)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
