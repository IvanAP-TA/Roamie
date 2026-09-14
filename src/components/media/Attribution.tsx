import { Copyright, ExternalLink } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { parseAttribution } from '@/lib/wikimedia'
import { cn } from '@/lib/utils'

/** Compact CC attribution chip (cards) that opens author/licence details. */
export function AttributionChip({ raw, className }: { raw: string | null | undefined; className?: string }) {
  const { t } = useTranslation()
  const attribution = parseAttribution(raw)
  if (!attribution) return null

  const stop = (e: React.SyntheticEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  return (
    <Popover>
      <PopoverTrigger
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label={t('media.photoCredits')}
        className={cn(
          'inline-flex h-6 items-center gap-1 rounded-full bg-black/35 px-2 text-[0.62rem] font-semibold text-white/90 backdrop-blur-md transition hover:bg-black/50',
          className,
        )}
      >
        <Copyright className="size-3" />
        {attribution.license ? attribution.license.replace(/^CC /, 'CC ') : t('media.credits')}
      </PopoverTrigger>
      <PopoverContent onClick={stop} className="space-y-1">
        <AttributionText raw={raw} />
      </PopoverContent>
    </Popover>
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
