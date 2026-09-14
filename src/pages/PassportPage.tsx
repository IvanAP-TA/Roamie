import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Earth,
  Eye,
  EyeOff,
  Globe2,
  Luggage,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  Share2,
  Stamp as StampIcon,
  Star,
  Trash2,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useHideVisit, usePassport, useVisitedPlaceMutations } from '@/hooks/usePassport'
import { useSeo } from '@/hooks/useSeo'
import { flagEmoji as flagOf } from '@/lib/flags'
import { passportStats, type Stamp } from '@/lib/passport'
import type { PassportCardData } from '@/lib/passportCard'
import type { VisitedPlace } from '@/lib/types'
import { Logo } from '@/components/brand/Logo'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageTransition } from '@/components/layout/PageTransition'
import { StampMap } from '@/components/map/StampMap'
import { CoverImage } from '@/components/media/CoverImage'
import { PassportShareSheet } from '@/components/passport/PassportShareSheet'
import { PlaceFormSheet } from '@/components/passport/PlaceFormSheet'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Chip, EmptyState, Skeleton } from '@/components/ui/misc'

const PERSONAL = 'personal'

export default function PassportPage() {
  const { t, i18n } = useTranslation()
  const lang = i18n.resolvedLanguage ?? 'en'
  const navigate = useNavigate()
  const { data, places, isLoading, isError, refetch } = usePassport()
  const { remove } = useVisitedPlaceMutations()
  const hideVisit = useHideVisit()
  const [filter, setFilter] = useState<string | null>(null)
  const [form, setForm] = useState<{ open: boolean; place: VisitedPlace | null }>({ open: false, place: null })
  const [sharing, setSharing] = useState(false)
  const [showHidden, setShowHidden] = useState(false)
  const [deleting, setDeleting] = useState<Stamp | null>(null)
  useSeo('app')

  const regionNames = useMemo(() => {
    try {
      return new Intl.DisplayNames([lang], { type: 'region' })
    } catch {
      return null
    }
  }, [lang])
  const countryName = useCallback(
    (s: Pick<Stamp, 'countryCode' | 'country'>) => (s.countryCode && regionNames?.of(s.countryCode)) || s.country || s.countryCode || '',
    [regionNames],
  )
  const rating = useMemo(() => new Intl.NumberFormat(lang, { maximumFractionDigits: 1 }), [lang])
  const visitDate = useMemo(() => new Intl.DateTimeFormat(lang, { month: 'short', year: 'numeric', timeZone: 'UTC' }), [lang])

  const stamps = useMemo(() => data?.stamps ?? [], [data])
  const hidden = data?.hidden ?? []
  const hasPersonal = stamps.some((s) => s.kind === 'personal')

  const trips = useMemo(() => {
    const byId = new Map<string, string>()
    for (const s of stamps) if (s.trip) byId.set(s.trip.id, s.trip.name)
    return [...byId].map(([id, name]) => ({ id, name }))
  }, [stamps])

  const visible = useMemo(
    () => stamps.filter((s) => !filter || (filter === PERSONAL ? s.kind === 'personal' : s.trip?.id === filter)),
    [stamps, filter],
  )
  const stats = useMemo(() => passportStats(visible, countryName, lang), [visible, countryName, lang])
  const allStats = useMemo(() => passportStats(stamps, countryName, lang), [stamps, countryName, lang])

  // The shared image always covers the whole passport, whatever the filter.
  const cardData = useMemo<PassportCardData | null>(() => {
    if (allStats.places === 0) return null
    const [top] = allStats.countries
    const { favorite, latest, years } = allStats
    return {
      eyebrow: t('passport.cardEyebrow'),
      years: years ? (years[0] === years[1] ? String(years[0]) : `${years[0]} – ${years[1]}`) : null,
      countries: allStats.countries.length,
      countriesLabel: t('passport.cardCountries', { count: allStats.countries.length }),
      stats: [
        { value: String(allStats.places), label: t('passport.statPlaces', { count: allStats.places }) },
        { value: String(allStats.continents.length), label: t('passport.statContinents', { count: allStats.continents.length }) },
        { value: String(allStats.trips), label: t('passport.statTrips', { count: allStats.trips }) },
      ],
      highlights: [
        // "Most visited" only means something once a country has more than one place.
        top && top.count > 1 && { label: t('passport.topCountry'), value: `${top.name} · ${t('passport.placesCount', { count: top.count })}` },
        favorite && { label: t('passport.favorite'), value: `${favorite.name} · ★ ${rating.format(favorite.rating!)}` },
        latest && { label: t('passport.latest'), value: `${latest.name} · ${visitDate.format(new Date(latest.date!))}` },
      ].filter((item): item is { label: string; value: string } => Boolean(item)),
      codes: allStats.countries.flatMap((c) => (c.code ? [c.code] : [])),
      points: stamps.flatMap((s) => (s.lat != null && s.lng != null ? [[s.lat, s.lng] as [number, number]] : [])),
      footer: 'roamie.org',
    }
  }, [allStats, stamps, t, rating, visitDate])

  const editPlace = (id: string) => {
    const place = places.find((p) => p.id === id)
    if (place) setForm({ open: true, place })
  }

  const openStamp = (stamp: Stamp) => {
    if (stamp.kind === 'personal') editPlace(stamp.id)
    else if (stamp.trip) navigate(`/trips/${stamp.trip.id}?d=${stamp.id}`)
  }

  const setHidden = (stamp: Stamp, hide: boolean) =>
    hideVisit.mutate(
      { destinationId: stamp.id, hide },
      {
        onSuccess: () => {
          if (!hide) return
          toast.success(t('passport.notThereDone', { name: stamp.name }), {
            action: { label: t('passport.undo'), onClick: () => hideVisit.mutate({ destinationId: stamp.id, hide: false }) },
          })
        },
        onError: () => toast.error(t('errors.generic')),
      },
    )

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await remove.mutateAsync(deleting.id)
      toast.success(t('passport.placeDeleted'))
    } catch {
      toast.error(t('errors.generic'))
    }
  }

  const tiles: { label: string; value: number; icon: LucideIcon }[] = [
    { label: t('passport.statCountries', { count: stats.countries.length }), value: stats.countries.length, icon: Globe2 },
    { label: t('passport.statContinents', { count: stats.continents.length }), value: stats.continents.length, icon: Earth },
    { label: t('passport.statPlaces', { count: stats.places }), value: stats.places, icon: MapPin },
    { label: t('passport.statTrips', { count: stats.trips }), value: stats.trips, icon: Luggage },
  ]

  const isEmpty = data && stamps.length === 0 && hidden.length === 0

  return (
    <>
      <AppHeader left={<Logo to="/trips" />} />
      <PageTransition className="mx-auto max-w-5xl space-y-8 px-5 pt-2 md:px-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t('passport.eyebrow')}</p>
            <h1 className="mt-1 text-[2.6rem] leading-none md:text-6xl">{t('passport.title')}</h1>
          </div>
          {data && !isEmpty && (
            <div className="flex gap-2">
              <Button variant="glass" size="sm" disabled={!cardData} onClick={() => setSharing(true)}>
                <Share2 />
                {t('passport.share')}
              </Button>
              <Button size="sm" onClick={() => setForm({ open: true, place: null })}>
                <Plus />
                {t('passport.addPlace')}
              </Button>
            </div>
          )}
        </header>

        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-24 rounded-[1.5rem]" />
            <Skeleton className="h-72 rounded-[2rem]" />
          </div>
        )}

        {isError && (
          <EmptyState seed="error" title={t('errors.generic')} body={t('errors.checkConnection')}>
            <Button onClick={() => void refetch()}>{t('common.retry')}</Button>
          </EmptyState>
        )}

        {isEmpty && (
          <EmptyState seed="passport" icon={<StampIcon />} title={t('passport.emptyTitle')} body={t('passport.emptyBody')}>
            <Button size="lg" onClick={() => setForm({ open: true, place: null })}>
              <Plus />
              {t('passport.addPlace')}
            </Button>
            <Button asChild size="lg" variant="glass">
              <Link to="/trips">{t('passport.goTrips')}</Link>
            </Button>
          </EmptyState>
        )}

        {data && stamps.length > 0 && (
          <>
            {(trips.length > 1 || (trips.length > 0 && hasPersonal)) && (
              <div className="scrollbar-none -mx-5 flex gap-2 overflow-x-auto px-5 md:mx-0 md:px-0">
                <Chip size="sm" active={filter === null} onClick={() => setFilter(null)}>
                  {t('passport.allTrips')}
                </Chip>
                {trips.map((trip) => (
                  <Chip key={trip.id} size="sm" active={filter === trip.id} onClick={() => setFilter(filter === trip.id ? null : trip.id)}>
                    {trip.name}
                  </Chip>
                ))}
                {hasPersonal && (
                  <Chip size="sm" active={filter === PERSONAL} onClick={() => setFilter(filter === PERSONAL ? null : PERSONAL)}>
                    {t('passport.personalChip')}
                  </Chip>
                )}
              </div>
            )}

            <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {tiles.map(({ label, value, icon: Icon }) => (
                <div key={label} className="glass rounded-[1.5rem] p-4">
                  <Icon className="size-4 text-primary" />
                  <p className="mt-2 font-sans text-3xl leading-none font-semibold md:text-4xl">{value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </section>

            <section aria-label={t('passport.map')} className="overflow-hidden rounded-[2rem] shadow-soft">
              <StampMap stamps={visible} onOpen={openStamp} className="h-72 w-full md:h-96" />
            </section>

            {stats.countries.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-2xl">{t('passport.countries')}</h2>
                <ul className="flex flex-wrap gap-2">
                  {stats.countries.map((c) => (
                    <li key={c.code ?? c.name} className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium">
                      {c.code && (
                        <span aria-hidden className="text-base leading-none">
                          {flagOf(c.code)}
                        </span>
                      )}
                      {c.name}
                      <span className="text-muted-foreground tabular-nums">{c.count}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}

        {data && (stamps.length > 0 || hidden.length > 0) && (
          <section className="space-y-3">
            <h2 className="text-2xl">{t('passport.stamps')}</h2>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((s) => (
                <li key={s.key} className="relative">
                  <button
                    type="button"
                    onClick={() => openStamp(s)}
                    className="flex w-full items-center gap-3 rounded-[1.75rem] bg-paper p-3 pr-12 text-left shadow-soft transition-shadow hover:shadow-lift"
                  >
                    <CoverImage url={s.imageUrl} seed={s.name} pin showAttribution={false} className="size-20 shrink-0 rounded-[1.25rem]" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display text-xl leading-tight">{s.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {s.countryCode && <span aria-hidden>{flagOf(s.countryCode)} </span>}
                        {[countryName(s), s.trip?.name ?? t('passport.personal')].filter(Boolean).join(' · ')}
                      </span>
                      <span className="mt-1.5 flex items-center gap-2 text-xs">
                        {s.rating != null ? (
                          <span className="inline-flex items-center gap-0.5 font-semibold">
                            <Star className="size-3.5 fill-sun text-sun" />
                            {rating.format(s.rating)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">{t('passport.notRated')}</span>
                        )}
                        {s.date && <span className="text-muted-foreground">{visitDate.format(new Date(s.date))}</span>}
                      </span>
                    </span>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label={t('passport.stampActions', { name: s.name })} className="absolute top-3 right-3">
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      {s.kind === 'personal' ? (
                        <>
                          <DropdownMenuItem onSelect={() => editPlace(s.id)}>
                            <Pencil />
                            {t('common.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem destructive onSelect={() => setDeleting(s)}>
                            <Trash2 />
                            {t('passport.remove')}
                          </DropdownMenuItem>
                        </>
                      ) : (
                        <>
                          <DropdownMenuItem onSelect={() => openStamp(s)}>
                            <Luggage />
                            {t('passport.openTrip')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setHidden(s, true)}>
                            <EyeOff />
                            {t('passport.notThere')}
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              ))}
            </ul>

            {hidden.length > 0 && (
              <div className="rounded-[1.5rem] bg-foreground/[0.03] p-4">
                <button
                  type="button"
                  onClick={() => setShowHidden((v) => !v)}
                  aria-expanded={showHidden}
                  className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
                >
                  {showHidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  {t('passport.hiddenCount', { count: hidden.length })} · {showHidden ? t('passport.hideList') : t('passport.showList')}
                </button>
                {showHidden && (
                  <ul className="mt-2 divide-y divide-border">
                    {hidden.map((s) => (
                      <li key={s.key} className="flex items-center gap-3 py-2.5">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{s.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">{[countryName(s), s.trip?.name].filter(Boolean).join(' · ')}</span>
                        </span>
                        <Button variant="ghost" size="sm" onClick={() => setHidden(s, false)}>
                          {t('passport.restore')}
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>
        )}
      </PageTransition>

      <PlaceFormSheet open={form.open} place={form.place} onOpenChange={(open) => setForm((f) => ({ ...f, open }))} />
      <PassportShareSheet open={sharing} onOpenChange={setSharing} data={cardData} />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t('passport.deleteTitle', { name: deleting?.name ?? '' })}
        description={t('passport.deleteBody')}
        confirmLabel={t('passport.remove')}
        cancelLabel={t('common.cancel')}
        destructive
        icon={<Trash2 />}
        onConfirm={confirmDelete}
      />
    </>
  )
}
