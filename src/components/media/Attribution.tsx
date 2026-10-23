import { lazy, Suspense, useState } from 'react'
import { Copyright, ExternalLink } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { parseAttribution } from '@/lib/wikimedia'
import { cn } from '@/lib/utils'

const AttributionPopover = lazy(() => import('./AttributionPopover'))

/**
 * Compact CC attribution chip (cards) that opens author/licence details. Until it's first tapped it is a plain button:
 * a page shows one per photo, and a popover mounted on each, even closed, updates its state as it mounts, which forced
 * React to adopt a prerendered page in one long task. The popover loads on the first tap and opens right away.
 */
export function AttributionChip({ raw, className, compact = false }: { raw: string | null | undefined; className?: string; compact?: boolean }) {
  const { t } = useTranslation()
  const [used, setUsed] = useState(false)
  const attribution = parseAttribution(raw)
  if (!attribution || !raw) return null

  const trigger = (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        setUsed(true)
      }}
      onPointerDown={(e) => e.stopPropagation()}
      // With the licence on show, the name starts with it, as voice control users say it.
      aria-label={compact || !attribution.license ? t('media.photoCredits') : `${attribution.license} · ${t('media.photoCredits')}`}
      aria-haspopup="dialog"
      className={cn(
        // A larger invisible touch area around the small chip (::after), without moving anything.
        'relative inline-flex h-6 items-center gap-1 rounded-full bg-black/35 after:absolute after:-inset-2 after:content-[\'\'] text-xs font-semibold text-white/90 backdrop-blur-md transition hover:bg-black/50',
        compact ? 'w-6 justify-center' : 'px-2',
        className,
      )}
    >
      <Copyright className="size-3" />
      {/* Compact (small cards): the icon alone, the licence is in the details it opens. */}
      {!compact && (attribution.license ? attribution.license.replace(/^CC /, 'CC ') : t('media.credits'))}
    </button>
  )
  if (!used) return trigger
  return (
    <Suspense fallback={trigger}>
      <AttributionPopover raw={raw} trigger={trigger} />
    </Suspense>
  )
}

/** Inline, always-visible attribution line (detail views). */
export function AttributionText({ raw, className }: { raw: string | null | undefined; className?: string }) {
  const { t } = useTranslation()
  const a = parseAttribution(raw)
  if (!a) return null

  return (
    <p className={cn('text-xs leading-relaxed text-muted-foreground', className)}>
      {t('media.photoBy')} <span className="font-semibold text-foreground/85">{a.author}</span>
      {a.license && (
        <>
          {' · '}
          {a.licenseUrl ? (
            <a href={a.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">
              {a.license}
            </a>
          ) : (
            a.license
          )}
        </>
      )}
      {a.sourceUrl && (
        <>
          {' · '}
          <a
            href={a.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 underline underline-offset-2 hover:text-foreground"
          >
            Wikimedia Commons
            <ExternalLink className="size-3" />
          </a>
        </>
      )}
    </p>
  )
}
