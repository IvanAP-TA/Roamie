import { useMemo, useState } from 'react'
import { Check, Loader2, MessagesSquare, ShieldCheck } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { Sheet } from '@/components/ui/sheet'
import { useDestinations } from '@/hooks/useDestinations'
import { useTellTheGroup } from '@/hooks/useTellTheGroup'
import { useTripContext } from '@/hooks/useTripContext'
import { keys } from '@/hooks/useTrips'
import { findPlaces, normalizePlace, type ExtraPlace, type FoundPlace, type PlaceIndex } from '@/lib/chatPlaces'
import { loadCountries } from '@/lib/countries'
import { flagEmoji } from '@/lib/flags'
import { supabase } from '@/lib/supabase'
import { cn, safeImageUrl } from '@/lib/utils'
import { findPlaceImages, serializeAttribution } from '@/lib/wikimedia'

const LANGS = ['it', 'en', 'es'] as const
const MAX_CHAT = 20_000

/**
 * What the chat is matched against, fetched when the sheet is first used: the cities (public/data/chat-places.json),
 * the guides' places and the countries, by their names in Italian, English and Spanish.
 */
let loading: Promise<{ index: PlaceIndex; extras: ExtraPlace[] }> | null = null
function loadPlaces() {
  loading ??= (async () => {
    const [index, countries, { GUIDE_CONTENT }] = await Promise.all([
      fetch('/data/chat-places.json').then((r) => (r.ok ? (r.json() as Promise<PlaceIndex>) : Promise.reject(new Error('places')))),
      loadCountries(),
      import('@/content/guides/content'),
    ])
    const guidePlaces: ExtraPlace[] = Object.values(GUIDE_CONTENT).flatMap((guide) =>
      guide.places.map((p) => ({ names: [...new Set(LANGS.map((l) => normalizePlace(p.name[l])))], countryCode: p.countryCode, lat: p.lat, lng: p.lng })),
    )
    const displays = LANGS.map((l) => new Intl.DisplayNames([l], { type: 'region' }))
    const countryPlaces: ExtraPlace[] = Object.keys(countries)
      .filter((code) => /^[A-Z]{2}$/.test(code))
      .map((code) => ({ names: [...new Set(displays.map((d) => normalizePlace(d.of(code) ?? '')).filter(Boolean))], countryCode: code, lat: null, lng: null }))
    return { index, extras: [...guidePlaces, ...countryPlaces] }
  })().catch((error) => {
    loading = null
    throw error
  })
  return loading
}

/**
 * "Paste the group chat": the places a WhatsApp or Telegram chat already talks about become the trip's proposals in
 * one go. The chat is read on the device and never sent anywhere (lib/chatPlaces.ts); only the places picked are
 * saved, each with a photo found the same way as when a place is added by hand.
 */
export function ChatImportSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.resolvedLanguage ?? 'en'
  const { trip } = useTripContext()
  const { data: destinations } = useDestinations(trip.id)
  const qc = useQueryClient()
  const tellGroup = useTellTheGroup()
  const [chat, setChat] = useState('')
  const [found, setFound] = useState<FoundPlace[] | null>(null)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState<'reading' | 'saving' | null>(null)

  // Places the trip already has, by name, so they aren't proposed twice.
  const existing = useMemo(() => new Set((destinations ?? []).map((d) => normalizePlace(d.name))), [destinations])
  const isNew = (place: FoundPlace) => !existing.has(normalizePlace(place.name))
  const country = (code: string) => {
    try {
      return new Intl.DisplayNames([lang], { type: 'region' }).of(code) ?? code
    } catch {
      return code
    }
  }

  const reset = () => {
    setFound(null)
    setPicked(new Set())
  }

  const read = async () => {
    setBusy('reading')
    try {
      const { index, extras } = await loadPlaces()
      const places = findPlaces(chat.slice(0, MAX_CHAT), index, extras)
      setFound(places)
      setPicked(new Set(places.filter(isNew).map((p) => p.id)))
    } catch {
      toast.error(t('errors.generic'))
    } finally {
      setBusy(null)
    }
  }

  const save = async () => {
    const chosen = (found ?? []).filter((p) => picked.has(p.id) && isNew(p))
    if (!chosen.length) return
    setBusy('saving')
    try {
      // A few photo searches at a time (Wikimedia asks automated clients to go gently).
      const rows = []
      for (let start = 0; start < chosen.length; start += 4) {
        rows.push(
          ...(await Promise.all(
            chosen.slice(start, start + 4).map(async (place) => {
              const image = (await findPlaceImages(place.name, lang).catch(() => [])).find((img) => safeImageUrl(img.thumbUrl)) ?? null
              return {
                trip_id: trip.id,
                name: place.name.slice(0, 120),
                country: place.lat === null ? null : country(place.countryCode),
                country_code: place.countryCode,
                lat: place.lat,
                lng: place.lng,
                image_url: image?.thumbUrl ?? null,
                image_attribution: image ? serializeAttribution(image.attribution) : null,
                mood: [],
                expectations: null,
              }
            }),
          )),
        )
      }
      const { error } = await supabase.from('destinations').insert(rows)
      if (error) throw error
      await qc.invalidateQueries({ queryKey: keys.destinations(trip.id) })
      void qc.invalidateQueries({ queryKey: keys.trips })
      tellGroup(
        t('chatImport.added', { count: rows.length }),
        t('chatImport.tell', { places: rows.map((r) => r.name).join(', '), trip: trip.name }),
      )
      onOpenChange(false)
      setChat('')
      reset()
    } catch {
      toast.error(t('errors.generic'))
    } finally {
      setBusy(null)
    }
  }

  const toggle = (id: string) =>
    setPicked((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const count = (found ?? []).filter((p) => picked.has(p.id) && isNew(p)).length

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t('chatImport.title')}
      description={found ? undefined : t('chatImport.intro')}
      footer={
        <div className="space-y-2 pb-3">
          {found ? (
            <div className="flex gap-2">
              <Button variant="ghost" onClick={reset} disabled={busy !== null}>
                {t('common.back')}
              </Button>
              <Button className="flex-1" onClick={() => void save()} disabled={!count || busy !== null}>
                {busy === 'saving' ? <Loader2 className="animate-spin" /> : <Check />}
                {t('chatImport.add', { count })}
              </Button>
            </div>
          ) : (
            <Button className="w-full" onClick={() => void read()} disabled={!chat.trim() || busy !== null}>
              {busy === 'reading' ? <Loader2 className="animate-spin" /> : <MessagesSquare />}
              {t('chatImport.find')}
            </Button>
          )}
        </div>
      }
    >
      {!found ? (
        <div className="space-y-3 pb-2">
          <Textarea
            value={chat}
            onChange={(e) => setChat(e.target.value)}
            rows={8}
            maxLength={MAX_CHAT}
            placeholder={t('chatImport.placeholder')}
            aria-label={t('chatImport.placeholder')}
          />
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="mt-px size-4 shrink-0 text-sage" />
            {t('chatImport.privacy')}
          </p>
        </div>
      ) : found.length === 0 ? (
        <p className="pb-4 text-sm text-muted-foreground">{t('chatImport.none')}</p>
      ) : (
        <div className="space-y-3 pb-2">
          <p className="text-sm text-muted-foreground">{t('chatImport.pick')}</p>
          <ul className="space-y-2">
            {found.map((place) => {
              const fresh = isNew(place)
              const on = fresh && picked.has(place.id)
              return (
                <li key={place.id}>
                  <button
                    type="button"
                    disabled={!fresh || busy !== null}
                    onClick={() => toggle(place.id)}
                    aria-pressed={on}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition',
                      on ? 'border-primary/50 bg-primary/8' : 'border-border bg-foreground/[0.03]',
                      !fresh && 'opacity-55',
                    )}
                  >
                    <span aria-hidden className="text-xl">
                      {flagEmoji(place.countryCode)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{place.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {!fresh ? t('chatImport.already') : [place.lat !== null && country(place.countryCode), t('chatImport.mentions', { count: place.mentions })].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    <span
                      aria-hidden
                      className={cn('flex size-6 shrink-0 items-center justify-center rounded-full border-2', on ? 'border-primary bg-primary text-primary-foreground' : 'border-foreground/25')}
                    >
                      {on && <Check className="size-3.5" strokeWidth={3} />}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          <p className="text-[0.7rem] text-muted-foreground">{t('chatImport.source')}</p>
        </div>
      )}
    </Sheet>
  )
}
