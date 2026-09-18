import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plane, Plus, Ticket } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { useMyTrips } from '@/hooks/useTrips'
import { Logo } from '@/components/brand/Logo'
import { InspirationCard } from '@/components/guides/GuidesLink'
import { InstallAppCard } from '@/components/install/InstallApp'
import { AppHeader } from '@/components/layout/AppHeader'
import { Footer } from '@/components/layout/Footer'
import { PageTransition, staggerContainer, staggerItem } from '@/components/layout/PageTransition'
import { TicketCard } from '@/components/trips/TicketCard'
import { TrendingPlaces } from '@/components/trips/TrendingPlaces'
import { TripFormSheet } from '@/components/trips/TripFormSheet'
import { JoinCodeForm } from '@/components/trips/JoinCodeForm'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'
import { EmptyState, Skeleton } from '@/components/ui/misc'

export default function TripsPage() {
  const { t } = useTranslation()
  const { profile, user } = useAuth()
  const { data: trips, isLoading, isError, refetch } = useMyTrips()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const [joinOpen, setJoinOpen] = useState(false)

  const creating = params.get('new') === '1'
  const openCreate = () => setParams({ new: '1' })
  const closeCreate = () => setParams({}, { replace: true })
  const firstName = profile?.display_name?.split(' ')[0] ?? ''

  return (
    <>
      <AppHeader left={<Logo to="/trips" />} />

      <PageTransition className="mx-auto max-w-5xl px-5 md:px-6">
        <section className="mt-3 mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t('trips.greeting', { name: firstName })}</p>
            <h1 className="mt-1 text-[2.6rem] leading-none md:text-6xl">
              {t('trips.title')}
              {trips && trips.length > 0 && (
                <sup className="ml-1.5 align-super font-sans text-base font-semibold text-primary">{trips.length}</sup>
              )}
            </h1>
          </div>
          <div className="flex gap-2">
            <Button variant="glass" size="sm" onClick={() => setJoinOpen(true)}>
              <Ticket />
              {t('trips.joinWithCode')}
            </Button>
            <Button size="sm" className="hidden md:inline-flex" onClick={openCreate}>
              <Plus />
              {t('trips.create')}
            </Button>
          </div>
        </section>

        {isLoading && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-[19rem] rounded-[1.75rem]" />
            ))}
          </div>
        )}

        {isError && (
          <EmptyState seed="error" title={t('errors.loadTrips')} body={t('errors.checkConnection')}>
            <Button onClick={() => void refetch()}>{t('common.retry')}</Button>
          </EmptyState>
        )}

        {trips && trips.length === 0 && (
          <EmptyState seed="3" icon={<Plane />} title={t('trips.emptyTitle')} body={t('trips.emptyBody')}>
            <Button size="lg" onClick={openCreate}>
              <Plus />
              {t('trips.create')}
            </Button>
            <Button size="lg" variant="glass" onClick={() => setJoinOpen(true)}>
              <Ticket />
              {t('trips.joinWithCode')}
            </Button>
          </EmptyState>
        )}

        {trips && trips.length > 0 && (
          <motion.ul
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {trips.map((trip) => (
              <motion.li key={trip.id} variants={staggerItem}>
                <TicketCard trip={trip} myRole={trip.trip_members.find((m) => m.user_id === user?.id)?.role} />
              </motion.li>
            ))}
          </motion.ul>
        )}

        {trips && trips.length > 0 && <InstallAppCard className="mt-10" />}
        {trips && <TrendingPlaces className="mt-10" />}
        {trips && <InspirationCard className="mt-6" />}
      </PageTransition>

      <Footer className="mt-8" />

      <TripFormSheet
        open={creating}
        onOpenChange={(open) => !open && closeCreate()}
        onSaved={(trip) => navigate(`/trips/${trip.id}/group`, { replace: true })}
      />

      <Sheet open={joinOpen} onOpenChange={setJoinOpen} title={t('join.enterCodeTitle')} description={t('join.enterCodeBody')}>
        <JoinCodeForm onDone={() => setJoinOpen(false)} />
      </Sheet>
    </>
  )
}
