import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AvailabilityRow, DayStatus } from '@/lib/dates'
import { supabase } from '@/lib/supabase'
import type { Trip } from '@/lib/types'
import { useAuth } from './useAuth'
import { keys, unwrap } from './useTrips'

export function useAvailability(tripId: string) {
  return useQuery({
    queryKey: keys.availability(tripId),
    queryFn: async () =>
      unwrap<AvailabilityRow[]>(await supabase.from('availability').select('user_id, day, status').eq('trip_id', tripId)),
  })
}

/** Marks the current member's days as free, maybe, or clears them (status null). Optimistic. */
export function useSetAvailability(tripId: string) {
  const qc = useQueryClient()
  const { user } = useAuth()
  const key = keys.availability(tripId)

  return useMutation({
    mutationKey: key,
    mutationFn: async ({ days, status }: { days: string[]; status: DayStatus | null }) => {
      unwrap(await supabase.rpc('set_availability', { p_trip_id: tripId, p_days: days, ...(status && { p_status: status }) }))
    },
    onMutate: async ({ days, status }) => {
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<AvailabilityRow[]>(key)
      qc.setQueryData<AvailabilityRow[]>(key, (list = []) => {
        const rest = list.filter((row) => !(row.user_id === user?.id && days.includes(row.day)))
        return status && user ? [...rest, ...days.map((day) => ({ user_id: user.id, day, status }))] : rest
      })
      return { previous }
    },
    onError: (_error, _vars, ctx) => qc.setQueryData(key, ctx?.previous),
    onSettled: () => {
      // Rapid taps: refetch once the last one has landed, so it can't overwrite a newer optimistic state.
      if (qc.isMutating({ mutationKey: key }) <= 1) void qc.invalidateQueries({ queryKey: key })
    },
  })
}

export type TripDatesInput = Partial<Pick<Trip, 'date_window_start' | 'date_window_end' | 'trip_length' | 'start_date' | 'end_date'>>

/** Owners and editors: the period to consider, the trip's length, and the final dates. */
export function useUpdateTripDates(tripId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: TripDatesInput) =>
      unwrap<Trip>(await supabase.from('trips').update(input).eq('id', tripId).select().single()),
    onSuccess: (trip) => {
      qc.setQueryData(keys.trip(tripId), trip)
      void qc.invalidateQueries({ queryKey: keys.trips })
    },
  })
}
