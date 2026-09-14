import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { useScrolled } from '@/hooks/useScrolled'
import { UserAvatar } from '@/components/ui/avatar'
import { LanguageSwitcher } from './LanguageSwitcher'
import { cn } from '@/lib/utils'

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
  const scrolled = useScrolled()

  return (
    <header className={cn('pt-safe sticky top-0 z-30 transition-all duration-300', className)}>
      <div
        className={cn(
          'mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 transition-all duration-300 md:px-6',
          scrolled && 'glass-strong mx-2 mt-2 rounded-[1.5rem] py-2 md:mx-auto',
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {left}
          {title && (
            <div
              className={cn(
                'min-w-0 truncate font-display text-lg font-medium transition-all duration-300',
                scrolled ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-1 opacity-0',
              )}
            >
              {title}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
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
