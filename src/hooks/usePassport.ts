import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Destination, Trip } from '@/lib/types'
import { useAuth } from './useAuth'
import { DESTINATION_SELECT } from './useDestinations'
import { unwrap } from './useTrips'

export type PassportStamp = Destination & { trip: Pick<Trip, 'id' | 'name'> | null }

/** Visited destinations across every trip the user belongs to (RLS scopes it), newest visit first. */
export function usePassport() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['passport', user?.id],
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap<PassportStamp[]>(
        await supabase
          .from('destinations')
          .select(`${DESTINATION_SELECT}, trip:trips(id, name)`)
          .eq('status', 'visited')
          .order('visited_at', { ascending: false, nullsFirst: false }),
      ),
  })
}
