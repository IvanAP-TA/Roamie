import { UserRound } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { Sheet } from '@/components/ui/sheet'
import { GoogleButton } from './GoogleButton'

/** For guests: link Google to keep everything and create trips of their own. Renders nothing for accounts. */
export function GuestBanner({ className }: { className?: string }) {
  const { t } = useTranslation()
  const { isGuest, profile } = useAuth()
  const location = useLocation()
  if (!isGuest) return null

  return (
    <section className={cn('glass-strong rounded-[1.75rem] p-5', className)}>
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <UserRound className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="font-sans text-base font-semibold">{t('guest.bannerTitle', { name: profile?.display_name?.split(' ')[0] ?? '' })}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('guest.bannerBody')}</p>
        </div>
      </div>
      <GoogleButton link next={`${location.pathname}${location.search}`} label={t('guest.link')} className="mt-4 h-12 bg-background" />
    </section>
  )
}

/** Shown to a guest who tries to create a trip. */
export function GuestUpgradeSheet({ open, onOpenChange, next }: { open: boolean; onOpenChange: (open: boolean) => void; next: string }) {
  const { t } = useTranslation()
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t('guest.createTitle')} description={t('guest.createBody')}>
      <div className="pb-2">
        <GoogleButton link next={next} label={t('guest.link')} className="bg-background" />
      </div>
    </Sheet>
  )
}
