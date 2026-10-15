import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowRight, CalendarDays, CheckCheck, Clock, Compass, MapPin, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { LanguageCode } from '@/i18n'
import { useAuth } from '@/hooks/useAuth'
import { usePublicTrip } from '@/hooks/usePublicTrip'
import { setHeadTag } from '@/hooks/useSeo'
import { flagEmoji } from '@/lib/flags'
import { LANDING_PATHS, SITE_URL } from '@/lib/seo'
import type { PublicTrip } from '@/lib/types'
import { AuroraBackground } from '@/components/brand/AuroraBackground'
import { Logo } from '@/components/brand/Logo'
import { MoodTag } from '@/components/destinations/moods'
import { Footer } from '@/components/layout/Footer'
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher'
import { PageTransition } from '@/components/layout/PageTransition'
import { CoverImage } from '@/components/media/CoverImage'
import { Button } from '@/components/ui/button'
import { EmptyState, Skeleton } from '@/components/ui/misc'
import { dateFormat } from '@/lib/intl'

/** Same tags api/public-trip.ts renders on the server, kept in sync for client-side navigation. */
function usePublicTripSeo(trip: PublicTrip | null | undefined) {
  const { t } = useTranslation()
  useEffect(() => {
    if (trip === undefined) return
    document.head.querySelectorAll('link[rel="alternate"][hreflang]').forEach((el) => el.remove())
    if (!trip) {
      document.title = `${t('publicPage.notFoundTitle')} · Roamie`
      setHeadTag('meta[name="robots"]', 'meta', { name: 'robots', content: 'noindex, follow' })
      setHeadTag('link[rel="canonical"]', 'link', null)
      return
    }
    const names = trip.destinations.slice(0, 6).map((d) => d.name)
    document.title = `${trip.name} · Roamie`
    setHeadTag('meta[name="description"]', 'meta', {
      name: 'description',
      content: (trip.description?.trim() || names.join(' · ') || 'Roamie').slice(0, 200),
    })
    setHeadTag('meta[name="robots"]', 'meta', { name: 'robots', content: 'index, follow, max-image-preview:large' })
    setHeadTag('link[rel="canonical"]', 'link', { rel: 'canonical', href: `${SITE_URL}/p/${trip.slug}` })
  }, [trip, t])
}

export default function PublicTripPage() {
  const { t } = useTranslation()
  const { slug } = useParams()
  const { session } = useAuth()
  const { data: trip, isLoading, isError, refetch } = usePublicTrip(slug?.toLowerCase())
  usePublicTripSeo(isLoading || isError ? undefined : (trip ?? null))

  return (
    <div className="relative flex min-h-dvh flex-col">
      <AuroraBackground />
      <header className="pt-safe mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-4 md:px-6">
        <Logo to={session ? '/trips' : '/'} />
        <LanguageSwitcher />
      </header>

      <main className="flex-1">
        <PageTransition className="mx-auto w-full max-w-5xl space-y-12 px-5 pb-16 md:px-6">
          {isLoading && (
            <div className="space-y-6">
              <Skeleton className="h-72 rounded-[2rem] md:h-96" />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-64 rounded-[1.75rem]" />
                ))}
              </div>
            </div>
          )}

          {isError && (
            <div className="glass-strong mx-auto max-w-sm rounded-[2rem] p-7 text-center">
              <h1 className="text-2xl">{t('errors.generic')}</h1>
              <Button className="mt-5" onClick={() => void refetch()}>
                {t('common.retry')}
              </Button>
            </div>
          )}

          {!isLoading && !isError && !trip && (
            <EmptyState seed={slug ?? 'public'} icon={<Compass />} title={t('publicPage.notFoundTitle')} body={t('publicPage.notFoundBody')}>
              <Button asChild size="lg">
                <Link to="/">{t('publicPage.cta')}</Link>
              </Button>
            </EmptyState>
          )}

          {trip && <TripContent trip={trip} signedIn={Boolean(session)} />}
        </PageTransition>
      </main>

      <Footer />
    </div>
  )
}

function TripContent({ trip, signedIn }: { trip: PublicTrip; signedIn: boolean }) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'it') as LanguageCode
  const dayDate = dateFormat(lang, { weekday: 'short', day: 'numeric', month: 'short' })

  return (
    <>
      <section className="overflow-hidden rounded-[2rem] shadow-soft">
        <CoverImage
          url={trip.cover_image_url}
          attribution={trip.cover_image_attribution}
          seed={trip.slug}
          sizes="100vw"
          priority
          className="h-72 md:h-96"
        >
          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_35%,rgb(20_10_5/0.7))]" />
          <div className="absolute inset-x-5 bottom-6 text-white md:inset-x-8 md:bottom-8">
            <p className="text-[0.68rem] font-bold tracking-[0.24em] uppercase opacity-85">{t('publicPage.eyebrow')}</p>
            <h1 className="mt-1 text-4xl leading-[1.05] drop-shadow md:text-6xl">{trip.name}</h1>
            <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium opacity-90">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4" />
                {t('publicPage.destinationCount', { count: trip.destinations.length })}
              </span>
              {trip.days.length > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-4" />
                  {t('publicPage.dayCount', { count: trip.days.length })}
                </span>
              )}
            </p>
          </div>
        </CoverImage>
      </section>

      {trip.description && <p className="max-w-2xl text-lg leading-relaxed whitespace-pre-line text-foreground/80">{trip.description}</p>}

      <section className="space-y-4" aria-labelledby="public-destinations">
        <h2 id="public-destinations" className="text-3xl">
          {t('publicPage.destinations')}
        </h2>
        {trip.destinations.length === 0 ? (
          <p className="text-muted-foreground">{t('publicPage.noDestinations')}</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trip.destinations.map((d) => (
              <li key={d.id} className="overflow-hidden rounded-[1.75rem] bg-paper shadow-soft">
                <CoverImage
                  url={d.image_url}
                  attribution={d.image_attribution}
                  seed={d.name}
                  pin
                  sizes="(min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw"
                  className="h-44"
                >
                  {d.status !== 'proposed' && (
                    <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-[var(--glass-strong)] px-2.5 py-1 text-[0.68rem] font-bold tracking-wide uppercase backdrop-blur-md">
                      {d.status === 'selected' ? <Sparkles className="size-3.5 text-primary" /> : <CheckCheck className="size-3.5 text-sage" />}
                      {t(`status.${d.status}`)}
                    </span>
                  )}
                </CoverImage>
                <div className="space-y-2.5 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-display text-2xl leading-tight">{d.name}</h3>
                      {(d.country || d.country_code) && (
                        <p className="truncate text-sm text-muted-foreground">
                          {d.country_code && <span aria-hidden>{flagEmoji(d.country_code)} </span>}
                          {d.country}
                        </p>
                      )}
                    </div>
                    {d.points != null && d.points > 0 && (
                      <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary tabular-nums">
                        {t('points.score', { count: d.points })}
                      </span>
                    )}
                  </div>
                  {d.mood.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {d.mood.slice(0, 3).map((mood) => (
                        <MoodTag key={mood} mood={mood} />
                      ))}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {trip.days.length > 0 && (
        <section className="space-y-4" aria-labelledby="public-itinerary">
          <h2 id="public-itinerary" className="text-3xl">
            {t('publicPage.itinerary')}
          </h2>
          <ol className="space-y-3">
            {trip.days.map((day) => (
              <li key={day.day_number} className="glass rounded-[1.75rem] p-5">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-sans text-xs font-bold tracking-wide text-primary uppercase">{t('publicPage.day', { number: day.day_number })}</span>
                  {day.date && <span className="text-xs text-muted-foreground">{dayDate.format(new Date(`${day.date}T12:00:00`))}</span>}
                </div>
                {day.title && <h3 className="mt-1 font-display text-xl">{day.title}</h3>}
                {day.items.length > 0 && (
                  <ul className="mt-3 space-y-3 border-l-2 border-dashed border-foreground/10 pl-4">
                    {day.items.map((item, index) => (
                      <li key={index}>
                        <p className="flex flex-wrap items-baseline gap-x-2 font-medium">
                          {item.time && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground tabular-nums">
                              <Clock className="size-3" />
                              {item.time}
                            </span>
                          )}
                          {item.title}
                        </p>
                        {item.place_name && (
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="size-3 shrink-0" />
                            <span className="truncate">{item.place_name}</span>
                          </p>
                        )}
                        {item.description && <p className="mt-1 text-sm whitespace-pre-line text-foreground/75">{item.description}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="glass-strong rounded-[2rem] p-7 text-center md:p-10">
        <h2 className="text-3xl">{t('publicPage.ctaTitle')}</h2>
        <p className="mx-auto mt-2 max-w-md text-muted-foreground">{t('publicPage.ctaBody')}</p>
        <Button asChild size="lg" className="mt-6">
          <Link to={signedIn ? '/trips' : (LANDING_PATHS[lang] ?? '/')}>
            {signedIn ? t('publicPage.ctaMember') : t('publicPage.cta')}
            <ArrowRight />
          </Link>
        </Button>
      </section>
    </>
  )
}
