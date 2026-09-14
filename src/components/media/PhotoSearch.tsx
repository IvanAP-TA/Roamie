import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, ImageOff, Loader2, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/misc'
import { findPlaceImages, sizedThumb, type WikiImage } from '@/lib/wikimedia'
import { cn, safeImageUrl } from '@/lib/utils'

/** Wikimedia Commons photo picker: a searchable grid of thumbnails, optionally searching as soon as it opens. */
export function PhotoSearch({
  initialQuery = '',
  autoSearch = false,
  selectedUrl,
  onSelect,
  onResults,
}: {
  initialQuery?: string
  /** Search for `initialQuery` on mount instead of waiting for a submit. */
  autoSearch?: boolean
  selectedUrl: string | null
  onSelect: (image: WikiImage) => void
  /** Called with every result set, e.g. to pre-select the first photo. */
  onResults?: (images: WikiImage[]) => void
}) {
  const { t, i18n } = useTranslation()
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<WikiImage[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [broken, setBroken] = useState<ReadonlySet<string>>(new Set())
  const latestRun = useRef(0)

  const run = async (q: string) => {
    if (!q.trim()) return
    const run = ++latestRun.current
    setLoading(true)
    let found: WikiImage[] = []
    try {
      // Only URLs the database accepts, so a picked photo can always be saved.
      found = (await findPlaceImages(q, i18n.resolvedLanguage ?? 'en')).filter((img) => safeImageUrl(img.thumbUrl))
    } catch {
      found = []
    }
    if (run !== latestRun.current) return
    setResults(found)
    setLoading(false)
    onResults?.(found)
  }

  useEffect(() => {
    if (autoSearch) void run(initialQuery)
    // Mount only: the parent remounts the picker (key) to search for a different place.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const visible = results?.filter((img) => !broken.has(img.thumbUrl)) ?? null

  return (
    <div className="space-y-3">
      {/* Not a <form>: the picker lives inside the trip and destination forms. */}
      <div className="flex gap-2" role="search">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void run(query)
            }
          }}
          placeholder={t('media.searchPlaceholder')}
          enterKeyHint="search"
        />
        <Button type="button" variant="secondary" size="icon" className="size-12 shrink-0 rounded-2xl" onClick={() => void run(query)} aria-label={t('media.search')}>
          {loading ? <Loader2 className="animate-spin" /> : <Search />}
        </Button>
      </div>

      {loading && !visible && (
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="aspect-square rounded-2xl" />
          ))}
        </div>
      )}

      {visible && visible.length === 0 && !loading && (
        <p className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
          <ImageOff className="size-4 shrink-0" />
          {t('media.noResults')}
        </p>
      )}

      {visible && visible.length > 0 && (
        <div className={cn('grid grid-cols-3 gap-2 transition-opacity', loading && 'opacity-60')}>
          {visible.map((img, i) => {
            const selected = selectedUrl === img.thumbUrl
            return (
              <motion.button
                type="button"
                key={img.title}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => onSelect(img)}
                aria-pressed={selected}
                aria-label={img.title.replace(/^File:/, '')}
                className={cn(
                  'relative aspect-square overflow-hidden rounded-2xl bg-muted ring-offset-2 ring-offset-[var(--popover)] transition active:scale-95',
                  selected && 'ring-3 ring-primary',
                )}
              >
                <img
                  src={sizedThumb(img.thumbUrl, 330)}
                  alt=""
                  loading="lazy"
                  crossOrigin="anonymous"
                  onError={() => setBroken((prev) => new Set(prev).add(img.thumbUrl))}
                  className="size-full object-cover"
                />
                {selected && (
                  <span className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-3.5" />
                  </span>
                )}
              </motion.button>
            )
          })}
        </div>
      )}
      <p className="text-[0.7rem] text-muted-foreground">{t('media.commonsNote')}</p>
    </div>
  )
}
