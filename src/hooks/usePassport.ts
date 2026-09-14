import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { buildStamps, type TripVisit } from '@/lib/passport'
import { supabase } from '@/lib/supabase'
import type { VisitedPlace } from '@/lib/types'
import { useAuth } from './useAuth'
import { DESTINATION_SELECT } from './useDestinations'
import { unwrap } from './useTrips'

export const passportKeys = {
  visits: (userId: string | undefined) => ['passport', userId, 'visits'] as const,
  places: (userId: string | undefined) => ['passport', userId, 'places'] as const,
  hidden: (userId: string | undefined) => ['passport', userId, 'hidden'] as const,
}

/**
 * Everything in the user's passport: destinations their groups marked as visited (RLS scopes them to
 * the user's trips) minus the ones they hid, plus their private visited places.
 */
export function usePassport() {
  const { user } = useAuth()
  const userId = user?.id

  const visits = useQuery({
    queryKey: passportKeys.visits(userId),
    enabled: Boolean(userId),
    queryFn: async () =>
      unwrap<TripVisit[]>(
        await supabase
          .from('destinations')
          .select(`${DESTINATION_SELECT}, trip:trips(id, name)`)
          .eq('status', 'visited')
          .order('visited_at', { ascending: false, nullsFirst: false }),
      ),
  })
  const places = useQuery({
    queryKey: passportKeys.places(userId),
    enabled: Boolean(userId),
    queryFn: async () => unwrap<VisitedPlace[]>(await supabase.from('visited_places').select('*').order('created_at', { ascending: false })),
  })
  const hidden = useQuery({
    queryKey: passportKeys.hidden(userId),
    enabled: Boolean(userId),
    queryFn: async () => unwrap<{ destination_id: string }[]>(await supabase.from('passport_exclusions').select('destination_id')),
  })

  const data = useMemo(
    () =>
      visits.data && places.data && hidden.data
        ? buildStamps(visits.data, places.data, new Set(hidden.data.map((h) => h.destination_id)))
        : undefined,
    [visits.data, places.data, hidden.data],
  )

  return {
    data,
    places: places.data ?? [],
    isLoading: visits.isLoading || places.isLoading || hidden.isLoading,
    isError: visits.isError || places.isError || hidden.isError,
    refetch: () => Promise.all([visits.refetch(), places.refetch(), hidden.refetch()]),
  }
}

export type VisitedPlaceInput = Pick<VisitedPlace, 'name' | 'country' | 'country_code' | 'lat' | 'lng' | 'visited_on' | 'rating'>

export function useVisitedPlaceMutations() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const key = passportKeys.places(user?.id)
  const refresh = () => qc.invalidateQueries({ queryKey: key })

  const add = useMutation({
    mutationFn: async (input: VisitedPlaceInput) => unwrap<VisitedPlace>(await supabase.from('visited_places').insert(input).select().single()),
    onSuccess: (row) => {
      qc.setQueryData<VisitedPlace[]>(key, (list) => (list ? [row, ...list] : list))
      void refresh()
    },
  })

  const update = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: VisitedPlaceInput }) =>
      unwrap<VisitedPlace>(await supabase.from('visited_places').update(input).eq('id', id).select().single()),
    onSuccess: (row) => {
      qc.setQueryData<VisitedPlace[]>(key, (list) => list?.map((p) => (p.id === row.id ? row : p)))
      void refresh()
    },
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      unwrap(await supabase.from('visited_places').delete().eq('id', id))
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<VisitedPlace[]>(key)
      qc.setQueryData<VisitedPlace[]>(key, (list) => list?.filter((p) => p.id !== id))
      return { previous }
    },
    onError: (_e, _id, ctx) => qc.setQueryData(key, ctx?.previous),
    onSettled: refresh,
  })

  return { add, update, remove }
}

/** "I wasn't there": hides a group visit from this user's passport only (or shows it again). */
export function useHideVisit() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const key = passportKeys.hidden(user?.id)

  return useMutation({
    mutationFn: async ({ destinationId, hide }: { destinationId: string; hide: boolean }) => {
      if (hide) unwrap(await supabase.from('passport_exclusions').insert({ destination_id: destinationId }))
      else unwrap(await supabase.from('passport_exclusions').delete().eq('destination_id', destinationId))
    },
    onMutate: async ({ destinationId, hide }) => {
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<{ destination_id: string }[]>(key)
      qc.setQueryData<{ destination_id: string }[]>(key, (list = []) =>
        hide ? [...list, { destination_id: destinationId }] : list.filter((h) => h.destination_id !== destinationId),
      )
      return { previous }
    },
    onError: (_e, _v, ctx) => qc.setQueryData(key, ctx?.previous),
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  })
}
