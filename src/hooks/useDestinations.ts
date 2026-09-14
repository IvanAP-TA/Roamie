import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { keys, unwrap } from './useTrips'
import type { BudgetLevel, Destination, DestinationComment, DestinationStatus, Mood, VoteType } from '@/lib/types'

export const DESTINATION_SELECT =
  '*, votes(id, user_id, vote_type), comments(count), creator:profiles!destinations_created_by_fkey(display_name, avatar_url)'

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
  lat: number | null
  lng: number | null
  image_url: string | null
  image_attribution: string | null
  mood: Mood[]
  budget_level: BudgetLevel | null
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

/** Toggle semantics live in the cast_vote RPC; the cache is updated optimistically for instant feedback. */
export function useCastVote(tripId: string) {
  const qc = useQueryClient()
  const { user } = useAuth()
  const key = keys.destinations(tripId)

  return useMutation({
    mutationFn: async ({ destinationId, voteType }: { destinationId: string; voteType: VoteType }) =>
      unwrap<VoteType | null>(await supabase.rpc('cast_vote', { p_destination_id: destinationId, p_vote_type: voteType })),
    onMutate: async ({ destinationId, voteType }) => {
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<Destination[]>(key)
      qc.setQueryData<Destination[]>(key, (list) =>
        list?.map((d) => {
          if (d.id !== destinationId || !user) return d
          const mine = d.votes.find((v) => v.user_id === user.id)
          const others = d.votes.filter((v) => v.user_id !== user.id)
          return {
            ...d,
            votes: mine?.vote_type === voteType ? others : [...others, { id: `optimistic-${destinationId}`, user_id: user.id, vote_type: voteType }],
          }
        }),
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
