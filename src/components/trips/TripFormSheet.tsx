import { useEffect, useState } from 'react'
import { Check, ImageIcon, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea } from '@/components/ui/input'
import { Scene } from '@/components/brand/Scene'
import { CoverImage, SCENE_PREFIX } from '@/components/media/CoverImage'
import { AttributionText } from '@/components/media/Attribution'
import { PhotoSearch } from '@/components/media/PhotoSearch'
import { useCreateTrip, useUpdateTrip, type TripInput } from '@/hooks/useTrips'
import { serializeAttribution } from '@/lib/wikimedia'
import type { Trip } from '@/lib/types'
import { cn } from '@/lib/utils'

const PRESETS = ['0', '1', '2', '3', '4']

export function TripFormSheet({
  open,
  onOpenChange,
  trip,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  trip?: Trip
  onSaved?: (trip: Trip) => void
}) {
  const { t } = useTranslation()
  const create = useCreateTrip()
  const update = useUpdateTrip(trip?.id ?? '')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [coverUrl, setCoverUrl] = useState<string | null>(`${SCENE_PREFIX}0`)
  const [coverAttribution, setCoverAttribution] = useState<string | null>(null)
  const [showSearch, setShowSearch] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(trip?.name ?? '')
    setDescription(trip?.description ?? '')
    setCoverUrl(trip ? trip.cover_image_url : `${SCENE_PREFIX}${Math.floor(Math.random() * PRESETS.length)}`)
    setCoverAttribution(trip?.cover_image_attribution ?? null)
    setShowSearch(false)
  }, [open, trip])

  const busy = create.isPending || update.isPending
  const valid = name.trim().length > 0 && name.trim().length <= 80

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    const input: TripInput = {
      name: name.trim(),
      description: description.trim() || null,
      cover_image_url: coverUrl,
      cover_image_attribution: coverAttribution,
    }
    try {
      const saved = trip ? await update.mutateAsync(input) : await create.mutateAsync(input)
      toast.success(trip ? t('tripForm.updated') : t('tripForm.created'))
      onSaved?.(saved)
      onOpenChange(false)
    } catch {
      toast.error(t('errors.generic'))
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={trip ? t('tripForm.editTitle') : t('tripForm.createTitle')}
      description={trip ? undefined : t('tripForm.createSubtitle')}
      footer={
        <Button form="trip-form" type="submit" size="lg" className="mb-1 w-full" disabled={!valid || busy}>
          {busy ? <Loader2 className="animate-spin" /> : <Check />}
          {trip ? t('common.save') : t('tripForm.submit')}
        </Button>
      }
    >
      <form id="trip-form" onSubmit={submit} className="space-y-5">
        <CoverImage url={coverUrl} attribution={coverAttribution} seed={name || 'new'} className="h-36 rounded-3xl shadow-soft" showAttribution={false}>
          <div className="absolute inset-0 flex items-end bg-[linear-gradient(180deg,transparent_40%,rgb(0_0_0/0.35))] p-4">
            <p className="truncate font-display text-2xl text-white drop-shadow">{name || t('tripForm.namePlaceholder')}</p>
          </div>
        </CoverImage>

        <div>
          <Label htmlFor="trip-name">{t('tripForm.name')}</Label>
          <Input
            id="trip-name"
            autoFocus={!trip}
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('tripForm.namePlaceholder')}
            required
          />
        </div>

        <div>
          <Label htmlFor="trip-description">{t('tripForm.description')}</Label>
          <Textarea
            id="trip-description"
            maxLength={500}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('tripForm.descriptionPlaceholder')}
          />
        </div>

        <div>
          <Label>{t('tripForm.cover')}</Label>
          <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 py-1">
            {PRESETS.map((preset) => {
              const value = `${SCENE_PREFIX}${preset}`
              const selected = coverUrl === value
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setCoverUrl(value)
                    setCoverAttribution(null)
                  }}
                  aria-label={t('tripForm.illustration', { n: Number(preset) + 1 })}
                  className={cn(
                    'relative h-16 w-14 shrink-0 overflow-hidden rounded-2xl transition active:scale-95',
                    selected ? 'ring-3 ring-primary ring-offset-2 ring-offset-[var(--popover)]' : 'opacity-80 hover:opacity-100',
                  )}
                >
                  <Scene seed={preset} className="absolute inset-0" />
                </button>
              )
            })}
            <button
              type="button"
              onClick={() => setShowSearch((s) => !s)}
              className={cn(
                'flex h-16 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-foreground/15 text-[0.65rem] font-semibold text-muted-foreground transition hover:border-primary/50 hover:text-primary',
                (showSearch || (coverUrl && !coverUrl.startsWith(SCENE_PREFIX))) && 'border-primary/60 text-primary',
              )}
            >
              <ImageIcon className="size-5" />
              {t('tripForm.photo')}
            </button>
          </div>
          {coverAttribution && <AttributionText raw={coverAttribution} className="mt-2 px-1" />}
          {showSearch && (
            <div className="mt-3">
              <PhotoSearch
                initialQuery={name}
                selectedUrl={coverUrl}
                onSelect={(img) => {
                  setCoverUrl(img.thumbUrl)
                  setCoverAttribution(serializeAttribution(img.attribution))
                }}
              />
            </div>
          )}
        </div>
      </form>
    </Sheet>
  )
}
