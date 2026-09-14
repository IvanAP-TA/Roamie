import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CalendarPlus, CalendarRange, Download, GripVertical, Link2, ListChecks, Map as MapIcon, Trash2, type LucideIcon } from 'lucide-react'
import { buildItineraryIcs, fileSlug } from '@/lib/ics'
import { downloadFile } from '@/lib/utils'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useItinerary, useItineraryMutations } from '@/hooks/useItinerary'
import { useTripContext } from '@/hooks/useTripContext'
import { PageTransition, staggerContainer, staggerItem } from '@/components/layout/PageTransition'
import { DayCard } from '@/components/itinerary/DayCard'
import { DayFormSheet, ItemFormSheet } from '@/components/itinerary/ItineraryForms'
import { ChecklistSection } from '@/components/plan/ChecklistSection'
import { LinksSection } from '@/components/plan/LinksSection'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState, Skeleton } from '@/components/ui/misc'
import type { ItineraryDay, ItineraryItem } from '@/lib/types'
import { cn } from '@/lib/utils'

const VIEWS = [
  { id: 'itinerary', icon: CalendarRange },
  { id: 'checklist', icon: ListChecks },
  { id: 'links', icon: Link2 },
] as const satisfies readonly { id: string; icon: LucideIcon }[]

type View = (typeof VIEWS)[number]['id']

const nextDate = (iso: string) => {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

function ItineraryView() {
  const { t, i18n } = useTranslation()
  const { trip, canEdit } = useTripContext()
  const { data: days, isLoading } = useItinerary(trip.id)
  const m = useItineraryMutations(trip.id)

  const [dayForm, setDayForm] = useState<{ day?: ItineraryDay } | null>(null)
  const [itemForm, setItemForm] = useState<{ dayId: string; item?: ItineraryItem } | null>(null)
  const [deletingDay, setDeletingDay] = useState<ItineraryDay | null>(null)

  const onError = () => toast.error(t('errors.generic'))
  const lastDay = days?.at(-1)
  const hasItems = days?.some((d) => d.itinerary_items.length > 1)

  const exportIcs = () => {
    const { ics, events } = buildItineraryIcs(trip, days ?? [])
    if (events === 0) {
      toast(t('stops.exportNone'))
      return
    }
    downloadFile(`${fileSlug(trip.name)}.ics`, ics, 'text/calendar;charset=utf-8')
    toast.success(t('stops.exported', { count: events }))
  }

  return (
    <>
      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-48 rounded-[2rem]" />
          <Skeleton className="h-36 rounded-[2rem]" />
        </div>
      )}

      {days && days.length === 0 && (
        <EmptyState seed="4" icon={<CalendarRange />} title={t('itinerary.emptyTitle')} body={t('itinerary.emptyBody')}>
          {canEdit && (
            <Button size="lg" onClick={() => setDayForm({})}>
              <CalendarPlus />
              {t('itinerary.addDay')}
            </Button>
          )}
        </EmptyState>
      )}

      {days && days.length > 0 && (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
            {canEdit && hasItems && (
              <p className="mr-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
                <GripVertical className="size-3.5" />
                {t('itinerary.dragHint')}
              </p>
            )}
            <Button asChild variant="glass" size="sm">
              <Link to="../map?layer=stops" relative="path" aria-label={t('stops.onMap')}>
                <MapIcon />
                <span className="hidden sm:inline">{t('stops.onMap')}</span>
              </Link>
            </Button>
            <Button variant="glass" size="sm" onClick={exportIcs} aria-label={t('stops.exportIcs')}>
              <Download />
              <span className="hidden sm:inline">{t('stops.exportIcs')}</span>
            </Button>
            {canEdit && (
              <Button size="sm" onClick={() => setDayForm({})} aria-label={t('itinerary.addDay')}>
                <CalendarPlus />
                <span className="hidden sm:inline">{t('itinerary.addDay')}</span>
              </Button>
            )}
          </div>
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-4">
            {days.map((day) => (
              <motion.div key={day.id} variants={staggerItem}>
                <DayCard
                  day={day}
                  canEdit={canEdit}
                  locale={i18n.resolvedLanguage ?? 'en'}
                  onAddItem={() => setItemForm({ dayId: day.id })}
                  onEditItem={(item) => setItemForm({ dayId: day.id, item })}
                  onEditDay={() => setDayForm({ day })}
                  onDeleteDay={() => setDeletingDay(day)}
                  onReorder={(orderedIds) =>
                    m.reorderItems.mutate(
                      { dayId: day.id, orderedIds, previous: day.itinerary_items },
                      { onError: () => toast.error(t('itinerary.reorderFailed')) },
                    )
                  }
                />
              </motion.div>
            ))}
          </motion.div>

          {canEdit && (
            <button
              type="button"
              onClick={() => setDayForm({})}
              className="mt-4 flex h-16 w-full items-center justify-center gap-2 rounded-[2rem] border-2 border-dashed border-foreground/12 font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-primary active:scale-[0.98]"
            >
              <CalendarPlus className="size-5" />
              {t('itinerary.addDay')}
            </button>
          )}
        </>
      )}

      <DayFormSheet
        open={dayForm !== null}
        onOpenChange={(open) => !open && setDayForm(null)}
        title={dayForm?.day ? t('itinerary.editDay') : t('itinerary.newDay')}
        initial={dayForm?.day ? { date: dayForm.day.date, title: dayForm.day.title } : undefined}
        suggestedDate={lastDay?.date ? nextDate(lastDay.date) : null}
        busy={m.addDay.isPending || m.updateDay.isPending}
        onSubmit={(input) => {
          const done = { onSuccess: () => setDayForm(null), onError }
          if (dayForm?.day) m.updateDay.mutate({ id: dayForm.day.id, input }, done)
          else m.addDay.mutate(input, done)
        }}
      />

      <ItemFormSheet
        open={itemForm !== null}
        onOpenChange={(open) => !open && setItemForm(null)}
        title={itemForm?.item ? t('itinerary.editItem') : t('itinerary.newItem')}
        initial={
          itemForm?.item
            ? {
                time: itemForm.item.time,
                title: itemForm.item.title,
                description: itemForm.item.description,
                place_name: itemForm.item.place_name,
                lat: itemForm.item.lat,
                lng: itemForm.item.lng,
              }
            : undefined
        }
        busy={m.addItem.isPending || m.updateItem.isPending}
        onDelete={
          itemForm?.item
            ? () => {
                m.deleteItem.mutate(itemForm.item!.id, { onError })
                setItemForm(null)
              }
            : undefined
        }
        onSubmit={(input) => {
          if (!itemForm) return
          const done = { onSuccess: () => setItemForm(null), onError }
          if (itemForm.item) m.updateItem.mutate({ id: itemForm.item.id, input }, done)
          else m.addItem.mutate({ dayId: itemForm.dayId, input }, done)
        }}
      />

      <ConfirmDialog
        open={deletingDay !== null}
        onOpenChange={(open) => !open && setDeletingDay(null)}
        title={t('itinerary.deleteDayTitle', { n: deletingDay?.day_number })}
        description={t('itinerary.deleteDayBody')}
        confirmLabel={t('itinerary.deleteDay')}
        cancelLabel={t('common.cancel')}
        destructive
        icon={<Trash2 />}
        onConfirm={async () => {
          if (!deletingDay) return
          try {
            await m.deleteDay.mutateAsync(deletingDay.id)
          } catch {
            onError()
          }
        }}
      />
    </>
  )
}

/** The trip plan: itinerary, shared checklist and useful links (?view=checklist|links). */
export default function PlanTab() {
  const { t } = useTranslation()
  const { trip } = useTripContext()
  const [params, setParams] = useSearchParams()
  const requested = params.get('view')
  const view: View = VIEWS.some((v) => v.id === requested) ? (requested as View) : 'itinerary'

  const setView = (next: View) =>
    setParams(
      (p) => {
        if (next === 'itinerary') p.delete('view')
        else p.set('view', next)
        return p
      },
      { replace: true },
    )

  return (
    <PageTransition className="mx-auto max-w-3xl px-5 md:px-6">
      <header className="mb-5">
        <p className="hidden truncate text-sm font-medium text-muted-foreground md:block">{trip.name}</p>
        <h1 className="text-[2.3rem] leading-none md:text-5xl">{t('plan.title')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t(`plan.subtitle.${view}`)}</p>
      </header>

      <div role="tablist" aria-label={t('plan.title')} className="glass mb-6 flex gap-1 rounded-full p-1">
        {VIEWS.map(({ id, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={view === id}
            onClick={() => setView(id)}
            className={cn(
              'relative flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-full px-2 text-sm font-semibold transition-colors',
              view === id ? 'text-background' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {view === id && (
              <motion.span layoutId="plan-view-pill" className="absolute inset-0 rounded-full bg-foreground" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />
            )}
            <Icon className="relative size-4" />
            <span className="relative">{t(`plan.tabs.${id}`)}</span>
          </button>
        ))}
      </div>

      {view === 'itinerary' && <ItineraryView />}
      {view === 'checklist' && <ChecklistSection />}
      {view === 'links' && <LinksSection />}
    </PageTransition>
  )
}
