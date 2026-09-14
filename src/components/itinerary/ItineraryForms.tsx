import { useEffect, useState } from 'react'
import { Check, Loader2, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea } from '@/components/ui/input'
import type { DayInput, ItemInput } from '@/hooks/useItinerary'

export function DayFormSheet({
  open,
  onOpenChange,
  initial,
  suggestedDate,
  title,
  busy,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: DayInput
  suggestedDate?: string | null
  title: string
  busy: boolean
  onSubmit: (input: DayInput) => void
}) {
  const { t } = useTranslation()
  const [date, setDate] = useState('')
  const [dayTitle, setDayTitle] = useState('')

  useEffect(() => {
    if (!open) return
    setDate(initial?.date ?? suggestedDate ?? '')
    setDayTitle(initial?.title ?? '')
  }, [open, initial, suggestedDate])

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      footer={
        <Button form="day-form" type="submit" size="lg" className="mb-1 w-full" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <Check />}
          {t('common.save')}
        </Button>
      }
    >
      <form
        id="day-form"
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit({ date: date || null, title: dayTitle.trim() || null })
        }}
      >
        <div>
          <Label htmlFor="day-title">{t('itinerary.dayTitle')}</Label>
          <Input id="day-title" value={dayTitle} maxLength={120} onChange={(e) => setDayTitle(e.target.value)} placeholder={t('itinerary.dayTitlePlaceholder')} />
        </div>
        <div>
          <Label htmlFor="day-date">{t('itinerary.date')}</Label>
          <Input id="day-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </form>
    </Sheet>
  )
}

export function ItemFormSheet({
  open,
  onOpenChange,
  initial,
  title,
  busy,
  onSubmit,
  onDelete,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: ItemInput
  title: string
  busy: boolean
  onSubmit: (input: ItemInput) => void
  onDelete?: () => void
}) {
  const { t } = useTranslation()
  const [time, setTime] = useState('')
  const [itemTitle, setItemTitle] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (!open) return
    setTime(initial?.time ?? '')
    setItemTitle(initial?.title ?? '')
    setDescription(initial?.description ?? '')
  }, [open, initial])

  const valid = itemTitle.trim().length > 0

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      footer={
        <div className="mb-1 flex gap-2">
          {onDelete && (
            <Button type="button" variant="ghost" size="lg" className="text-destructive" onClick={onDelete} aria-label={t('itinerary.deleteItem')}>
              <Trash2 />
            </Button>
          )}
          <Button form="item-form" type="submit" size="lg" className="flex-1" disabled={!valid || busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Check />}
            {t('common.save')}
          </Button>
        </div>
      }
    >
      <form
        id="item-form"
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault()
          if (valid) onSubmit({ time: time || null, title: itemTitle.trim(), description: description.trim() || null })
        }}
      >
        <div className="grid grid-cols-[7.5rem_1fr] gap-2">
          <div>
            <Label htmlFor="item-time">{t('itinerary.time')}</Label>
            <Input id="item-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="item-title">{t('itinerary.itemTitle')}</Label>
            <Input
              id="item-title"
              value={itemTitle}
              maxLength={160}
              autoFocus
              onChange={(e) => setItemTitle(e.target.value)}
              placeholder={t('itinerary.itemTitlePlaceholder')}
              required
            />
          </div>
        </div>
        <div>
          <Label htmlFor="item-description">{t('itinerary.itemDescription')}</Label>
          <Textarea
            id="item-description"
            value={description}
            maxLength={1000}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('itinerary.itemDescriptionPlaceholder')}
          />
        </div>
      </form>
    </Sheet>
  )
}
