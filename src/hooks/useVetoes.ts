import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { keys, unwrap } from '@/hooks/useTrips'
import { supabase } from '@/lib/supabase'
import type { Trip } from '@/lib/types'

const YEAR_MS = 365 * 86_400_000

const vetoesKey = (tripId: string, userId: string | undefined) => ['trip', tripId, 'my-vetoes', userId] as const

/** My own vetoes in a trip (nobody else's: the table only shows each member their own). */
function useMyVetoes(tripId: string) {
  const { user } = useAuth()
  return useQuery({
    queryKey: vetoesKey(tripId, user?.id),
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap<{ destination_id: string; created_at: string; destination: { trip_id: string } | null }[]>(
        await supabase.from('destination_vetoes').select('destination_id, created_at, destination:destinations!inner(trip_id)').eq('destination.trip_id', tripId)
          .is('withdrawn_at', null),
      ),
  })
}

/** What I can do with vetoes in this trip: which places I have vetoed, how many are left of the year's. */
export function useVetoes(trip: Pick<Trip, 'id' | 'vetoes_per_year'>) {
  const { data = [] } = useMyVetoes(trip.id)
  const recent = data.filter((v) => Date.now() - new Date(v.created_at).getTime() < YEAR_MS).length
  return { mine: new Set(data.map((v) => v.destination_id)), left: Math.max(0, trip.vetoes_per_year - recent) }
}

/** Takes a place off the wheel, or gives the veto back. */
export function useSetVeto(tripId: string) {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async ({ destinationId, veto }: { destinationId: string; veto: boolean }) => {
      unwrap(await supabase.rpc(veto ? 'cast_veto' : 'remove_veto', { p_destination_id: destinationId }))
    },
    onSettled: () =>
      Promise.all([qc.invalidateQueries({ queryKey: keys.destinations(tripId) }), qc.invalidateQueries({ queryKey: vetoesKey(tripId, user?.id) })]),
  })
}

/** The owner's setting: how many vetoes each member has per year. */
export function useSetVetoesPerYear(tripId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (count: number) => {
      unwrap(await supabase.rpc('set_vetoes_per_year', { p_trip_id: tripId, p_count: count }))
    },
    onSettled: () => qc.invalidateQueries({ queryKey: keys.trip(tripId) }),
  })
}
