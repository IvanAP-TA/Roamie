import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Role, Trip, TripListItem, TripMember, TripPreview } from '@/lib/types'

export const keys = {
  trips: ['trips'] as const,
  trip: (id: string) => ['trip', id] as const,
  members: (id: string) => ['trip', id, 'members'] as const,
  destinations: (id: string) => ['trip', id, 'destinations'] as const,
  itinerary: (id: string) => ['trip', id, 'itinerary'] as const,
  links: (id: string) => ['trip', id, 'links'] as const,
  checklist: (id: string) => ['trip', id, 'checklist'] as const,
  comments: (destinationId: string) => ['comments', destinationId] as const,
  preview: (code: string) => ['preview', code] as const,
}

export function unwrap<T>({ data, error }: { data: unknown; error: PostgrestError | null }): T {
  if (error) throw error
  return data as T
}

const MEMBER_SELECT = 'id, trip_id, user_id, role, joined_at, profile:profiles(display_name, avatar_url)'

// ─── Queries ────────────────────────────────────────────────────────────────
export function useMyTrips() {
  return useQuery({
    queryKey: keys.trips,
    queryFn: async () =>
      unwrap<TripListItem[]>(
        await supabase
          .from('trips')
          .select(`*, trip_members(${MEMBER_SELECT}), destinations(count)`)
          .order('created_at', { ascending: false }),
      ),
  })
}

export function useTrip(tripId: string | undefined) {
  return useQuery({
    queryKey: keys.trip(tripId ?? ''),
    enabled: Boolean(tripId),
    queryFn: async () => unwrap<Trip | null>(await supabase.from('trips').select('*').eq('id', tripId!).maybeSingle()),
  })
}

export function useTripMembers(tripId: string | undefined) {
  return useQuery({
    queryKey: keys.members(tripId ?? ''),
    enabled: Boolean(tripId),
    queryFn: async () =>
      unwrap<TripMember[]>(
        await supabase.from('trip_members').select(MEMBER_SELECT).eq('trip_id', tripId!).order('joined_at'),
      ),
  })
}

/** userId is part of the key because `is_member` depends on who is asking. */
export function useTripPreview(code: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: [...keys.preview(code ?? ''), userId ?? 'anon'],
    enabled: Boolean(code),
    staleTime: 0,
    queryFn: async () => {
      const rows = unwrap<TripPreview[]>(await supabase.rpc('get_trip_preview', { p_code: code! }))
      return rows[0] ?? null
    },
  })
}

// ─── Mutations ──────────────────────────────────────────────────────────────
export interface TripInput {
  name: string
  description: string | null
  cover_image_url: string | null
  cover_image_attribution: string | null
}

export function useCreateTrip() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: TripInput) =>
      unwrap<Trip>(await supabase.from('trips').insert(input).select().single()),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.trips }),
  })
}

export function useUpdateTrip(tripId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Partial<TripInput>) =>
      unwrap<Trip>(await supabase.from('trips').update(input).eq('id', tripId).select().single()),
    onSuccess: (trip) => {
      qc.setQueryData(keys.trip(tripId), trip)
      void qc.invalidateQueries({ queryKey: keys.trips })
    },
  })
}

export function useDeleteTrip() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (tripId: string) => {
      unwrap(await supabase.from('trips').delete().eq('id', tripId))
    },
    onSuccess: (_d, tripId) => {
      qc.removeQueries({ queryKey: keys.trip(tripId) })
      void qc.invalidateQueries({ queryKey: keys.trips })
    },
  })
}

export function useRegenerateInvite(tripId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => unwrap<string>(await supabase.rpc('regenerate_invite_code', { p_trip_id: tripId })),
    onSuccess: (code) => {
      qc.setQueryData<Trip | null>(keys.trip(tripId), (t) => (t ? { ...t, invite_code: code } : t))
      void qc.invalidateQueries({ queryKey: keys.trips })
    },
  })
}

export function useUpdateMemberRole(tripId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: Exclude<Role, 'owner'> }) => {
      unwrap(await supabase.from('trip_members').update({ role }).eq('id', memberId))
    },
    onMutate: async ({ memberId, role }) => {
      await qc.cancelQueries({ queryKey: keys.members(tripId) })
      const previous = qc.getQueryData<TripMember[]>(keys.members(tripId))
      qc.setQueryData<TripMember[]>(keys.members(tripId), (list) =>
        list?.map((m) => (m.id === memberId ? { ...m, role } : m)),
      )
      return { previous }
    },
    onError: (_e, _v, ctx) => qc.setQueryData(keys.members(tripId), ctx?.previous),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.members(tripId) }),
  })
}

/** Owner removing a member, or a member leaving the trip. */
export function useRemoveMember(tripId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (memberId: string) => {
      const rows = unwrap<{ id: string }[]>(await supabase.from('trip_members').delete().eq('id', memberId).select('id'))
      if (rows.length === 0) throw new Error('forbidden')
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.members(tripId) })
      void qc.invalidateQueries({ queryKey: keys.trips })
    },
  })
}

export function useJoinTrip() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (code: string) => unwrap<string>(await supabase.rpc('join_trip', { p_code: code })),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.trips }),
  })
}
