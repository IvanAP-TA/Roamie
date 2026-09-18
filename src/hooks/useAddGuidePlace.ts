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
const destinationRow = (tripId: string, place: GuidePlace, lang: LanguageCode, image: Pick<GuideImage, 'url' | 'attribution'> | null) => ({
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
