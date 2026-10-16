import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { useScrolled } from '@/hooks/useScrolled'
import { UserAvatar } from '@/components/ui/avatar'
import { LanguageSwitcher } from './LanguageSwitcher'
import { cn } from '@/lib/utils'

// Browsers that tie an animation to the scroll position play the header's change from the stylesheet alone, frame by
// frame with the finger (index.css, .app-header); the others switch it once, past the first few pixels.
const scrollLinked = typeof CSS !== 'undefined' && CSS.supports('animation-timeline: scroll()')

/**
 * The page's top bar. Scrolling down, it gathers into a glass pill: the pill fades in behind it and the buttons step
 * into it, all by opacity and transforms, which the compositor plays without the main thread.
 */
export function AppHeader({
  left,
  title,
  right,
  className,
}: {
  left: React.ReactNode
  title?: React.ReactNode
  right?: React.ReactNode
  className?: string
}) {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const scrolled = useScrolled(8, !scrollLinked)

  return (
    <header data-scrolled={scrolled || undefined} className={cn('app-header pt-safe sticky top-0 z-30', className)}>
      <div className="relative mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 md:px-6">
        <span aria-hidden className="app-header-glass glass-strong pointer-events-none absolute inset-x-2 top-2 bottom-0 rounded-[1.5rem] md:inset-x-0" />
        {/* The padding at the end keeps a long title clear of the buttons once both groups have stepped inwards. */}
        <div className="app-header-start relative flex min-w-0 flex-1 items-center gap-2 pe-4">
          {left}
          {title && <div className="app-header-title pointer-events-none min-w-0 truncate font-display text-lg font-medium">{title}</div>}
        </div>
        <div className="app-header-end relative flex shrink-0 items-center gap-2">
          {right}
          <LanguageSwitcher />
          <Link to="/profile" aria-label={t('nav.profile')} className="rounded-full transition active:scale-90">
            <UserAvatar profile={profile} className="size-9 ring-2 ring-white/60" />
          </Link>
        </div>
      </div>
    </header>
  )
}
