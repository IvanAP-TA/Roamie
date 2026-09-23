import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { Criteria, Idea, Itinerary, Lang } from '../../supabase/functions/trip-ideas/ideas.ts'
import { invokeAi } from '@/lib/ai'
import { useOrigin } from '@/lib/origin'
import { findSpotNear, suggestPlaces } from '@/lib/photon'
import { supabase } from '@/lib/supabase'
import { safeImageUrl } from '@/lib/utils'
import { findPlaceImages, serializeAttribution } from '@/lib/wikimedia'
import { keys, unwrap } from './useTrips'

export type { Criteria, Idea, Itinerary }
export { CONTINENTS, DISTANCES, FAME, LENGTHS, MAX_DAYS, PACES } from '../../supabase/functions/trip-ideas/ideas.ts'

const useLang = (): Lang => {
  const { i18n } = useTranslation()
  const lang = i18n.resolvedLanguage
  return lang === 'it' || lang === 'es' ? lang : 'en'
}

/** "Trova la meta": 3 destinations for the choices made; `exclude` asks for different ones. */
export function useSuggestIdeas() {
  const lang = useLang()
  const [origin] = useOrigin()
  return useMutation({
    mutationFn: ({ criteria, exclude }: { criteria: Criteria; exclude: string[] }) =>
      invokeAi<Idea[]>('trip-ideas', { action: 'suggest', criteria, lang, origin, exclude }),
  })
}

/** A day-by-day plan for one of the suggested places. */
export function useIdeaItinerary() {
  const lang = useLang()
  return useMutation({
    mutationFn: ({ idea, days, criteria }: { idea: Idea; days: number; criteria: Criteria }) =>
      invokeAi<Itinerary>('trip-ideas', {
        action: 'itinerary',
        place: { name: idea.name, country: idea.country },
        days,
        criteria: { moods: criteria.moods, budget: criteria.budget, month: criteria.month, pace: criteria.pace },
        lang,
      }),
  })
}

/**
 * The suggested place as a destination row: found on the map (same country) for its pin and climate, with a Commons
 * photo when there's a relevant one. Neither is required: a place the map doesn't know is proposed without a pin.
 */
async function destinationFor(idea: Idea, lang: Lang) {
  const [place, images] = await Promise.all([
    suggestPlaces(idea.name).then(
      (found) => found.find((p) => p.countryCode === idea.countryCode) ?? null,
      () => null,
    ),
    findPlaceImages(idea.name, lang).catch(() => []),
  ])
  // The same size of photo the destination form picks, and only one the database accepts.
  const image = images.find((img) => safeImageUrl(img.thumbUrl)) ?? null
  return {
    row: {
      name: idea.name.slice(0, 120),
      country: idea.country,
      country_code: idea.countryCode,
      lat: place?.lat ?? null,
      lng: place?.lng ?? null,
      image_url: image?.thumbUrl ?? null,
      image_attribution: image ? serializeAttribution(image.attribution) : null,
      mood: idea.moods,
      budget_level: idea.budget,
      expectations: idea.why,
    },
    image,
  }
}

/**
 * Itinerary rows after the trip's last day. Stops are pinned only when the map finds them near the place.
 * All or nothing: if the stops can't be saved (a limit, the network), the days just added go too.
 */
async function addItinerary(tripId: string, itinerary: Itinerary, near: { lat: number; lng: number } | null) {
  const { data: last } = await supabase
    .from('itinerary_days')
    .select('day_number')
    .eq('trip_id', tripId)
    .order('day_number', { ascending: false })
    .limit(1)
    .maybeSingle()
  const first = (last?.day_number ?? 0) + 1

  const days = unwrap<{ id: string; day_number: number }[]>(
    await supabase
      .from('itinerary_days')
      .insert(itinerary.days.map((day, i) => ({ trip_id: tripId, day_number: first + i, title: day.title || null })))
      .select('id, day_number'),
  )

  const stops = itinerary.days.flatMap((day, i) => {
    const dayId = days.find((d) => d.day_number === first + i)?.id
    return dayId ? day.items.map((stop, index) => ({ dayId, index, stop })) : []
  })
  const items = []
  // A few at a time: Photon is a free service (and results are cached), but a three-week plan has ~80 stops.
  for (let start = 0; start < stops.length; start += 4) {
    const batch = await Promise.all(
      stops.slice(start, start + 4).map(async ({ dayId, index, stop }) => {
        const spot = stop.place && near ? await findSpotNear(stop.place, near).catch(() => null) : null
        return {
          itinerary_day_id: dayId,
          order_index: index,
          time: stop.time,
          title: stop.title,
          description: stop.description || null,
          place_name: spot ? stop.place : null,
          lat: spot?.lat ?? null,
          lng: spot?.lng ?? null,
        }
      }),
    )
    items.push(...batch)
  }
  const { error } = await supabase.from('itinerary_items').insert(items)
  if (error) {
    await supabase.from('itinerary_days').delete().in('id', days.map((d) => d.id))
    throw error
  }
}

/** A new trip built around the suggested place, with the itinerary when there is one. Returns the trip id. */
export function useCreateTripFromIdea() {
  const lang = useLang()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ idea, itinerary }: { idea: Idea; itinerary: Itinerary | null }) => {
      const { row, image } = await destinationFor(idea, lang)
      const trip = unwrap<{ id: string }>(
        await supabase
          .from('trips')
          .insert({
            name: idea.name.slice(0, 80),
            description: idea.why.slice(0, 500),
            cover_image_url: row.image_url,
            cover_image_attribution: image ? row.image_attribution : null,
          })
          .select('id')
          .single(),
      )
      try {
        unwrap(await supabase.from('destinations').insert({ trip_id: trip.id, ...row }))
        if (itinerary) await addItinerary(trip.id, itinerary, row.lat != null && row.lng != null ? { lat: row.lat, lng: row.lng } : null)
      } catch (error) {
        // Half a trip is worse than none: take it away again.
        await supabase.from('trips').delete().eq('id', trip.id)
        throw error
      }
      return trip.id
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.trips }),
  })
}

/** The suggested place proposed in an existing trip, and its itinerary after the trip's days when there is one. */
export function useAddIdeaToTrip() {
  const lang = useLang()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ tripId, idea, itinerary }: { tripId: string; idea: Idea; itinerary: Itinerary | null }) => {
      const { row } = await destinationFor(idea, lang)
      const created = unwrap<{ id: string }>(await supabase.from('destinations').insert({ trip_id: tripId, ...row }).select('id').single())
      if (itinerary) {
        try {
          await addItinerary(tripId, itinerary, row.lat != null && row.lng != null ? { lat: row.lat, lng: row.lng } : null)
        } catch (error) {
          // The place without its plan would look like it worked: take it away again, so a retry starts clean.
          await supabase.from('destinations').delete().eq('id', created.id)
          throw error
        }
      }
      return created.id
    },
    onSuccess: (_id, { tripId }) => {
      void qc.invalidateQueries({ queryKey: keys.trips })
      void qc.invalidateQueries({ queryKey: keys.destinations(tripId) })
      void qc.invalidateQueries({ queryKey: keys.itinerary(tripId) })
    },
  })
}
