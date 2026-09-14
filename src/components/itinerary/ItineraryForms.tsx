import { useEffect, useState } from 'react'
import { Check, Loader2, MapPin, Trash2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea } from '@/components/ui/input'
import { PlaceSearch } from '@/components/places/PlaceSearch'
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

type StopPlace = Pick<ItemInput, 'place_name' | 'lat' | 'lng'>

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
  const [place, setPlace] = useState<StopPlace | null>(null)
  const [picking, setPicking] = useState(false)

  useEffect(() => {
    if (!open) return
    setTime(initial?.time ?? '')
    setItemTitle(initial?.title ?? '')
    setDescription(initial?.description ?? '')
    setPlace(initial?.place_name ? { place_name: initial.place_name, lat: initial.lat, lng: initial.lng } : null)
    setPicking(false)
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
          <Button form="item-form" type="submit" size="lg" className="flex-1" disabled={!valid || busy || picking}>
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
          if (!valid) return
          onSubmit({
            time: time || null,
            title: itemTitle.trim(),
            description: description.trim() || null,
            place_name: place?.place_name ?? null,
            lat: place?.lat ?? null,
            lng: place?.lng ?? null,
          })
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
          <Label htmlFor="item-place">{t('stops.place')}</Label>
          {place ? (
            <div className="flex min-h-12 items-center gap-2 rounded-2xl border border-input bg-[var(--glass-strong)] py-1 pr-1 pl-3.5">
              <MapPin className="size-4 shrink-0 text-primary" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{place.place_name}</span>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => setPlace(null)} aria-label={t('stops.removePlace')}>
                <X />
              </Button>
            </div>
          ) : (
            <PlaceSearch
              id="item-place"
              placeholder={t('stops.placePlaceholder')}
              onBusyChange={setPicking}
              onPick={(picked) => {
                setPlace({ place_name: picked.name.slice(0, 160), lat: picked.lat, lng: picked.lng })
                if (!itemTitle.trim()) setItemTitle(picked.name.slice(0, 160))
              }}
            />
          )}
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
