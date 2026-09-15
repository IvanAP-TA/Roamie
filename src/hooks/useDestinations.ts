import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { keys, unwrap } from './useTrips'
import type { BudgetLevel, Destination, DestinationComment, DestinationStatus, Mood } from '@/lib/types'

export const DESTINATION_SELECT =
  '*, votes(id, user_id, points), reviews:destination_reviews(id, user_id, rating), comments(count), creator:profiles!destinations_created_by_fkey(display_name, avatar_url), reasons:destination_reasons(id, user_id, text, created_at, likes:reason_likes(id, user_id))'

const COMMENT_SELECT = 'id, destination_id, user_id, content, created_at, author:profiles(display_name, avatar_url)'

export function useDestinations(tripId: string) {
  return useQuery({
    queryKey: keys.destinations(tripId),
    queryFn: async () =>
      unwrap<Destination[]>(
        await supabase
          .from('destinations')
          .select(DESTINATION_SELECT)
          .eq('trip_id', tripId)
          .order('created_at', { ascending: false }),
      ),
  })
}

export interface DestinationInput {
  name: string
  country: string | null
  country_code: string | null
  lat: number | null
  lng: number | null
  image_url: string | null
  image_attribution: string | null
  mood: Mood[]
  /** Only set by guides now; the app shows a level estimated from the destination's costs. */
  budget_level?: BudgetLevel | null
  expectations: string | null
}

export function useCreateDestination(tripId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: DestinationInput) =>
      unwrap<Destination>(
        await supabase.from('destinations').insert({ ...input, trip_id: tripId }).select(DESTINATION_SELECT).single(),
      ),
    onSuccess: (created) => {
      qc.setQueryData<Destination[]>(keys.destinations(tripId), (list) =>
        list && !list.some((d) => d.id === created.id) ? [created, ...list] : list,
      )
      void qc.invalidateQueries({ queryKey: keys.trips })
    },
  })
}

export function useUpdateDestination(tripId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<DestinationInput> & { status?: DestinationStatus } }) =>
      unwrap<Destination>(await supabase.from('destinations').update(patch).eq('id', id).select(DESTINATION_SELECT).single()),
    onSuccess: (updated) => {
      qc.setQueryData<Destination[]>(keys.destinations(tripId), (list) => list?.map((d) => (d.id === updated.id ? updated : d)))
    },
  })
}

export function useDeleteDestination(tripId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const rows = unwrap<{ id: string }[]>(await supabase.from('destinations').delete().eq('id', id).select('id'))
      if (rows.length === 0) throw new Error('forbidden')
    },
    onSuccess: (_d, id) => {
      qc.setQueryData<Destination[]>(keys.destinations(tripId), (list) => list?.filter((d) => d.id !== id))
      void qc.invalidateQueries({ queryKey: keys.trips })
    },
  })
}

/** The 10-point budget is enforced by set_points() and its trigger; the cache is updated optimistically. */
export function useSetPoints(tripId: string) {
  const qc = useQueryClient()
  const { user } = useAuth()
  const key = keys.destinations(tripId)

  return useMutation({
    mutationFn: async ({ destinationId, points }: { destinationId: string; points: number }) =>
      unwrap<number>(await supabase.rpc('set_points', { p_destination_id: destinationId, p_points: points })),
    onMutate: async ({ destinationId, points }) => {
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<Destination[]>(key)
      qc.setQueryData<Destination[]>(key, (list) =>
        list?.map((d) => {
          if (d.id !== destinationId || !user) return d
          const mine = d.votes.find((v) => v.user_id === user.id)
          const others = d.votes.filter((v) => v.user_id !== user.id)
          return {
            ...d,
            votes: points > 0 ? [...others, { id: mine?.id ?? `optimistic-${destinationId}`, user_id: user.id, points }] : others,
          }
        }),
      )
      return { previous }
    },
    onError: (_e, _v, ctx) => qc.setQueryData(key, ctx?.previous),
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  })
}

/** A member's final rating of a visited destination (0 removes it); optimistic like points. */
export function useSetRating(tripId: string) {
  const qc = useQueryClient()
  const { user } = useAuth()
  const key = keys.destinations(tripId)

  return useMutation({
    mutationFn: async ({ destinationId, rating }: { destinationId: string; rating: number }) => {
      unwrap(await supabase.rpc('set_rating', { p_destination_id: destinationId, p_rating: rating }))
    },
    onMutate: async ({ destinationId, rating }) => {
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<Destination[]>(key)
      qc.setQueryData<Destination[]>(key, (list) =>
        list?.map((d) => {
          if (d.id !== destinationId || !user) return d
          const existing = d.reviews.find((r) => r.user_id === user.id)
          const others = d.reviews.filter((r) => r.user_id !== user.id)
          return { ...d, reviews: rating > 0 ? [...others, { id: existing?.id ?? `optimistic-${d.id}`, user_id: user.id, rating }] : others }
        }),
      )
      return { previous }
    },
    onError: (_e, _v, ctx) => qc.setQueryData(key, ctx?.previous),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: key })
      void qc.invalidateQueries({ queryKey: ['passport'] })
    },
  })
}

/** Sets the day and time the wheel spins by itself, or cancels it (no time). */
export function useScheduleRoulette(tripId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (at: Date | null) => {
      unwrap(await supabase.rpc('schedule_roulette', { p_trip_id: tripId, ...(at && { p_at: at.toISOString() }) }))
    },
    onSettled: () => qc.invalidateQueries({ queryKey: keys.trip(tripId) }),
  })
}

/** Clears the caller's points on proposed destinations, or everyone's (owners only). Optimistic. */
export function useResetPoints(tripId: string) {
  const qc = useQueryClient()
  const { user } = useAuth()
  const key = keys.destinations(tripId)

  return useMutation({
    mutationFn: async (everyone: boolean) =>
      unwrap<number>(await supabase.rpc('reset_points', { p_trip_id: tripId, ...(everyone && { p_everyone: true }) })),
    onMutate: async (everyone) => {
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<Destination[]>(key)
      qc.setQueryData<Destination[]>(key, (list) =>
        list?.map((d) => (d.status === 'proposed' ? { ...d, votes: everyone ? [] : d.votes.filter((v) => v.user_id !== user?.id) } : d)),
      )
      return { previous }
    },
    onError: (_e, _v, ctx) => qc.setQueryData(key, ctx?.previous),
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  })
}

export function useComments(destinationId: string | null) {
  return useQuery({
    queryKey: keys.comments(destinationId ?? ''),
    enabled: Boolean(destinationId),
    queryFn: async () =>
      unwrap<DestinationComment[]>(
        await supabase.from('comments').select(COMMENT_SELECT).eq('destination_id', destinationId!).order('created_at'),
      ),
  })
}

export function useAddComment(tripId: string, destinationId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (content: string) =>
      unwrap<DestinationComment>(
        await supabase.from('comments').insert({ destination_id: destinationId, content }).select(COMMENT_SELECT).single(),
      ),
    onSuccess: (comment) => {
      qc.setQueryData<DestinationComment[]>(keys.comments(destinationId), (list) =>
        list && !list.some((c) => c.id === comment.id) ? [...list, comment] : list,
      )
      void qc.invalidateQueries({ queryKey: keys.destinations(tripId) })
    },
  })
}

export function useDeleteComment(tripId: string, destinationId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const rows = unwrap<{ id: string }[]>(await supabase.from('comments').delete().eq('id', id).select('id'))
      if (rows.length === 0) throw new Error('forbidden')
    },
    onSuccess: (_d, id) => {
      qc.setQueryData<DestinationComment[]>(keys.comments(destinationId), (list) => list?.filter((c) => c.id !== id))
      void qc.invalidateQueries({ queryKey: keys.destinations(tripId) })
    },
  })
}

/** Server-side weighted draw (see spin_roulette in SQL). Returns the winning destination id. */
export function useSpinRoulette(tripId: string) {
  return useMutation({
    mutationFn: async () => unwrap<string>(await supabase.rpc('spin_roulette', { p_trip_id: tripId })),
  })
}
