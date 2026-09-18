import type { ComponentProps } from 'react'
import { Link } from 'react-router-dom'
import { Compass, Earth } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { GUIDE_BASE } from '@/content/guides/meta'
import type { LanguageCode } from '@/i18n'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** The guides index in the current UI language: the guides are public, but members reach them from the app too. */
export function GuidesLinkButton({ size, variant, className }: Pick<ComponentProps<typeof Button>, 'size' | 'variant' | 'className'>) {
  const { t, i18n } = useTranslation()
  return (
    <Button asChild size={size} variant={variant} className={className}>
      <Link to={GUIDE_BASE[i18n.resolvedLanguage as LanguageCode] ?? GUIDE_BASE.en}>
        <Compass />
        {t('guides.browse')}
      </Link>
    </Button>
  )
}

export function InspirationCard({ className }: { className?: string }) {
  const { t } = useTranslation()
  return (
    <aside className={cn('glass flex flex-col items-start gap-4 rounded-[1.75rem] p-5 sm:flex-row sm:items-center md:p-6', className)}>
      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
        <Compass className="size-6" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-xl leading-snug">{t('guides.inspirationTitle')}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{t('guides.inspirationBody')}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <GuidesLinkButton />
        <Button asChild variant="glass">
          <Link to="/explore">
            <Earth />
            {t('explore.cta')}
          </Link>
        </Button>
      </div>
    </aside>
  )
}
