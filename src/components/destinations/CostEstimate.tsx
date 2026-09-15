import { BedDouble, Plane, Ticket } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useTripContext } from '@/hooks/useTripContext'
import priceLevels from '@/data/price-levels.json'
import { estimateTripCost, tripDays, type Range } from '@/lib/tripCost'
import type { Destination } from '@/lib/types'
import { cn } from '@/lib/utils'

/** Per-person cost estimate for a destination: return flight from Italy, a night, a day, and the whole trip. */
export function CostEstimate({ destination, className }: { destination: Destination; className?: string }) {
  const { t, i18n } = useTranslation()
  const { trip } = useTripContext()
  const { days, source } = tripDays(trip)
  const estimate = estimateTripCost(destination, days)
  if (!estimate.flight && !estimate.local) return null

  const euros: Intl.NumberFormat & { formatRange?: (start: number, end: number) => string } = new Intl.NumberFormat(
    i18n.resolvedLanguage ?? 'it',
    { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 },
  )
  // formatRange writes "€150–350" / "150-350 €" the local way; older browsers get the plain version.
  const range = ({ low, high }: Range) => euros.formatRange?.(low, high) ?? `${euros.format(low)}–${euros.format(high)}`

  const rows = [
    {
      icon: Plane,
      label: t('cost.flight'),
      value: estimate.flight === 'near' ? t('cost.flightNear') : estimate.flight ? range(estimate.flight) : t('cost.flightUnknown'),
    },
    estimate.local && { icon: BedDouble, label: t('cost.stay'), value: t('cost.perNight', { amount: euros.format(estimate.local.night) }) },
    estimate.local && { icon: Ticket, label: t('cost.daily'), value: t('cost.perDay', { amount: euros.format(estimate.local.day) }) },
  ].filter((row): row is { icon: typeof Plane; label: string; value: string } => Boolean(row))

  return (
    <section className={cn('rounded-[1.5rem] bg-foreground/[0.03] p-4', className)} aria-labelledby="cost-title">
      <h3 id="cost-title" className="font-sans text-xs font-bold tracking-wide text-primary uppercase">
        {t('cost.title')}
      </h3>
      {estimate.total && (
        <p className="mt-1 text-sm font-semibold">
          {source === 'default'
            ? t('cost.totalWeek', { range: range(estimate.total) })
            : t('cost.totalDays', { range: range(estimate.total), count: days })}
        </p>
      )}

      <ul className="mt-3 space-y-2">
        {rows.map(({ icon: Icon, label, value }) => (
          <li key={label} className="flex items-center gap-3 text-sm">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-background/60 text-muted-foreground">
              <Icon className="size-4" />
            </span>
            <span className="min-w-0 flex-1 text-muted-foreground">{label}</span>
            <span className="text-right font-medium tabular-nums">{value}</span>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-[0.65rem] leading-relaxed text-muted-foreground">
        {t('cost.disclaimer')} ·{' '}
        <a
          href="https://data.worldbank.org/indicator/PA.NUS.PRVT.PP"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-foreground"
        >
          {t('cost.source', { years: priceLevels.years.join('–') })}
        </a>
      </p>
    </section>
  )
}
