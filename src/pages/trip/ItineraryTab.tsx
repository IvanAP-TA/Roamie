import { useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarPlus, CalendarRange, GripVertical, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useItinerary, useItineraryMutations } from '@/hooks/useItinerary'
import { useTripContext } from '@/hooks/useTripContext'
import { PageTransition, staggerContainer, staggerItem } from '@/components/layout/PageTransition'
import { DayCard } from '@/components/itinerary/DayCard'
import { DayFormSheet, ItemFormSheet } from '@/components/itinerary/ItineraryForms'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState, Skeleton } from '@/components/ui/misc'
import type { ItineraryDay, ItineraryItem } from '@/lib/types'

const nextDate = (iso: string) => {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

export default function ItineraryTab() {
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

  return (
    <PageTransition className="mx-auto max-w-3xl px-5 md:px-6">
      <header className="mb-6 flex items-end justify-between gap-3">
        <div>
          <p className="truncate text-sm font-medium text-muted-foreground">{trip.name}</p>
          <h1 className="text-[2.6rem] leading-none md:text-5xl">{t('itinerary.title')}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t('itinerary.subtitle')}</p>
        </div>
        {canEdit && days && days.length > 0 && (
          <Button size="sm" onClick={() => setDayForm({})}>
            <CalendarPlus />
            <span className="hidden sm:inline">{t('itinerary.addDay')}</span>
          </Button>
        )}
      </header>

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
          {canEdit && hasItems && (
            <p className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
              <GripVertical className="size-3.5" />
              {t('itinerary.dragHint')}
            </p>
          )}
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
        initial={itemForm?.item ? { time: itemForm.item.time, title: itemForm.item.title, description: itemForm.item.description } : undefined}
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
    </PageTransition>
  )
}
