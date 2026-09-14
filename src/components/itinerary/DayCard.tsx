import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion } from 'framer-motion'
import { GripVertical, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { ItineraryDay, ItineraryItem } from '@/lib/types'
import { cn } from '@/lib/utils'

function Stop({ item, canEdit, onEdit, isLast }: { item: ItineraryItem; canEdit: boolean; onEdit: () => void; isLast: boolean }) {
  const { t } = useTranslation()
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: !canEdit,
  })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn('relative flex gap-3 pl-1', isDragging && 'z-20')}
    >
      {/* route line + stop marker */}
      <div className="relative flex w-4 shrink-0 justify-center">
        <span className="relative z-10 mt-[1.15rem] size-3 rounded-full border-[3px] border-primary bg-paper" />
        {!isLast && <span className="absolute top-8 bottom-[-0.75rem] w-0 border-l-2 border-dashed border-primary/30" />}
      </div>

      <div
        className={cn(
          'mb-3 flex min-w-0 flex-1 items-start gap-2 rounded-2xl bg-paper py-2.5 pr-2 pl-3.5 shadow-soft transition-shadow',
          isDragging && 'scale-[1.02] shadow-lift ring-2 ring-primary/30',
        )}
      >
        <button type="button" onClick={onEdit} disabled={!canEdit} className="min-w-0 flex-1 text-left disabled:cursor-default">
          <span className="flex items-baseline gap-2">
            {item.time && <span className="shrink-0 font-mono text-xs font-semibold text-primary">{item.time.slice(0, 5)}</span>}
            <span className="truncate font-semibold">{item.title}</span>
          </span>
          {item.description && <span className="mt-0.5 line-clamp-2 block text-sm text-muted-foreground">{item.description}</span>}
        </button>
        {canEdit && (
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...listeners}
            {...attributes}
            aria-label={t('itinerary.dragHint')}
            className="flex size-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-xl text-muted-foreground/60 transition hover:bg-foreground/5 hover:text-foreground active:cursor-grabbing"
          >
            <GripVertical className="size-5" />
          </button>
        )}
      </div>
    </li>
  )
}

export function DayCard({
  day,
  canEdit,
  locale,
  onAddItem,
  onEditItem,
  onEditDay,
  onDeleteDay,
  onReorder,
}: {
  day: ItineraryDay
  canEdit: boolean
  locale: string
  onAddItem: () => void
  onEditItem: (item: ItineraryItem) => void
  onEditDay: () => void
  onDeleteDay: () => void
  onReorder: (orderedIds: string[]) => void
}) {
  const { t } = useTranslation()
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 80, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const items = day.itinerary_items

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const from = items.findIndex((i) => i.id === active.id)
    const to = items.findIndex((i) => i.id === over.id)
    onReorder(arrayMove(items, from, to).map((i) => i.id))
  }

  const dateLabel = day.date
    ? new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${day.date}T12:00:00`))
    : null

  return (
    <motion.article layout className="glass rounded-[2rem] p-4 md:p-5">
      <header className="mb-4 flex items-start gap-3">
        <span className="font-display text-5xl leading-[0.8] font-medium text-primary/90 display-wonk">
          {String(day.day_number).padStart(2, '0')}
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-[0.68rem] font-bold tracking-[0.18em] text-muted-foreground uppercase">
            {t('itinerary.day', { n: day.day_number })}
            {dateLabel && <span className="ml-2 text-foreground/70">· {dateLabel}</span>}
          </p>
          <h3 className="truncate text-xl leading-tight">{day.title || t('itinerary.stops', { count: items.length })}</h3>
        </div>
        {canEdit && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={t('common.more')}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onEditDay}>
                <Pencil />
                {t('itinerary.editDay')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive onSelect={onDeleteDay}>
                <Trash2 />
                {t('itinerary.deleteDay')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>

      {items.length === 0 ? (
        <p className="mb-3 rounded-2xl bg-foreground/[0.04] px-4 py-3 text-sm text-muted-foreground">{t('itinerary.emptyDay')}</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <ol>
              {items.map((item, index) => (
                <Stop key={item.id} item={item} canEdit={canEdit} isLast={index === items.length - 1} onEdit={() => onEditItem(item)} />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      )}

      {canEdit && (
        <button
          type="button"
          onClick={onAddItem}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-foreground/10 text-sm font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-primary active:scale-[0.98]"
        >
          <Plus className="size-4" />
          {t('itinerary.addItem')}
        </button>
      )}
    </motion.article>
  )
}
