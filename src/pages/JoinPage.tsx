import { useCallback, useEffect, useRef } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Loader2, TicketX, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { useSeo } from '@/hooks/useSeo'
import { useJoinTrip, useTripPreview } from '@/hooks/useTrips'
import { rpcErrorCode } from '@/lib/supabase'
import { formatInviteCode } from '@/lib/share'
import { AuroraBackground } from '@/components/brand/AuroraBackground'
import { Logo } from '@/components/brand/Logo'
import { GoogleButton } from '@/components/auth/GoogleButton'
import { GuestJoinForm } from '@/components/auth/GuestJoinForm'
import { CoverImage } from '@/components/media/CoverImage'
import { JoinCodeForm } from '@/components/trips/JoinCodeForm'
import { Footer } from '@/components/layout/Footer'
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher'
import { PageTransition } from '@/components/layout/PageTransition'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/misc'

export default function JoinPage() {
  const { t } = useTranslation()
  useSeo('app')
  const params = useParams()
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const { session, loading: authLoading } = useAuth()
  const code = params.code?.toUpperCase().replace(/[^A-Z0-9]/g, '')
  const autoJoin = search.get('auto') === '1'

  const preview = useTripPreview(authLoading ? undefined : code, session?.user.id)
  const join = useJoinTrip()
  const attempted = useRef(false)
  const trip = preview.data

  const doJoin = useCallback(async () => {
    if (!code || !trip) return
    try {
      const tripId = await join.mutateAsync(code)
      toast.success(t('join.welcome', { trip: trip.name }))
      navigate(`/trips/${tripId}`, { replace: true })
    } catch (err) {
      const code = rpcErrorCode(err as Error)
      toast.error(code === 'invalid_invite_code' ? t('join.invalidTitle') : code === 'owner_is_guest' ? t('join.ownerIsGuest') : t('errors.generic'))
    }
  }, [code, trip, join, navigate, t])

  // Back from Google login with ?auto=1 → join without a second tap.
  useEffect(() => {
    if (!autoJoin || !session || !trip || attempted.current) return
    attempted.current = true
    if (trip.is_member) navigate(`/trips/${trip.id}`, { replace: true })
    else void doJoin()
  }, [autoJoin, session, trip, doJoin, navigate])

  return (
    <div className="relative flex min-h-dvh flex-col">
      <AuroraBackground />
      <header className="pt-safe mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-4">
        <Logo to={session ? '/trips' : '/'} />
        <LanguageSwitcher />
      </header>

      <main className="flex flex-1 items-center justify-center px-5 py-6">
        <PageTransition className="w-full max-w-sm">
          {!code && (
            <div className="glass-strong rounded-[2rem] p-7">
              <h1 className="text-3xl">{t('join.enterCodeTitle')}</h1>
              <p className="mt-2 mb-6 text-sm text-muted-foreground">{t('join.enterCodeBody')}</p>
              <JoinCodeForm />
            </div>
          )}

          {code && (authLoading || preview.isLoading) && <Skeleton className="h-[26rem] rounded-[2rem]" />}

          {code && preview.isSuccess && !trip && (
            <div className="glass-strong rounded-[2rem] p-7 text-center">
              <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <TicketX className="size-6" />
              </div>
              <h1 className="text-2xl">{t('join.invalidTitle')}</h1>
              <p className="mt-2 mb-6 text-sm text-muted-foreground">{t('join.invalidBody')}</p>
              <JoinCodeForm />
            </div>
          )}

          {code && preview.isError && (
            <div className="glass-strong rounded-[2rem] p-7 text-center">
              <h1 className="text-2xl">{t('errors.generic')}</h1>
              <Button className="mt-5" onClick={() => void preview.refetch()}>
                {t('common.retry')}
              </Button>
            </div>
          )}

          {code && trip && (
            <motion.div
              initial={{ rotate: -4, y: 30, opacity: 0 }}
              animate={{ rotate: 0, y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 140, damping: 16 }}
              className="drop-shadow-[0_30px_40px_rgb(150_70_30/0.25)]"
            >
              <div className="ticket-notch overflow-hidden rounded-[2rem] bg-paper [--notch-y:calc(100%-8.75rem)]">
                <CoverImage
                  url={trip.cover_image_url}
                  attribution={trip.cover_image_attribution}
                  seed={trip.id}
                  sizes="(min-width: 640px) 448px, 100vw"
                  priority
                  className="h-52"
                >
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgb(0_0_0/0.45))]" />
                  <div className="absolute bottom-4 left-5 text-white">
                    <p className="text-[0.65rem] font-bold tracking-[0.24em] uppercase opacity-85">{t('join.invitedTo')}</p>
                    <h1 className="text-3xl leading-tight drop-shadow">{trip.name}</h1>
                  </div>
                </CoverImage>

                <div className="flex items-center justify-between px-6 py-4">
                  <span className="inline-flex items-center gap-2 text-sm font-medium">
                    <Users className="size-4 text-primary" />
                    {t('join.members', { count: trip.member_count })}
                  </span>
                  <span className="font-mono text-xs tracking-widest text-muted-foreground">{formatInviteCode(code)}</span>
                </div>

                <div className="mx-6 border-t-2 border-dashed border-foreground/10" />

                <div className="space-y-3 px-6 pt-5 pb-6">
                  {!session && (
                    <>
                      <GoogleButton next={`/join/${code}?auto=1`} label={t('join.joinWithGoogle')} className="bg-background" />
                      {/* Signing in here keeps this page: the ?auto=1 effect then joins the trip. */}
                      <GuestJoinForm onJoined={() => navigate(`/join/${code}?auto=1`, { replace: true })} />
                    </>
                  )}
                  {session && trip.is_member && (
                    <Button asChild size="lg" className="w-full">
                      <Link to={`/trips/${trip.id}`}>
                        {t('join.openTrip')}
                        <ArrowRight />
                      </Link>
                    </Button>
                  )}
                  {session && !trip.is_member && (
                    <Button size="lg" className="w-full" disabled={join.isPending} onClick={() => void doJoin()}>
                      {join.isPending ? <Loader2 className="animate-spin" /> : null}
                      {t('join.join')}
                    </Button>
                  )}
                  <p className="text-center text-xs text-muted-foreground">
                    {session && trip.is_member ? t('join.alreadyMember') : t('join.roleHint')}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </PageTransition>
      </main>

      <Footer />
    </div>
  )
}
