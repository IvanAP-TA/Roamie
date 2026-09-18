import { BedDouble, Plane, Ticket } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useTripContext } from '@/hooks/useTripContext'
import priceLevels from '@/data/price-levels.json'
import { useOrigin } from '@/lib/origin'
import { estimateTripCost, tripDays, type Range } from '@/lib/tripCost'
import type { Destination } from '@/lib/types'
import { cn } from '@/lib/utils'
import { OriginSelect } from './OriginSelect'

interface Row {
  icon: typeof Plane
  label: React.ReactNode
  key: string
  value: string
}

/** Per-person cost estimate for a destination: return flight from the user's country, a night, a day, the whole trip. */
export function CostEstimate({ destination, className }: { destination: Destination; className?: string }) {
  const { t, i18n } = useTranslation()
  const { trip } = useTripContext()
  const { days, source } = tripDays(trip)
  const [origin] = useOrigin()
  const estimate = estimateTripCost(destination, days, origin)
  if (!estimate.flight && !estimate.local) return null

  const euros: Intl.NumberFormat & { formatRange?: (start: number, end: number) => string } = new Intl.NumberFormat(
    i18n.resolvedLanguage ?? 'it',
    { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 },
  )
  // formatRange writes "€150–350" / "150-350 €" the local way; older browsers get the plain version.
  const range = ({ low, high }: Range) => euros.formatRange?.(low, high) ?? `${euros.format(low)}–${euros.format(high)}`

  const rows: (Row | null | false)[] = [
    {
      icon: Plane,
      label: <OriginSelect label={t('cost.origin')} />,
      key: 'flight',
      value: estimate.flight === 'near' ? t('cost.flightNear') : estimate.flight ? range(estimate.flight) : t('cost.flightUnknown'),
    },
    estimate.local && { icon: BedDouble, label: t('cost.stay'), key: 'stay', value: t('cost.perNight', { amount: euros.format(estimate.local.night) }) },
    estimate.local && { icon: Ticket, label: t('cost.daily'), key: 'daily', value: t('cost.perDay', { amount: euros.format(estimate.local.day) }) },
  ]
  const shown = rows.filter((row): row is Row => Boolean(row))

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
        {shown.map(({ icon: Icon, label, key, value }) => (
          <li key={key} className="flex items-center gap-3 text-sm">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-background/60 text-muted-foreground">
              <Icon className="size-4" />
            </span>
            <span className="min-w-0 flex-1 text-muted-foreground">
              {key === 'flight' ? (
                <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                  {t('cost.flightFrom')} {label}
                </span>
              ) : (
                label
              )}
            </span>
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
