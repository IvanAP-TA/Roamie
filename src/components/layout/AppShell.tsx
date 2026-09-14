import { Outlet, useNavigate } from 'react-router-dom'
import { Luggage, Plus, UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AuroraBackground } from '@/components/brand/AuroraBackground'
import { DockNav } from './DockNav'

/** Shell for the authenticated, non-trip screens (trip list, profile). */
export function AppShell() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className="relative min-h-dvh">
      <AuroraBackground />
      <div className="pb-32 md:pb-10 md:pl-28">
        <Outlet />
      </div>
      <DockNav
        layoutId="main-dock"
        items={[
          { to: '/trips', label: t('nav.trips'), icon: Luggage, end: true },
          { label: t('nav.new'), icon: Plus, primary: true, onClick: () => navigate('/trips?new=1') },
          { to: '/profile', label: t('nav.profile'), icon: UserRound },
        ]}
      />
    </div>
  )
}
