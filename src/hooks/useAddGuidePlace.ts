import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { GuidePlace } from '@/content/guides/content'
import { guideCoverImage, guidePlaceImage, type GuideImage } from '@/content/guides/images'
import type { GuideMeta } from '@/content/guides/meta'
import type { LanguageCode } from '@/i18n'
import { supabase } from '@/lib/supabase'
import type { Destination } from '@/lib/types'
import { findPlaceImages, serializeAttribution } from '@/lib/wikimedia'
import { DESTINATION_SELECT } from './useDestinations'
import { keys, unwrap } from './useTrips'

const regionName = (code: string, lang: LanguageCode) => {
  try {
    return new Intl.DisplayNames([lang], { type: 'region' }).of(code) ?? null
  } catch {
    return null
  }
}

/** A guide place as a proposed destination of a trip. */
export const destinationRow = (tripId: string, place: GuidePlace, lang: LanguageCode, image: Pick<GuideImage, 'url' | 'attribution'> | null) => ({
  trip_id: tripId,
  name: place.name[lang],
  country: regionName(place.countryCode, lang),
  country_code: place.countryCode,
  lat: place.lat,
  lng: place.lng,
  image_url: image?.url ?? null,
  image_attribution: image ? serializeAttribution(image.attribution) : null,
  mood: place.moods,
  expectations: place.text[lang],
})

/** Proposes a guide destination in one of the user's trips, with a Commons photo when a relevant one exists. */
export function useAddGuidePlace(lang: LanguageCode) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ tripId, place }: { tripId: string; place: GuidePlace }) => {
      // The same photo as in the guide; a search only for places without one. A missing photo never blocks the
      // proposal: the card falls back to an illustration.
      const image =
        guidePlaceImage(place.key) ??
        (await findPlaceImages(place.name[lang], lang).then(
          (found) => found[0] ?? null,
          () => null,
        ))
      return unwrap<Destination>(
        await supabase.from('destinations').insert(destinationRow(tripId, place, lang, image)).select(DESTINATION_SELECT).single(),
      )
    },
    onSuccess: (created, { tripId }) => {
      qc.setQueryData<Destination[]>(keys.destinations(tripId), (list) =>
        list && !list.some((d) => d.id === created.id) ? [created, ...list] : list,
      )
      void qc.invalidateQueries({ queryKey: keys.trips })
    },
  })
}

/** A new trip from a guide, with all its places already proposed: the group only has to vote. Returns the trip id. */
export function useCreateTripFromGuide(lang: LanguageCode) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ guide, places }: { guide: GuideMeta; places: GuidePlace[] }) => {
      const cover = guideCoverImage(guide.id)
      const trip = unwrap<{ id: string }>(
        await supabase
          .from('trips')
          .insert({
            name: (guide.tripName?.[lang] ?? guide.title[lang]).slice(0, 80),
            description: guide.description[lang].slice(0, 500),
            cover_image_url: cover?.url ?? null,
            cover_image_attribution: cover ? serializeAttribution(cover.attribution) : null,
          })
          .select('id')
          .single(),
      )
      const { error } = await supabase.from('destinations').insert(places.map((place) => destinationRow(trip.id, place, lang, guidePlaceImage(place.key))))
      if (error) {
        // Half a template is worse than none: take the empty trip away again.
        await supabase.from('trips').delete().eq('id', trip.id)
        throw error
      }
      return trip.id
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.trips }),
  })
}

const SAMPLE_KEY = 'roamie.sampleTrips'

/** Sample trips created on this device, so their page can say what they are. */
export function isSampleTrip(tripId: string): boolean {
  try {
    return (JSON.parse(localStorage.getItem(SAMPLE_KEY) ?? '[]') as string[]).includes(tripId)
  } catch {
    return false
  }
}

function rememberSample(tripId: string) {
  try {
    const ids = JSON.parse(localStorage.getItem(SAMPLE_KEY) ?? '[]') as string[]
    localStorage.setItem(SAMPLE_KEY, JSON.stringify([...ids, tripId].slice(-10)))
  } catch {
    // Storage blocked: the sample trip just looks like any other.
  }
}

/** The sample trip (src/content/sampleTrip.ts), ready to play with. Returns its id. */
export function useCreateSampleTrip(lang: LanguageCode) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const [{ GUIDE_CONTENT }, sample] = await Promise.all([import('@/content/guides/content'), import('@/content/sampleTrip')])
      const places = sample.SAMPLE_PLACES.map((key) =>
        Object.values(GUIDE_CONTENT)
          .flatMap((guide) => guide.places)
          .find((place) => place.key === key),
      ).filter((place): place is GuidePlace => Boolean(place))
      const cover = guidePlaceImage(places[0]?.key ?? '')
      // The period to pick dates in: next month.
      const start = new Date()
      start.setMonth(start.getMonth() + 1, 1)
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 0)
      const day = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

      const trip = unwrap<{ id: string }>(
        await supabase
          .from('trips')
          .insert({
            name: sample.SAMPLE_TRIP.name[lang],
            description: sample.SAMPLE_TRIP.description[lang],
            cover_image_url: cover?.url ?? null,
            cover_image_attribution: cover ? serializeAttribution(cover.attribution) : null,
            date_window_start: day(start),
            date_window_end: day(end),
            trip_length: sample.SAMPLE_TRIP.length,
          })
          .select('id')
          .single(),
      )
      try {
        const destinations = unwrap<{ id: string; name: string }[]>(
          await supabase
            .from('destinations')
            .insert(places.map((place) => destinationRow(trip.id, place, lang, guidePlaceImage(place.key))))
            .select('id, name'),
        )
        const idOf = (key: string) => destinations.find((d) => d.name === places.find((p) => p.key === key)?.name[lang])?.id
        for (const [key, points] of Object.entries(sample.SAMPLE_POINTS)) {
          const id = idOf(key)
          if (id) unwrap(await supabase.rpc('set_points', { p_destination_id: id, p_points: points }))
        }
        const lisbon = idOf('lisbon')
        if (lisbon) unwrap(await supabase.from('destination_reasons').insert({ destination_id: lisbon, text: sample.SAMPLE_TRIP.reason[lang] }))

        const days = unwrap<{ id: string; day_number: number }[]>(
          await supabase
            .from('itinerary_days')
            .insert(sample.SAMPLE_DAYS.map((d, i) => ({ trip_id: trip.id, day_number: i + 1, title: d.title[lang] })))
            .select('id, day_number'),
        )
        unwrap(
          await supabase.from('itinerary_items').insert(
            sample.SAMPLE_DAYS.flatMap((d, i) =>
              d.stops.map((stop, index) => ({
                itinerary_day_id: days.find((row) => row.day_number === i + 1)!.id,
                order_index: index,
                time: stop.time,
                title: stop.title[lang],
                description: stop.description[lang],
                place_name: stop.place?.name ?? null,
                lat: stop.place?.lat ?? null,
                lng: stop.place?.lng ?? null,
              })),
            ),
          ),
        )
        unwrap(await supabase.from('checklist_items').insert(sample.SAMPLE_CHECKLIST.map((item) => ({ trip_id: trip.id, kind: item.kind, title: item.title[lang] }))))
      } catch (error) {
        // Half a sample is worse than none: take it away again.
        await supabase.from('trips').delete().eq('id', trip.id)
        throw error
      }
      rememberSample(trip.id)
      return trip.id
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.trips }),
  })
}
