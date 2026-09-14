import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { PublicTrip, Trip } from '@/lib/types'
import { keys, unwrap } from './useTrips'

/** The read-only page at /p/:slug; null when the slug is wrong or the trip is no longer public. */
export function usePublicTrip(slug: string | undefined) {
  return useQuery({
    queryKey: ['public-trip', slug],
    enabled: Boolean(slug),
    queryFn: async () => unwrap<PublicTrip | null>(await supabase.rpc('get_public_trip', { p_slug: slug! })),
  })
}

/** Owner only: publish (returns the slug) or make the page private again (returns null). */
export function useSetTripPublic(tripId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (isPublic: boolean) =>
      unwrap<string | null>(await supabase.rpc('set_trip_public', { p_trip_id: tripId, p_public: isPublic })),
    onSuccess: (slug) => {
      qc.setQueryData<Trip | null>(keys.trip(tripId), (trip) => (trip ? { ...trip, public_slug: slug } : trip))
      void qc.invalidateQueries({ queryKey: keys.trips })
      void qc.invalidateQueries({ queryKey: ['public-trip'] })
    },
  })
}
