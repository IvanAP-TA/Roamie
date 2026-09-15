import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { GuidePlace } from '@/content/guides/content'
import { guidePlaceImage } from '@/content/guides/images'
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
        await supabase
          .from('destinations')
          .insert({
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
          .select(DESTINATION_SELECT)
          .single(),
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
