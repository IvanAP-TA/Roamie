import { useMemo, useState } from 'react'
import { CalendarCheck, CalendarDays, Loader2, Pencil } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { useTripContext } from '@/hooks/useTripContext'
import { useAvailability, useSetAvailability, useUpdateTripDates } from '@/hooks/useTripDates'
import { bestWindows, dayTotals, daysBetween, eachDay, pendingMembers, type DateWindow, type DayStatus } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/misc'
import { Sheet } from '@/components/ui/sheet'

type Brush = DayStatus | 'clear'

const BRUSHES: Brush[] = ['yes', 'maybe', 'clear']
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/
const utc = (day: string) => new Date(`${day}T00:00:00Z`)

function useDateFormats(lang: string) {
  return useMemo(() => {
    const short = new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short', timeZone: 'UTC' })
    const long = new Intl.DateTimeFormat(lang, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
    const month = new Intl.DateTimeFormat(lang, { month: 'long', year: 'numeric', timeZone: 'UTC' })
    const narrow = new Intl.DateTimeFormat(lang, { weekday: 'narrow', timeZone: 'UTC' })
    // 1–7 January 2024 run Monday to Sunday.
    const weekdays = Array.from({ length: 7 }, (_, i) => narrow.format(utc(`2024-01-0${i + 1}`)))
    const range = (from: string, to: string) => (from === to ? short.format(utc(from)) : short.formatRange(utc(from), utc(to)))
    return { long, month, weekdays, range }
  }, [lang])
}

/** Share of the group free on a day ("maybe" counts half) → one hue, from faint to full. */
function heatClass(share: number) {
  if (share <= 0) return 'bg-foreground/[0.04] text-foreground'
  if (share < 0.34) return 'bg-primary/15 text-foreground'
  if (share < 0.67) return 'bg-primary/35 text-foreground'
  if (share < 1) return 'bg-primary/65 text-white'
  return 'bg-primary text-primary-foreground'
}

const HEAT_STEPS = [0, 0.2, 0.5, 0.8, 1]

/** Choosing the dates together: the period, everyone's free days on a calendar, and the best windows. */
export function DatesSection() {
  const { t, i18n } = useTranslation()
  const format = useDateFormats(i18n.resolvedLanguage ?? 'en')
  const { user } = useAuth()
  const { trip, members, canEdit } = useTripContext()
  const { data: rows = [], isLoading } = useAvailability(trip.id)
  const setDays = useSetAvailability(trip.id)
  const updateDates = useUpdateTripDates(trip.id)
  const [brush, setBrush] = useState<Brush>('yes')
  const [editingWindow, setEditingWindow] = useState(false)

  const window =
    trip.date_window_start && trip.date_window_end && trip.trip_length
      ? { start: trip.date_window_start, end: trip.date_window_end, length: trip.trip_length }
      : null
  const memberIds = useMemo(() => members.map((m) => m.user_id), [members])
  const days = useMemo(() => (window ? eachDay(window.start, window.end) : []), [window?.start, window?.end]) // eslint-disable-line react-hooks/exhaustive-deps
  const totals = useMemo(() => dayTotals(days, memberIds, rows), [days, memberIds, rows])
  const mine = useMemo(() => new Map(rows.filter((r) => r.user_id === user?.id).map((r) => [r.day, r.status])), [rows, user?.id])
  const windows = useMemo(() => (window ? bestWindows(window, window.length, memberIds, rows) : []), [window?.start, window?.end, window?.length, memberIds, rows]) // eslint-disable-line react-hooks/exhaustive-deps
  const pending = window ? pendingMembers(window, memberIds, rows) : []
  const months = useMemo(() => {
    const byMonth = new Map<string, string[]>()
    for (const day of days) byMonth.set(day.slice(0, 7), [...(byMonth.get(day.slice(0, 7)) ?? []), day])
    return [...byMonth]
  }, [days])

  const nameOf = (userId: string) => members.find((m) => m.user_id === userId)?.profile?.display_name?.split(' ')[0] ?? t('group.unknown')
  const onError = () => toast.error(t('errors.generic'))

  const mark = (day: string) => {
    if (!user) return
    const current = mine.get(day) ?? null
    const status = brush === 'clear' || current === brush ? null : brush
    if (status === current) return
    setDays.mutate({ days: [day], status }, { onError })
  }

  const saveWindow = (input: { start: string; end: string; length: number }) =>
    updateDates.mutate(
      { date_window_start: input.start, date_window_end: input.end, trip_length: input.length },
      {
        onSuccess: () => {
          setEditingWindow(false)
          toast.success(t('dates.saved'))
        },
        onError,
      },
    )

  const fix = (w: DateWindow) =>
    updateDates.mutate({ start_date: w.start, end_date: w.end }, { onSuccess: () => toast.success(t('dates.fixed', { range: format.range(w.start, w.end) })), onError })

  if (!window) {
    return (
      <section className="glass space-y-4 rounded-[2rem] p-6">
        <CalendarDays className="size-8 text-primary" />
        <div>
          <h2 className="text-2xl">{t('dates.setupTitle')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{canEdit ? t('dates.setupBody') : t('dates.waitingBody')}</p>
        </div>
        {canEdit && <WindowForm busy={updateDates.isPending} onSave={saveWindow} />}
      </section>
    )
  }

  return (
    <div className="space-y-6">
      {trip.start_date && trip.end_date && (
        <div className="glass-strong flex flex-wrap items-center gap-3 rounded-[1.75rem] p-5">
          <CalendarCheck className="size-6 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold tracking-wide text-primary uppercase">{t('dates.tripDates')}</p>
            <p className="font-display text-2xl leading-tight">{format.range(trip.start_date, trip.end_date)}</p>
          </div>
          {canEdit && (
            <Button variant="ghost" size="sm" disabled={updateDates.isPending} onClick={() => updateDates.mutate({ start_date: null, end_date: null }, { onError })}>
              {t('dates.unfix')}
            </Button>
          )}
        </div>
      )}

      <section className="glass space-y-4 rounded-[2rem] p-4 md:p-6" aria-labelledby="dates-calendar">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="dates-calendar" className="font-semibold">
              {format.range(window.start, window.end)} · {t('dates.lengthDays', { count: window.length })}
            </h2>
            <p className="text-xs text-muted-foreground">{t('dates.tapHint')}</p>
          </div>
          {canEdit && (
            <Button variant="ghost" size="sm" onClick={() => setEditingWindow(true)}>
              <Pencil />
              {t('dates.editWindow')}
            </Button>
          )}
        </div>

        <div role="radiogroup" aria-label={t('dates.brushLabel')} className="flex gap-1 rounded-full bg-foreground/[0.05] p-1">
          {BRUSHES.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={brush === option}
              onClick={() => setBrush(option)}
              className={cn(
                'flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-full px-2 text-sm font-semibold transition-colors',
                brush === option ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'size-2.5 rounded-full',
                  option === 'yes' && 'bg-sage',
                  option === 'maybe' && 'border-2 border-current',
                  option === 'clear' && 'bg-current opacity-30',
                )}
              />
              {t(`dates.${option}`)}
            </button>
          ))}
        </div>

        {isLoading ? (
          <Skeleton className="h-72 rounded-[1.5rem]" />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {months.map(([key, monthDays]) => (
              <div key={key}>
                <h3 className="mb-2 font-display text-lg first-letter:uppercase">{format.month.format(utc(monthDays[0]))}</h3>
                <div className="grid grid-cols-7 gap-1 text-center">
                  {format.weekdays.map((weekday, i) => (
                    <span key={i} aria-hidden className="pb-1 text-[0.65rem] font-semibold text-muted-foreground uppercase">
                      {weekday}
                    </span>
                  ))}
                  {Array.from({ length: (utc(monthDays[0]).getUTCDay() + 6) % 7 }, (_, i) => (
                    <span key={`blank-${i}`} aria-hidden />
                  ))}
                  {monthDays.map((day) => {
                    const total = totals.get(day)!
                    const available = total.yes.length + total.maybe.length
                    const share = memberIds.length ? (total.yes.length + total.maybe.length / 2) / memberIds.length : 0
                    const my = mine.get(day)
                    const inTrip = trip.start_date && trip.end_date && day >= trip.start_date && day <= trip.end_date
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => mark(day)}
                        aria-pressed={Boolean(my)}
                        aria-label={[
                          format.long.format(utc(day)),
                          t('dates.cellLabel', { count: total.yes.length, maybe: total.maybe.length, total: memberIds.length }),
                          t(my === 'yes' ? 'dates.youYes' : my === 'maybe' ? 'dates.youMaybe' : 'dates.youNone'),
                        ].join(', ')}
                        className={cn(
                          'relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm font-semibold tabular-nums transition active:scale-90',
                          heatClass(share),
                          inTrip && 'ring-2 ring-sun ring-offset-1 ring-offset-background',
                        )}
                      >
                        <span>{Number(day.slice(8))}</span>
                        <span className="h-3 text-[0.6rem] leading-3 font-medium opacity-80">{available > 0 ? available : ''}</span>
                        {my && (
                          <span
                            aria-hidden
                            className={cn(
                              'absolute top-1 right-1 size-2 rounded-full',
                              my === 'yes' ? 'bg-sage ring-1 ring-white' : 'border-2 border-foreground bg-background',
                            )}
                          />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            {t('dates.legendFew')}
            <span className="flex gap-0.5" aria-hidden>
              {HEAT_STEPS.map((step) => (
                <span key={step} className={cn('size-3 rounded', heatClass(step))} />
              ))}
            </span>
            {t('dates.legendAll')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-2 rounded-full bg-sage" />
            {t('dates.youYes')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-2 rounded-full border-2 border-foreground" />
            {t('dates.youMaybe')}
          </span>
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="dates-best">
        <h2 id="dates-best" className="text-2xl">
          {t('dates.bestTitle')}
        </h2>
        {windows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('dates.bestEmpty')}</p>
        ) : (
          <ol className="space-y-2">
            {windows.map((w, index) => {
              const everyone = w.free.length === memberIds.length
              const isFixed = trip.start_date === w.start && trip.end_date === w.end
              return (
                <li key={w.start} className="glass flex flex-wrap items-center gap-3 rounded-[1.5rem] p-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent font-display text-lg text-accent-foreground">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{format.range(w.start, w.end)}</p>
                    <p className="text-xs text-muted-foreground">
                      {everyone
                        ? t('dates.allFree')
                        : t(w.maybe.length ? 'dates.summaryMaybe' : 'dates.summary', { count: w.free.length, maybe: w.maybe.length, total: memberIds.length })}
                      {w.missing.length > 0 && ` · ${t('dates.missing', { count: w.missing.length, names: w.missing.map(nameOf).join(', ') })}`}
                    </p>
                  </div>
                  {isFixed ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                      <CalendarCheck className="size-4" />
                      {t('dates.tripDates')}
                    </span>
                  ) : (
                    canEdit && (
                      <Button size="sm" variant="outline" disabled={updateDates.isPending} onClick={() => fix(w)}>
                        <CalendarCheck />
                        {t('dates.fix')}
                      </Button>
                    )
                  )}
                </li>
              )
            })}
          </ol>
        )}
        {pending.length > 0 && <p className="text-xs text-muted-foreground">{t('dates.pending', { names: pending.map(nameOf).join(', ') })}</p>}
      </section>

      <Sheet open={editingWindow} onOpenChange={setEditingWindow} title={t('dates.editWindow')} description={t('dates.setupBody')}>
        <div className="pb-2">
          <WindowForm initial={window} busy={updateDates.isPending} onSave={saveWindow} />
        </div>
      </Sheet>
    </div>
  )
}

function WindowForm({
  initial,
  busy,
  onSave,
}: {
  initial?: { start: string; end: string; length: number }
  busy: boolean
  onSave: (input: { start: string; end: string; length: number }) => void
}) {
  const { t } = useTranslation()
  const [start, setStart] = useState(initial?.start ?? '')
  const [end, setEnd] = useState(initial?.end ?? '')
  const [length, setLength] = useState(String(initial?.length ?? 5))

  const days = Number(length)
  const span = ISO_DAY.test(start) && ISO_DAY.test(end) ? daysBetween(start, end) + 1 : 0
  const valid = span >= 1 && span <= 367 && Number.isInteger(days) && days >= 1 && days <= 60 && days <= span

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (valid) onSave({ start, end, length: days })
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1.5 text-sm font-semibold">
          <span>{t('dates.from')}</span>
          <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} required />
        </label>
        <label className="space-y-1.5 text-sm font-semibold">
          <span>{t('dates.to')}</span>
          <Input type="date" value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} required />
        </label>
      </div>
      <label className="block space-y-1.5 text-sm font-semibold">
        <span>{t('dates.length')}</span>
        <Input type="number" inputMode="numeric" min={1} max={60} value={length} onChange={(e) => setLength(e.target.value)} required />
      </label>
      {start && end && !valid && <p className="text-xs text-destructive">{t('dates.invalidWindow')}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={!valid || busy}>
        {busy && <Loader2 className="animate-spin" />}
        {t('dates.saveWindow')}
      </Button>
    </form>
  )
}
