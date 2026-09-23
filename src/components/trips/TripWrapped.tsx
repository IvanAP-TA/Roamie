import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Loader2, Sparkles } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useItinerary } from '@/hooks/useItinerary'
import { useTripContext } from '@/hooks/useTripContext'
import { ShareStoryButton } from '@/components/media/ShareStoryButton'
import { Sheet } from '@/components/ui/sheet'
import { totalPoints } from '@/lib/roulette'
import { votesHidden } from '@/lib/secretVoting'
import { storyPhotoUrl } from '@/lib/storyCard'
import { supabase } from '@/lib/supabase'
import type { Destination } from '@/lib/types'
import { renderWrappedCard, type WrappedCardData } from '@/lib/wrappedCard'

const today = () => new Date().toISOString().slice(0, 10)

/** The trip is over: its last day has passed, or a place has been marked as visited. */
export function isTripOver(trip: { end_date: string | null }, destinations: Destination[]): boolean {
  return (trip.end_date !== null && trip.end_date < today()) || destinations.some((d) => d.status === 'visited')
}

function useSpinCount(tripId: string) {
  return useQuery({
    queryKey: ['trip', tripId, 'spins'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { count } = await supabase.from('roulette_spins').select('id', { count: 'exact', head: true }).eq('trip_id', tripId)
      return count ?? 0
    },
  })
}

/**
 * "Il vostro viaggio in una storia": once the trip is over, a card on the trip home opens the group's Wrapped, a
 * story image to post — each finished trip shown to friends who might start their own.
 */
export function TripWrapped({ destinations }: { destinations: Destination[] }) {
  const { t, i18n } = useTranslation()
  const { trip, members } = useTripContext()
  const [open, setOpen] = useState(false)

  if (!isTripOver(trip, destinations)) return null

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        whileTap={{ scale: 0.98 }}
        className="group flex w-full items-center gap-4 rounded-[2rem] bg-[linear-gradient(135deg,#5a2a45,#b8475a_60%,#ff8a65)] p-4 text-left text-white shadow-glow md:p-5"
      >
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/20">
          <Sparkles className="size-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-lg leading-tight font-semibold">{t('wrapped.cta')}</span>
          <span className="block text-sm text-white/85">{t('wrapped.ctaBody', { count: members.length })}</span>
        </span>
        <ArrowRight className="size-5 shrink-0 transition-transform group-hover:translate-x-1" />
      </motion.button>
      <Sheet open={open} onOpenChange={setOpen} title={t('wrapped.title')}>
        {open && <WrappedPreview destinations={destinations} lang={i18n.resolvedLanguage ?? 'en'} />}
      </Sheet>
    </>
  )
}

function WrappedPreview({ destinations, lang }: { destinations: Destination[]; lang: string }) {
  const { t } = useTranslation()
  const { trip, members } = useTripContext()
  const { data: days } = useItinerary(trip.id)
  const spins = useSpinCount(trip.id)
  const ready = days !== undefined && !spins.isPending

  const data = useMemo<WrappedCardData | null>(() => {
    if (!ready) return null
    // Where they went: the last place visited, else the wheel's latest pick.
    const byDate = (a: Destination, b: Destination) => (b.visited_at ?? b.selected_at ?? '').localeCompare(a.visited_at ?? a.selected_at ?? '')
    const place = destinations.filter((d) => d.status === 'visited').sort(byDate)[0] ?? destinations.filter((d) => d.status === 'selected').sort(byDate)[0]

    const format = new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short', year: 'numeric' })
    const length =
      trip.start_date && trip.end_date ? Math.round((Date.parse(trip.end_date) - Date.parse(trip.start_date)) / 86_400_000) + 1 : null
    const when = trip.start_date
      ? [format.formatRange(new Date(`${trip.start_date}T12:00:00`), new Date(`${trip.end_date ?? trip.start_date}T12:00:00`)), length && t('wrapped.days', { count: length })]
          .filter(Boolean)
          .join(' · ')
      : null

    const stops = (days ?? []).reduce((sum, d) => sum + d.itinerary_items.length, 0)
    const comments = destinations.reduce((sum, d) => sum + (d.comments[0]?.count ?? 0), 0)
    const points = votesHidden(trip) ? 0 : destinations.reduce((sum, d) => sum + totalPoints(d), 0)
    const stats = [
      { value: members.length, label: t('wrapped.stats.people', { count: members.length }) },
      { value: destinations.length, label: t('wrapped.stats.places', { count: destinations.length }) },
      { value: points, label: t('wrapped.stats.points', { count: points }) },
      { value: comments, label: t('wrapped.stats.comments', { count: comments }) },
      { value: spins.data ?? 0, label: t('wrapped.stats.spins', { count: spins.data ?? 0 }) },
      { value: stops, label: t('wrapped.stats.stops', { count: stops }) },
    ]
      // Only what happened: a zero says nothing about the trip.
      .filter((s) => s.value > 0)
      .map((s) => ({ value: s.value.toLocaleString(lang), label: s.label }))

    const reasons = destinations.flatMap((d) => d.reasons.map((r) => ({ ...r, place: d.name })))
    const best = votesHidden(trip) ? null : reasons.sort((a, b) => b.likes.length - a.likes.length)[0]
    const names = members.map((m) => m.profile?.display_name?.split(' ')[0]).filter((n): n is string => Boolean(n))
    const people =
      names.length <= 4
        ? new Intl.ListFormat(lang, { type: 'conjunction' }).format(names)
        : t('wrapped.peopleMore', { names: names.slice(0, 3).join(', '), count: names.length - 3 })

    return {
      eyebrow: t(place?.status === 'visited' ? 'wrapped.eyebrowVisited' : 'wrapped.eyebrow'),
      title: place?.name ?? trip.name,
      subtitle: when ?? place?.country ?? null,
      tripName: trip.name,
      photoUrl: storyPhotoUrl(place?.image_url ?? trip.cover_image_url),
      stats,
      quote: best && best.likes.length > 0 ? { text: best.text, caption: t('wrapped.quote', { place: best.place, count: best.likes.length }) } : null,
      people,
      footer: t('wrapped.footer'),
    }
  }, [ready, destinations, days, spins.data, members, trip, lang, t])

  const blob = useMemo(() => (data ? renderWrappedCard(data) : null), [data])
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let revoked = false
    let made: string | null = null
    void blob?.then((b) => {
      if (revoked) return
      made = URL.createObjectURL(b)
      setUrl(made)
    })
    return () => {
      revoked = true
      if (made) URL.revokeObjectURL(made)
    }
  }, [blob])

  return (
    <div className="space-y-4 pb-2">
      <div className="mx-auto aspect-[9/16] w-full max-w-[18rem] overflow-hidden rounded-[1.75rem] bg-foreground/[0.05] shadow-lift">
        {url ? (
          <img src={url} alt={t('wrapped.alt', { name: data?.title })} className="size-full object-cover" />
        ) : (
          <span className="flex size-full items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </span>
        )}
      </div>
      <p className="text-center text-sm text-muted-foreground">{t('wrapped.hint')}</p>
      {blob && (
        <ShareStoryButton render={() => blob} fileName={`roamie-${trip.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`} title={trip.name} variant="default" className="w-full" />
      )}
    </div>
  )
}
