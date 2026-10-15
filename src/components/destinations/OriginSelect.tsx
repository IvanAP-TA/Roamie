import { useMemo } from 'react'
import { ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { flagEmoji } from '@/lib/flags'
import { ORIGIN_HUBS, useOrigin } from '@/lib/origin'
import { cn } from '@/lib/utils'
import { collator } from '@/lib/intl'

/** The country flights are estimated from: a native select, so it works the same on every phone. */
export function OriginSelect({ label, className }: { label: string; className?: string }) {
  const { i18n } = useTranslation()
  const lang = i18n.resolvedLanguage ?? 'it'
  const [origin, setOrigin] = useOrigin()

  const options = useMemo(() => {
    let names: Intl.DisplayNames | null = null
    try {
      names = new Intl.DisplayNames([lang], { type: 'region' })
    } catch {
      // Very old browsers: the codes will do.
    }
    return Object.keys(ORIGIN_HUBS)
      .map((code) => ({ code, name: names?.of(code) ?? code }))
      .sort((a, b) => collator(lang).compare(a.name, b.name))
  }, [lang])

  return (
    <span className={cn('relative inline-flex max-w-full items-center', className)}>
      <select
        value={origin}
        onChange={(e) => setOrigin(e.target.value)}
        aria-label={label}
        className="max-w-44 cursor-pointer appearance-none truncate rounded-full bg-background/70 py-1 pr-7 pl-2.5 text-sm font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {options.map(({ code, name }) => (
          <option key={code} value={code}>
            {flagEmoji(code)} {name}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute right-2 size-3.5 text-muted-foreground" />
    </span>
  )
}
