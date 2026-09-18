import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { TrendingPlace } from '@/lib/types'
import { unwrap } from './useTrips'

/** "Le mete del momento": recomputed by the database once a day, the same for everyone. */
export function useTrendingPlaces(limit = 12) {
  return useQuery({
    queryKey: ['trending-places', limit],
    staleTime: 60 * 60 * 1000,
    queryFn: async () =>
      unwrap<TrendingPlace[]>(
        await supabase
          .from('trending_places')
          .select('rank, name, country, country_code, image_url, image_attribution, trips, chosen')
          .order('rank')
          .limit(limit),
      ),
  })
}
