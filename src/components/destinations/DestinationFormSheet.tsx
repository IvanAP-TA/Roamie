import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ImageOff, Images, Loader2, LocateFixed, MapPin, Search, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea } from '@/components/ui/input'
import { Chip } from '@/components/ui/misc'
import { CoverImage } from '@/components/media/CoverImage'
import { AttributionText } from '@/components/media/Attribution'
import { useCreateDestination, useUpdateDestination, type DestinationInput } from '@/hooks/useDestinations'
import { NominatimError, searchPlaces, type Place } from '@/lib/nominatim'
import { findPlaceImages, serializeAttribution, type WikiImage } from '@/lib/wikimedia'
import { MOODS, type BudgetLevel, type Destination, type Mood } from '@/lib/types'
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
  const { t, i18n } = useTranslation()
  const lang = i18n.resolvedLanguage ?? 'en'
  const create = useCreateDestination(tripId)
  const update = useUpdateDestination(tripId)

  // place search (explicit, per Nominatim policy)
  const [query, setQuery] = useState('')
  const [places, setPlaces] = useState<Place[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [country, setCountry] = useState<string | null>(null)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)

  // photo
  const [images, setImages] = useState<WikiImage[] | null>(null)
  const [imageIndex, setImageIndex] = useState(0)
  const [imagesLoading, setImagesLoading] = useState(false)
  const [image, setImage] = useState<{ url: string; attribution: string } | null>(null)

  const [mood, setMood] = useState<Mood[]>([])
  const [budget, setBudget] = useState<BudgetLevel | null>(null)
  const [expectations, setExpectations] = useState('')

  useEffect(() => {
    if (!open) return
    setQuery('')
    setPlaces(null)
    setSearchError(null)
    setName(destination?.name ?? '')
    setCountry(destination?.country ?? null)
    setCoords(destination?.lat != null && destination.lng != null ? { lat: destination.lat, lng: destination.lng } : null)
    setImages(null)
    setImageIndex(0)
    setImage(destination?.image_url ? { url: destination.image_url, attribution: destination.image_attribution ?? '' } : null)
    setMood(destination?.mood ?? [])
    setBudget(destination?.budget_level ?? null)
    setExpectations(destination?.expectations ?? '')
  }, [open, destination])

  const searchPlace = async () => {
    if (query.trim().length < 2 || searching) return
    setSearching(true)
    setSearchError(null)
    try {
      setPlaces(await searchPlaces(query, lang))
    } catch (err) {
      setSearchError(err instanceof NominatimError && err.code === 'rate_limited' ? t('destForm.rateLimited') : t('destForm.searchFailed'))
    } finally {
      setSearching(false)
    }
  }

  const loadImages = async (placeName: string) => {
    setImagesLoading(true)
    setImages(null)
    try {
      const found = await findPlaceImages(placeName, lang)
      setImages(found)
      setImageIndex(0)
      setImage(found[0] ? { url: found[0].thumbUrl, attribution: serializeAttribution(found[0].attribution) } : null)
    } catch {
      setImages([])
    } finally {
      setImagesLoading(false)
    }
  }

  const pickPlace = (place: Place) => {
    setName(place.name)
    setCountry(place.country)
    setCoords({ lat: place.lat, lng: place.lng })
    setPlaces(null)
    void loadImages(place.name)
  }

  const cycleImage = () => {
    if (!images || images.length < 2) return
    const next = (imageIndex + 1) % images.length
    setImageIndex(next)
    setImage({ url: images[next].thumbUrl, attribution: serializeAttribution(images[next].attribution) })
  }

  const busy = create.isPending || update.isPending
  const valid = name.trim().length > 0

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid || busy) return
    const input: DestinationInput = {
      name: name.trim(),
      country: country?.trim() || null,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      image_url: image?.url ?? null,
      image_attribution: image?.attribution || null,
      mood,
      budget_level: budget,
      expectations: expectations.trim() || null,
    }
    try {
      if (destination) await update.mutateAsync({ id: destination.id, patch: input })
      else await create.mutateAsync(input)
      toast.success(destination ? t('destForm.updated') : t('destForm.created', { name: input.name }))
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
        <Button form="destination-form" type="submit" size="lg" className="mb-1 w-full" disabled={!valid || busy}>
          {busy ? <Loader2 className="animate-spin" /> : <Check />}
          {destination ? t('common.save') : t('destForm.submit')}
        </Button>
      }
    >
      <form id="destination-form" onSubmit={submit} className="space-y-6">
        {/* ── Where ── */}
        <section>
          <Label htmlFor="place-search">{t('destForm.where')}</Label>
          <div className="flex gap-2">
            <Input
              id="place-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void searchPlace()
                }
              }}
              placeholder={t('destForm.searchPlaceholder')}
              enterKeyHint="search"
              autoComplete="off"
            />
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="size-12 shrink-0 rounded-2xl"
              onClick={() => void searchPlace()}
              aria-label={t('media.search')}
            >
              {searching ? <Loader2 className="animate-spin" /> : <Search />}
            </Button>
          </div>
          {searchError && <p className="mt-2 px-1 text-sm text-destructive">{searchError}</p>}

          <AnimatePresence>
            {places && (
              <motion.ul
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 overflow-hidden rounded-2xl border border-border bg-[var(--glass-strong)]"
              >
                {places.length === 0 && <li className="px-4 py-3 text-sm text-muted-foreground">{t('destForm.noPlaces')}</li>}
                {places.map((place) => (
                  <li key={place.id}>
                    <button
                      type="button"
                      onClick={() => pickPlace(place)}
                      className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-foreground/5"
                    >
                      <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{place.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">{place.displayName}</span>
                      </span>
                    </button>
                  </li>
                ))}
                <li className="border-t border-border px-4 py-1.5 text-[0.65rem] text-muted-foreground">
                  {t('destForm.searchAttribution')}{' '}
                  <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline">
                    © OpenStreetMap
                  </a>
                </li>
              </motion.ul>
            )}
          </AnimatePresence>
        </section>

        <section className="grid grid-cols-[1fr_auto] gap-2">
          <div className="col-span-2 sm:col-span-1">
            <Label htmlFor="dest-name">{t('destForm.name')}</Label>
            <Input id="dest-name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} placeholder="Lisboa" required />
          </div>
          <div className="col-span-2 sm:col-span-1 sm:w-40">
            <Label htmlFor="dest-country">{t('destForm.country')}</Label>
            <Input id="dest-country" value={country ?? ''} onChange={(e) => setCountry(e.target.value)} placeholder="Portugal" />
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
          <CoverImage url={image?.url} seed={name || 'destination'} pin className="h-44 rounded-3xl shadow-soft" showAttribution={false}>
            {imagesLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm">
                <Loader2 className="size-7 animate-spin text-white" />
              </div>
            )}
          </CoverImage>
          {image?.attribution && <AttributionText raw={image.attribution} className="mt-2 px-1" />}
          {images && images.length === 0 && !imagesLoading && (
            <p className="mt-2 px-1 text-xs text-muted-foreground">{t('destForm.noPhoto')}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            {images && images.length > 1 && (
              <Button type="button" variant="glass" size="sm" onClick={cycleImage}>
                <Images />
                {t('destForm.otherPhoto', { current: imageIndex + 1, total: images.length })}
              </Button>
            )}
            {!images && name.trim() && !imagesLoading && (
              <Button type="button" variant="glass" size="sm" onClick={() => void loadImages(name)}>
                <Search />
                {t('destForm.findPhoto')}
              </Button>
            )}
            {image && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setImage(null)}>
                <ImageOff />
                {t('destForm.withoutPhoto')}
              </Button>
            )}
          </div>
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

        {/* ── Budget ── */}
        <section>
          <Label>{t('destForm.budget')}</Label>
          <div className="grid grid-cols-3 gap-1 rounded-2xl bg-foreground/[0.05] p-1">
            {([1, 2, 3] as const).map((level) => (
              <button
                key={level}
                type="button"
                aria-pressed={budget === level}
                onClick={() => setBudget(budget === level ? null : level)}
                className={cn(
                  'relative flex flex-col items-center rounded-xl py-2 transition-colors',
                  budget === level ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {budget === level && (
                  <motion.span layoutId="budget-pill" className="absolute inset-0 rounded-xl bg-[var(--paper)] shadow-soft" transition={{ type: 'spring', stiffness: 450, damping: 32 }} />
                )}
                <span className="relative font-semibold">{'€'.repeat(level)}</span>
                <span className="relative text-[0.68rem]">{t(`budget.${level}`)}</span>
              </button>
            ))}
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
