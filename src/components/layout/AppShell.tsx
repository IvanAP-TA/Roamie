import { Suspense } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Skeleton } from '@/components/ui/misc'
import { Luggage, Plus, Stamp, UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AuroraBackground } from '@/components/brand/AuroraBackground'
import { DockNav } from './DockNav'

/** Shell for the authenticated, non-trip screens (trip list, passport, profile). */
export function AppShell() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className="relative min-h-dvh">
      <AuroraBackground />
      <div className="pb-32 md:pb-10 md:pl-28">
        {/* Opening a page for the first time keeps the dock in place instead of the full-screen splash. */}
        <Suspense
          fallback={
            <div className="mx-auto max-w-5xl space-y-4 px-5 pt-8">
              <Skeleton className="h-12 w-2/3 rounded-full" />
              <Skeleton className="h-48 rounded-[2rem]" />
              <Skeleton className="h-32 rounded-[2rem]" />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </div>
      <DockNav
        layoutId="main-dock"
        items={[
          { to: '/trips', label: t('nav.trips'), icon: Luggage, end: true },
          { label: t('nav.new'), icon: Plus, primary: true, onClick: () => navigate('/trips?new=1') },
          { to: '/passport', label: t('nav.passport'), icon: Stamp },
          { to: '/profile', label: t('nav.profile'), icon: UserRound },
        ]}
      />
    </div>
  )
}
