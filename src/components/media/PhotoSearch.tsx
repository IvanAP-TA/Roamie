import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, ImageOff, Loader2, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { findPlaceImages, type WikiImage } from '@/lib/wikimedia'
import { cn } from '@/lib/utils'

/** Explicit (on submit) Wikimedia Commons search with a selectable thumbnail grid. */
export function PhotoSearch({
  initialQuery = '',
  selectedUrl,
  onSelect,
}: {
  initialQuery?: string
  selectedUrl: string | null
  onSelect: (image: WikiImage) => void
}) {
  const { t, i18n } = useTranslation()
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<WikiImage[] | null>(null)
  const [loading, setLoading] = useState(false)

  const run = async () => {
    if (!query.trim()) return
    setLoading(true)
    try {
      setResults(await findPlaceImages(query, i18n.resolvedLanguage ?? 'en'))
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          void run()
        }}
      >
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('media.searchPlaceholder')} />
        <Button type="submit" variant="secondary" size="icon" className="size-12 shrink-0 rounded-2xl" aria-label={t('media.search')}>
          {loading ? <Loader2 className="animate-spin" /> : <Search />}
        </Button>
      </form>

      {results && results.length === 0 && !loading && (
        <p className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
          <ImageOff className="size-4 shrink-0" />
          {t('media.noResults')}
        </p>
      )}

      {results && results.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {results.map((img, i) => {
            const selected = selectedUrl === img.thumbUrl
            return (
              <motion.button
                type="button"
                key={img.title}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => onSelect(img)}
                className={cn(
                  'relative aspect-square overflow-hidden rounded-2xl bg-muted ring-offset-2 ring-offset-[var(--popover)] transition active:scale-95',
                  selected && 'ring-3 ring-primary',
                )}
              >
                <img src={img.thumbUrl} alt="" loading="lazy" crossOrigin="anonymous" className="size-full object-cover" />
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
