import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, MapPin, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { localizePlace, NominatimError, searchPlaces, type Place } from '@/lib/nominatim'
import { suggestPlaces } from '@/lib/photon'

const SUGGEST_MIN_CHARS = 3
const SUGGEST_DEBOUNCE_MS = 300

/**
 * Place search used by destinations and itinerary stops: suggestions while typing (Photon), the full
 * search on demand (Nominatim, whose policy forbids autocomplete), and the picked place renamed in the
 * UI language. Not a <form>, so it can sit inside other forms.
 */
export function PlaceSearch({
  id,
  placeholder,
  onPick,
  onBusyChange,
}: {
  id: string
  placeholder?: string
  onPick: (place: Place) => void
  onBusyChange?: (busy: boolean) => void
}) {
  const { t, i18n } = useTranslation()
  const lang = i18n.resolvedLanguage ?? 'en'
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ source: 'suggest' | 'search'; places: Place[] } | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)

  // Suggestions as you type, debounced; a newer keystroke aborts the previous request.
  useEffect(() => {
    const q = query.trim()
    if (q.length < SUGGEST_MIN_CHARS) {
      setResults(null)
      setSearching(false)
      return
    }
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setSearching(true)
      setSearchError(null)
      try {
        setResults({ source: 'suggest', places: await suggestPlaces(q, controller.signal) })
      } catch {
        // Suggestions are best-effort: the explicit search is still available.
        if (!controller.signal.aborted) setResults({ source: 'suggest', places: [] })
      } finally {
        if (!controller.signal.aborted) setSearching(false)
      }
    }, SUGGEST_DEBOUNCE_MS)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  const searchPlace = async () => {
    if (query.trim().length < 2) return
    setSearching(true)
    setSearchError(null)
    try {
      setResults({ source: 'search', places: await searchPlaces(query, lang) })
    } catch (err) {
      setSearchError(err instanceof NominatimError && err.code === 'rate_limited' ? t('destForm.rateLimited') : t('destForm.searchFailed'))
    } finally {
      setSearching(false)
    }
  }

  const pickPlace = async (place: Place) => {
    setResults(null)
    setPicking(true)
    onBusyChange?.(true)
    const localized = await localizePlace(place, lang)
    setPicking(false)
    onBusyChange?.(false)
    setQuery('')
    onPick(localized)
  }

  return (
    <div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            id={id}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void searchPlace()
              }
            }}
            placeholder={placeholder ?? t('destForm.searchPlaceholder')}
            enterKeyHint="search"
            autoComplete="off"
            role="combobox"
            aria-expanded={Boolean(results)}
            aria-controls={`${id}-results`}
            className="pr-10"
          />
          {(searching || picking) && <Loader2 className="absolute top-1/2 right-3.5 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
        </div>
        <Button type="button" variant="secondary" size="icon" className="size-12 shrink-0 rounded-2xl" onClick={() => void searchPlace()} aria-label={t('media.search')}>
          <Search />
        </Button>
      </div>
      {searchError && <p className="mt-2 px-1 text-sm text-destructive">{searchError}</p>}

      <AnimatePresence>
        {results && (
          <motion.ul
            id={`${id}-results`}
            role="listbox"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 overflow-hidden rounded-2xl border border-border bg-[var(--glass-strong)]"
          >
            {results.places.length === 0 && (
              <li className="px-4 py-3 text-sm text-muted-foreground">
                {results.source === 'suggest' ? t('destForm.noSuggestions') : t('destForm.noPlaces')}
              </li>
            )}
            {results.places.map((place) => (
              <li key={place.id} role="option" aria-selected={false}>
                <button
                  type="button"
                  onClick={() => void pickPlace(place)}
                  className="flex min-h-12 w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-foreground/5 active:bg-foreground/10"
                >
                  <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{place.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{place.displayName}</span>
                  </span>
                </button>
              </li>
            ))}
            {results.source === 'suggest' && (
              <li className="border-t border-border">
                <button
                  type="button"
                  onClick={() => void searchPlace()}
                  className="flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-primary transition hover:bg-foreground/5"
                >
                  <Search className="size-4 shrink-0" />
                  <span className="truncate">{t('destForm.searchMore', { query: query.trim() })}</span>
                </button>
              </li>
            )}
            <li className="border-t border-border px-4 py-1.5 text-[0.65rem] text-muted-foreground">
              {t('destForm.searchAttribution')}{' '}
              <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline">
                © OpenStreetMap
              </a>
            </li>
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
