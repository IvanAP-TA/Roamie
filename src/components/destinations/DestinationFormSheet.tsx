import { useEffect, useState } from 'react'
import { Check, ImageOff, Images, Loader2, LocateFixed, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea } from '@/components/ui/input'
import { Chip } from '@/components/ui/misc'
import { CoverImage } from '@/components/media/CoverImage'
import { AttributionText } from '@/components/media/Attribution'
import { PhotoSearch } from '@/components/media/PhotoSearch'
import { PlaceSearch } from '@/components/places/PlaceSearch'
import { useCreateDestination, useUpdateDestination, type DestinationInput } from '@/hooks/useDestinations'
import { useTellTheGroup } from '@/hooks/useTellTheGroup'
import { useTripContext } from '@/hooks/useTripContext'
import type { Place } from '@/lib/nominatim'
import { serializeAttribution, type WikiImage } from '@/lib/wikimedia'
import { MOODS, type Destination, type Mood } from '@/lib/types'
import { cn } from '@/lib/utils'
import { MOOD_META } from './moods'

export function DestinationFormSheet({
  open,
  onOpenChange,
  tripId,
  destination,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  tripId: string
  destination?: Destination
}) {
  const { t } = useTranslation()
  const create = useCreateDestination(tripId)
  const { trip } = useTripContext()
  const tellGroup = useTellTheGroup()
  const update = useUpdateDestination(tripId)

  const [picking, setPicking] = useState(false)
  const [name, setName] = useState('')
  const [country, setCountry] = useState<string | null>(null)
  const [countryCode, setCountryCode] = useState<string | null>(null)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)

  // Photo: preview + an optional picker, remounted (key) for each new search.
  const [image, setImage] = useState<{ url: string; attribution: string } | null>(null)
  const [picker, setPicker] = useState<{ key: number; query: string; autoSelect: boolean } | null>(null)

  const [mood, setMood] = useState<Mood[]>([])
  const [expectations, setExpectations] = useState('')

  useEffect(() => {
    if (!open) return
    setPicking(false)
    setName(destination?.name ?? '')
    setCountry(destination?.country ?? null)
    setCountryCode(destination?.country_code ?? null)
    setCoords(destination?.lat != null && destination.lng != null ? { lat: destination.lat, lng: destination.lng } : null)
    setImage(destination?.image_url ? { url: destination.image_url, attribution: destination.image_attribution ?? '' } : null)
    setPicker(null)
    setMood(destination?.mood ?? [])
    setExpectations(destination?.expectations ?? '')
  }, [open, destination])

  const openPicker = (photoQuery: string, autoSelect: boolean) =>
    setPicker((prev) => ({ key: (prev?.key ?? 0) + 1, query: photoQuery, autoSelect }))

  const applyPlace = (place: Place) => {
    setName(place.name)
    setCountry(place.country)
    setCountryCode(place.countryCode)
    setCoords({ lat: place.lat, lng: place.lng })
    // Show the photos of the new place; pre-select the first one only if there's no photo yet.
    openPicker(place.name, !image)
  }

  const selectImage = (img: WikiImage) => setImage({ url: img.thumbUrl, attribution: serializeAttribution(img.attribution) })

  const busy = create.isPending || update.isPending
  const valid = name.trim().length > 0

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid || busy) return
    const input: DestinationInput = {
      name: name.trim(),
      country: country?.trim() || null,
      country_code: countryCode && /^[A-Z]{2}$/.test(countryCode) ? countryCode : null,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      image_url: image?.url ?? null,
      image_attribution: image?.attribution || null,
      mood,
      expectations: expectations.trim() || null,
    }
    try {
      if (destination) {
        await update.mutateAsync({ id: destination.id, patch: input })
        toast.success(t('destForm.updated'))
      } else {
        await create.mutateAsync(input)
        // A new proposal is news for the group: offer to tell them in the chat.
        tellGroup(t('destForm.created', { name: input.name }), t('tellGroup.proposed', { place: input.name, trip: trip.name }))
      }
      onOpenChange(false)
    } catch {
      toast.error(t('errors.generic'))
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={destination ? t('destForm.editTitle') : t('destForm.createTitle')}
      description={destination ? undefined : t('destForm.createSubtitle')}
      footer={
        <Button form="destination-form" type="submit" size="lg" className="mb-1 w-full" disabled={!valid || busy || picking}>
          {busy ? <Loader2 className="animate-spin" /> : <Check />}
          {destination ? t('common.save') : t('destForm.submit')}
        </Button>
      }
    >
      <form id="destination-form" onSubmit={submit} className="space-y-6">
        {/* ── Where ── */}
        <section>
          <Label htmlFor="place-search">{t('destForm.where')}</Label>
          <PlaceSearch id="place-search" onPick={applyPlace} onBusyChange={setPicking} />
        </section>

        <section className="grid grid-cols-[1fr_auto] gap-2">
          <div className="col-span-2 sm:col-span-1">
            <Label htmlFor="dest-name">{t('destForm.name')}</Label>
            <Input id="dest-name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} placeholder="Lisboa" required />
          </div>
          <div className="col-span-2 sm:col-span-1 sm:w-40">
            <Label htmlFor="dest-country">{t('destForm.country')}</Label>
            <Input
              id="dest-country"
              value={country ?? ''}
              onChange={(e) => {
                setCountry(e.target.value)
                // A hand-typed country no longer matches the code from the place search.
                setCountryCode(null)
              }}
              placeholder="Portugal"
            />
          </div>
          <p className="col-span-2 inline-flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
            <LocateFixed className="size-3.5" />
            {coords ? `${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)}` : t('destForm.noCoords')}
            {coords && (
              <button type="button" onClick={() => setCoords(null)} className="ml-1 rounded-full p-0.5 hover:bg-foreground/5" aria-label={t('destForm.clearCoords')}>
                <X className="size-3" />
              </button>
            )}
          </p>
        </section>

        {/* ── Photo ── */}
        <section>
          <Label>{t('destForm.photo')}</Label>
          <CoverImage url={image?.url} seed={name || 'destination'} pin className="h-44 rounded-3xl shadow-soft" showAttribution={false} />
          {image?.attribution && <AttributionText raw={image.attribution} className="mt-2 px-1" />}
          <div className="mt-2 flex flex-wrap gap-2">
            {picker ? (
              <Button type="button" variant="glass" size="sm" onClick={() => setPicker(null)}>
                <X />
                {t('destForm.closePhotos')}
              </Button>
            ) : (
              <Button type="button" variant="glass" size="sm" disabled={!name.trim()} onClick={() => openPicker(name.trim(), false)}>
                <Images />
                {image ? t('destForm.changePhoto') : t('destForm.findPhoto')}
              </Button>
            )}
            {image && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setImage(null)}>
                <ImageOff />
                {t('destForm.withoutPhoto')}
              </Button>
            )}
          </div>
          {picker && (
            <div className="mt-3">
              <PhotoSearch
                key={picker.key}
                initialQuery={picker.query}
                autoSearch
                selectedUrl={image?.url ?? null}
                onSelect={selectImage}
                onResults={(found) => {
                  if (picker.autoSelect && found[0]) selectImage(found[0])
                }}
              />
            </div>
          )}
        </section>

        {/* ── Mood ── */}
        <section>
          <Label>{t('destForm.mood')}</Label>
          <div className="flex flex-wrap gap-2">
            {MOODS.map((m) => {
              const Icon = MOOD_META[m].icon
              const active = mood.includes(m)
              return (
                <Chip key={m} active={active} onClick={() => setMood((prev) => (active ? prev.filter((x) => x !== m) : [...prev, m]))}>
                  <Icon className={cn(!active && MOOD_META[m].tint)} />
                  {t(`moods.${m}`)}
                </Chip>
              )
            })}
          </div>
        </section>

        {/* ── Expectations ── */}
        <section>
          <Label htmlFor="dest-expectations">{t('destForm.expectations')}</Label>
          <Textarea
            id="dest-expectations"
            value={expectations}
            maxLength={2000}
            onChange={(e) => setExpectations(e.target.value)}
            placeholder={t('destForm.expectationsPlaceholder')}
            className="min-h-28"
          />
        </section>
      </form>
    </Sheet>
  )
}
