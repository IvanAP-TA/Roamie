import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useClimate } from '@/hooks/useClimate'
import { monthRanges, type Climate } from '@/lib/climate'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/misc'
import { cn } from '@/lib/utils'

function useMonthNames(lang: string) {
  return useMemo(() => {
    const short = new Intl.DateTimeFormat(lang, { month: 'short' })
    const long = new Intl.DateTimeFormat(lang, { month: 'long' })
    const at = (m: number) => new Date(Date.UTC(2021, m, 15))
    return {
      short: Array.from({ length: 12 }, (_, m) => short.format(at(m)).replace('.', '')),
      long: Array.from({ length: 12 }, (_, m) => long.format(at(m))),
    }
  }, [lang])
}

/** "Best time to go: May–Aug" text, or null when no month is pleasant. */
export function useBestMonthsLabel(climate: Climate | undefined): string | null {
  const { i18n } = useTranslation()
  const names = useMonthNames(i18n.resolvedLanguage ?? 'en')
  if (!climate || climate.best.length === 0) return null
  return monthRanges(climate.best)
    .map(([from, to]) => (from === to ? names.long[from] : `${names.short[from]}–${names.short[to]}`))
    .join(', ')
}

/**
 * Month-by-month climate: two aligned small charts (temperature range, rainy days) instead of one
 * dual-axis plot, best months tinted and also named in text, a per-month readout on hover/focus/tap,
 * and the full numbers in a table.
 */
export function ClimateCard({ lat, lng, className }: { lat: number; lng: number; className?: string }) {
  const { t, i18n } = useTranslation()
  const names = useMonthNames(i18n.resolvedLanguage ?? 'en')
  const { data: climate, isLoading, isError, refetch } = useClimate(lat, lng)
  const bestLabel = useBestMonthsLabel(climate)
  const [active, setActive] = useState<number | null>(null)

  if (isLoading) return <Skeleton className={cn('h-56 rounded-[1.5rem]', className)} />

  if (isError || !climate) {
    return (
      <div className={cn('flex items-center justify-between gap-3 rounded-[1.5rem] bg-foreground/[0.03] px-4 py-3 text-sm text-muted-foreground', className)}>
        {t('climate.error')}
        <Button variant="ghost" size="sm" onClick={() => void refetch()}>
          {t('common.retry')}
        </Button>
      </div>
    )
  }

  const { months, best, years } = climate
  const bestSet = new Set(best)
  const low = Math.min(...months.map((m) => m.tempMin)) - 2
  const high = Math.max(...months.map((m) => m.tempMax)) + 2
  const tempPct = (value: number) => ((value - low) / (high - low)) * 100
  const rainMax = Math.max(10, ...months.map((m) => m.rainDays))

  const readout = (i: number) => {
    const m = months[i]
    return [
      names.long[i],
      `${Math.round(m.tempMin)}–${Math.round(m.tempMax)} °C`,
      t('climate.rainDays', { count: Math.round(m.rainDays) }),
      t('climate.sun', { hours: Math.round(m.sunHours) }),
    ].join(' · ')
  }

  return (
    <section className={cn('rounded-[1.5rem] bg-foreground/[0.03] p-4', className)} aria-labelledby="climate-title">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id="climate-title" className="font-sans text-xs font-bold tracking-wide text-primary uppercase">
          {t('climate.title')}
        </h3>
        <span className="text-[0.65rem] text-muted-foreground tabular-nums">
          {years[0]}–{years[1]}
        </span>
      </div>
      <p className="mt-1 text-sm font-semibold">{bestLabel ? t('climate.best', { months: bestLabel }) : t('climate.noBest')}</p>
      <p className="mt-1.5 min-h-4 text-xs text-muted-foreground" aria-live="polite">
        {active != null ? readout(active) : t('climate.hint')}
      </p>

      <div className="mt-2 grid grid-cols-12 gap-0.5" onPointerLeave={() => setActive(null)}>
        {months.map((m, i) => (
          <button
            key={i}
            type="button"
            aria-label={readout(i)}
            onPointerEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
            onClick={() => setActive(i)}
            className={cn(
              'relative flex flex-col items-center rounded-lg pt-1.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
              bestSet.has(i) && 'bg-sun/20',
              // An outline, so a selected best month keeps its tint.
              active === i && 'ring-1 ring-foreground/30',
            )}
          >
            {/* temperature: low–high range */}
            <span className="relative block h-20 w-full">
              <span
                className="absolute left-1/2 w-2 -translate-x-1/2 rounded-full bg-chart-temp"
                style={{ bottom: `${tempPct(m.tempMin)}%`, top: `${100 - tempPct(m.tempMax)}%` }}
              />
            </span>
            {/* rainy days, from a shared baseline */}
            <span className="relative mt-2 block h-12 w-full border-b border-border">
              <span
                className="absolute bottom-0 left-1/2 w-2 -translate-x-1/2 rounded-t-[4px] bg-chart-rain"
                style={{ height: `${Math.max((m.rainDays / rainMax) * 100, m.rainDays > 0 ? 4 : 0)}%` }}
              />
            </span>
            <span className="mt-1 mb-1 text-[0.58rem] leading-none text-muted-foreground uppercase">{names.short[i].slice(0, 1)}</span>
          </button>
        ))}
      </div>

      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[0.68rem] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-1.5 rounded-full bg-chart-temp" />
          {t('climate.legendTemp')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-1.5 rounded-t-[3px] bg-chart-rain" />
          {t('climate.legendRain')}
        </span>
        {best.length > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span className="size-3 rounded-[4px] bg-sun/30" />
            {t('climate.legendBest')}
          </span>
        )}
      </div>

      <details className="mt-3 text-xs">
        <summary className="cursor-pointer text-muted-foreground underline-offset-4 hover:underline">{t('climate.table')}</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left tabular-nums">
            <thead className="text-muted-foreground">
              <tr>
                <th className="py-1 pr-2 font-medium">{t('climate.colMonth')}</th>
                <th className="py-1 pr-2 font-medium">°C</th>
                <th className="py-1 pr-2 font-medium">{t('climate.colRain')}</th>
                <th className="py-1 font-medium">{t('climate.colSun')}</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m, i) => (
                <tr key={i} className={cn('border-t border-border', bestSet.has(i) && 'font-semibold')}>
                  <td className="py-1 pr-2 capitalize">{names.long[i]}</td>
                  <td className="py-1 pr-2">
                    {Math.round(m.tempMin)}–{Math.round(m.tempMax)}
                  </td>
                  <td className="py-1 pr-2">{Math.round(m.rainDays)}</td>
                  <td className="py-1">{Math.round(m.sunHours)} h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <p className="mt-2.5 text-[0.65rem] leading-relaxed text-muted-foreground">
        {t('climate.estimate')} ·{' '}
        <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">
          Weather data by Open-Meteo.com
        </a>
      </p>
    </section>
  )
}
