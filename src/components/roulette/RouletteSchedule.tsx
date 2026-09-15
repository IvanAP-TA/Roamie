import { useEffect, useState } from 'react'
import { CalendarClock, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useScheduleRoulette } from '@/hooks/useDestinations'
import { useTripContext } from '@/hooks/useTripContext'
import { rpcErrorCode } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet } from '@/components/ui/sheet'

/** "yyyy-MM-ddTHH:mm" in the device's time zone, as <input type="datetime-local"> expects. */
const toLocalInput = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)

/** Tomorrow at 21:00: after dinner, when the group is usually around. */
function suggestedTime() {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  date.setHours(21, 0, 0, 0)
  return date
}

/**
 * The wheel spinning by itself at a set time (a server job does it, app open or not). Owners and editors set, change
 * or cancel it; everyone sees when it will happen.
 */
export function RouletteSchedule({ className }: { className?: string }) {
  const { t, i18n } = useTranslation()
  const { trip, canEdit } = useTripContext()
  const schedule = useScheduleRoulette(trip.id)
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')

  const at = trip.roulette_spin_at ? new Date(trip.roulette_spin_at) : null
  const atTime = at?.getTime()

  // In the last hour, a live countdown instead of the date.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (atTime == null || atTime - Date.now() > 60 * 60 * 1000) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [atTime])

  if (!at && !canEdit) return null

  const remaining = atTime != null ? atTime - now : null
  const countdown =
    remaining == null || remaining > 60 * 60 * 1000
      ? null
      : remaining > 0
        ? t('live.dueIn', {
            time: `${Math.floor(remaining / 60_000)}:${String(Math.floor((remaining % 60_000) / 1000)).padStart(2, '0')}`,
          })
        : t('live.dueNow')

  const when = (date: Date) =>
    new Intl.DateTimeFormat(i18n.resolvedLanguage, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(date)

  const edit = () => {
    setValue(toLocalInput(at ?? suggestedTime()))
    setOpen(true)
  }

  const save = () => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime()) || date.getTime() < Date.now() + 60_000) {
      toast.error(t('roulette.invalidTime'))
      return
    }
    schedule.mutate(date, {
      onSuccess: () => {
        setOpen(false)
        toast.success(t('roulette.scheduleSaved', { when: when(date) }))
      },
      onError: (err) => toast.error(rpcErrorCode(err as Error) === 'invalid_spin_time' ? t('roulette.invalidTime') : t('errors.generic')),
    })
  }

  const cancel = () =>
    schedule.mutate(null, {
      onSuccess: () => toast(t('roulette.scheduleCancelled')),
      onError: () => toast.error(t('errors.generic')),
    })

  return (
    <>
      {at ? (
        <div className={cn('glass flex flex-wrap items-center gap-3 rounded-[1.5rem] p-4', className)}>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <CalendarClock className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold first-letter:uppercase">{t('roulette.scheduled', { when: when(at) })}</span>
            <span className={cn('block text-xs', countdown ? 'font-semibold text-primary tabular-nums' : 'text-muted-foreground')}>
              {countdown ?? t('roulette.scheduledHint')}
            </span>
          </span>
          {canEdit && (
            <span className="ml-auto flex gap-1">
              <Button variant="ghost" size="sm" onClick={edit}>
                {t('roulette.change')}
              </Button>
              <Button variant="ghost" size="sm" onClick={cancel} disabled={schedule.isPending}>
                {t('roulette.cancelSchedule')}
              </Button>
            </span>
          )}
        </div>
      ) : (
        <Button variant="glass" className={cn('mx-auto flex w-full max-w-xs', className)} onClick={edit}>
          <CalendarClock />
          {t('roulette.schedule')}
        </Button>
      )}

      <Sheet
        open={open}
        onOpenChange={setOpen}
        title={t('roulette.scheduleTitle')}
        description={t('roulette.scheduleBody')}
        footer={
          <Button size="lg" className="w-full" onClick={save} disabled={schedule.isPending || !value}>
            {schedule.isPending ? <Loader2 className="animate-spin" /> : <CalendarClock />}
            {t('roulette.scheduleCta')}
          </Button>
        }
      >
        <label htmlFor="roulette-spin-at" className="mb-1.5 block text-sm font-medium">
          {t('roulette.when')}
        </label>
        <Input
          id="roulette-spin-at"
          type="datetime-local"
          value={value}
          min={toLocalInput(new Date(Date.now() + 5 * 60_000))}
          onChange={(e) => setValue(e.target.value)}
        />
      </Sheet>
    </>
  )
}
